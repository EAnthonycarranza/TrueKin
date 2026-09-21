const express = require('express');
const router = express.Router();
const {
  createQuote,
  adminListQuotes,
  adminGetQuote,
  adminUpdateQuoteStatus,
  adminSaveQuoteBuilder,
  adminSendQuoteProposal,
} = require('../controllers/quoteController');
const { auth, adminOnly } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.post('/', upload.single('designPreview'), createQuote);
router.get('/admin/all', auth, adminOnly, adminListQuotes);
router.get('/admin/:id', auth, adminOnly, adminGetQuote);
router.put('/admin/:id/status', auth, adminOnly, adminUpdateQuoteStatus);
router.put('/admin/:id/builder', auth, adminOnly, upload.fields([
  { name: 'conceptImages', maxCount: 6 },
  { name: 'productImage', maxCount: 1 },
]), adminSaveQuoteBuilder);
router.post('/admin/:id/send', auth, adminOnly, adminSendQuoteProposal);

module.exports = router;
