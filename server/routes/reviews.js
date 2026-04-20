const express = require('express');
const router = express.Router();
const {
  listByProduct,
  createOrUpdate,
  deleteOwn,
} = require('../controllers/reviewController');
const { auth } = require('../middleware/auth');

router.get('/product/:productId', listByProduct);
router.post('/', auth, createOrUpdate);
router.delete('/:id', auth, deleteOwn);

module.exports = router;
