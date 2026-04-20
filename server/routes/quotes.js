const express = require('express');
const router = express.Router();
const {
  createQuote,
  adminListQuotes,
  adminUpdateQuoteStatus,
} = require('../controllers/quoteController');
const { auth, adminOnly } = require('../middleware/auth');

router.post('/', createQuote);
router.get('/admin/all', auth, adminOnly, adminListQuotes);
router.put('/admin/:id/status', auth, adminOnly, adminUpdateQuoteStatus);

module.exports = router;
