const nodemailer = require('nodemailer');

let cachedTransporter = null;

function getTransporter() {
  if (cachedTransporter) return cachedTransporter;
  if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    return null;
  }
  cachedTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 465,
    secure: Number(process.env.SMTP_PORT || 465) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
  return cachedTransporter;
}

function money(cents) {
  return `$${(Number(cents || 0) / 100).toFixed(2)}`;
}

function itemLine(item) {
  const style = item.shirtStyle === 'womens' ? "Women's" : "Men's";
  const extras = [style, item.size ? `Size ${item.size}` : null, item.color || null]
    .filter(Boolean)
    .join(' · ');
  
  return `
    <tr>
      <td style="padding:16px 0;border-bottom:1px solid #d9d3c2;">
        <div style="font-family:'Oswald', sans-serif;font-weight:700;color:#0a0a0a;font-size:16px;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.02em;">${escapeHtml(item.title)}</div>
        <div style="color:#5a564c;font-size:13px;font-weight:500;">QTY ${item.quantity} &bull; ${escapeHtml(extras)}</div>
      </td>
      <td style="padding:16px 0;border-bottom:1px solid #d9d3c2;text-align:right;vertical-align:top;white-space:nowrap;font-family:'Oswald', sans-serif;font-weight:700;color:#0a0a0a;font-size:15px;letter-spacing:0.02em;">
        ${money(item.price * item.quantity)}
      </td>
    </tr>
  `;
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function wrapEmail(bodyHtml, preheader = '') {
  return `
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1"/>
      <title>Truekin</title>
      <style>
        @media only screen and (max-width: 600px) {
          .container { width: 100% !important; border-radius: 0 !important; border: none !important; }
          .content { padding: 32px 20px !important; }
          .header { padding: 32px 20px !important; }
        }
      </style>
    </head>
    <body style="margin:0;padding:0;background-color:#f4f1ea;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0a0a0a;-webkit-font-smoothing:antialiased;">
      <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;visibility:hidden;opacity:0;">${escapeHtml(preheader)}</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f1ea;">
        <tr>
          <td align="center" style="padding:40px 10px;">
            <table class="container" role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#ffffff;border:1.5px solid #0a0a0a;border-radius:4px;overflow:hidden;box-shadow:8px 8px 0px 0px rgba(10,10,10,0.05);">
              <!-- Header -->
              <tr>
                <td class="header" style="padding:32px 48px;background-color:#ffffff;text-align:center;border-bottom:1.5px solid #0a0a0a;">
                  <div style="font-weight:900;letter-spacing:0.2em;font-size:24px;color:#0a0a0a;text-transform:uppercase;font-family:'Anton', sans-serif;">TRUEKIN</div>
                  <div style="font-size:10px;letter-spacing:0.3em;color:#c8301f;text-transform:uppercase;font-weight:700;margin-top:4px;">Faith Worn Well</div>
                </td>
              </tr>
              <!-- Main Content -->
              <tr>
                <td class="content" style="padding:48px;">
                  ${bodyHtml}
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="padding:32px 48px;background-color:#ece7dc;border-top:1.5px solid #0a0a0a;text-align:center;">
                  <div style="font-weight:800;font-size:11px;color:#0a0a0a;letter-spacing:0.2em;text-transform:uppercase;margin-bottom:12px;">Truekin Official</div>
                  <p style="margin:0;font-size:13px;color:#5a564c;line-height:1.6;font-weight:500;">
                    Questions? Reply to this email and we'll help you out.<br/>
                    &copy; ${new Date().getFullYear()} Truekin. Sourced Premium Blanks. Pressed by Hand.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>`;
}

function trackUrl(order) {
  const base = process.env.CLIENT_URL || 'http://localhost:5173';
  const email = encodeURIComponent(order.guestEmail || order.user?.email || '');
  return `${base}/track?order=${order._id}&email=${email}`;
}

exports.sendOrderConfirmation = async function sendOrderConfirmation(order) {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn('Email not configured, skipping order confirmation.');
    return;
  }

  const to = order.guestEmail || order.user?.email;
  if (!to) return;

  const itemsHtml = order.items.map(itemLine).join('');
  const shippingLine = order.shippingRate?.amount
    ? `
    <tr>
      <td style="padding:10px 0;color:#5a564c;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Shipping</td>
      <td style="padding:10px 0;text-align:right;color:#0a0a0a;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">
        ${escapeHtml(order.shippingRate.carrier || '')} ${escapeHtml(order.shippingRate.service || '')}<br/>
        <span style="color:#5a564c;font-weight:500;">$${order.shippingRate.amount.toFixed(2)}</span>
      </td>
    </tr>`
    : '';

  const body = `
    <div style="margin-bottom:32px;">
      <span style="display:inline-block;padding:4px 8px;border:1.5px solid #c8301f;color:#c8301f;font-size:10px;font-weight:800;letter-spacing:0.15em;text-transform:uppercase;margin-bottom:16px;">Order Confirmed</span>
      <h1 style="font-size:36px;font-weight:400;margin:0 0 12px;color:#0a0a0a;letter-spacing:0.01em;text-transform:uppercase;font-family:'Anton', sans-serif;line-height:0.95;">Welcome to<br/><span style="color:#c8301f;">Truekin.</span></h1>
      <div style="width:40px;height:3px;background-color:#0a0a0a;margin:20px 0;"></div>
      <p style="font-size:15px;color:#5a564c;margin:0;line-height:1.6;font-weight:500;">
        Thanks for your order, ${escapeHtml(order.shippingAddress?.name?.split(' ')[0] || 'friend')}! We've received your design and we're getting the press ready.
      </p>
    </div>

    <div style="background-color:#faf7f0;border:1px solid #d9d3c2;padding:20px;margin-bottom:32px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td>
            <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.15em;color:#8a8578;font-weight:800;margin-bottom:4px;">Reference</div>
            <div style="font-family:monospace;font-weight:700;font-size:14px;color:#0a0a0a;">#${order._id.toString().slice(-8)}</div>
          </td>
          <td style="text-align:right;">
            <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.15em;color:#8a8578;font-weight:800;margin-bottom:4px;">Date</div>
            <div style="font-weight:700;font-size:14px;color:#0a0a0a;text-transform:uppercase;">${new Date(order.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</div>
          </td>
        </tr>
      </table>
    </div>

    <h3 style="font-size:12px;font-weight:800;margin:0 0 16px;text-transform:uppercase;letter-spacing:0.15em;color:#8a8578;border-bottom:1.5px solid #f4f1ea;padding-bottom:8px;">Order Summary</h3>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:20px;">
      ${itemsHtml}
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:32px;">
      ${shippingLine}
      <tr>
        <td style="padding:20px 0 0;font-weight:800;font-size:22px;color:#0a0a0a;border-top:2px solid #0a0a0a;text-transform:uppercase;letter-spacing:0.02em;font-family:'Oswald', sans-serif;">Total</td>
        <td style="padding:20px 0 0;font-weight:800;font-size:22px;text-align:right;color:#0a0a0a;border-top:2px solid #0a0a0a;font-family:'Oswald', sans-serif;">${money(order.totalAmount)}</td>
      </tr>
    </table>

    <div style="margin-bottom:32px;padding:24px;background-color:#ffffff;border:1.5px solid #d9d3c2;border-left:4px solid #0a0a0a;">
      <h3 style="font-size:11px;font-weight:800;margin:0 0 12px;text-transform:uppercase;letter-spacing:0.15em;color:#8a8578;">Shipping Address</h3>
      <p style="margin:0;color:#0a0a0a;line-height:1.6;font-size:14px;font-weight:600;">
        ${escapeHtml(order.shippingAddress?.name || '')}<br/>
        <span style="color:#5a564c;font-weight:500;">
          ${escapeHtml(order.shippingAddress?.street || '')}<br/>
          ${escapeHtml(order.shippingAddress?.city || '')}, ${escapeHtml(order.shippingAddress?.state || '')} ${escapeHtml(order.shippingAddress?.zip || '')}
        </span>
      </p>
    </div>

    <div style="text-align:center;">
      <a href="${trackUrl(order)}" style="display:inline-block;background-color:#0a0a0a;color:#ffffff;padding:16px 36px;border-radius:4px;text-decoration:none;font-weight:700;font-size:14px;text-transform:uppercase;letter-spacing:0.1em;font-family:'Oswald', sans-serif;">
        Track Your Order
      </a>
      <p style="color:#8a8578;font-size:12px;margin:24px 0 0;font-weight:500;text-transform:uppercase;letter-spacing:0.05em;">
        View full details: <a href="${trackUrl(order)}" style="color:#c8301f;text-decoration:none;font-weight:700;">Order Timeline</a>
      </p>
    </div>
  `;

  try {
    console.log(`[Email] Attempting to send order confirmation for #${order._id.toString().slice(-8)} to ${to}...`);
    const info = await transporter.sendMail({
      from: `Truekin <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
      to,
      subject: `Order #${order._id.toString().slice(-8)} Confirmed — Truekin`,
      html: wrapEmail(body, `Welcome to the Kin. Your design is in safe hands.`),
    });
    console.log(`[Email] Order confirmation sent: ${info.messageId}`);
  } catch (err) {
    console.error('[Email] sendOrderConfirmation failed:', err.message);
  }
};

