import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Truck,
  Tag,
  MapPin,
  CreditCard,
  Package,
  RefreshCw,
  XCircle,
  CheckCircle2,
  Clock,
  FileText,
  QrCode,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { statusLabel, pickupPaymentDue } from '../../utils/fulfillment';
import { api } from '../../api/client';
import AdminLayout from '../../components/AdminLayout';

const statusBadge = {
  pending: 'badge-warning',
  paid: 'badge-success',
  processing: 'badge-info',
  shipped: 'badge-info',
  delivered: 'badge-success',
  cancelled: 'badge-danger',
  ready_for_pickup: 'badge-warning',
  picked_up: 'badge-success',
};

const trackingStatusColor = {
  PRE_TRANSIT: 'var(--warning)',
  TRANSIT: 'var(--info, #2563eb)',
  DELIVERED: 'var(--success, #16a34a)',
  RETURNED: 'var(--danger, #dc2626)',
  FAILURE: 'var(--danger, #dc2626)',
  UNKNOWN: 'var(--text-muted)',
};

export default function AdminOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [labelLoading, setLabelLoading] = useState(false);
  const [refundLoading, setRefundLoading] = useState(false);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [statusUpdate, setStatusUpdate] = useState('');
  const [rates, setRates] = useState([]);
  const [selectedRateId, setSelectedRateId] = useState('');
  const [parcel, setParcel] = useState({
    length: 10, width: 8, height: 2, weight: 8,
    distanceUnit: 'in', massUnit: 'oz',
  });
  const [tracking, setTracking] = useState(null);

  useEffect(() => {
    api.adminGetOrder(id)
      .then((d) => {
        setOrder(d.order);
        setStatusUpdate(d.order.status);
        if (d.order.parcel) {
          setParcel({
            length: d.order.parcel.length || 10,
            width: d.order.parcel.width || 8,
            height: d.order.parcel.height || 2,
            weight: d.order.parcel.weight || 8,
            distanceUnit: d.order.parcel.distanceUnit || 'in',
            massUnit: d.order.parcel.massUnit || 'oz',
          });
        }
        if (d.order.shippoRateId) setSelectedRateId(d.order.shippoRateId);
      })
      .catch(() => toast.error('Order not found'))
      .finally(() => setLoading(false));
  }, [id]);

  const updateStatus = async () => {
    try {
      const { order: updated } = await api.adminUpdateOrderStatus(id, statusUpdate);
      setOrder(updated);
      toast.success('Status updated');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const fetchRates = async () => {
    setRatesLoading(true);
    try {
      const { rates: r } = await api.adminGetOrderRates(id);
      setRates(r);
      if (r.length > 0 && !selectedRateId) setSelectedRateId(r[0].rateId);
      toast.success(`Found ${r.length} rates`);
    } catch (err) {
      toast.error(err.message || 'Failed to fetch rates');
    } finally {
      setRatesLoading(false);
    }
  };

  const createLabel = async () => {
    setLabelLoading(true);
    try {
      const { order: updated, label } = await api.adminCreateLabel({
        orderId: id,
        rateId: selectedRateId || undefined,
        parcel,
      });
      setOrder(updated);
      toast.success(`Label created! Tracking: ${label.trackingNumber}`);
    } catch (err) {
      toast.error(err.message || 'Failed to create label');
    } finally {
      setLabelLoading(false);
    }
  };

  const refreshTracking = async () => {
    setTrackingLoading(true);
    try {
      const t = await api.adminGetTracking(id);
      setTracking(t);
      // Also refresh the order to pick up synced history
      const { order: updated } = await api.adminGetOrder(id);
      setOrder(updated);
      toast.success(`Tracking: ${t.status || 'unknown'}`);
    } catch (err) {
      toast.error(err.message || 'Tracking lookup failed');
    } finally {
      setTrackingLoading(false);
    }
  };

  const refundLabel = async () => {
    if (!window.confirm('Void this shipping label? This requests a refund from the carrier.')) {
      return;
    }
    setRefundLoading(true);
    try {
      const { order: updated, refund } = await api.adminRefundLabel(id);
      setOrder(updated);
      toast.success(`Refund ${refund.status || 'requested'}`);
    } catch (err) {
      toast.error(err.message || 'Refund failed');
    } finally {
      setRefundLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Order">
        <div className="loading-page"><div className="spinner" /></div>
      </AdminLayout>
    );
  }
  if (!order) {
    return (
      <AdminLayout title="Order">
        <p>Order not found.</p>
      </AdminLayout>
    );
  }

  const hasLabel = !!order.shippoTransactionId;
  const history = order.trackingHistory || [];

  return (
    <AdminLayout>
      <div className="admin-order-detail" style={{ maxWidth: 1100 }}>
        <button onClick={() => navigate('/admin/orders')} className="btn btn-secondary btn-sm" style={{ marginBottom: 18 }}>
          <ArrowLeft size={14} /> Back to Orders
        </button>

        <div className="admin-order-detail-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', fontFamily: 'var(--font-body)' }} className="mono">
              Order #{order._id.slice(-8)}
            </h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: 4, fontSize: 14 }}>
              Placed {new Date(order.createdAt).toLocaleString()}
            </p>
          </div>
          <div className="admin-order-detail-badges" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span className={`badge ${statusBadge[order.status] || 'badge-gray'}`} style={{ fontSize: 13, padding: '6px 14px' }}>
              {statusLabel(order.status)}
            </span>
            {order.trackingStatus && (
              <span
                className="badge"
                style={{ background: trackingStatusColor[order.trackingStatus], color: '#fff', fontSize: 13, padding: '6px 14px' }}
              >
                {order.trackingStatus}
              </span>
            )}
          </div>
        </div>

        <div className="admin-order-detail-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* LEFT */}
          <div>
            <div className="card" style={{ marginBottom: 16 }}>
              <h3 style={styles.sectionTitle}><Tag size={16} /> Items</h3>
              {order.items.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                  {item.imageUrl ? (
                    <img src={`${item.imageUrl}`} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6 }} />
                  ) : (
                    <div style={{ width: 48, height: 48, background: '#f3f4f6', borderRadius: 6 }} />
                  )}
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 500, fontSize: 14 }}>{item.title}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      Qty: {item.quantity}
                      {item.shirtStyle && <> · Unisex</>}
                      {item.size && <> · Size: {item.size}</>}
                      {item.color && <> · {item.color}</>}
                    </p>
                  </div>
                  <span style={{ fontWeight: 600 }}>${((item.price * item.quantity) / 100).toFixed(2)}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 16, fontWeight: 700, fontSize: 18 }}>
                <span>Total</span>
                <span>${(order.totalAmount / 100).toFixed(2)}</span>
              </div>
              {order.shippingRate?.amount && (
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                  Includes ${order.shippingRate.amount.toFixed(2)} shipping · {order.shippingRate.carrier} {order.shippingRate.service}
                </p>
              )}
            </div>

            {/* Tracking History */}
            {hasLabel && (
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <h3 style={{ ...styles.sectionTitle, marginBottom: 0 }}>
                    <Clock size={16} /> Tracking History
                  </h3>
                  <button className="btn btn-secondary btn-sm" onClick={refreshTracking} disabled={trackingLoading}>
                    <RefreshCw size={14} className={trackingLoading ? 'spin' : ''} />
                    {trackingLoading ? 'Refreshing…' : 'Refresh'}
                  </button>
                </div>
                {history.length === 0 ? (
                  <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    No tracking events yet. Click Refresh to query the carrier.
                  </p>
                ) : (
                  <ol style={styles.timeline}>
                    {history.slice().reverse().map((h, i) => (
                      <li key={i} style={styles.timelineItem}>
                        <div
                          style={{
                            ...styles.timelineDot,
                            background: trackingStatusColor[h.status] || 'var(--text-muted)',
                          }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                            <strong style={{ fontSize: 13 }}>{h.status}</strong>
                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                              {h.occurredAt ? new Date(h.occurredAt).toLocaleString() : ''}
                            </span>
                          </div>
                          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                            {h.statusDetails}
                          </p>
                          {(h.location?.city || h.location?.state) && (
                            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' }}>
                              {h.location.city}{h.location.state ? `, ${h.location.state}` : ''} {h.location.zip || ''}
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
                {order.trackingEta && (
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 10 }}>
                    Estimated delivery: {new Date(order.trackingEta).toLocaleDateString()}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* RIGHT */}
          <div>
            {/* Customer */}
            <div className="card" style={{ marginBottom: 16 }}>
              <h3 style={styles.sectionTitle}><CreditCard size={16} /> Customer</h3>
              <p style={{ fontSize: 14 }}><strong>{order.user?.name || 'Guest'}</strong></p>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                {order.user?.email || order.guestEmail}
              </p>
              {order.stripePaymentIntentId && (
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                  Stripe: <span className="mono">{order.stripePaymentIntentId}</span>
                </p>
              )}
              {order.stripeRefundId && (
                <p style={{ fontSize: 12, color: 'var(--danger, #dc2626)', marginTop: 4 }}>
                  Refunded: <span className="mono">{order.stripeRefundId}</span>
                </p>
              )}
            </div>

            {/* Shipping Address */}
            <div className="card" style={{ marginBottom: 16 }}>
              <h3 style={styles.sectionTitle}><MapPin size={16} /> Shipping Address</h3>
              <p style={{ fontSize: 14, lineHeight: 1.6 }}>
                {order.shippingAddress.name}<br />
                {order.shippingAddress.street}<br />
                {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zip}<br />
                {order.shippingAddress.country}
              </p>
            </div>

            {/* Update Status */}
            <div className="card" style={{ marginBottom: 16 }}>
              <h3 style={styles.sectionTitle}>Update Status</h3>
              <div className="admin-status-update" style={{ display: 'flex', gap: 8 }}>
                <select className="input" value={statusUpdate} onChange={(e) => setStatusUpdate(e.target.value)}>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="processing">Processing</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <button className="btn btn-primary" onClick={updateStatus}>Update</button>
              </div>
            </div>

            {/* Shipping / Shippo */}
            <div className="card">
              <h3 style={styles.sectionTitle}><Truck size={16} /> Shipping</h3>

              {hasLabel ? (
                <div>
                  <p style={{ fontSize: 14, marginBottom: 8 }}>
                    <strong>Tracking:</strong>{' '}
                    <a href={order.shippoTrackingUrl} target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>
                      {order.shippoTrackingNumber}
                    </a>
                  </p>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
                    <strong>Carrier:</strong> {order.shippingRate?.carrier || '—'} · {order.shippingRate?.service || ''}
                  </p>
                  {order.labelCreatedAt && (
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                      Label created {new Date(order.labelCreatedAt).toLocaleString()}
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {order.shippoLabelUrl && (
                      <a href={order.shippoLabelUrl} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">
                        <FileText size={14} /> Download Label
                      </a>
                    )}
                    {order.shippoQrCodeUrl && (
                      <a href={order.shippoQrCodeUrl} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">
                        <QrCode size={14} /> QR Code
                      </a>
                    )}
                    {order.shippoCommercialInvoiceUrl && (
                      <a href={order.shippoCommercialInvoiceUrl} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">
                        <FileText size={14} /> Invoice
                      </a>
                    )}
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={refundLabel}
                      disabled={refundLoading}
                    >
                      <XCircle size={14} /> {refundLoading ? 'Voiding…' : 'Void / Refund Label'}
                    </button>
                  </div>
                  {order.shippoRefundStatus && (
                    <p style={{ fontSize: 12, marginTop: 8, color: 'var(--text-secondary)' }}>
                      Refund status: <strong>{order.shippoRefundStatus}</strong>
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
                    No shipping label yet. {order.status === 'pending' && 'Order must be paid first.'}
                  </p>

                  {/* Parcel editor */}
                  <div style={{ background: 'var(--bg-subtle, #f9fafb)', padding: 12, borderRadius: 6, marginBottom: 12 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Package size={13} /> Parcel
                    </p>
                    <div className="admin-parcel-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                      {['length', 'width', 'height', 'weight'].map((f) => (
                        <label key={f} style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {f} ({f === 'weight' ? parcel.massUnit : parcel.distanceUnit})
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            className="input"
                            style={{ fontSize: 13, padding: '4px 8px', marginTop: 2 }}
                            value={parcel[f]}
                            onChange={(e) => setParcel({ ...parcel, [f]: parseFloat(e.target.value) || 0 })}
                          />
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Rates selector */}
                  <div style={{ marginBottom: 12 }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={fetchRates}
                      disabled={ratesLoading || order.status === 'pending'}
                      style={{ marginBottom: 8 }}
                    >
                      <RefreshCw size={14} className={ratesLoading ? 'spin' : ''} />
                      {ratesLoading ? 'Fetching rates…' : 'Fetch Carrier Rates'}
                    </button>
                    {rates.length > 0 && (
                      <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 6 }}>
                        {rates.map((r) => (
                          <label
                            key={r.rateId}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              padding: '8px 10px',
                              borderBottom: '1px solid var(--border)',
                              cursor: 'pointer',
                              background: selectedRateId === r.rateId ? 'var(--accent-subtle, #eff6ff)' : 'transparent',
                            }}
                          >
                            <input
                              type="radio"
                              name="rate"
                              checked={selectedRateId === r.rateId}
                              onChange={() => setSelectedRateId(r.rateId)}
                            />
                            <div style={{ flex: 1, fontSize: 13 }}>
                              <strong>{r.carrier}</strong> · {r.service}
                              <span style={{ color: 'var(--text-muted)', fontSize: 11, marginLeft: 6 }}>
                                {typeof r.estimatedDays === 'number' ? `${r.estimatedDays}d` : r.estimatedDays}
                              </span>
                            </div>
                            <span style={{ fontWeight: 600, fontSize: 13 }}>${r.amount.toFixed(2)}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    className="btn btn-primary"
                    onClick={createLabel}
                    disabled={labelLoading || order.status === 'pending'}
                    style={{ width: '100%' }}
                  >
                    <Truck size={16} />
                    {labelLoading ? 'Creating Label…' : selectedRateId ? 'Buy Label (Selected Rate)' : 'Buy Label (Cheapest Rate)'}
                  </button>
                  {order.status === 'pending' && (
                    <p style={{ fontSize: 12, color: 'var(--warning)', marginTop: 6 }}>
                      Order must be paid before creating a label.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

const styles = {
  sectionTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 15,
    fontWeight: 600,
    marginBottom: 14,
  },
  timeline: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    borderLeft: '2px solid var(--border)',
    paddingLeft: 16,
  },
  timelineItem: {
    position: 'relative',
    paddingBottom: 14,
    display: 'flex',
    gap: 10,
  },
  timelineDot: {
    position: 'absolute',
    left: -22,
    top: 4,
    width: 10,
    height: 10,
    borderRadius: '50%',
    border: '2px solid var(--bg)',
  },
};
