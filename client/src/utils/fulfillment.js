export const statusLabel = (status) => ({ ready_for_pickup: 'Ready for pickup', picked_up: 'Picked up' }[status] || status);
export const pickupPaymentDue = (order) => order.paymentMethod === 'pay_on_pickup' && order.paymentStatus !== 'paid' && order.status !== 'cancelled';

/** Used when a location leaves the contact blank, so pickups always name someone. */
export const DEFAULT_PICKUP_CONTACT = { name: 'Tone Velez', email: 'Admin@Truking.com' };

/**
 * Resolve who a customer coordinates a pickup with, falling back to the shop
 * default. Accepts either a PickupLocation or an order's saved pickup snapshot.
 * Mirrors pickupContact() in server/utils/fulfillment.js.
 */
export const pickupContact = (location) => ({
  name: (location?.contactPerson || '').trim() || DEFAULT_PICKUP_CONTACT.name,
  email: (location?.contactEmail || '').trim() || DEFAULT_PICKUP_CONTACT.email,
});
