import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { CreditCard, Truck, Loader, MapPin, Banknote, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../api/client';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { PickupLocationDetails, PickupCoordinator } from '../components/PickupDetails';
import { pickupContact } from '../utils/fulfillment';

export default function Checkout() {
  const items = useCartStore((state) => state.items);
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadingRates, setLoadingRates] = useState(false);
  const [rates, setRates] = useState([]);
  const [selectedRate, setSelectedRate] = useState(null);
  const [method, setMethod] = useState('shipping');
  const [paymentMethod, setPaymentMethod] = useState('pay_on_pickup');
  const [locations, setLocations] = useState([]);
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [locationsError, setLocationsError] = useState('');
  const [locationId, setLocationId] = useState('');
  const [notes, setNotes] = useState('');
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '', street: '', city: '', state: '', zip: '', country: 'US' });
  const rateRequest = useRef(0);
  const checkoutForm = useRef(null);
  const isPickup = method === 'pickup';
  const deferredPayment = isPickup && paymentMethod === 'pay_on_pickup';
  const selectedLocation = locations.find((location) => location._id === locationId);
  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingCost = isPickup ? 0 : (selectedRate?.amount || 0);

  useEffect(() => {
    let ignore = false;
    api.getPickupLocations().then((data) => { if (!ignore) setLocations(data.locations); })
      .catch(() => { if (!ignore) setLocationsError('Pickup locations couldn’t be loaded. Please refresh to try again.'); })
      .finally(() => { if (!ignore) setLocationsLoading(false); });
    return () => { ignore = true; };
  }, []);

  const handleChange = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
    rateRequest.current += 1;
    setRates([]);
    setSelectedRate(null);
    setLoadingRates(false);
  };

  const fetchRates = async () => {
    if (!checkoutForm.current.reportValidity()) return;
    const requestId = ++rateRequest.current;
    setLoadingRates(true);
    try {
      const { rates: fetchedRates } = await api.getShippingRates({ address: form });
      if (requestId !== rateRequest.current) return;
      setRates(fetchedRates);
      setSelectedRate(fetchedRates[0] || null);
      if (!fetchedRates.length) toast.error('No shipping rates found for this address');
    } catch (err) { if (requestId === rateRequest.current) toast.error(err.message || 'Could not fetch shipping rates'); }
    finally { if (requestId === rateRequest.current) setLoadingRates(false); }
  };

  const handleCheckout = async (event) => {
    event.preventDefault();
    if (loading) return;
    if (isPickup && !selectedLocation) { toast.error('Please choose a pickup location'); return; }
    if (!isPickup && !selectedRate) { toast.error('Please get and select a shipping rate'); return; }
    setLoading(true);
    try {
      const result = await api.createCheckoutSession({
        items: items.map((item) => ({ productId: item.productId, quantity: item.quantity, color: item.color || null, size: item.size || null, shirtStyle: item.shirtStyle || 'unisex' })),
        fulfillmentMethod: method,
        paymentMethod: deferredPayment ? 'pay_on_pickup' : 'card',
        shippingAddress: isPickup ? undefined : form,
        pickup: isPickup ? { locationId, contactName: form.name, customerInstructions: notes } : undefined,
        guestEmail: !user ? form.email : undefined,
        shippingRate: isPickup ? undefined : selectedRate,
      });
      if (result.order) {
        const params = new URLSearchParams({ order: result.order._id, email: user?.email || form.email });
        navigate(`/order-success?${params}`);
      } else { window.location.href = result.url; }
    } catch (err) { toast.error(err.message || 'Checkout failed'); setLoading(false); }
  };

  if (items.length === 0) return <Navigate to="/cart" replace />;

  return <div className="page checkout-page"><div className="container checkout-container" style={{ maxWidth: 1080 }}>
    <div className="page-header"><span className="seal">Made for the kin</span><h1 style={{ marginTop: 16 }}>Make it yours.</h1><p className="text-secondary">Your tees. Your way to get them.</p></div>
    <form ref={checkoutForm} onSubmit={handleCheckout}>
      <fieldset disabled={loading} className="pickup-fieldset">
        <div className="checkout-layout">
          <div className="checkout-form-column">
            <section className="card checkout-card"><h2 className="checkout-section-title"><span>01</span> How will you get your order?</h2>
              <div className="fulfillment-options">
                <label className={`fulfillment-option ${!isPickup ? 'is-selected' : ''}`}><input type="radio" name="fulfillment" value="shipping" checked={!isPickup} onChange={() => setMethod('shipping')} /><Truck size={23} /><strong>Ship to me</strong><small>Delivered to your door</small></label>
                <label className={`fulfillment-option ${isPickup ? 'is-selected' : ''}`}><input type="radio" name="fulfillment" value="pickup" checked={isPickup} onChange={() => setMethod('pickup')} /><MapPin size={23} /><strong>Pick it up</strong><small>Free · Pay now or at pickup</small></label>
              </div>
            </section>
            <section className="card checkout-card"><h2 className="checkout-section-title"><span>02</span> {isPickup ? 'Your pickup details' : 'Contact & shipping address'}</h2>
              {!user && <div className="form-group"><label htmlFor="checkout-email">Email address</label><input id="checkout-email" className="input" type="email" required autoComplete="email" name="email" maxLength={254} value={form.email} onChange={handleChange} placeholder="you@example.com" /></div>}
              <div className="form-group"><label htmlFor="checkout-name">{isPickup ? 'Name for pickup' : 'Full name'}</label><input id="checkout-name" className="input" required maxLength={120} autoComplete="name" name="name" value={form.name} onChange={handleChange} placeholder="First and last name" /></div>
              {isPickup ? <>
                <div className="form-group"><label htmlFor="pickup-location">Pickup location</label><select id="pickup-location" className="input" required value={locationId} onChange={(e) => setLocationId(e.target.value)} disabled={locationsLoading || !locations.length}><option value="">{locationsLoading ? 'Loading locations…' : 'Choose a pickup location'}</option>{locations.map((location) => <option key={location._id} value={location._id}>{location.name} — {location.city}</option>)}</select></div>
                {locationsError ? <p role="alert" className="pickup-status-note">{locationsError} <button type="button" className="btn btn-secondary btn-sm" onClick={() => window.location.reload()}>Refresh</button></p> : !locationsLoading && !locations.length ? <p className="pickup-status-note">No pickup locations are available right now. Please choose shipping.</p> : null}
                {selectedLocation && <div className="checkout-location-preview"><h3>{selectedLocation.name}</h3><PickupLocationDetails location={selectedLocation} /></div>}
                <PickupCoordinator location={selectedLocation} />
                <div className="form-group"><label htmlFor="pickup-notes">Pickup notes <span className="text-muted">(optional)</span></label><textarea id="pickup-notes" className="input" rows={3} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={`Contact number, who’s collecting, or anything ${pickupContact(selectedLocation).name.split(' ')[0]} should know.`} /><p className="pickup-help">Requests and pickup times should be confirmed with {pickupContact(selectedLocation).name}.</p></div>
              </> : <>
                <div className="form-group"><label htmlFor="checkout-street">Street address</label><input id="checkout-street" className="input" required maxLength={200} autoComplete="address-line1" name="street" value={form.street} onChange={handleChange} placeholder="Street and apartment number" /></div>
                <div className="checkout-address-row">{[['city', 'City', 'address-level2'], ['state', 'State', 'address-level1'], ['zip', 'ZIP code', 'postal-code']].map(([name, label, autoComplete]) => <div className="form-group" key={name}><label htmlFor={`checkout-${name}`}>{label}</label><input id={`checkout-${name}`} className="input" required autoComplete={autoComplete} maxLength={name === 'state' ? 2 : 100} name={name} value={form[name]} onChange={handleChange} /></div>)}</div>
                <button type="button" className="btn btn-secondary" onClick={fetchRates} disabled={loadingRates}>{loadingRates ? <><Loader size={14} className="spin" /> Calculating…</> : 'Get shipping rates'}</button>
                {rates.length > 0 && <div className="checkout-rates">{rates.map((rate) => <label key={rate.rateId} className={`checkout-rate ${selectedRate?.rateId === rate.rateId ? 'is-selected' : ''}`}><input type="radio" name="rate" checked={selectedRate?.rateId === rate.rateId} onChange={() => setSelectedRate(rate)} /><span><strong>{rate.carrier} · {rate.service}</strong>{rate.estimatedDays && <small>Est. {rate.estimatedDays} business days</small>}</span><strong>${rate.amount.toFixed(2)}</strong></label>)}</div>}
              </>}
            </section>
            {isPickup && <section className="card checkout-card"><h2 className="checkout-section-title"><span>03</span> When would you like to pay?</h2><div className="fulfillment-options">
              <label className={`fulfillment-option ${deferredPayment ? 'is-selected' : ''}`}><input type="radio" name="payment" checked={deferredPayment} onChange={() => setPaymentMethod('pay_on_pickup')} /><Banknote size={23} /><strong>Pay at pickup</strong><small>Arrange payment with {pickupContact(selectedLocation).name}</small></label>
              <label className={`fulfillment-option ${!deferredPayment ? 'is-selected' : ''}`}><input type="radio" name="payment" checked={!deferredPayment} onChange={() => setPaymentMethod('card')} /><CreditCard size={23} /><strong>Pay now</strong><small>Secure card payment with Stripe</small></label>
            </div></section>}
          </div>
          <aside className="checkout-summary-column"><div className="card checkout-card checkout-summary"><h2 className="checkout-section-title">Your order</h2>{items.map((item, i) => <div key={i} className="checkout-summary-item"><div><strong>{item.title}</strong><small>Qty {item.quantity}{item.size ? ` · ${item.size}` : ''} · Unisex</small></div><span>${((item.price * item.quantity) / 100).toFixed(2)}</span></div>)}
            <div className="checkout-totals"><div><span>Subtotal</span><span>${(totalPrice / 100).toFixed(2)}</span></div><div><span>{isPickup ? 'Local pickup' : 'Shipping'}</span><span>{isPickup ? 'Free' : selectedRate ? `$${shippingCost.toFixed(2)}` : 'Select a rate'}</span></div><div className="checkout-total"><span>Total</span><span>${(totalPrice / 100 + shippingCost).toFixed(2)}</span></div></div>
            {isPickup && selectedLocation && <p className="pickup-summary-location"><MapPin size={16} /> {selectedLocation.name}</p>}
            {deferredPayment && <div className="pickup-payment-summary"><div><span>Due today</span><strong>$0.00</strong></div><p>${(totalPrice / 100).toFixed(2)} due when you pick up. Coordinate pickup and payment with {pickupContact(selectedLocation).name}.</p></div>}
            <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 20 }} disabled={loading || (isPickup && !selectedLocation)}>{loading ? <><Loader size={16} className="spin" /> Placing order…</> : deferredPayment ? <>Place pickup order <ArrowRight size={18} /></> : <><CreditCard size={18} /> Pay with Stripe</>}</button>
            <p className="pickup-help text-center">{deferredPayment ? 'No online payment required.' : 'You’ll continue to Stripe’s secure checkout.'}</p><Link to="/cart" className="checkout-back-link">Back to bag</Link>
          </div></aside>
        </div>
      </fieldset>
    </form>
  </div></div>;
}
