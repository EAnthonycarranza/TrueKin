const { test, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const PickupLocation = require('../models/PickupLocation');
const User = require('../models/User');
const { validateOrderStatus, locationInput, pickupContact } = require('../utils/fulfillment');
const mail = require('../utils/email');
// No mail, Stripe, or database traffic leaves this regression suite.
const confirmation = mock.fn(async () => {});
const readyMail = mock.fn(async () => {});
mail.sendOrderConfirmation = confirmation;
mail.sendPickupReadyNotification = readyMail;
const stripeCreate = mock.fn(async () => ({ id: 'cs_test_pickup', url: 'https://checkout.stripe.test/session' }));
require.cache[require.resolve('stripe')] = { exports: () => ({ checkout: { sessions: { create: stripeCreate } } }) };
const checkout = require('../controllers/checkoutController');
const orders = require('../controllers/orderController');
const locations = require('../controllers/pickupController');
const shipping = require('../controllers/shippingController');

const locationId = new mongoose.Types.ObjectId();
const productId = new mongoose.Types.ObjectId();
const location = { _id: locationId, name: 'QA Studio', street: '123 Test St', city: 'Testville', state: 'TX', zip: '75001', country: 'US', hours: 'By appointment', instructions: 'Use the side door.', active: true };
const pickupOrder = (extra = {}) => new Order({ totalAmount: 5000, items: [{ product: productId, title: 'Test tee', price: 2500, quantity: 2 }], fulfillmentMethod: 'pickup', paymentMethod: 'pay_on_pickup', pickup: { ...location, locationId, contactName: 'Alex', customerInstructions: 'Sam is collecting.' }, ...extra });
const body = (extra = {}) => ({ items: [{ productId: productId.toString(), quantity: 2 }], fulfillmentMethod: 'pickup', paymentMethod: 'pay_on_pickup', guestEmail: 'alex+pickup@example.test', recaptchaToken: 'checkout-token', pickup: { locationId: locationId.toString(), contactName: 'Alex', customerInstructions: 'Sam is collecting.', instructions: 'UNTRUSTED' }, ...extra });
const response = () => ({ code: 200, status(code) { this.code = code; return this; }, json(data) { this.data = data; return this; } });
const query = (value) => ({ populate() { return this; }, select() { return this; }, lean() { return Promise.resolve(value); }, then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); } });
let created;
let recaptchaResult;

beforeEach(() => {
  process.env.STRIPE_SECRET_KEY = 'sk_test_fixture';
  process.env.RECAPTCHA_SECRET_KEY = 'recaptcha-test-secret';
  process.env.RECAPTCHA_MIN_SCORE = '0.5';
  recaptchaResult = { success: true, score: 0.9, action: 'checkout_submit', hostname: 'localhost' };
  confirmation.mock.resetCalls(); readyMail.mock.resetCalls(); stripeCreate.mock.resetCalls();
  created = null;
  mock.method(global, 'fetch', async () => ({ ok: true, status: 200, json: async () => recaptchaResult }));
  mock.method(PickupLocation, 'findOne', async () => location);
  mock.method(Product, 'findById', async () => ({ _id: productId, title: 'Test tee', price: 2500, imageUrls: [], sizes: [] }));
  mock.method(Order, 'create', async (data) => {
    created = new Order(data);
    await created.validate();
    created.save = async () => created;
    created.populate = async () => created;
    return created;
  });
});
afterEach(() => { mock.restoreAll(); });

test('pickup schema accepts no shipping address and an unassigned location; legacy shipping still needs an address', async () => {
  await pickupOrder({ pickup: { contactName: 'Alex' } }).validate();
  await assert.rejects(new Order({ totalAmount: 5000 }).validate(), /shippingAddress/);
  await assert.rejects(pickupOrder({ pickup: undefined }).validate(), /pickup/);
});

test('pay at pickup snapshots the active location, ignores client shipping costs, and never calls Stripe', async () => {
  delete process.env.STRIPE_SECRET_KEY;
  const res = response();
  await checkout.createCheckoutSession({ body: body({ shippingRate: { amount: 99, rateId: 'untrusted' } }) }, res);
  assert.equal(res.code, 201);
  assert.equal(created.totalAmount, 5000);
  assert.equal(created.paymentStatus, 'pending');
  assert.equal(created.pickup.instructions, location.instructions);
  assert.equal(created.pickup.customerInstructions, 'Sam is collecting.');
  assert.equal(created.shippoRateId, undefined);
  assert.equal(created.shippingRate.amount, undefined);
  assert.equal(stripeCreate.mock.callCount(), 0);
  assert.equal(confirmation.mock.callCount(), 1);
});

