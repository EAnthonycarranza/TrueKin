const express = require('express');
const router = express.Router();
const {
  getMyOrders,
  getAllOrders,
  getOrder,
  updateOrderStatus,
  getDashboardStats,
  trackOrders,
  updatePickupInstructions,
  deleteOrder,
  exportOrders,
  importOrders,
} = require('../controllers/orderController');
const { auth, adminOnly } = require('../middleware/auth');

// Public tracking by email (no auth — email acts as the shared secret)
router.get('/track', trackOrders);

// Customer
router.get('/my-orders', auth, getMyOrders);

// Admin
router.get('/admin/stats', auth, adminOnly, getDashboardStats);
router.get('/admin/all', auth, adminOnly, getAllOrders);
// Both sit above /admin/:id so "export" and "import" are not read as order ids.
router.get('/admin/export', auth, adminOnly, exportOrders);
router.post('/admin/import', auth, adminOnly, importOrders);
router.get('/admin/:id', auth, adminOnly, getOrder);
router.delete('/admin/:id', auth, adminOnly, deleteOrder);
router.put('/admin/:id/status', auth, adminOnly, updateOrderStatus);
router.put('/admin/:id/pickup', auth, adminOnly, updatePickupInstructions);

module.exports = router;
