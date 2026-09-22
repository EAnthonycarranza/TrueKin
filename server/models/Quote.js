const mongoose = require('mongoose');

const lineItemSchema = new mongoose.Schema({
  description: { type: String, trim: true, maxlength: 240, required: true },
  quantity: { type: Number, min: 1, max: 100000, required: true },
  unitPrice: { type: Number, min: 0, required: true },
}, { _id: false });

const conceptSchema = new mongoose.Schema({
  label: { type: String, trim: true, maxlength: 120, default: 'Design concept' },
  imageUrl: { type: String, trim: true, maxlength: 2000, required: true },
  notes: { type: String, trim: true, maxlength: 500, default: '' },
}, { _id: false });

const productPreviewSchema = new mongoose.Schema({
  sourceProductId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
  sourceStudioSide: { type: String, enum: ['', 'front', 'back', 'left', 'right'], default: '' },
  title: { type: String, trim: true, maxlength: 160, default: '' },
  description: { type: String, trim: true, maxlength: 700, default: '' },
  imageUrl: { type: String, trim: true, maxlength: 2000, default: '' },
}, { _id: false });

const adminQuoteSchema = new mongoose.Schema({
  quoteNumber: { type: String, trim: true, maxlength: 40, default: '' },
  lineItems: { type: [lineItemSchema], default: [] },
  setupFee: { type: Number, min: 0, default: 0 },
  shipping: { type: Number, min: 0, default: 0 },
  discount: { type: Number, min: 0, default: 0 },
  taxRate: { type: Number, min: 0, max: 100, default: 0 },
  subtotal: { type: Number, min: 0, default: 0 },
  tax: { type: Number, min: 0, default: 0 },
  total: { type: Number, min: 0, default: 0 },
  validUntil: { type: String, trim: true, maxlength: 40, default: '' },
  leadTime: { type: String, trim: true, maxlength: 120, default: '7–14 business days after art approval' },
  paymentTerms: { type: String, trim: true, maxlength: 240, default: 'Payment terms confirmed before production begins.' },
  customerMessage: { type: String, trim: true, maxlength: 3000, default: '' },
  internalNotes: { type: String, trim: true, maxlength: 3000, default: '' },
  productPreview: { type: productPreviewSchema, default: undefined },
  concepts: { type: [conceptSchema], default: [] },
  lastSentAt: { type: Date, default: null },
}, { _id: false });

const quoteSchema = new mongoose.Schema({
  requestType: {
    type: String,
    enum: ['basic', 'studio'],
    default: 'basic',
  },
  productType: {
    type: String,
    enum: ['other', 'tshirt', 'sticker'],
    default: 'other',
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120,
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    maxlength: 200,
  },
  phone: {
    type: String,
    trim: true,
    maxlength: 40,
    default: '',
  },
  organization: {
    type: String,
    trim: true,
    maxlength: 160,
    default: '',
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    max: 100000,
  },
  neededBy: {
    type: String,
    trim: true,
    maxlength: 80,
    default: '',
  },
  details: {
    type: String,
    required: true,
    maxlength: 4000,
  },
  designData: {
    type: String,
    default: null,
  },
  designPreviewUrl: {
    type: String,
    trim: true,
    default: '',
  },
  designSidePreviews: {
    type: [{
      side: { type: String, enum: ['front', 'back', 'left', 'right'], required: true },
      imageUrl: { type: String, trim: true, maxlength: 2000, required: true },
    }],
    default: [],
  },
  specifications: {
    printLocations: { type: Number, min: 1, max: 4, default: 1 },
    stickerSize: { type: String, enum: ['', '2in', '3in', '4in'], default: '' },
    rush: { type: Boolean, default: false },
  },
  adminQuote: { type: adminQuoteSchema, default: () => ({}) },
  status: {
    type: String,
    enum: ['new', 'contacted', 'quoted', 'closed'],
    default: 'new',
  },
}, { timestamps: true });

module.exports = mongoose.model('Quote', quoteSchema);
