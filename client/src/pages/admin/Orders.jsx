import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Eye, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../api/client';
import AdminLayout from '../../components/AdminLayout';

const statusBadge = {
  pending: 'badge-warning',
  paid: 'badge-success',
  processing: 'badge-info',
  shipped: 'badge-info',
  delivered: 'badge-success',
  cancelled: 'badge-danger',
};

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const fetchOrders = () => {
    setLoading(true);
    api.adminGetOrders(filter)
      .then((d) => setOrders(d.orders))
      .catch(() => toast.error('Failed to load orders'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchOrders(); }, [filter]);

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
    >
      {/* Status filter chips */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
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
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-wrap">
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
                      <td>
                        <Link
                          to={`/admin/orders/${order._id}`}
                          className="mono"
                          style={{ fontWeight: 600, color: 'var(--text)' }}
                        >
                          #{order._id.slice(-8)}
                        </Link>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>
                          {order.user?.name || order.guestEmail || 'Guest'}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {order.user?.email || order.guestEmail || ''}
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>
                        {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
                      </td>
                      <td style={{ fontWeight: 700 }}>
                        ${(order.totalAmount / 100).toFixed(2)}
                      </td>
                      <td>
                        <span className={`badge ${statusBadge[order.status] || 'badge-gray'}`}>
                          {order.status}
                        </span>
                      </td>
                      <td>
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
                      <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <Link to={`/admin/orders/${order._id}`} className="btn btn-secondary btn-sm">
                          <Eye size={14} /> View
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