exports.sendShippingNotification = async function sendShippingNotification(order) {
  const transporter = getTransporter();
  if (!transporter) return;

  const to = order.guestEmail || order.user?.email;
  if (!to || !order.shippoTrackingNumber) return;

  const body = `
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-block;padding:4px 8px;border:1.5px solid #3f7a3a;color:#3f7a3a;font-size:10px;font-weight:800;letter-spacing:0.15em;text-transform:uppercase;margin-bottom:16px;">In Transit</div>
      <h1 style="font-size:36px;font-weight:400;margin:0 0 12px;color:#0a0a0a;letter-spacing:0.01em;text-transform:uppercase;font-family:'Anton', sans-serif;line-height:0.95;">On the<br/><span style="color:#c8301f;">Way.</span></h1>
      <div style="width:40px;height:3px;background-color:#0a0a0a;margin:20px auto;"></div>
      <p style="font-size:15px;color:#5a564c;margin:0;line-height:1.6;font-weight:500;">
        Great news. Order <strong>#${order._id.toString().slice(-8)}</strong> has left the press and is headed to your door.
      </p>
    </div>

    <div style="background-color:#faf7f0;border:1.5px solid #0a0a0a;padding:28px;margin-bottom:32px;text-align:center;">
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.2em;color:#8a8578;font-weight:800;margin-bottom:8px;">Tracking Number</div>
      <div style="font-family:monospace;font-weight:800;font-size:22px;color:#0a0a0a;letter-spacing:0.05em;margin-bottom:12px;">${escapeHtml(order.shippoTrackingNumber)}</div>
      <div style="font-size:12px;color:#5a564c;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;">
        ${escapeHtml(order.shippingRate?.carrier || '')} &bull; ${escapeHtml(order.shippingRate?.service || '')}
      </div>
    </div>

    <div style="text-align:center;margin-bottom:32px;">
      <a href="${order.shippoTrackingUrl || trackUrl(order)}" style="display:inline-block;background-color:#0a0a0a;color:#ffffff;padding:16px 36px;border-radius:4px;text-decoration:none;font-weight:700;font-size:14px;text-transform:uppercase;letter-spacing:0.1em;font-family:'Oswald', sans-serif;">
        Track Shipment
      </a>
    </div>

    <div style="border-top:1.5px solid #f4f1ea;padding-top:24px;text-align:center;">
      <p style="margin:0;font-size:12px;color:#8a8578;font-weight:500;text-transform:uppercase;letter-spacing:0.05em;">
        Need the full history? <a href="${trackUrl(order)}" style="color:#0a0a0a;font-weight:700;text-decoration:none;border-bottom:1.5px solid #d9d3c2;">View Order Timeline</a>
      </p>
    </div>
  `;

  try {
    console.log(`[Email] Attempting to send shipping notification for #${order._id.toString().slice(-8)} to ${to}...`);
    const info = await transporter.sendMail({
      from: `Truekin <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
      to,
      subject: `Order #${order._id.toString().slice(-8)} is on the way — Truekin`,
      html: wrapEmail(body, `Your Truekin package has been handed to the carrier.`),
    });
    console.log(`[Email] Shipping notification sent: ${info.messageId}`);
  } catch (err) {
    console.error('[Email] sendShippingNotification failed:', err.message);
  }
};