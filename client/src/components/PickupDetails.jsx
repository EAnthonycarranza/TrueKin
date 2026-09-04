import { MapPin, Clock, Navigation, ClipboardList, UserRound, Mail } from 'lucide-react';
import { pickupContact } from '../utils/fulfillment';

export function PickupCoordinator({ location }) {
  // Per-location contact when the admin has set one, otherwise the shop default.
  const contact = pickupContact(location);
  return <div className="pickup-coordinator"><UserRound size={20} /><div><strong>Coordinate with {contact.name}</strong><p>Arrange pickup and payment before coming.</p><a href={`mailto:${contact.email}`}>{contact.email}</a></div></div>;
}

export function PickupLocationDetails({ location, directions = true }) {
  if (!location) return null;
  const address = [location.street, location.city, location.state, location.zip, location.country].filter(Boolean).join(', ');
  return (
    <div className="pickup-location-details">
      <p className="pickup-detail-line"><MapPin size={17} /><span>{location.street}<br />{location.city}, {location.state} {location.zip}{location.country && location.country !== 'US' ? ` · ${location.country}` : ''}</span></p>
      {location.hours && <p className="pickup-detail-line"><Clock size={17} /><span className="pickup-text">{location.hours}</span></p>}
      {location.contactPerson && <p className="pickup-detail-line"><UserRound size={17} /><span className="pickup-text">Ask for {location.contactPerson}</span></p>}
      {location.contactEmail && <p className="pickup-detail-line"><Mail size={17} /><a href={`mailto:${location.contactEmail}`}>{location.contactEmail}</a></p>}
      {location.instructions && <div className="pickup-instructions"><strong>Pickup instructions</strong><p className="pickup-text">{location.instructions}</p></div>}
      {directions && <a className="pickup-directions" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`} target="_blank" rel="noreferrer"><Navigation size={14} /> Get directions</a>}
    </div>
  );
}

export default function PickupDetails({ order }) {
  if (order.fulfillmentMethod !== 'pickup' || !order.pickup) return null;
  const pickup = order.pickup;
  const message = order.status === 'picked_up' ? 'Your order has been picked up. Thank you!'
    : order.status === 'ready_for_pickup' ? 'Your order is ready. Bring your order number when you collect it.'
    : order.status === 'cancelled' ? 'This order is cancelled. Please do not travel to collect it.'
    : order.status === 'pending' && order.paymentMethod !== 'pay_on_pickup' ? 'Payment is pending. Pickup preparation starts after payment is confirmed.'
    : 'We’re preparing your order. Check your order status and wait until it says “Ready for pickup” before coming.';
  return (
    <section className="pickup-order-details" aria-label="Pickup details">
      <div className="pickup-section-heading"><MapPin size={19} /><h3>Pickup at {pickup.name}</h3><span className="badge badge-success">Free</span></div>
      <p className={`pickup-status-note ${order.status === 'ready_for_pickup' ? 'is-ready' : ''}`}>{message}</p>
      <PickupLocationDetails location={pickup} />
      <PickupCoordinator location={pickup} />
      {order.paymentMethod === 'pay_on_pickup' && <p className="pickup-status-note"><strong>{order.status === 'cancelled' ? 'Order cancelled' : order.paymentStatus === 'paid' ? 'Payment collected' : `$${(order.totalAmount / 100).toFixed(2)} due at pickup`}</strong>{order.status !== 'cancelled' && order.paymentStatus !== 'paid' && ' · No online payment required.'}</p>}
      <p className="pickup-contact"><strong>Collecting under:</strong> {pickup.contactName}</p>
      {pickup.orderInstructions && <div className="pickup-instructions"><strong><ClipboardList size={14} /> Instructions for your order</strong><p className="pickup-text">{pickup.orderInstructions}</p></div>}
      {pickup.customerInstructions && <div className="pickup-instructions"><strong>Your pickup notes</strong><p className="pickup-text">{pickup.customerInstructions}</p></div>}
    </section>
  );
}
