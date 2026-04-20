const mongoose = require('mongoose');

const quoteSchema = new mongoose.Schema({
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
  status: {
    type: String,
    enum: ['new', 'contacted', 'quoted', 'closed'],
    default: 'new',
  },
}, { timestamps: true });

module.exports = mongoose.model('Quote', quoteSchema);
