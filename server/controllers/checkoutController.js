const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Order = require('../models/Order');
const Product = require('../models/Product');
const PickupLocation = require('../models/PickupLocation');
const mongoose = require('mongoose');
const { inputError, readText, snapshotLocation } = require('../utils/fulfillment');
const { sendOrderConfirmation } = require('../utils/email');

// Create Stripe Checkout Session
exports.createCheckoutSession = async (req, res) => {
  try {
    // Pickup is the default because the storefront is pickup-only. Shipping is
    // still accepted so an admin can ship an order by hand from the order
    // console, and so orders placed before the change keep working.
    const { items, shippingAddress, guestEmail, fulfillmentMethod = 'pickup', paymentMethod = 'card' } = req.body;
    if (!['shipping', 'pickup'].includes(fulfillmentMethod)) throw inputError('Choose shipping or pickup');
    if (!['card', 'pay_on_pickup'].includes(paymentMethod)) throw inputError('Choose a valid payment method');
    if (paymentMethod === 'pay_on_pickup' && fulfillmentMethod !== 'pickup') throw inputError('Payment at pickup is only available for pickup orders');
    if (!req.user && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(readText(guestEmail, 'Email', 254, true))) {
      throw inputError('Enter a valid email address');
    }
    let pickup;
    // Only accept a location ID from the customer; addresses and instructions
    // are copied from the active, admin-managed location on the server.
    if (fulfillmentMethod === 'pickup') {
      const details = req.body.pickup || {};
      pickup = {
        contactName: readText(details.contactName, 'Pickup name', 120, true),
        customerInstructions: readText(details.customerInstructions, 'Pickup notes', 2000),
      };
      // A location is optional. If the customer picked one we snapshot it
      // server-side; otherwise the order is placed without one and we
      // coordinate the spot with them after it is in.
      if (details.locationId) {
        if (!mongoose.isValidObjectId(details.locationId)) throw inputError('Choose a valid pickup location');
        const location = await PickupLocation.findOne({ _id: details.locationId, active: true });
        if (!location) throw inputError('This pickup location is no longer available. Please choose another.');
        pickup = { ...pickup, ...snapshotLocation(location), locationId: location._id };
      }
    } else {
      for (const field of ['name', 'street', 'city', 'state', 'zip']) {
        readText(shippingAddress?.[field], `Shipping ${field}`, 200, true);
      }
    }
    const shippingRate = fulfillmentMethod === 'shipping' ? req.body.shippingRate : undefined;
    if (shippingRate && (!Number.isFinite(shippingRate.amount) || shippingRate.amount < 0)) {
      throw inputError('Invalid shipping amount');
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'No items provided' });
    }

    // Validate products and build line items
    const lineItems = [];
    const orderItems = [];

    for (const item of items) {
      if (!Number.isSafeInteger(item.quantity) || item.quantity < 1) throw inputError('Item quantities must be positive whole numbers');
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({ message: `Product not found: ${item.productId}` });
      }

      // Check size inventory if applicable. Truekin is unisex-only, but
      // products created before the unisex switch still carry size rows tagged
      // 'mens'/'womens', so fall back to a size-only match for those.
      if (item.size && product.sizes && product.sizes.length > 0) {
        const itemStyle = item.shirtStyle || 'unisex';
        const sizeEntry =
          product.sizes.find(
            (s) => s.size === item.size && (s.style || 'unisex') === itemStyle
          ) || product.sizes.find((s) => s.size === item.size);
        if (!sizeEntry) {
          return res.status(400).json({
            message: `Size ${item.size} not available for ${product.title}`,
          });
        }
        if (!sizeEntry.unlimited && sizeEntry.quantity < item.quantity) {
          return res.status(400).json({
            message: `Only ${sizeEntry.quantity} left in size ${item.size} for ${product.title}`,
          });
        }
        if (!sizeEntry.unlimited) {
          sizeEntry.quantity -= item.quantity;
          await product.save();
        }
      }

      const itemName = item.size
        ? `${product.title} (Unisex / ${item.size})`
        : `${product.title} (Unisex)`;

      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: itemName,
            description: product.description?.slice(0, 100) || product.title,
            images: product.imageUrls[0]
              ? [`${process.env.CLIENT_URL}${product.imageUrls[0]}`]
              : [],
          },
          unit_amount: product.price, // Already in cents
        },
        quantity: item.quantity,
      });

      orderItems.push({
        product: product._id,
        title: product.title,
        price: product.price,
        quantity: item.quantity,
        imageUrl: product.imageUrls[0] || '',
        color: item.color || null,
        size: item.size || null,
        shirtStyle: 'unisex',
      });
    }

    const itemsTotal = lineItems.reduce(
      (sum, li) => sum + li.price_data.unit_amount * li.quantity,
      0
    );

    // Shipping is surfaced to Stripe as a first-class shipping_option so it
    // appears as "Shipping" on the receipt and is tracked separately from items.
    const shippingOptions = [];
    if (shippingRate && shippingRate.amount) {
      shippingOptions.push({
        shipping_rate_data: {
          type: 'fixed_amount',
          fixed_amount: {
            amount: Math.round(shippingRate.amount * 100),
            currency: 'usd',
          },
          display_name: `${shippingRate.carrier} - ${shippingRate.service}`,
          delivery_estimate:
            typeof shippingRate.estimatedDays === 'number'
              ? {
                  minimum: { unit: 'business_day', value: shippingRate.estimatedDays },
                  maximum: { unit: 'business_day', value: shippingRate.estimatedDays },
                }
              : undefined,
        },
      });
    }

    const totalAmount = itemsTotal + (shippingRate?.amount ? Math.round(shippingRate.amount * 100) : 0);

    // Create order in DB — persist rateId so the webhook can auto-purchase the label
    const order = await Order.create({
      user: req.user?._id || undefined,
      guestEmail: guestEmail || undefined,
      items: orderItems,
      totalAmount,
      fulfillmentMethod,
      paymentMethod,
      pickup,
      shippingAddress: fulfillmentMethod === 'shipping' ? shippingAddress : undefined,
      status: 'pending',
      shippingRate: shippingRate
        ? {
            carrier: shippingRate.carrier,
            service: shippingRate.service,
            serviceToken: shippingRate.serviceToken,
            amount: shippingRate.amount,
            currency: shippingRate.currency || 'usd',
            estimatedDays: shippingRate.estimatedDays,
            rateId: shippingRate.rateId,
          }
        : undefined,
      shippoRateId: shippingRate?.rateId || undefined,
    });

    if (paymentMethod === 'pay_on_pickup') {
      await order.populate('user', 'name email');
      sendOrderConfirmation(order).catch((error) => console.error('Pickup confirmation email failed:', error.message));
      return res.status(201).json({ order });
    }

    // Create Stripe session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      shipping_options: shippingOptions.length ? shippingOptions : undefined,
      success_url: `${process.env.CLIENT_URL}/order-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/cart`,
      metadata: {
        orderId: order._id.toString(),
        shippoRateId: shippingRate?.rateId || '',
        fulfillmentMethod,
      },
      customer_email: req.user?.email || guestEmail || undefined,
    });

    order.stripeSessionId = session.id;
    await order.save();

    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(error.status || (error.name === 'ValidationError' ? 400 : 500)).json({ message: error.message });
  }
};

