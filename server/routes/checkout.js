const express = require('express');
const router = express.Router();
const {
  createCheckoutSession,
  getOrderBySession,
} = require('../controllers/checkoutController');
const { optionalAuth } = require('../middleware/auth');

router.post('/create-session', optionalAuth, createCheckoutSession);
router.get('/order/:sessionId', getOrderBySession);

module.exports = router;
