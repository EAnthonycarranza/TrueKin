const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  deleteProductImage,
  adminGetProducts,
  saveDesign,
} = require('../controllers/productController');
const { auth, adminOnly } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Public routes
router.get('/', getProducts);
router.get('/:id', getProduct);

// Admin routes
router.get('/admin/all', auth, adminOnly, adminGetProducts);
router.post('/', auth, adminOnly, upload.array('images', 5), createProduct);
router.put('/:id', auth, adminOnly, upload.array('images', 5), updateProduct);
router.delete('/:id', auth, adminOnly, deleteProduct);
router.put('/:id/remove-image', auth, adminOnly, deleteProductImage);
router.put('/:id/design', auth, adminOnly, upload.fields([
  { name: 'designImage', maxCount: 1 },
]), saveDesign);

module.exports = router;
