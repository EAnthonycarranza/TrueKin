const express = require('express');
const router = express.Router();
const {
  getRates,
  validateAddress,
  createLabel,
  refundLabel,
  getTracking,
  getOrderRates,
  listCarriers,
  trackingWebhook,
} = require('../controllers/shippingController');
const { auth, adminOnly, optionalAuth } = require('../middleware/auth');

// Public / customer
router.post('/rates', optionalAuth, getRates);
router.post('/validate-address', optionalAuth, validateAddress);

// Shippo webhook (public — Shippo calls this)
router.post('/webhook', trackingWebhook);

// Admin
router.get('/carriers', auth, adminOnly, listCarriers);
router.get('/order/:orderId/rates', auth, adminOnly, getOrderRates);
router.get('/order/:orderId/tracking', auth, adminOnly, getTracking);
router.post('/label', auth, adminOnly, createLabel);
router.post('/order/:orderId/refund', auth, adminOnly, refundLabel);

module.exports = router;