// Stripe Webhook Handler
exports.handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    if (process.env.STRIPE_WEBHOOK_SECRET && process.env.STRIPE_WEBHOOK_SECRET !== 'whsec_your_webhook_secret_here') {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } else {
      // For development without webhook secret
      event = JSON.parse(req.body.toString());
    }
  } catch (err) {
    console.error('Webhook Error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const orderId = session.metadata?.orderId;

    try {
      const order = await Order.findById(orderId).populate('user', 'name email');
      if (order && order.status === 'pending' && session.payment_status === 'paid') {
        order.status = 'paid';
        order.paymentStatus = 'paid';
        order.paidAt = new Date();
        order.stripePaymentIntentId = session.payment_intent;
        await order.save();
        console.log(`Order ${orderId} marked as paid`);
        sendOrderConfirmation(order).catch((e) =>
          console.error('Confirmation email failed:', e.message)
        );
      }
    } catch (err) {
      console.error('Error updating order:', err);
    }
  }

  // When a payment is refunded in Stripe, mark the order cancelled so admins
  // know to void the Shippo label.
  if (event.type === 'charge.refunded') {
    const charge = event.data.object;
    try {
      const order = await Order.findOne({ stripePaymentIntentId: charge.payment_intent });
      if (order) {
        order.status = 'cancelled';
        order.stripeRefundId = charge.refunds?.data?.[0]?.id || order.stripeRefundId;
        await order.save();
      }
    } catch (err) {
      console.error('Error handling refund:', err);
    }
  }

  res.json({ received: true });
};

// Get order by session ID (for success page)
exports.getOrderBySession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const order = await Order.findOne({ stripeSessionId: sessionId }).populate(
      'user', 'name email'
    );

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Verify payment with Stripe when the webhook has not arrived yet.
    if (order.status === 'pending') {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.payment_status !== 'paid') return res.json({ order });
      order.status = 'paid';
      order.paymentStatus = 'paid';
      order.paidAt = new Date();
      order.stripePaymentIntentId = session.payment_intent;
      await order.save();
      
      // Trigger confirmation email
      sendOrderConfirmation(order).catch((e) =>
        console.error('Confirmation email fallback failed:', e.message)
      );
    }

    res.json({ order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
