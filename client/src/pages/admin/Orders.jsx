import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Eye, Package, Trash2, Download, Upload, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import { statusLabel } from '../../utils/fulfillment';
import { api } from '../../api/client';
import AdminLayout from '../../components/AdminLayout';
import ConfirmModal from '../../components/ConfirmModal';

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

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importReport, setImportReport] = useState(null);
  const fileInput = useRef(null);

  const fetchOrders = () => {
    setLoading(true);
    api.adminGetOrders(filter)
      .then((d) => setOrders(d.orders))
      .catch(() => toast.error('Failed to load orders'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchOrders(); }, [filter]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.adminDeleteOrder(deleteTarget._id);
      toast.success(`Order #${deleteTarget._id.slice(-8).toUpperCase()} deleted`);
      setDeleteTarget(null);
      fetchOrders();
    } catch (err) {
      toast.error(err.message || 'Could not delete the order');
    } finally {
      setDeleting(false);
    }
  };

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    // Clear immediately so re-picking the same file still fires a change event.
    event.target.value = '';
    if (!file) return;
    setImporting(true);
    setImportReport(null);
    try {
      const csv = await file.text();
      const report = await api.adminImportOrders(csv);
      setImportReport(report);
      const changed = report.created + report.updated;
      if (changed) toast.success(`${report.created} restored, ${report.updated} updated`);
      if (report.failed) toast.error(`${report.failed} ${report.failed === 1 ? 'row' : 'rows'} could not be imported`);
      if (changed) fetchOrders();
    } catch (err) {
      toast.error(err.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const statusFilters = [
    { v: '', l: 'All' },
    { v: 'pending', l: 'Pending' },
    { v: 'paid', l: 'Paid' },
    { v: 'processing', l: 'Processing' },
    { v: 'shipped', l: 'Shipped' },
    { v: 'delivered', l: 'Delivered' },
    { v: 'cancelled', l: 'Cancelled' },
  ];

  return (
    <AdminLayout
      title="Orders"
      description={`${orders.length} ${orders.length === 1 ? 'order' : 'orders'}`}
      action={
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <a
            className="btn btn-secondary"
            href={api.adminExportOrdersUrl(filter)}
            download
          >
            <Download size={15} /> Export CSV
          </a>
          <button
            className="btn btn-secondary"
            onClick={() => fileInput.current?.click()}
            disabled={importing}
          >
            {importing ? <><Loader size={15} className="spin" /> Importing…</> : <><Upload size={15} /> Import CSV</>}
          </button>
          <input
            ref={fileInput}
            type="file"
            accept=".csv,text/csv"
            onChange={handleImport}
            style={{ display: 'none' }}
          />
        </div>
      }
    >
      {importReport && (
        <div className="card" style={{ padding: 18, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
            <div>
              <strong style={{ fontSize: 14 }}>Import finished</strong>
              <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
                {importReport.created} restored · {importReport.updated} updated · {importReport.failed} failed
              </p>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => setImportReport(null)}>Dismiss</button>
          </div>
          {importReport.errors?.length > 0 && (
            <ul style={{ margin: '12px 0 0', paddingLeft: 18, fontSize: 13, color: 'var(--danger)' }}>
              {importReport.errors.map((e) => (
                <li key={e.line}>Row {e.line}: {e.message}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      {/* Status filter chips */}
      <div className="admin-order-filters" style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {statusFilters.map((s) => (
          <button
            key={s.v}
            className={`chip ${filter === s.v ? 'chip-active' : ''}`}
            onClick={() => setFilter(s.v)}
          >
            {s.l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-page"><div className="spinner" /></div>
      ) : (
        <div className="card admin-orders-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-wrap admin-mobile-table admin-orders-table">
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Tracking</th>
                  <th>Date</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: 60 }}>
                      <Package size={28} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
                      <p style={{ fontWeight: 600, marginBottom: 4 }}>No orders found</p>
                      <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                        Try a different status filter.
                      </p>
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr key={order._id}>
                      <td data-label="Order">
                        <Link
                          to={`/admin/orders/${order._id}`}
                          className="mono"
                          style={{ fontWeight: 600, color: 'var(--text)' }}
                        >
                          #{order._id.slice(-8)}
                        </Link>
                      </td>
                      <td data-label="Customer">
                        <div className="admin-customer-name" style={{ fontWeight: 500 }}>
                          {order.user?.name || order.guestEmail || 'Guest'}
                        </div>
                        {order.user?.email && (
                          <div className="admin-customer-email" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            {order.user.email}
                          </div>
                        )}
                      </td>
                      <td data-label="Items" style={{ color: 'var(--text-secondary)' }}>
                        {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
                      </td>
                      <td data-label="Total" style={{ fontWeight: 700 }}>
                        ${(order.totalAmount / 100).toFixed(2)}
                      </td>
                      <td data-label="Status">
                        <span className={`badge ${statusBadge[order.status] || 'badge-gray'}`}>
                          {statusLabel(order.status)}
                        </span>
                      </td>
                      <td data-label="Tracking">
                        {order.shippoTrackingNumber ? (
                          <a
                            href={order.shippoTrackingUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mono"
                            style={{ color: 'var(--info)', fontSize: 12 }}
                          >
                            {order.shippoTrackingNumber.slice(0, 10)}…
                          </a>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>—</span>
                        )}
                      </td>
                      <td data-label="Date" style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                      <td data-label="Actions" className="admin-actions-cell" style={{ textAlign: 'right' }}>
                        <Link to={`/admin/orders/${order._id}`} className="btn btn-secondary btn-sm" aria-label={`View order ${order._id.slice(-8)}`}>
                          <Eye size={14} /> View
                        </Link>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => setDeleteTarget(order)}
                          aria-label={`Delete order ${order._id.slice(-8)}`}
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Order"
        busy={deleting}
        confirmLabel="Delete Order"
        busyLabel="Deleting…"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      >
        Permanently delete order{' '}
        <strong>#{deleteTarget?._id.slice(-8).toUpperCase()}</strong>
        {' '}&mdash; {deleteTarget?.items?.length} {deleteTarget?.items?.length === 1 ? 'item' : 'items'},{' '}
        <strong>${((deleteTarget?.totalAmount || 0) / 100).toFixed(2)}</strong>,{' '}
        {statusLabel(deleteTarget?.status)}
        {deleteTarget?.guestEmail || deleteTarget?.user?.email
          ? <> for {deleteTarget.guestEmail || deleteTarget.user.email}</>
          : null}?
        <br /><br />
        This cannot be undone. Export the orders to CSV first if you might want it back.
      </ConfirmModal>
    </AdminLayout>
  );
}