test('customers can place a pickup order before agreeing a location', async () => {
  const res = response();
  await checkout.createCheckoutSession({ body: body({ pickup: { contactName: 'Alex' } }) }, res);
  assert.equal(res.code, 201);
  assert.equal(created.pickup.locationId, undefined);
  assert.deepEqual(pickupContact(created.pickup), { name: 'Tone Velez', email: 'Admin@Truking.com' });
});

test('inactive or unknown locations are rejected before reserving products', async () => {
  mock.method(PickupLocation, 'findOne', async () => null);
  const res = response();
  await checkout.createCheckoutSession({ body: body() }, res);
  assert.equal(res.code, 400);
  assert.equal(created, null);
  assert.equal(Product.findById.mock.callCount(), 0);
});

test('shipping cannot request payment at pickup', async () => {
  const res = response();
  await checkout.createCheckoutSession({ body: body({ fulfillmentMethod: 'shipping' }) }, res);
  assert.equal(res.code, 400);
  assert.equal(created, null);
});

test('checkout requires a valid purchase reCAPTCHA result before inventory or order work', async () => {
  const missing = response();
  await checkout.createCheckoutSession({ body: body({ recaptchaToken: undefined }) }, missing);
  assert.equal(missing.code, 400);
  assert.match(missing.data.message, /verification/i);
  assert.equal(Product.findById.mock.callCount(), 0);

  recaptchaResult = { success: true, score: 0.2, action: 'checkout_submit', hostname: 'localhost' };
  const suspicious = response();
  await checkout.createCheckoutSession({ body: body() }, suspicious);
  assert.equal(suspicious.code, 403);
  assert.equal(Product.findById.mock.callCount(), 0);
  assert.equal(created, null);
});

test('card pickup creates a Stripe session with no shipping charge', async () => {
  const res = response();
  await checkout.createCheckoutSession({ body: body({ paymentMethod: 'card', shippingRate: { amount: 10 } }) }, res);
  assert.equal(res.code, 200);
  assert.equal(res.data.sessionId, 'cs_test_pickup');
  const args = stripeCreate.mock.calls[0].arguments[0];
  assert.equal(args.shipping_options, undefined);
  assert.equal(args.metadata.fulfillmentMethod, 'pickup');
  assert.equal(args.customer_email, 'alex+pickup@example.test');
  assert.equal(created.totalAmount, 5000);
  assert.equal(confirmation.mock.callCount(), 0);
});

test('every checkout requires an explicitly submitted valid email, including signed-in customers', async () => {
  const user = { _id: new mongoose.Types.ObjectId(), email: 'old-account@example.test' };
  for (const guestEmail of [undefined, '', 'not-an-email']) {
    const res = response();
    await checkout.createCheckoutSession({ user, body: body({ guestEmail }) }, res);
    assert.equal(res.code, 400);
    assert.match(res.data.message, /email/i);
    assert.equal(created, null);
  }

  const res = response();
  await checkout.createCheckoutSession({ user, body: body({ guestEmail: '  New.Address@Example.Test  ' }) }, res);
  assert.equal(res.code, 201);
  assert.equal(created.guestEmail, 'new.address@example.test');
  assert.equal(created.user.toString(), user._id.toString());
  assert.equal(confirmation.mock.callCount(), 1);
});

test('rejects invalid quantities and oversized customer notes', async () => {
  for (const payload of [body({ items: [{ productId, quantity: -1 }] }), body({ pickup: { contactName: 'Alex', customerInstructions: 'x'.repeat(2001) } })]) {
    const res = response();
    await checkout.createCheckoutSession({ body: payload }, res);
    assert.equal(res.code, 400);
    assert.equal(created, null);
  }
});

test('pickup transitions distinguish deferred payment from unpaid online payment', () => {
  assert.doesNotThrow(() => validateOrderStatus(pickupOrder(), 'ready_for_pickup'));
  assert.throws(() => validateOrderStatus(pickupOrder(), 'shipped'), /fulfillment method/);
  assert.throws(() => validateOrderStatus(pickupOrder(), 'picked_up', true), /ready for pickup/);
  assert.throws(() => validateOrderStatus(pickupOrder(), 'paid'), /Confirm payment/);
  assert.throws(() => validateOrderStatus(pickupOrder({ paymentMethod: 'card', status: 'processing' }), 'ready_for_pickup'), /online payment/);
});

