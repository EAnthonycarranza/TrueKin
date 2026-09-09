/**
 * Checkout — pickup only.
 *
 * Truekin hands every storefront order over in person, so there is no
 * fulfilment choice to make here and no address to collect: the customer tells
 * us who is collecting, optionally which spot suits them, and whether they want
 * to pay now or when they arrive.
 *
 * The server still understands shipping (an admin can ship an order by hand
 * from the order console, and older orders were shipped), which is why the
 * request below states `fulfillmentMethod: 'pickup'` explicitly rather than
 * leaning on a default.
 */
import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { CreditCard, Loader, MapPin, Banknote, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../api/client';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { PickupLocationDetails, PickupCoordinator } from '../components/PickupDetails';

export default function Checkout() {
  const items = useCartStore((state) => state.items);
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('pay_on_pickup');
  const [locations, setLocations] = useState([]);
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [locationsError, setLocationsError] = useState('');
  const [locationId, setLocationId] = useState('');
  const [notes, setNotes] = useState('');
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '' });
  const checkoutForm = useRef(null);
  const deferredPayment = paymentMethod === 'pay_on_pickup';
  const selectedLocation = locations.find((location) => location._id === locationId);
  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  useEffect(() => {
    let ignore = false;
    api.getPickupLocations().then((data) => { if (!ignore) setLocations(data.locations); })
      .catch(() => { if (!ignore) setLocationsError('Pickup spots couldn’t be loaded. Please refresh to try again.'); })
      .finally(() => { if (!ignore) setLocationsLoading(false); });
    return () => { ignore = true; };
  }, []);

  const handleChange = (event) => setForm({ ...form, [event.target.name]: event.target.value });

  const handleCheckout = async (event) => {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const result = await api.createCheckoutSession({
        items: items.map((item) => ({ productId: item.productId, quantity: item.quantity, color: item.color || null, size: item.size || null, shirtStyle: item.shirtStyle || 'unisex' })),
        fulfillmentMethod: 'pickup',
        paymentMethod: deferredPayment ? 'pay_on_pickup' : 'card',
        pickup: { locationId, contactName: form.name, customerInstructions: notes },
        guestEmail: !user ? form.email : undefined,
      });
      if (result.order) {
        const params = new URLSearchParams({ order: result.order._id, email: user?.email || form.email });
        navigate(`/order-success?${params}`);
      } else { window.location.href = result.url; }
    } catch (err) { toast.error(err.message || 'Checkout failed'); setLoading(false); }
  };

  if (items.length === 0) return <Navigate to="/cart" replace />;

  return <div className="page checkout-page"><div className="container checkout-container" style={{ maxWidth: 1080 }}>
    <div className="page-header"><span className="seal"><MapPin size={14} /> Local pickup</span><h1 style={{ marginTop: 16 }}>Make it yours.</h1><p className="text-secondary">Every Truekin order is collected in person — free, and we’ll arrange the handoff with you.</p></div>
    <form ref={checkoutForm} onSubmit={handleCheckout}>
      <fieldset disabled={loading} className="pickup-fieldset">
        <div className="checkout-layout">
          <div className="checkout-form-column">
            <section className="card checkout-card"><h2 className="checkout-section-title"><span>01</span> Who’s collecting?</h2>
              {!user && <div className="form-group"><label htmlFor="checkout-email">Email address</label><input id="checkout-email" className="input" type="email" required autoComplete="email" name="email" maxLength={254} value={form.email} onChange={handleChange} placeholder="you@example.com" /><p className="pickup-help">This is where your confirmation and your “ready for pickup” email go.</p></div>}
              <div className="form-group"><label htmlFor="checkout-name">Name for pickup</label><input id="checkout-name" className="input" required maxLength={120} autoComplete="name" name="name" value={form.name} onChange={handleChange} placeholder="First and last name" /></div>
              {(locationsLoading || locations.length > 0) && <div className="form-group"><label htmlFor="pickup-location">Preferred pickup spot <span className="text-muted">(optional)</span></label><select id="pickup-location" className="input" value={locationId} onChange={(e) => setLocationId(e.target.value)} disabled={locationsLoading}><option value="">{locationsLoading ? 'Loading spots…' : 'No preference — we’ll coordinate with you'}</option>{locations.map((location) => <option key={location._id} value={location._id}>{location.name} — {location.city}</option>)}</select></div>}
              {locationsError && <p role="alert" className="pickup-status-note">{locationsError} <button type="button" className="btn btn-secondary btn-sm" onClick={() => window.location.reload()}>Refresh</button></p>}
              {selectedLocation && <div className="checkout-location-preview"><h3>{selectedLocation.name}</h3><PickupLocationDetails location={selectedLocation} /></div>}
              <PickupCoordinator location={selectedLocation} />
              <div className="form-group"><label htmlFor="pickup-notes">Anything we should know? <span className="text-muted">(optional)</span></label><textarea id="pickup-notes" className="input" rows={3} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="A contact number, who else might collect it, days or areas that suit you — anything that makes the handoff easier." /><p className="pickup-help">We’ll confirm the spot and a time with you once your order is in.</p></div>
            </section>
            <section className="card checkout-card"><h2 className="checkout-section-title"><span>02</span> When would you like to pay?</h2><div className="fulfillment-options">
              <label className={`fulfillment-option ${deferredPayment ? 'is-selected' : ''}`}><input type="radio" name="payment" checked={deferredPayment} onChange={() => setPaymentMethod('pay_on_pickup')} /><Banknote size={23} /><strong>Pay at pickup</strong><small>Nothing due today — we’ll arrange payment with you</small></label>
              <label className={`fulfillment-option ${!deferredPayment ? 'is-selected' : ''}`}><input type="radio" name="payment" checked={!deferredPayment} onChange={() => setPaymentMethod('card')} /><CreditCard size={23} /><strong>Pay now</strong><small>Secure card payment with Stripe</small></label>
            </div></section>
          </div>
          <aside className="checkout-summary-column"><div className="card checkout-card checkout-summary"><h2 className="checkout-section-title">Your order</h2>{items.map((item, i) => <div key={i} className="checkout-summary-item"><div><strong>{item.title}</strong><small>Qty {item.quantity}{item.size ? ` · ${item.size}` : ''} · Unisex</small></div><span>${((item.price * item.quantity) / 100).toFixed(2)}</span></div>)}
            <div className="checkout-totals"><div><span>Subtotal</span><span>${(totalPrice / 100).toFixed(2)}</span></div><div><span>Local pickup</span><span>Free</span></div><div className="checkout-total"><span>Total</span><span>${(totalPrice / 100).toFixed(2)}</span></div></div>
            {selectedLocation && <p className="pickup-summary-location"><MapPin size={16} /> {selectedLocation.name}</p>}
            {deferredPayment && <div className="pickup-payment-summary"><div><span>Due today</span><strong>$0.00</strong></div><p>${(totalPrice / 100).toFixed(2)} due when you collect your order. We’ll coordinate the pickup spot, timing, and payment with you.</p></div>}
            <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 20 }} disabled={loading}>{loading ? <><Loader size={16} className="spin" /> Placing order…</> : deferredPayment ? <>Place pickup order <ArrowRight size={18} /></> : <><CreditCard size={18} /> Pay with Stripe</>}</button>
            <p className="pickup-help text-center">{deferredPayment ? 'No online payment required.' : 'You’ll continue to Stripe’s secure checkout.'}</p><Link to="/cart" className="checkout-back-link">Back to bag</Link>
          </div></aside>
        </div>
      </fieldset>
    </form>
  </div></div>;
}
