import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, Package } from 'lucide-react';
import PickupDetails from '../components/PickupDetails';
import { pickupPaymentDue, pickupContact } from '../utils/fulfillment';
import { api } from '../api/client';
import { useCartStore } from '../store/cartStore';

export default function OrderSuccess() {
  const [searchParams] = useSearchParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const clearCart = useCartStore((s) => s.clearCart);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    const orderId = searchParams.get('order');
    const email = searchParams.get('email');
    const request = sessionId ? api.getOrderBySession(sessionId) : orderId && email ? api.trackOrders({ orderId, email }) : null;
    if (request) {
      request.then((d) => {
        setOrder(d.order);
        if (d.order.paymentMethod === 'pay_on_pickup' || d.order.status !== 'pending') clearCart();
      }).catch(() => {}).finally(() => setLoading(false));
    } else { setLoading(false); }
  }, [searchParams, clearCart]);

  if (loading) return <div className="loading-page"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 600, textAlign: 'center' }}>
        <CheckCircle size={64} color="var(--success)" style={{ marginBottom: 20 }} />
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>{!order ? 'Check your order' : order.status === 'pending' && order.paymentMethod !== 'pay_on_pickup' ? 'Confirming payment…' : 'Order Confirmed!'}</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 32, fontSize: 16 }}>
          {pickupPaymentDue(order || {}) ? `Your pickup order is placed. Pay when you collect it and coordinate with ${pickupContact(order?.pickup).name} at ${pickupContact(order?.pickup).email}.` : order ? 'Thank you for your order. View your latest status and details below.' : 'We couldn’t load your confirmation. Use Track Your Order to look it up.'}
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
                    {item.shirtStyle && <> · Unisex</>}
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

        {order?.fulfillmentMethod === 'pickup' && <div className="card" style={{ marginBottom: 24 }}><PickupDetails order={order} /></div>}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/shop" className="btn btn-primary">Continue Shopping</Link>
          <Link to={order ? `/track?${new URLSearchParams({ order: order._id, email: searchParams.get('email') || order.guestEmail || order.user?.email || '' })}` : '/track'} className="btn btn-secondary">Track Your Order</Link>
        </div>
      </div>
    </div>
  );
}
