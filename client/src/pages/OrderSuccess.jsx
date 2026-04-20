import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, Package } from 'lucide-react';
import { api } from '../api/client';
import { useCartStore } from '../store/cartStore';

export default function OrderSuccess() {
  const [searchParams] = useSearchParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const clearCart = useCartStore((s) => s.clearCart);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (sessionId) {
      api.getOrderBySession(sessionId)
        .then((d) => {
          setOrder(d.order);
          clearCart();
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [searchParams, clearCart]);

  if (loading) return <div className="loading-page"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 600, textAlign: 'center' }}>
        <CheckCircle size={64} color="var(--success)" style={{ marginBottom: 20 }} />
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Order Confirmed!</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 32, fontSize: 16 }}>
          Thank you for your purchase. You'll receive a confirmation email shortly.
        </p>

        {order && (
          <div className="card" style={{ textAlign: 'left', marginBottom: 32 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Package size={18} /> Order Details
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
              Order ID: {order._id}
            </p>

            {order.items.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 500 }}>{item.title}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    Qty: {item.quantity}
                    {item.shirtStyle && <> · {item.shirtStyle === 'womens' ? "Women's" : "Men's"}</>}
                    {item.size && <> · Size: {item.size}</>}
                    {item.color && (
                      <>
                        {' · '}
                        <span style={{
                          display: 'inline-block',
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: item.color,
                          border: '1px solid #ccc',
                          verticalAlign: 'middle',
                          marginRight: 2,
                        }} />
                        {item.color}
                      </>
                    )}
                  </p>
                </div>
                <span style={{ fontWeight: 600 }}>${((item.price * item.quantity) / 100).toFixed(2)}</span>
              </div>
            ))}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, fontWeight: 700, fontSize: 16 }}>
              <span>Total</span>
              <span>${(order.totalAmount / 100).toFixed(2)}</span>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <Link to="/shop" className="btn btn-primary">Continue Shopping</Link>
          <Link to="/my-orders" className="btn btn-secondary">View My Orders</Link>
        </div>
      </div>
    </div>
  );
}
