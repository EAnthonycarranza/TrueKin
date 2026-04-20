import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Truck, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../api/client';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';

export default function Checkout() {
  const { items, clearCart } = useCartStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadingRates, setLoadingRates] = useState(false);
  const [rates, setRates] = useState([]);
  const [selectedRate, setSelectedRate] = useState(null);

  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    street: '',
    city: '',
    state: '',
    zip: '',
    country: 'US',
  });

  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const fetchRates = async () => {
    if (!form.street || !form.city || !form.state || !form.zip) {
      toast.error('Please fill in your shipping address');
      return;
    }
    setLoadingRates(true);
    try {
      const { rates: fetchedRates } = await api.getShippingRates({
        address: {
          name: form.name,
          street: form.street,
          city: form.city,
          state: form.state,
          zip: form.zip,
          country: form.country,
        },
      });
      setRates(fetchedRates);
      if (fetchedRates.length > 0) {
        setSelectedRate(fetchedRates[0]);
      }
    } catch (err) {
      toast.error('Could not fetch shipping rates');
    } finally {
      setLoadingRates(false);
    }
  };

  const handleCheckout = async () => {
    if (!form.name || !form.street || !form.city || !form.state || !form.zip) {
      toast.error('Please fill in all address fields');
      return;
    }
    if (!user && !form.email) {
      toast.error('Please enter your email');
      return;
    }

    setLoading(true);
    try {
      const { url } = await api.createCheckoutSession({
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          color: item.color || null,
          size: item.size || null,
          shirtStyle: item.shirtStyle || 'mens',
        })),
        shippingAddress: {
          name: form.name,
          street: form.street,
          city: form.city,
          state: form.state,
          zip: form.zip,
          country: form.country,
        },
        guestEmail: !user ? form.email : undefined,
        shippingRate: selectedRate
          ? {
              rateId: selectedRate.rateId,
              carrier: selectedRate.carrier,
              service: selectedRate.service,
              serviceToken: selectedRate.serviceToken,
              amount: selectedRate.amount,
              currency: selectedRate.currency,
              estimatedDays: selectedRate.estimatedDays,
            }
          : undefined,
      });

      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch (err) {
      toast.error(err.message || 'Checkout failed');
      setLoading(false);
    }
  };

  if (items.length === 0) {
    navigate('/cart');
    return null;
  }

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 900 }}>
        <div className="page-header">
          <h1>Checkout</h1>
        </div>

        <div style={styles.layout}>
          {/* Form */}
          <div>
            <div className="card" style={{ marginBottom: 24 }}>
              <h3 style={styles.sectionTitle}>
                <Truck size={18} /> Shipping Address
              </h3>

              {!user && (
                <div className="form-group">
                  <label>Email</label>
                  <input className="input" name="email" value={form.email} onChange={handleChange} placeholder="your@email.com" />
                </div>
              )}

              <div className="form-group">
                <label>Full Name</label>
                <input className="input" name="name" value={form.name} onChange={handleChange} placeholder="John Doe" />
              </div>

              <div className="form-group">
                <label>Street Address</label>
                <input className="input" name="street" value={form.street} onChange={handleChange} placeholder="123 Main St" />
              </div>

              <div style={styles.row}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>City</label>
                  <input className="input" name="city" value={form.city} onChange={handleChange} placeholder="City" />
                </div>
                <div className="form-group" style={{ width: 100 }}>
                  <label>State</label>
                  <input className="input" name="state" value={form.state} onChange={handleChange} placeholder="CA" />
                </div>
                <div className="form-group" style={{ width: 120 }}>
                  <label>ZIP Code</label>
                  <input className="input" name="zip" value={form.zip} onChange={handleChange} placeholder="94105" />
                </div>
              </div>

              <button className="btn btn-secondary" onClick={fetchRates} disabled={loadingRates} style={{ marginTop: 8 }}>
                {loadingRates ? <><Loader size={14} className="spin" /> Calculating...</> : 'Get Shipping Rates'}
              </button>
            </div>

            {/* Shipping Rates */}
            {rates.length > 0 && (
              <div className="card" style={{ marginBottom: 24 }}>
                <h3 style={styles.sectionTitle}>Shipping Options</h3>
                {rates.map((rate, i) => (
                  <label key={i} style={{
                    ...styles.rateOption,
                    border: selectedRate?.rateId === rate.rateId ? '2px solid var(--accent)' : '1px solid var(--border)',
                  }}>
                    <input
                      type="radio"
                      name="rate"
                      checked={selectedRate?.rateId === rate.rateId}
                      onChange={() => setSelectedRate(rate)}
                    />
                    <div style={{ flex: 1 }}>
                      <strong>{rate.carrier} - {rate.service}</strong>
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                        Est. {rate.estimatedDays} days
                      </p>
                    </div>
                    <span style={{ fontWeight: 600 }}>${rate.amount.toFixed(2)}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div>
            <div className="card" style={{ position: 'sticky', top: 96 }}>
              <h3 style={styles.sectionTitle}>Order Summary</h3>
              {items.map((item, i) => (
                <div key={i} style={styles.summaryItem}>
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
                  <span style={{ fontWeight: 600 }}>
                    ${((item.price * item.quantity) / 100).toFixed(2)}
                  </span>
                </div>
              ))}

              <div style={styles.divider} />

              <div style={styles.summaryRow}>
                <span>Subtotal</span>
                <span>${(totalPrice / 100).toFixed(2)}</span>
              </div>
              {selectedRate && (
                <div style={styles.summaryRow}>
                  <span>Shipping</span>
                  <span>${selectedRate.amount.toFixed(2)}</span>
                </div>
              )}
              <div style={{ ...styles.summaryRow, fontWeight: 700, fontSize: 18, marginTop: 8 }}>
                <span>Total</span>
                <span>${((totalPrice / 100) + (selectedRate?.amount || 0)).toFixed(2)}</span>
              </div>

              <button
                className="btn btn-primary btn-lg"
                style={{ width: '100%', marginTop: 20 }}
                onClick={handleCheckout}
                disabled={loading}
              >
                {loading ? (
                  <><Loader size={16} /> Processing...</>
                ) : (
                  <><CreditCard size={18} /> Pay with Stripe</>
                )}
              </button>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center', marginTop: 8 }}>
                You'll be redirected to Stripe's secure checkout
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  layout: { display: 'grid', gridTemplateColumns: '1fr 380px', gap: 32, alignItems: 'start' },
  sectionTitle: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 600, marginBottom: 20 },
  row: { display: 'flex', gap: 12 },
  rateOption: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 'var(--radius)',
    cursor: 'pointer',
    marginBottom: 8,
  },
  summaryItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 0',
    borderBottom: '1px solid var(--border)',
  },
  divider: { height: 1, background: 'var(--border)', margin: '12px 0' },
  summaryRow: { display: 'flex', justifyContent: 'space-between', padding: '4px 0' },
};
