const Order = require('../models/Order');
const User = require('../models/User');
const mongoose = require('mongoose');
const { readText, validateOrderStatus, inputError } = require('../utils/fulfillment');
const { toCsv, parseCsv } = require('../utils/csv');
const { sendPickupReadyNotification } = require('../utils/email');

// Public: Lookup an order by email + orderId for anonymous tracking.
// Either:
//   - ?orderId=<id>&email=<email>  → single order
//   - ?email=<email>               → list of recent orders for that email
// We verify email matches guestEmail or the associated user's email so we never
// leak order details across customers.
exports.trackOrders = async (req, res) => {
  try {
    const email = (req.query.email || '').trim().toLowerCase();
    const orderId = (req.query.orderId || '').trim();

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Collect userIds that match this email, so we can match orders placed
    // under a signed-in account as well as guest orders.
    const users = await User.find({ email }).select('_id name email').lean();
    const userIds = users.map((u) => u._id);

    const baseMatch = {
      $or: [
        { guestEmail: new RegExp(`^${email}$`, 'i') },
        userIds.length ? { user: { $in: userIds } } : { _id: null },
      ],
    };

    if (orderId) {
      const order = await Order.findOne({ _id: orderId, ...baseMatch })
        .populate('user', 'name email')
        .populate('items.product', 'title imageUrls');
      if (!order) {
        return res.status(404).json({
          message: 'No order found for that email and order number.',
        });
      }
      // Strip fields not relevant to customers
      return res.json({
        order: {
          _id: order._id,
          status: order.status,
          createdAt: order.createdAt,
          totalAmount: order.totalAmount,
          items: order.items,
          shippingAddress: order.shippingAddress,
          shippingRate: order.shippingRate,
          fulfillmentMethod: order.fulfillmentMethod,
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          paidAt: order.paidAt,
          pickup: order.pickup,
          shippoTrackingNumber: order.shippoTrackingNumber,
          shippoTrackingUrl: order.shippoTrackingUrl,
          shippoLabelUrl: order.shippoLabelUrl,
          trackingStatus: order.trackingStatus,
          trackingStatusDetails: order.trackingStatusDetails,
          trackingEta: order.trackingEta,
          trackingHistory: order.trackingHistory,
          labelCreatedAt: order.labelCreatedAt,
        },
      });
    }

    const orders = await Order.find(baseMatch)
      .sort({ createdAt: -1 })
      .limit(20)
      .select('_id status createdAt totalAmount items shippoTrackingNumber shippoTrackingUrl trackingStatus shippingRate fulfillmentMethod pickup paymentMethod paymentStatus');

    res.json({ orders });
  } catch (error) {
    console.error('Track orders error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get user's orders
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate('items.product', 'title imageUrls');

    res.json({ orders });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Admin: Get all orders
exports.getAllOrders = async (req, res) => {
  try {
    const { status, fulfillmentMethod } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (fulfillmentMethod === 'pickup') filter.fulfillmentMethod = 'pickup';
    if (fulfillmentMethod === 'shipping') filter.fulfillmentMethod = { $ne: 'pickup' };

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .populate('user', 'name email')
      .populate('items.product', 'title imageUrls');

    res.json({ orders });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Admin: Get single order
exports.getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email')
      .populate('items.product', 'title imageUrls');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json({ order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Admin: Update order status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id).populate('user', 'name email');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    validateOrderStatus(order, status, req.body.paymentReceived);
    // Only the first move into ready_for_pickup should email the customer;
    // re-saving an order that is already ready must not send it again.
    const announcePickup = status === 'ready_for_pickup' && order.status !== 'ready_for_pickup';
    order.status = status;
    if (status === 'ready_for_pickup' && !order.pickup.readyAt) order.pickup.readyAt = new Date();
    if (status === 'picked_up' && !order.pickup.pickedUpAt) order.pickup.pickedUpAt = new Date();
    if (status === 'picked_up' && order.paymentMethod === 'pay_on_pickup' && order.paymentStatus !== 'paid') {
      order.paymentStatus = 'paid';
      order.paidAt = new Date();
    }
    await order.save();
    if (announcePickup) {
      sendPickupReadyNotification(order).catch((e) =>
        console.error('Pickup ready email failed:', e.message));
    }
    res.json({ order });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
};

// Customer-visible instructions specific to this order, separate from their notes.
exports.updatePickupInstructions = async (req, res) => {
  try {
    const orderInstructions = readText(req.body.orderInstructions, 'Pickup instructions', 2000);
    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, fulfillmentMethod: 'pickup' },
      { $set: { 'pickup.orderInstructions': orderInstructions } },
      { new: true, runValidators: true }
    ).populate('user', 'name email');
    if (!order) return res.status(404).json({ message: 'Pickup order not found' });
    res.json({ order });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
};

// Admin: Dashboard stats
exports.getDashboardStats = async (req, res) => {
  try {
    // Legacy card orders have no paymentMethod. Uncollected pickup balances
    // must never count as received revenue, even while processing or ready.
    const paidFilter = {
      status: { $in: ['paid', 'processing', 'shipped', 'delivered', 'ready_for_pickup', 'picked_up'] },
      $or: [{ paymentMethod: { $ne: 'pay_on_pickup' } }, { paymentStatus: 'paid' }],
    };
    const totalOrders = await Order.countDocuments();
    const paidOrders = await Order.countDocuments(paidFilter);
    const pendingOrders = await Order.countDocuments({ status: 'pending' });
    const readyForPickupOrders = await Order.countDocuments({ status: 'ready_for_pickup' });
    const shippedOrders = await Order.countDocuments({ status: 'shipped' });

    const revenueResult = await Order.aggregate([
      { $match: paidFilter },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);

    const totalRevenue = revenueResult[0]?.total || 0;

    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('user', 'name email');

    res.json({
      stats: {
        totalOrders,
        paidOrders,
        pendingOrders,
        shippedOrders,
        readyForPickupOrders,
        totalRevenue,
      },
      recentOrders,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ─────────────────────────  Delete / CSV  ───────────────────────── */

/**
 * Admin: delete an order outright.
 *
 * Deliberately a hard delete rather than a soft flag — this exists so an admin
 * can clear test orders and mistakes out of the console, and a "deleted" order
 * still cluttering every query would defeat the point. The CSV export is the
 * safety net: take one before a clearout and the rows can be imported back.
 *
 * Refusing to delete a paid order that was never fulfilled would be paternalistic
 * (an admin who wants it gone has a reason), but the UI names the amount and the
 * status in its confirmation so the decision is an informed one.
 */
exports.deleteOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    await Order.deleteOne({ _id: order._id });
    res.json({ message: 'Order deleted', id: order._id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Columns for the order CSV.
 *
 * `items` holds JSON rather than a prose summary. A summary reads better in a
 * spreadsheet but cannot be parsed back without guessing, and this file has to
 * survive a round trip — `itemsSummary` is carried alongside it for humans and
 * ignored on import.
 */
const CSV_COLUMNS = [
  { key: 'orderId', label: 'Order ID' },
  { key: 'reference', label: 'Reference' },
  { key: 'createdAt', label: 'Placed' },
  { key: 'status', label: 'Status' },
  { key: 'fulfillmentMethod', label: 'Fulfillment' },
  { key: 'paymentMethod', label: 'Payment method' },
  { key: 'paymentStatus', label: 'Payment status' },
  { key: 'customerName', label: 'Customer' },
  { key: 'customerEmail', label: 'Email' },
  { key: 'itemCount', label: 'Item count' },
  { key: 'itemsSummary', label: 'Items' },
  { key: 'totalAmount', label: 'Total (cents)' },
  { key: 'totalFormatted', label: 'Total' },
  { key: 'pickupName', label: 'Pickup spot' },
  { key: 'pickupContactName', label: 'Collecting as' },
  { key: 'pickupStreet', label: 'Pickup street' },
  { key: 'pickupCity', label: 'Pickup city' },
  { key: 'pickupState', label: 'Pickup state' },
  { key: 'pickupZip', label: 'Pickup ZIP' },
  { key: 'pickupHours', label: 'Pickup hours' },
  { key: 'pickupInstructions', label: 'Pickup instructions' },
  { key: 'orderInstructions', label: 'Order instructions' },
  { key: 'customerInstructions', label: 'Customer notes' },
  { key: 'shipName', label: 'Ship to' },
  { key: 'shipStreet', label: 'Ship street' },
  { key: 'shipCity', label: 'Ship city' },
  { key: 'shipState', label: 'Ship state' },
  { key: 'shipZip', label: 'Ship ZIP' },
  { key: 'shipCountry', label: 'Ship country' },
  { key: 'carrier', label: 'Carrier' },
  { key: 'service', label: 'Service' },
  { key: 'shippingAmount', label: 'Shipping cost' },
  { key: 'trackingNumber', label: 'Tracking number' },
  { key: 'trackingUrl', label: 'Tracking URL' },
  { key: 'items', label: 'Items JSON' },
];

function orderToRow(order) {
  const p = order.pickup || {};
  const s = order.shippingAddress || {};
  const items = (order.items || []).map((i) => ({
    product: i.product ? i.product.toString() : null,
    title: i.title,
    price: i.price,
    quantity: i.quantity,
    color: i.color || null,
    size: i.size || null,
    shirtStyle: i.shirtStyle || 'unisex',
    imageUrl: i.imageUrl || '',
  }));
  return {
    orderId: order._id.toString(),
    reference: order._id.toString().slice(-8).toUpperCase(),
    createdAt: order.createdAt ? new Date(order.createdAt).toISOString() : '',
    status: order.status,
    fulfillmentMethod: order.fulfillmentMethod,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    customerName: order.user?.name || p.contactName || s.name || '',
    customerEmail: order.guestEmail || order.user?.email || '',
    itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
    itemsSummary: items.map((i) => `${i.quantity}x ${i.title}${i.size ? ` (${i.size})` : ''}`).join('; '),
    totalAmount: order.totalAmount,
    totalFormatted: `$${((order.totalAmount || 0) / 100).toFixed(2)}`,
    pickupName: p.name || '',
    pickupContactName: p.contactName || '',
    pickupStreet: p.street || '',
    pickupCity: p.city || '',
    pickupState: p.state || '',
    pickupZip: p.zip || '',
    pickupHours: p.hours || '',
    pickupInstructions: p.instructions || '',
    orderInstructions: p.orderInstructions || '',
    customerInstructions: p.customerInstructions || '',
    shipName: s.name || '',
    shipStreet: s.street || '',
    shipCity: s.city || '',
    shipState: s.state || '',
    shipZip: s.zip || '',
    shipCountry: s.country || '',
    carrier: order.shippingRate?.carrier || '',
    service: order.shippingRate?.service || '',
    shippingAmount: order.shippingRate?.amount ?? '',
    trackingNumber: order.shippoTrackingNumber || '',
    trackingUrl: order.shippoTrackingUrl || '',
    items: JSON.stringify(items),
  };
}

/** Admin: download the current order list as CSV, honouring the status filter. */
exports.exportOrders = async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.fulfillmentMethod) filter.fulfillmentMethod = req.query.fulfillmentMethod;

    const orders = await Order.find(filter).sort({ createdAt: -1 }).populate('user', 'name email');
    const csv = toCsv(orders.map(orderToRow), CSV_COLUMNS);

    const stamp = new Date().toISOString().slice(0, 10);
    const suffix = req.query.status ? `-${req.query.status}` : '';
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="truekin-orders${suffix}-${stamp}.csv"`);
    res.send(csv);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const ORDER_STATUSES = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'ready_for_pickup', 'picked_up', 'cancelled'];

/**
 * Re-key an imported row onto the internal field names.
 *
 * The export writes human labels ("Order ID"), because the whole point is that
 * it opens sensibly in a spreadsheet — so a file that came straight back out of
 * the app arrives keyed by label, not by field. Accept either, case- and
 * space-insensitively, so both a pristine export and a hand-built sheet work.
 */
const HEADER_LOOKUP = (() => {
  const map = new Map();
  const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const column of CSV_COLUMNS) {
    map.set(norm(column.key), column.key);
    if (column.label) map.set(norm(column.label), column.key);
  }
  return { map, norm };
})();

function normalizeRow(row) {
  const out = {};
  for (const [header, value] of Object.entries(row)) {
    const key = HEADER_LOOKUP.map.get(HEADER_LOOKUP.norm(header));
    if (key) out[key] = value;
  }
  return out;
}

/** Fields an import is allowed to change on an order that already exists. */
function applyEditableFields(order, row) {
  const status = (row.status || '').trim();
  if (status) {
    if (!ORDER_STATUSES.includes(status)) throw inputError(`Unknown status "${status}"`);
    order.status = status;
  }
  const paymentStatus = (row.paymentStatus || '').trim();
  if (paymentStatus) {
    if (!['pending', 'paid'].includes(paymentStatus)) throw inputError(`Unknown payment status "${paymentStatus}"`);
    order.paymentStatus = paymentStatus;
  }
  if (order.fulfillmentMethod === 'pickup' && order.pickup) {
    if (row.orderInstructions !== undefined) order.pickup.orderInstructions = readText(row.orderInstructions, 'Order instructions', 2000);
    if (row.customerInstructions !== undefined) order.pickup.customerInstructions = readText(row.customerInstructions, 'Customer notes', 2000);
  }
  if (row.trackingNumber !== undefined && row.trackingNumber !== '') order.shippoTrackingNumber = row.trackingNumber.trim();
  if (row.trackingUrl !== undefined && row.trackingUrl !== '') order.shippoTrackingUrl = row.trackingUrl.trim();
}

/** Build a brand-new order from an exported row, for restoring a deletion. */
function orderFromRow(row) {
  let items;
  try {
    items = JSON.parse(row.items || '[]');
  } catch {
    throw inputError('Items JSON is not valid JSON');
  }
  if (!Array.isArray(items) || items.length === 0) throw inputError('Row has no items');

  const fulfillmentMethod = ['shipping', 'pickup'].includes(row.fulfillmentMethod) ? row.fulfillmentMethod : 'pickup';
  const total = Number(row.totalAmount);
  if (!Number.isFinite(total) || total < 0) throw inputError('Total (cents) must be a number');

  const doc = {
    _id: row.orderId && mongoose.isValidObjectId(row.orderId) ? row.orderId : undefined,
    guestEmail: (row.customerEmail || '').trim() || undefined,
    items: items.map((i) => ({
      product: i.product && mongoose.isValidObjectId(i.product) ? i.product : new mongoose.Types.ObjectId(),
      title: i.title,
      price: Number(i.price) || 0,
      quantity: Math.max(1, Number(i.quantity) || 1),
      imageUrl: i.imageUrl || '',
      color: i.color ?? null,
      size: i.size ?? null,
      shirtStyle: ['unisex', 'mens', 'womens'].includes(i.shirtStyle) ? i.shirtStyle : 'unisex',
    })),
    totalAmount: total,
    fulfillmentMethod,
    paymentMethod: ['card', 'pay_on_pickup'].includes(row.paymentMethod) ? row.paymentMethod : 'card',
    paymentStatus: ['pending', 'paid'].includes(row.paymentStatus) ? row.paymentStatus : 'pending',
    status: ORDER_STATUSES.includes(row.status) ? row.status : 'pending',
  };

  if (fulfillmentMethod === 'pickup') {
    doc.pickup = {
      name: row.pickupName || '',
      street: row.pickupStreet || '',
      city: row.pickupCity || '',
      state: row.pickupState || '',
      zip: row.pickupZip || '',
      country: 'US',
      hours: row.pickupHours || '',
      instructions: row.pickupInstructions || '',
      // contactName is required on the model; fall back so a thin row still restores.
      contactName: (row.pickupContactName || row.customerName || 'Customer').slice(0, 120),
      orderInstructions: row.orderInstructions || '',
      customerInstructions: row.customerInstructions || '',
    };
  } else {
    doc.shippingAddress = {
      name: row.shipName || '',
      street: row.shipStreet || '',
      city: row.shipCity || '',
      state: row.shipState || '',
      zip: row.shipZip || '',
      country: row.shipCountry || 'US',
    };
  }

  if (row.trackingNumber) doc.shippoTrackingNumber = row.trackingNumber;
  if (row.trackingUrl) doc.shippoTrackingUrl = row.trackingUrl;
  if (row.carrier || row.service || row.shippingAmount !== '') {
    doc.shippingRate = {
      carrier: row.carrier || undefined,
      service: row.service || undefined,
      amount: row.shippingAmount === '' ? undefined : Number(row.shippingAmount),
    };
  }
  if (row.createdAt) {
    const placed = new Date(row.createdAt);
    if (!Number.isNaN(placed.getTime())) doc.createdAt = placed;
  }
  return doc;
}

/**
 * Admin: import orders from a CSV produced by the export.
 *
 * Upsert by Order ID: a row whose order still exists updates the handful of
 * fields an admin would sensibly edit in a spreadsheet (status, payment status,
 * instructions, tracking); a row whose order is gone is recreated from the
 * archived columns. That covers both jobs the export is used for — bulk status
 * edits and undoing a delete.
 *
 * One bad row must not cost the admin the other ninety-nine, so rows are applied
 * independently and every failure is reported back with its line number.
 */
exports.importOrders = async (req, res) => {
  try {
    const { records } = parseCsv(req.body?.csv || '');
    if (!records.length) throw inputError('That file has no rows');
    if (records.length > 2000) throw inputError('Import is limited to 2000 rows at a time');

    const summary = { created: 0, updated: 0, failed: 0, errors: [] };

    for (const [index, rawRow] of records.entries()) {
      // +2: one for the header, one because spreadsheets are 1-indexed.
      const line = index + 2;
      const row = normalizeRow(rawRow);
      try {
        const id = (row.orderId || '').trim();
        if (!id) throw inputError('Missing Order ID');
        if (!mongoose.isValidObjectId(id)) throw inputError(`"${id}" is not a valid Order ID`);

        const existing = await Order.findById(id);
        if (existing) {
          applyEditableFields(existing, row);
          await existing.save();
          summary.updated += 1;
        } else {
          await Order.create(orderFromRow(row));
          summary.created += 1;
        }
      } catch (error) {
        summary.failed += 1;
        if (summary.errors.length < 25) summary.errors.push({ line, message: error.message });
      }
    }

    res.json(summary);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
};
