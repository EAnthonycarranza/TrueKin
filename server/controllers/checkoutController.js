const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Order = require('../models/Order');
const Product = require('../models/Product');
const { sendOrderConfirmation } = require('../utils/email');

// Create Stripe Checkout Session
exports.createCheckoutSession = async (req, res) => {
  try {
    const { items, shippingAddress, guestEmail, shippingRate } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'No items provided' });
    }

    // Validate products and build line items
    const lineItems = [];
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({ message: `Product not found: ${item.productId}` });
      }

      // Check size inventory if applicable — match by size + style
      if (item.size && product.sizes && product.sizes.length > 0) {
        const itemStyle = item.shirtStyle || 'mens';
        const sizeEntry = product.sizes.find(
          (s) => s.size === item.size && (s.style || 'mens') === itemStyle
        );
        if (!sizeEntry) {
          return res.status(400).json({
            message: `Size ${item.size} (${itemStyle}) not available for ${product.title}`,
          });
        }
        if (!sizeEntry.unlimited && sizeEntry.quantity < item.quantity) {
          return res.status(400).json({
            message: `Only ${sizeEntry.quantity} left in size ${item.size} (${itemStyle}) for ${product.title}`,
          });
        }
        if (!sizeEntry.unlimited) {
          sizeEntry.quantity -= item.quantity;
          await product.save();
        }
      }

      const styleSuffix = item.shirtStyle === 'womens' ? "Women's" : "Men's";
      const itemName = item.size
        ? `${product.title} (${styleSuffix} / ${item.size})`
        : `${product.title} (${styleSuffix})`;

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
        shirtStyle: item.shirtStyle || 'mens',
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
      shippingAddress,
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
      },
      customer_email: req.user?.email || guestEmail || undefined,
    });

    order.stripeSessionId = session.id;
    await order.save();

    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ message: error.message });
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
      if (order) {
        order.status = 'paid';
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

    // Fallback: If webhook didn't hit yet (common in local dev without Stripe CLI),
    // we mark it paid here and send the email so the user gets confirmation.
    if (order.status === 'pending') {
      console.log(`[Dev Fallback] Marking order ${order._id} as paid from success page`);
      order.status = 'paid';
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