test('completing pickup requires explicit payment confirmation and records the receipt', async () => {
  const order = pickupOrder({ status: 'ready_for_pickup' });
  const save = mock.fn(async () => order);
  order.save = save;
  mock.method(Order, 'findById', () => query(order));
  const denied = response();
  await orders.updateOrderStatus({ params: { id: order.id }, body: { status: 'picked_up' } }, denied);
  assert.equal(denied.code, 400);
  assert.equal(save.mock.callCount(), 0);
  const res = response();
  await orders.updateOrderStatus({ params: { id: order.id }, body: { status: 'picked_up', paymentReceived: true } }, res);
  assert.equal(res.code, 200);
  assert.equal(order.paymentStatus, 'paid');
  assert.ok(order.paidAt instanceof Date);
  assert.ok(order.pickup.pickedUpAt instanceof Date);
});

test('marking ready sends one notification; saving ready again does not resend', async () => {
  const order = pickupOrder();
  order.save = async () => order;
  mock.method(Order, 'findById', () => query(order));
  const req = { params: { id: order.id }, body: { status: 'ready_for_pickup' } };
  await orders.updateOrderStatus(req, response());
  await orders.updateOrderStatus(req, response());
  assert.equal(readyMail.mock.callCount(), 1);
  assert.equal(order.paymentStatus, 'pending');
});

test('admin assignment updates only location details and staff instructions, preserving customer notes', async () => {
  let update;
  mock.method(Order, 'findOneAndUpdate', (filter, data) => { update = { filter, data }; return query(pickupOrder()); });
  const res = response();
  await orders.updatePickupInstructions({ params: { id: new mongoose.Types.ObjectId().toString() }, body: { locationId: locationId.toString(), orderInstructions: 'Meet at 4 PM.' } }, res);
  assert.equal(res.code, 200);
  assert.equal(update.data.$set['pickup.street'], location.street);
  assert.equal(update.data.$set['pickup.orderInstructions'], 'Meet at 4 PM.');
  assert.equal(update.data.$set['pickup.customerInstructions'], undefined);
  assert.equal(update.data.$set['pickup.contactName'], undefined);
  assert.deepEqual(update.filter.status, { $nin: ['picked_up', 'cancelled'] });
});

test('public locations exclude inactive locations; admin can see all', async () => {
  const filters = [];
  mock.method(PickupLocation, 'find', (filter) => { filters.push(filter); return { sort: async () => [] }; });
  await locations.listLocations({}, response());
  await locations.listLocations({ user: { role: 'admin' } }, response());
  assert.deepEqual(filters, [{ active: true }, {}]);
  assert.throws(() => locationInput({ ...location, instructions: 'a'.repeat(2001) }), /2000/);
});

test('pickup orders cannot buy shipping labels or query carrier rates', async () => {
  process.env.SHIPPO_API_KEY = 'shippo_test_fixture';
  mock.method(Order, 'findById', () => query(pickupOrder()));
  for (const handler of [shipping.createLabel, shipping.getOrderRates]) {
    const res = response();
    await handler({ params: { orderId: new mongoose.Types.ObjectId().toString() }, body: { orderId: new mongoose.Types.ObjectId().toString() } }, res);
    assert.equal(res.code, 400);
    assert.match(res.data.message, /Pickup orders/);
  }
});

test('tracking matches email punctuation literally, including plus-addressing', async () => {
  mock.method(User, 'find', () => query([]));
  let filter;
  mock.method(Order, 'findOne', (input) => { filter = input; return query(pickupOrder()); });
  const res = response();
  await orders.trackOrders({ query: { email: 'alex+pickup@example.test', orderId: new mongoose.Types.ObjectId().toString() } }, res);
  assert.equal(res.code, 200);
  const emailRegex = filter.$or[0].guestEmail;
  assert.ok(emailRegex.test('alex+pickup@example.test'));
  assert.equal(emailRegex.test('alexxpickup@exampleXtest'), false);
});

test('dashboard excludes unpaid pickup balances from received revenue', async () => {
  let revenueFilter;
  mock.method(Order, 'countDocuments', async () => 0);
  mock.method(Order, 'aggregate', async (pipeline) => { revenueFilter = pipeline[0].$match; return []; });
  mock.method(Order, 'find', () => ({ sort() { return this; }, limit() { return this; }, populate: async () => [] }));
  await orders.getDashboardStats({}, response());
  assert.deepEqual(revenueFilter.$or, [{ paymentMethod: { $ne: 'pay_on_pickup' } }, { paymentStatus: 'paid' }]);
  assert.ok(revenueFilter.status.$in.includes('picked_up'));
});
