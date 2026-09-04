const Order = require('../models/Order');
const User = require('../models/User');
const { readText, validateOrderStatus } = require('../utils/fulfillment');

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
    order.status = status;
    if (status === 'ready_for_pickup' && !order.pickup.readyAt) order.pickup.readyAt = new Date();
    if (status === 'picked_up' && !order.pickup.pickedUpAt) order.pickup.pickedUpAt = new Date();
    if (status === 'picked_up' && order.paymentMethod === 'pay_on_pickup' && order.paymentStatus !== 'paid') {
      order.paymentStatus = 'paid';
      order.paidAt = new Date();
    }
    await order.save();
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
