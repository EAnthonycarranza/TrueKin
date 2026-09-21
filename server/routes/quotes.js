const express = require('express');
const router = express.Router();
const {
  createQuote,
  adminListQuotes,
  adminGetQuote,
  adminUpdateQuoteStatus,
  adminSaveQuoteBuilder,
  adminSendQuoteProposal,
  getEstimate,
} = require('../controllers/quoteController');
const { auth, adminOnly } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.post('/estimate', getEstimate);
router.post('/', upload.single('designPreview'), createQuote);
router.get('/admin/all', auth, adminOnly, adminListQuotes);
router.get('/admin/:id', auth, adminOnly, adminGetQuote);
router.put('/admin/:id/status', auth, adminOnly, adminUpdateQuoteStatus);
router.put('/admin/:id/builder', auth, adminOnly, upload.array('conceptImages', 6), adminSaveQuoteBuilder);
router.post('/admin/:id/send', auth, adminOnly, adminSendQuoteProposal);

module.exports = router;
