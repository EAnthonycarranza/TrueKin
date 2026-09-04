// NB: `contactPerson` is the shop-side person a customer coordinates pickup
// with. It is deliberately NOT called `contactName`, which already exists on
// Order.pickup and means the *customer* collecting the order. Order.pickup
// spreads these same fields, so the two would collide under one name.
const locationFields = ['name', 'street', 'city', 'state', 'zip', 'country', 'hours', 'instructions', 'contactPerson', 'contactEmail'];
const limits = { name: 120, street: 200, city: 100, state: 100, zip: 20, country: 2, hours: 500, instructions: 2000, contactPerson: 120, contactEmail: 200 };

/** Fields a location may leave blank; everything else is required. */
const optionalLocationFields = ['hours', 'instructions', 'contactPerson', 'contactEmail'];

/** Used when a location leaves the contact blank, so pickups always name someone. */
const DEFAULT_PICKUP_CONTACT = { name: 'Tone Velez', email: 'Admin@Truking.com' };

/** Resolve a location's pickup coordinator, falling back to the shop default. */
function pickupContact(location) {
  return {
    name: (location?.contactPerson || '').trim() || DEFAULT_PICKUP_CONTACT.name,
    email: (location?.contactEmail || '').trim() || DEFAULT_PICKUP_CONTACT.email,
  };
}

function inputError(message) {
  return Object.assign(new Error(message), { status: 400 });
}

function readText(value, label, max, required = false) {
  if (value != null && typeof value !== 'string') throw inputError(`${label} must be text`);
  const text = (value || '').trim();
  if (required && !text) throw inputError(`${label} is required`);
  if (text.length > max) throw inputError(`${label} must be ${max} characters or fewer`);
  return text;
}

function locationInput(body) {
  const location = {};
  for (const field of locationFields) {
    location[field] = readText(body[field] ?? (field === 'country' ? 'US' : ''), field, limits[field], !optionalLocationFields.includes(field));
  }
  location.country = location.country.toUpperCase();
  if (!/^[A-Z]{2}$/.test(location.country)) throw inputError('Country must be a two-letter code');
  if (location.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(location.contactEmail)) {
    throw inputError('Contact email must be a valid email address');
  }
  if (body.active !== undefined && typeof body.active !== 'boolean') throw inputError('Active must be true or false');
  location.active = body.active ?? true;
  return location;
}

function snapshotLocation(location) {
  return Object.fromEntries(locationFields.map((field) => [field, location[field] || '']));
}

function validateOrderStatus(order, status, paymentReceived = false) {
  const pickup = order.fulfillmentMethod === 'pickup';
  const allowed = ['pending', 'paid', 'processing', 'cancelled', ...(pickup ? ['ready_for_pickup', 'picked_up'] : ['shipped', 'delivered'])];
  if (!allowed.includes(status)) throw inputError('This status is not available for this fulfillment method');
  const payAtPickup = order.paymentMethod === 'pay_on_pickup';
  if (payAtPickup && order.paymentStatus !== 'paid' && status === 'paid') {
    throw inputError('Confirm payment received when marking this order picked up');
  }
  if (status === 'ready_for_pickup' && !['paid', 'processing', 'ready_for_pickup', ...(payAtPickup ? ['pending'] : [])].includes(order.status)) {
    throw inputError('Only a paid or processing order can be marked ready for pickup');
  }
  if (status === 'picked_up' && !['ready_for_pickup', 'picked_up'].includes(order.status)) {
    throw inputError('Mark the order ready for pickup before completing pickup');
  }
  if (status === 'picked_up' && payAtPickup && order.paymentStatus !== 'paid' && paymentReceived !== true) {
    throw inputError('Confirm that payment was collected before completing pickup');
  }
}

module.exports = { locationFields, limits, optionalLocationFields, DEFAULT_PICKUP_CONTACT, pickupContact, inputError, readText, locationInput, snapshotLocation, validateOrderStatus };
