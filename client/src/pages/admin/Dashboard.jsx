import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  DollarSign, ShoppingCart, Package, Truck, Shirt, ClipboardList,
  ArrowRight, ArrowUpRight, TrendingUp, PlusCircle,
} from 'lucide-react';
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

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.adminGetStats()
      .then((d) => {
        setStats(d.stats);
        setRecentOrders(d.recentOrders || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <AdminLayout title="Dashboard">
        <div className="loading-page"><div className="spinner" /></div>
      </AdminLayout>
    );
  }

  const statCards = [
    {
      label: 'Total Revenue',
      value: `$${((stats?.totalRevenue || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      accent: '#0e9f6e',
      sub: 'All-time',
    },
    {
      label: 'Total Orders',
      value: stats?.totalOrders || 0,
      icon: ShoppingCart,
      accent: '#6366f1',
      sub: 'Across all statuses',
    },
    {
      label: 'Paid',
      value: stats?.paidOrders || 0,
      icon: Package,
      accent: '#f59e0b',
      sub: 'Awaiting fulfillment',
    },
    {
      label: 'Shipped',
      value: stats?.shippedOrders || 0,
      icon: Truck,
      accent: '#3b82f6',
      sub: 'In transit',
    },
  ];

  return (
    <AdminLayout
      title="Command Post"
      description="The Truekin at-a-glance — every order, every drop, watched over."
      action={
        <div className="admin-dashboard-actions" style={{ display: 'flex', gap: 10 }}>
          <Link to="/admin/orders" className="btn btn-secondary btn-sm">
            View orders <ArrowRight size={14} />
          </Link>
          <Link to="/admin/products/new" className="btn btn-primary btn-sm">
            <PlusCircle size={15} /> New Drop
          </Link>
        </div>
      }
    >
      {/* Stats */}
      <div
        className="admin-stats-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          marginBottom: 28,
        }}
      >
        {statCards.map((s, i) => (
          <div
            key={i}
            className="card card-hover admin-stat-card"
            style={{
              padding: 22,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: 18,
            }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: `${s.accent}15`,
                color: s.accent,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <s.icon size={19} />
              </div>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--success)',
                background: 'var(--success-soft)',
                padding: '3px 8px',
                borderRadius: 6,
              }}>
                <TrendingUp size={11} /> Live
              </span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>{s.label}</p>
            <p style={{
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: '-0.02em',
              marginTop: 4,
              lineHeight: 1.1,
            }}>
              {s.value}
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="admin-quick-grid">
        {[
          { to: '/admin/products', icon: Shirt, label: 'Manage Drops', sub: 'Edit designs and inventory' },
          { to: '/admin/products/new', icon: PlusCircle, label: 'Design a New Tee', sub: 'Launch the 2D or 3D editor' },
          { to: '/admin/orders', icon: ClipboardList, label: 'Fulfill Orders', sub: 'Print, label, and send with care' },
        ].map((a) => (
          <Link
            key={a.to}
            to={a.to}
            className="card card-hover admin-quick-action"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              textDecoration: 'none',
              padding: 18,
            }}
          >
            <div className="admin-quick-icon" style={{
              width: 44,
              height: 44,
              borderRadius: 11,
              background: 'var(--ink)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <a.icon size={19} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 700 }}>{a.label}</p>
              <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>{a.sub}</p>
            </div>
            <ArrowUpRight size={18} color="var(--text-muted)" />
          </Link>
        ))}
      </div>

      {/* Recent orders */}
      <div className="card admin-recent-orders" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="admin-recent-orders-head" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 24px',
          borderBottom: '1px solid var(--border)',
        }}>
          <div>
            <h3 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 22,
              fontWeight: 400,
              letterSpacing: '0.03em',
              textTransform: 'uppercase',
              lineHeight: 1,
            }}>Recent Orders</h3>
            <p style={{
              fontFamily: 'var(--font-secondary)',
              fontSize: 11,
              color: 'var(--text-muted)',
              marginTop: 6,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}>Latest transactions across Truekin</p>
          </div>
          <Link to="/admin/orders" style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}>
            View all <ArrowRight size={14} />
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
            <Package size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
            <p style={{ fontWeight: 500 }}>No orders yet</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>Your first order will appear here.</p>
          </div>
        ) : (
          <div className="table-wrap admin-mobile-table admin-dashboard-orders-table">
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order._id}>
                    <td data-label="Order">
                      <Link
                        to={`/admin/orders/${order._id}`}
                        style={{ fontWeight: 600, color: 'var(--text)' }}
                        className="mono"
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
                    <td data-label="Total" style={{ fontWeight: 700 }}>
                      ${(order.totalAmount / 100).toFixed(2)}
                    </td>
                    <td data-label="Status">
                      <span className={`badge ${statusBadge[order.status] || 'badge-gray'}`}>
                        {order.status}
                      </span>
                    </td>
                    <td data-label="Date" style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: 13 }}>
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
