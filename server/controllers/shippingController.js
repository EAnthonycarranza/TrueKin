const Order = require('../models/Order');
const { sendShippingNotification } = require('../utils/email');

// Shippo REST API base URL
const SHIPPO_API = 'https://api.goshippo.com';

function shippoHeaders() {
  return {
    'Authorization': `ShippoToken ${process.env.SHIPPO_API_KEY}`,
    'Content-Type': 'application/json',
    'Shippo-API-Version': '2018-02-08',
  };
}

function isShippoConfigured() {
  return !!process.env.SHIPPO_API_KEY && process.env.SHIPPO_API_KEY.length > 10;
}

// From address (your store) pulled from env so admin can edit without code changes
function fromAddress() {
  return {
    name: process.env.STORE_NAME || 'Tones & Tees',
    street1: process.env.STORE_STREET || '123 Store St',
    city: process.env.STORE_CITY || 'San Francisco',
    state: process.env.STORE_STATE || 'CA',
    zip: process.env.STORE_ZIP || '94105',
    country: process.env.STORE_COUNTRY || 'US',
    phone: process.env.STORE_PHONE || '5555555555',
    email: process.env.STORE_EMAIL || 'store@tonesandtees.com',
  };
}

function defaultParcel(parcel) {
  const p = parcel || {};
  return {
    length: String(p.length || 10),
    width: String(p.width || 8),
    height: String(p.height || 2),
    distance_unit: p.distanceUnit || 'in',
    weight: String(p.weight || 8),
    mass_unit: p.massUnit || 'oz',
  };
}

function formatRate(rate) {
  return {
    rateId: rate.object_id,
    carrier: rate.provider,
    carrierAccount: rate.carrier_account,
    service: rate.servicelevel?.name || rate.servicelevel?.token || 'Standard',
    serviceToken: rate.servicelevel?.token || '',
    amount: parseFloat(rate.amount),
    currency: rate.currency,
    estimatedDays: rate.estimated_days || rate.duration_terms || 'N/A',
    attributes: rate.attributes || [],
  };
}

