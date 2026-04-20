import { useState, useEffect } from 'react';
import { Package } from 'lucide-react';
import { api } from '../api/client';

const statusBadge = {
  pending: 'badge-gray',
  paid: 'badge-success',
  processing: 'badge-info',
  shipped: 'badge-info',
  delivered: 'badge-success',
  cancelled: 'badge-danger',
};

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getMyOrders()
      .then((d) => setOrders(d.orders))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-page"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 800 }}>
        <div className="page-header">
          <h1>My Orders</h1>
        </div>

        {orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)' }}>
            <Package size={48} color="#d1d5db" />
            <p style={{ marginTop: 12 }}>No orders yet.</p>
          </div>
        ) : (
          orders.map((order) => (
            <div key={order._id} className="card" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>ID: {order._id}</p>
                </div>
                <span className={`badge ${statusBadge[order.status] || 'badge-gray'}`}>
                  {order.status}
                </span>
              </div>

              {order.items.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 14 }}>
                  <span>{item.title} x{item.quantity}</span>
                  <span style={{ fontWeight: 500 }}>${((item.price * item.quantity) / 100).toFixed(2)}</span>
                </div>
              ))}

              <div style={{ borderTop: '1px solid var(--border)', marginTop: 12, paddingTop: 12, display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                <span>Total</span>
                <span>${(order.totalAmount / 100).toFixed(2)}</span>
              </div>

              {order.shippoTrackingNumber && (
                <p style={{ fontSize: 13, marginTop: 8 }}>
                  Tracking: <a href={order.shippoTrackingUrl} target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>
                    {order.shippoTrackingNumber}
                  </a>
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
