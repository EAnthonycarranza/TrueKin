const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  title: String,
  price: Number,
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  imageUrl: String,
  color: { type: String, default: null },
  size: { type: String, default: null },
  shirtStyle: { type: String, enum: ['unisex', 'mens', 'womens'], default: 'unisex' },
});

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  guestEmail: {
    type: String,
  },
  items: [orderItemSchema],
  totalAmount: {
    type: Number,
    required: true,
  },
  shippingAddress: {
    name: { type: String, required: true },
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zip: { type: String, required: true },
    country: { type: String, default: 'US' },
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending',
  },
  stripeSessionId: String,
  stripePaymentIntentId: String,
  stripeRefundId: String,

  // Shippo rate selected at checkout (so we can purchase the label post-payment)
  shippoRateId: String,
  shippoShipmentId: String,

  // Label / transaction
  shippoTransactionId: String,
  shippoTrackingNumber: String,
  shippoTrackingUrl: String,
  shippoTrackingUrlAlt: String,
  shippoLabelUrl: String,
  shippoCommercialInvoiceUrl: String,
  shippoQrCodeUrl: String,
  labelCreatedAt: Date,

  // Refund / void
  shippoRefundId: String,
  shippoRefundStatus: {
    type: String,
    enum: [null, 'QUEUED', 'PENDING', 'SUCCESS', 'ERROR'],
    default: null,
  },

  // Parcel dimensions/weight used for this shipment (admin can override per order)
  parcel: {
    length: { type: Number, default: 10 },
    width: { type: Number, default: 8 },
    height: { type: Number, default: 2 },
    distanceUnit: { type: String, default: 'in' },
    weight: { type: Number, default: 8 },
    massUnit: { type: String, default: 'oz' },
  },

  // The rate the customer chose at checkout (or cheapest auto-picked)
  shippingRate: {
    carrier: String,
    service: String,
    serviceToken: String,
    amount: Number,
    currency: String,
    estimatedDays: mongoose.Schema.Types.Mixed,
    rateId: String,
  },

  // Address validation result from Shippo
  addressValidation: {
    isValid: Boolean,
    messages: [String],
    validatedAt: Date,
  },

  // Tracking updates (populated by Shippo tracking webhook)
  trackingStatus: {
    type: String,
    enum: [null, 'UNKNOWN', 'PRE_TRANSIT', 'TRANSIT', 'DELIVERED', 'RETURNED', 'FAILURE'],
    default: null,
  },
  trackingStatusDetails: String,
  trackingEta: Date,
  trackingHistory: [
    {
      status: String,
      statusDetails: String,
      location: {
        city: String,
        state: String,
        zip: String,
        country: String,
      },
      occurredAt: Date,
    },
  ],
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