// Public: Get shipping rates for an address (used at checkout)
exports.getRates = async (req, res) => {
  try {
    if (!isShippoConfigured()) {
      return res.status(503).json({
        message: 'Shipping is not configured. Set SHIPPO_API_KEY on the server.',
      });
    }

    const { address, parcel } = req.body;

    const shipmentRes = await fetch(`${SHIPPO_API}/shipments/`, {
      method: 'POST',
      headers: shippoHeaders(),
      body: JSON.stringify({
        address_from: fromAddress(),
        address_to: {
          name: address.name,
          street1: address.street,
          city: address.city,
          state: address.state,
          zip: address.zip,
          country: address.country || 'US',
        },
        parcels: [defaultParcel(parcel)],
        async: false,
      }),
    });

    const shipment = await shipmentRes.json();

    if (!shipmentRes.ok) {
      console.error('Shippo shipment error:', shipment);
      return res.status(400).json({
        message: 'Could not get shipping rates',
        details: shipment,
      });
    }

    const rates = (shipment.rates || [])
      .map(formatRate)
      .sort((a, b) => a.amount - b.amount);

    res.json({
      rates,
      shipmentId: shipment.object_id,
      addressValidation: shipment.address_to?.validation_results || null,
    });
  } catch (error) {
    console.error('Shipping rates error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Public: Validate an address before checkout
exports.validateAddress = async (req, res) => {
  try {
    if (!isShippoConfigured()) {
      return res.status(503).json({ message: 'Shipping not configured' });
    }

    const { address } = req.body;

    const addrRes = await fetch(`${SHIPPO_API}/addresses/`, {
      method: 'POST',
      headers: shippoHeaders(),
      body: JSON.stringify({
        name: address.name,
        street1: address.street,
        city: address.city,
        state: address.state,
        zip: address.zip,
        country: address.country || 'US',
        validate: true,
      }),
    });

    const result = await addrRes.json();

    if (!addrRes.ok) {
      return res.status(400).json({ message: 'Address validation failed', details: result });
    }

    res.json({
      isValid: result.validation_results?.is_valid ?? false,
      messages: (result.validation_results?.messages || []).map((m) => m.text || m.message || ''),
      normalized: {
        name: result.name,
        street: result.street1,
        city: result.city,
        state: result.state,
        zip: result.zip,
        country: result.country,
      },
    });
  } catch (error) {
    console.error('Validate address error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Admin: Get rates for an existing order (so admin can pick a label)
exports.getOrderRates = async (req, res) => {
  try {
    if (!isShippoConfigured()) {
      return res.status(503).json({ message: 'Shipping not configured' });
    }

    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.fulfillmentMethod === 'pickup') {
      return res.status(400).json({ message: 'Pickup orders do not use shipping labels, rates, or tracking' });
    }

    const shipmentRes = await fetch(`${SHIPPO_API}/shipments/`, {
      method: 'POST',
      headers: shippoHeaders(),
      body: JSON.stringify({
        address_from: fromAddress(),
        address_to: {
          name: order.shippingAddress.name,
          street1: order.shippingAddress.street,
          city: order.shippingAddress.city,
          state: order.shippingAddress.state,
          zip: order.shippingAddress.zip,
          country: order.shippingAddress.country || 'US',
        },
        parcels: [defaultParcel(order.parcel)],
        async: false,
      }),
    });

    const shipment = await shipmentRes.json();

    if (!shipmentRes.ok) {
      return res.status(400).json({ message: 'Could not get rates', details: shipment });
    }

    order.shippoShipmentId = shipment.object_id;
    await order.save();

    const rates = (shipment.rates || [])
      .map(formatRate)
      .sort((a, b) => a.amount - b.amount);

    res.json({ rates, shipmentId: shipment.object_id });
  } catch (error) {
    console.error('Order rates error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Admin: Create shipping label for an order (purchase rate via Shippo transaction)
exports.createLabel = async (req, res) => {
  try {
    if (!isShippoConfigured()) {
      return res.status(503).json({ message: 'Shipping not configured' });
    }

    const { orderId, rateId, parcel } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.fulfillmentMethod === 'pickup') {
      return res.status(400).json({ message: 'Pickup orders do not use shipping labels, rates, or tracking' });
    }

    if (order.shippoTransactionId) {
      return res.status(400).json({
        message: 'Order already has a shipping label. Refund the existing label first.',
      });
    }

    // If parcel overrides provided, persist them on the order
    if (parcel) {
      order.parcel = {
        length: parcel.length ?? order.parcel?.length ?? 10,
        width: parcel.width ?? order.parcel?.width ?? 8,
        height: parcel.height ?? order.parcel?.height ?? 2,
        distanceUnit: parcel.distanceUnit || order.parcel?.distanceUnit || 'in',
        weight: parcel.weight ?? order.parcel?.weight ?? 8,
        massUnit: parcel.massUnit || order.parcel?.massUnit || 'oz',
      };
    }

    let chosenRateId = rateId || order.shippoRateId;

    // If no rate id, create a shipment and pick the cheapest rate
    if (!chosenRateId) {
      const shipmentRes = await fetch(`${SHIPPO_API}/shipments/`, {
        method: 'POST',
        headers: shippoHeaders(),
        body: JSON.stringify({
          address_from: fromAddress(),
          address_to: {
            name: order.shippingAddress.name,
            street1: order.shippingAddress.street,
            city: order.shippingAddress.city,
            state: order.shippingAddress.state,
            zip: order.shippingAddress.zip,
            country: order.shippingAddress.country || 'US',
          },
          parcels: [defaultParcel(order.parcel)],
          async: false,
        }),
      });

      const shipment = await shipmentRes.json();

      if (!shipmentRes.ok || !shipment.rates?.length) {
        return res.status(400).json({
          message: 'No rates available for this address',
          details: shipment,
        });
      }

      const cheapest = shipment.rates.sort(
        (a, b) => parseFloat(a.amount) - parseFloat(b.amount)
      )[0];
      chosenRateId = cheapest.object_id;
      order.shippoShipmentId = shipment.object_id;
      order.shippingRate = {
        carrier: cheapest.provider,
        service: cheapest.servicelevel?.name,
        serviceToken: cheapest.servicelevel?.token,
        amount: parseFloat(cheapest.amount),
        currency: cheapest.currency,
        estimatedDays: cheapest.estimated_days,
        rateId: cheapest.object_id,
      };
    }

    // Purchase the label
    const txnRes = await fetch(`${SHIPPO_API}/transactions/`, {
      method: 'POST',
      headers: shippoHeaders(),
      body: JSON.stringify({
        rate: chosenRateId,
        label_file_type: 'PDF',
        async: false,
      }),
    });

    const transaction = await txnRes.json();

    if (!txnRes.ok || transaction.status === 'ERROR') {
      console.error('Shippo transaction error:', transaction);
      return res.status(400).json({
        message: 'Could not create label',
        details: transaction.messages || transaction,
      });
    }

    order.shippoTransactionId = transaction.object_id;
    order.shippoRateId = chosenRateId;
    order.shippoTrackingNumber = transaction.tracking_number || '';
    order.shippoTrackingUrl = transaction.tracking_url_provider || '';
    order.shippoLabelUrl = transaction.label_url || '';
    order.shippoCommercialInvoiceUrl = transaction.commercial_invoice_url || '';
    order.shippoQrCodeUrl = transaction.qr_code_url || '';
    order.labelCreatedAt = new Date();
    order.status = 'shipped';
    order.trackingStatus = 'PRE_TRANSIT';
    await order.save();

    // Populate for email rendering and send shipping notification
    await order.populate('user', 'name email');
    sendShippingNotification(order).catch((e) =>
      console.error('Shipping email failed:', e.message)
    );

    // Register a tracking webhook so we get status updates
    if (transaction.tracking_number && transaction.rate?.provider) {
      fetch(`${SHIPPO_API}/tracks/`, {
        method: 'POST',
        headers: shippoHeaders(),
        body: JSON.stringify({
          carrier: transaction.rate.provider.toLowerCase(),
          tracking_number: transaction.tracking_number,
          metadata: `order:${order._id}`,
        }),
      }).catch((e) => console.warn('Tracking registration failed:', e.message));
    }

    res.json({
      order,
      label: {
        trackingNumber: transaction.tracking_number,
        trackingUrl: transaction.tracking_url_provider,
        labelUrl: transaction.label_url,
        commercialInvoiceUrl: transaction.commercial_invoice_url,
      },
    });
  } catch (error) {
    console.error('Create label error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Admin: Refund (void) a label
exports.refundLabel = async (req, res) => {
  try {
    if (!isShippoConfigured()) {
      return res.status(503).json({ message: 'Shipping not configured' });
    }

    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.fulfillmentMethod === 'pickup') {
      return res.status(400).json({ message: 'Pickup orders do not use shipping labels, rates, or tracking' });
    }
    if (!order.shippoTransactionId) {
      return res.status(400).json({ message: 'Order has no label to refund' });
    }

    const refundRes = await fetch(`${SHIPPO_API}/refunds/`, {
      method: 'POST',
      headers: shippoHeaders(),
      body: JSON.stringify({
        transaction: order.shippoTransactionId,
        async: false,
      }),
    });

    const refund = await refundRes.json();

    if (!refundRes.ok) {
      return res.status(400).json({ message: 'Refund failed', details: refund });
    }

    order.shippoRefundId = refund.object_id;
    order.shippoRefundStatus = refund.status || 'PENDING';

    if (refund.status === 'SUCCESS' || refund.status === 'QUEUED' || refund.status === 'PENDING') {
      // Clear label fields so a new one can be created
      order.shippoTransactionId = undefined;
      order.shippoTrackingNumber = undefined;
      order.shippoTrackingUrl = undefined;
      order.shippoLabelUrl = undefined;
      order.shippoCommercialInvoiceUrl = undefined;
      order.shippoQrCodeUrl = undefined;
      order.shippoRateId = undefined;
      order.labelCreatedAt = undefined;
      order.trackingStatus = null;
      order.status = 'processing';
    }

    await order.save();
    res.json({ order, refund });
  } catch (error) {
    console.error('Refund label error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Admin/Public: Get live tracking for an order
exports.getTracking = async (req, res) => {
  try {
    if (!isShippoConfigured()) {
      return res.status(503).json({ message: 'Shipping not configured' });
    }

    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.fulfillmentMethod === 'pickup') {
      return res.status(400).json({ message: 'Pickup orders do not use shipping labels, rates, or tracking' });
    }
    if (!order.shippoTrackingNumber) {
      return res.status(400).json({ message: 'Order has no tracking number yet' });
    }

    const carrier = (order.shippingRate?.carrier || 'shippo').toLowerCase();

    const trackRes = await fetch(
      `${SHIPPO_API}/tracks/${carrier}/${order.shippoTrackingNumber}`,
      { headers: shippoHeaders() }
    );

    const tracking = await trackRes.json();

    if (!trackRes.ok) {
      return res.status(400).json({ message: 'Tracking lookup failed', details: tracking });
    }

    // Sync tracking state into the order
    if (tracking.tracking_status) {
      order.trackingStatus = tracking.tracking_status.status || null;
      order.trackingStatusDetails = tracking.tracking_status.status_details || '';
      order.trackingEta = tracking.eta ? new Date(tracking.eta) : undefined;
    }
    if (Array.isArray(tracking.tracking_history)) {
      order.trackingHistory = tracking.tracking_history.map((h) => ({
        status: h.status,
        statusDetails: h.status_details,
        location: {
          city: h.location?.city,
          state: h.location?.state,
          zip: h.location?.zip,
          country: h.location?.country,
        },
        occurredAt: h.status_date ? new Date(h.status_date) : undefined,
      }));
    }
    if (order.trackingStatus === 'DELIVERED') {
      order.status = 'delivered';
    }
    await order.save();

    res.json({
      trackingNumber: order.shippoTrackingNumber,
      trackingUrl: order.shippoTrackingUrl,
      status: order.trackingStatus,
      statusDetails: order.trackingStatusDetails,
      eta: order.trackingEta,
      history: order.trackingHistory,
      raw: tracking,
    });
  } catch (error) {
    console.error('Get tracking error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Admin: List connected Shippo carrier accounts
exports.listCarriers = async (req, res) => {
  try {
    if (!isShippoConfigured()) {
      return res.status(503).json({ message: 'Shipping not configured' });
    }

    const r = await fetch(`${SHIPPO_API}/carrier_accounts/`, { headers: shippoHeaders() });
    const data = await r.json();
    if (!r.ok) return res.status(400).json({ message: 'Could not list carriers', details: data });
    res.json({ carriers: data.results || [] });
  } catch (error) {
    console.error('List carriers error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Public: Shippo tracking webhook — receives status updates pushed by Shippo
exports.trackingWebhook = async (req, res) => {
  try {
    const payload = req.body || {};
    const event = payload.event || payload.data?.event;
    const data = payload.data || payload;

    const trackingNumber = data.tracking_number;
    const metadata = data.metadata || '';
    const match = metadata.match(/order:([a-f0-9]+)/i);
    const orderId = match ? match[1] : null;

    let order = null;
    if (orderId) {
      order = await Order.findById(orderId);
    }
    if (!order && trackingNumber) {
      order = await Order.findOne({ shippoTrackingNumber: trackingNumber });
    }

    if (!order) {
      console.warn('Shippo webhook: no matching order for', trackingNumber);
      return res.json({ received: true });
    }

    if (data.tracking_status) {
      order.trackingStatus = data.tracking_status.status || order.trackingStatus;
      order.trackingStatusDetails = data.tracking_status.status_details || '';
    }
    if (data.eta) order.trackingEta = new Date(data.eta);
    if (Array.isArray(data.tracking_history)) {
      order.trackingHistory = data.tracking_history.map((h) => ({
        status: h.status,
        statusDetails: h.status_details,
        location: {
          city: h.location?.city,
          state: h.location?.state,
          zip: h.location?.zip,
          country: h.location?.country,
        },
        occurredAt: h.status_date ? new Date(h.status_date) : undefined,
      }));
    }
    if (order.trackingStatus === 'DELIVERED') order.status = 'delivered';
    await order.save();

    console.log(`Shippo webhook ${event || ''} applied to order ${order._id}`);
    res.json({ received: true });
  } catch (error) {
    console.error('Tracking webhook error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Helper exported for use by the Stripe webhook / checkout flow
exports._isShippoConfigured = isShippoConfigured;
exports._fromAddress = fromAddress;
exports._defaultParcel = defaultParcel;
exports._formatRate = formatRate;
