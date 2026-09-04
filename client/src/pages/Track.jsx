import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Package, Truck, CheckCircle2, Clock, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import PickupDetails from '../components/PickupDetails';
import { api } from '../api/client';

const statusBadge = {
  ready_for_pickup: { label: 'Ready for pickup', color: '#926b12' },
  picked_up: { label: 'Picked up', color: '#16a34a' },
  pending: { label: 'Pending', color: '#f59e0b' },
  paid: { label: 'Paid', color: '#16a34a' },
  processing: { label: 'Processing', color: '#2563eb' },
  shipped: { label: 'Shipped', color: '#2563eb' },
  delivered: { label: 'Delivered', color: '#16a34a' },
  cancelled: { label: 'Cancelled', color: '#dc2626' },
};

const trackingStatusColor = {
  PRE_TRANSIT: '#f59e0b',
  TRANSIT: '#2563eb',
  DELIVERED: '#16a34a',
  RETURNED: '#dc2626',
  FAILURE: '#dc2626',
  UNKNOWN: '#888',
};

export default function Track() {
  const [params, setParams] = useSearchParams();
  const [email, setEmail] = useState(params.get('email') || '');
  const [orderId, setOrderId] = useState(params.get('order') || '');
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState(null);
  const [orders, setOrders] = useState(null);

  useEffect(() => {
    const urlEmail = params.get('email');
    const urlOrder = params.get('order');
    if (urlEmail && urlOrder) {
      lookup({ email: urlEmail, orderId: urlOrder });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lookup = async ({ email: e = email, orderId: o = orderId } = {}) => {
    if (!e) {
      toast.error('Enter your email');
      return;
    }
    if (!o) {
      toast.error('Enter your order number');
      return;
    }
    setLoading(true);
    setOrder(null);
    setOrders(null);
    try {
      const data = await api.trackOrders({ email: e, orderId: o });
      if (data.order) setOrder(data.order);
      else if (data.orders) setOrders(data.orders);

      const next = new URLSearchParams();
      next.set('email', e);
      if (o) next.set('order', o);
      setParams(next, { replace: true });
    } catch (err) {
      toast.error(err.message || 'Could not find that order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 760 }}>
        <div className="page-header">
          <h1>Track your order</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
            Enter the email you used at checkout to see your order status and tracking.
          </p>
        </div>

        <div className="card" style={{ marginBottom: 24 }}>
          <form
            onSubmit={(e) => { e.preventDefault(); lookup(); }}
            style={{ display: 'grid', gap: 10 }}
          >
            <div className="form-group" style={{ margin: 0 }}>
              <label>Email</label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoFocus
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Order number</label>
              <input
                className="input"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="e.g. 62a8c4e1f0b8..."
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading}>
              <Search size={16} /> {loading ? 'Searching…' : 'Find my order'}
            </button>
          </form>
        </div>

        {orders && orders.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: 40 }}>
            <Package size={28} style={{ opacity: 0.3 }} />
            <p style={{ marginTop: 12, fontWeight: 600 }}>No orders found</p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Double-check the email you used at checkout.
            </p>
          </div>
        )}

        {orders && orders.length > 0 && (
          <div style={{ display: 'grid', gap: 10 }}>
            {orders.map((o) => (
              <button
                key={o._id}
                className="card"
                style={{
                  textAlign: 'left',
                  cursor: 'pointer',
                  border: '1px solid var(--border)',
                  background: '#fff',
                }}
                onClick={() => { setOrderId(o._id); lookup({ orderId: o._id }); }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <div className="mono" style={{ fontWeight: 700 }}>#{o._id.slice(-8)}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                      {new Date(o.createdAt).toLocaleDateString()} · {o.items?.length || 0} item{(o.items?.length || 0) !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <StatusBadge status={o.status} trackingStatus={o.trackingStatus} />
                    <span style={{ fontWeight: 700 }}>${(o.totalAmount / 100).toFixed(2)}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {order && <OrderDetail order={order} />}
      </div>
    </div>
  );
}

function StatusBadge({ status, trackingStatus }) {
  const s = statusBadge[status] || { label: status, color: '#888' };
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      <span style={{
        background: s.color,
        color: '#fff',
        fontSize: 12,
        padding: '3px 10px',
        borderRadius: 12,
        fontWeight: 600,
      }}>
        {s.label}
      </span>
      {trackingStatus && trackingStatus !== 'UNKNOWN' && (
        <span style={{
          background: trackingStatusColor[trackingStatus] || '#888',
          color: '#fff',
          fontSize: 12,
          padding: '3px 10px',
          borderRadius: 12,
          fontWeight: 600,
        }}>
          {trackingStatus}
        </span>
      )}
    </div>
  );
}

function OrderDetail({ order }) {
  const isPickup = order.fulfillmentMethod === 'pickup';
  const steps = [
    { key: 'paid', label: 'Ordered', icon: CheckCircle2 },
    { key: 'processing', label: 'Processing', icon: Package },
    ...(isPickup ? [{ key: 'ready_for_pickup', label: 'Ready for pickup', icon: MapPin }, { key: 'picked_up', label: 'Picked up', icon: CheckCircle2 }] : [{ key: 'shipped', label: 'Shipped', icon: Truck }, { key: 'delivered', label: 'Delivered', icon: MapPin }]),
  ];
  const order404 = { pending: order.paymentMethod === 'pay_on_pickup' ? 0 : -1, paid: 0, processing: 1, shipped: 2, delivered: 3, ready_for_pickup: 2, picked_up: 3, cancelled: -1 };
  const activeIdx = order404[order.status] ?? 0;

  return (
    <div className="card" style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }} className="mono">
            Order #{order._id.slice(-8)}
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Placed {new Date(order.createdAt).toLocaleString()}
          </p>
        </div>
        <StatusBadge status={order.status} trackingStatus={order.trackingStatus} />
      </div>

      {/* Progress steps */}
      {order.status !== 'cancelled' && (
        <div style={{ display: 'flex', justifyContent: 'space-between', margin: '22px 0', gap: 8 }}>
          {steps.map((s, i) => {
            const Icon = s.icon;
            const done = i <= activeIdx;
            return (
              <div key={s.key} style={{ flex: 1, textAlign: 'center', position: 'relative' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', margin: '0 auto',
                  background: done ? '#111' : '#e5e7eb',
                  color: done ? '#fff' : '#888',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={18} />
                </div>
                <div style={{ marginTop: 6, fontSize: 12, fontWeight: done ? 700 : 500, color: done ? '#111' : '#888' }}>
                  {s.label}
                </div>
                {i < steps.length - 1 && (
                  <div style={{
                    position: 'absolute', top: 18, left: '60%', right: '-40%', height: 2,
                    background: i < activeIdx ? '#111' : '#e5e7eb',
                    zIndex: -1,
                  }} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Tracking */}
      {order.shippoTrackingNumber && (
        <div style={{ background: '#fafafa', border: '1px solid #eee', borderRadius: 8, padding: 14, marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tracking</div>
          <a
            href={order.shippoTrackingUrl}
            target="_blank"
            rel="noreferrer"
            className="mono"
            style={{ fontWeight: 700, color: '#2563eb', fontSize: 14 }}
          >
            {order.shippoTrackingNumber}
          </a>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {order.shippingRate?.carrier} {order.shippingRate?.service}
          </div>
          {order.trackingEta && (
            <div style={{ fontSize: 13, marginTop: 6 }}>
              Estimated delivery: <strong>{new Date(order.trackingEta).toLocaleDateString()}</strong>
            </div>
          )}
        </div>
      )}

      {/* Tracking history */}
      {order.trackingHistory?.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Clock size={14} /> Tracking history
          </h3>
          <ol style={{ listStyle: 'none', padding: 0, margin: 0, borderLeft: '2px solid #eee', paddingLeft: 14 }}>
            {order.trackingHistory.slice().reverse().map((h, i) => (
              <li key={i} style={{ position: 'relative', paddingBottom: 12 }}>
                <div style={{
                  position: 'absolute', left: -20, top: 4, width: 9, height: 9, borderRadius: '50%',
                  background: trackingStatusColor[h.status] || '#888',
                }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <strong style={{ fontSize: 13 }}>{h.status}</strong>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {h.occurredAt ? new Date(h.occurredAt).toLocaleString() : ''}
                  </span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '2px 0 0' }}>{h.statusDetails}</p>
                {(h.location?.city || h.location?.state) && (
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' }}>
                    {h.location.city}{h.location.state ? `, ${h.location.state}` : ''} {h.location.zip || ''}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Items */}
      <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Items</h3>
      {order.items.map((item, i) => (
        <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: '1px solid #eee' }}>
          {item.imageUrl ? (
            <img src={item.imageUrl} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6 }} />
          ) : (
            <div style={{ width: 48, height: 48, background: '#f3f4f6', borderRadius: 6 }} />
          )}
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 500, fontSize: 14, margin: 0 }}>{item.title}</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' }}>
              Qty {item.quantity}
              {item.size && ` · ${item.size}`}
              {item.color && ` · ${item.color}`}
            </p>
          </div>
          <span style={{ fontWeight: 600 }}>${((item.price * item.quantity) / 100).toFixed(2)}</span>
        </div>
      ))}
      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 14, fontWeight: 700, fontSize: 16 }}>
        <span>Total</span>
        <span>${(order.totalAmount / 100).toFixed(2)}</span>
      </div>

      <PickupDetails order={order} />
      {!isPickup && <div style={{ marginTop: 16, fontSize: 13, color: 'var(--text-secondary)' }}>
        Ship to: {order.shippingAddress?.name}, {order.shippingAddress?.street},{' '}
        {order.shippingAddress?.city}, {order.shippingAddress?.state} {order.shippingAddress?.zip}
      </div>}
    </div>
  );
}
