const mongoose = require('mongoose');
const { locationFields, limits, optionalLocationFields } = require('../utils/fulfillment');

const fields = Object.fromEntries(locationFields.map((field) => [field, {
  type: String,
  trim: true,
  maxlength: limits[field],
  required: !optionalLocationFields.includes(field),
  ...(field === 'country' ? { default: 'US', uppercase: true } : {}),
}]));

module.exports = mongoose.model('PickupLocation', new mongoose.Schema({
  ...fields,
  active: { type: Boolean, default: true, index: true },
}, { timestamps: true }));
