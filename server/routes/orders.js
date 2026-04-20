const express = require('express');
const router = express.Router();
const {
  getMyOrders,
  getAllOrders,
  getOrder,
  updateOrderStatus,
  getDashboardStats,
  trackOrders,
} = require('../controllers/orderController');
const { auth, adminOnly } = require('../middleware/auth');

// Public tracking by email (no auth — email acts as the shared secret)
router.get('/track', trackOrders);

// Customer
router.get('/my-orders', auth, getMyOrders);

// Admin
router.get('/admin/stats', auth, adminOnly, getDashboardStats);
router.get('/admin/all', auth, adminOnly, getAllOrders);
router.get('/admin/:id', auth, adminOnly, getOrder);
router.put('/admin/:id/status', auth, adminOnly, updateOrderStatus);

module.exports = router;
