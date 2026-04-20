const Order = require('../models/Order');
const User = require('../models/User');

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
      .select('_id status createdAt totalAmount items shippoTrackingNumber shippoTrackingUrl trackingStatus shippingRate');

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
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;

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
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('user', 'name email');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json({ order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Admin: Dashboard stats
exports.getDashboardStats = async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const paidOrders = await Order.countDocuments({ status: { $in: ['paid', 'processing', 'shipped', 'delivered'] } });
    const pendingOrders = await Order.countDocuments({ status: 'pending' });
    const shippedOrders = await Order.countDocuments({ status: 'shipped' });

    const revenueResult = await Order.aggregate([
      { $match: { status: { $in: ['paid', 'processing', 'shipped', 'delivered'] } } },
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
        totalRevenue,
      },
      recentOrders,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
