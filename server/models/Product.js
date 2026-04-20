const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  imageUrls: [{
    type: String,
    required: true,
  }],
  category: {
    type: String,
    default: 'T-Shirt',
  },
  featured: {
    type: Boolean,
    default: false,
  },
  active: {
    type: Boolean,
    default: true,
  },
  designData: {
    type: String,
    default: null,
  },
  editorType: {
    type: String,
    enum: ['3d', '2d'],
    default: '3d',
  },
  shirtStyle: {
    type: String,
    enum: ['unisex', 'mens', 'womens'],
    default: 'unisex',
  },
  availableColors: [{
    type: String,
    trim: true,
  }],
  sizes: [{
    size: {
      type: String,
      enum: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'],
      required: true,
    },
    style: {
      type: String,
      enum: ['unisex', 'mens', 'womens'],
      default: 'unisex',
    },
    quantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    unlimited: {
      type: Boolean,
      default: false,
    },
  }],
}, { timestamps: true });

// Ensure sizes always include 'style' in JSON output (back-fills old docs missing it)
productSchema.set('toJSON', {
  transform: (doc, ret) => {
    if (ret.sizes) {
      ret.sizes = ret.sizes.map((s) => ({
        ...s,
        style: s.style || 'unisex',
      }));
    }
    return ret;
  },
});

productSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('Product', productSchema);
