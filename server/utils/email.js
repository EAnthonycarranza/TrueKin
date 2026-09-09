/**
 * Transactional email.
 *
 * Truekin is a pickup shop: every storefront order is collected in person, so
 * these templates lead with the pickup handoff rather than a delivery address.
 * sendShippingNotification stays for orders an admin ships by hand from the
 * order console — the shipping tooling lives there, not on the storefront.
 *
 * Layout notes, because HTML email is not HTML:
 *   • Everything is tables with inline styles. No flex, no grid, no <style>
 *     rules beyond the one media query Outlook ignores harmlessly.
 *   • The logo is attached with a Content-ID rather than linked to a URL, so
 *     it renders without the app being publicly reachable and without a
 *     tracking-pixel-shaped request. Clients that block images still get the
 *     alt text, and the wordmark is repeated as live text underneath.
 *   • Every message ships a text/plain alternative. It reads on watches and
 *     in plain-text clients, and it measurably helps deliverability.
 */
const path = require('path');
const nodemailer = require('nodemailer');
const { pickupContact } = require('./fulfillment');

let cachedTransporter = null;

const LOGO_PATH = path.join(__dirname, '..', 'assets', 'truekin-email-logo.png');
const LOGO_CID = 'truekin-logo';

/* Brand tokens, mirrored from client/src/index.css. */
const C = {
  bone: '#f4f1ea',
  paper: '#ece7dc',
  card: '#ffffff',
  ink: '#0a0a0a',
  body: '#5a564c',
  muted: '#8a8578',
  line: '#d9d3c2',
  brand: '#c8301f',
  wash: '#faf7f0',
};

const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const MONO = "ui-monospace,SFMono-Regular,Menlo,Consolas,monospace";

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

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function orderRef(order) {
  return order._id.toString().slice(-8).toUpperCase();
}

function itemLine(item) {
  const extras = ['Unisex', item.size ? `Size ${item.size}` : null, item.color || null]
    .filter(Boolean)
    .join(' &middot; ');

  return `
    <tr>
      <td style="padding:14px 0;border-bottom:1px solid ${C.line};font-family:${SANS};">
        <div style="font-weight:700;color:${C.ink};font-size:15px;line-height:1.35;">${escapeHtml(item.title)}</div>
        <div style="color:${C.muted};font-size:12px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;margin-top:5px;">Qty ${item.quantity} &middot; ${extras}</div>
      </td>
      <td style="padding:14px 0;border-bottom:1px solid ${C.line};text-align:right;vertical-align:top;white-space:nowrap;font-family:${SANS};font-weight:700;color:${C.ink};font-size:15px;">
        ${money(item.price * item.quantity)}
      </td>
    </tr>
  `;
}

/** Section label — the small uppercase rule that separates blocks. */
function label(text) {
  return `<div style="font-family:${SANS};font-size:11px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;color:${C.muted};padding-bottom:10px;border-bottom:1.5px solid ${C.ink};margin-bottom:4px;">${text}</div>`;
}

/** Bordered panel used for pickup details, totals and callouts. */
function panel(inner, { accent = C.ink, background = C.wash } = {}) {
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;margin:0 0 28px;">
    <tr>
      <td style="background-color:${background};border:1px solid ${C.line};border-left:4px solid ${accent};padding:22px 24px;font-family:${SANS};">
        ${inner}
      </td>
    </tr>
  </table>`;
}

/** Bulletproof-ish CTA: a padded table cell, which Outlook renders correctly. */
function button(href, text) {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto;">
    <tr>
      <td align="center" style="background-color:${C.ink};border-radius:3px;">
        <a href="${href}" style="display:inline-block;padding:15px 40px;font-family:${SANS};font-size:13px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:#ffffff;text-decoration:none;">${text}</a>
      </td>
    </tr>
  </table>`;
}

/**
 * Headline block: eyebrow chip, big title, rule, lead paragraph.
 * `accent` colours the chip and the second line of the title.
 */
function headline({ chip, title, accentTitle, lead, accent = C.brand }) {
  return `
  <div style="margin-bottom:30px;font-family:${SANS};">
    <span style="display:inline-block;padding:5px 10px;border:1.5px solid ${accent};color:${accent};font-size:10px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;">${chip}</span>
    <h1 style="font-size:34px;font-weight:800;margin:18px 0 0;color:${C.ink};letter-spacing:-0.01em;line-height:1.05;">
      ${title}${accentTitle ? `<br/><span style="color:${accent};">${accentTitle}</span>` : ''}
    </h1>
    <div style="width:44px;height:3px;background-color:${C.ink};margin:18px 0;"></div>
    <p style="font-size:15px;color:${C.body};margin:0;line-height:1.65;">${lead}</p>
  </div>`;
}

function wrapEmail(bodyHtml, preheader = '') {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
    <meta name="color-scheme" content="light"/>
    <meta name="supported-color-schemes" content="light"/>
    <title>Truekin</title>
    <style>
      @media only screen and (max-width: 600px) {
        .container { width: 100% !important; }
        .content { padding: 32px 22px !important; }
        .header, .footer { padding: 26px 22px !important; }
        .h1 { font-size: 28px !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background-color:${C.bone};font-family:${SANS};color:${C.ink};-webkit-font-smoothing:antialiased;">
    <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;visibility:hidden;opacity:0;">${escapeHtml(preheader)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${C.bone};">
      <tr>
        <td align="center" style="padding:36px 12px;">
          <table class="container" role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:${C.card};border:1.5px solid ${C.ink};">

            <!-- Header: the mark, then the wordmark as live text so the
                 identity survives an image-blocking client. -->
            <tr>
              <td class="header" style="padding:34px 48px 28px;background-color:${C.card};text-align:center;border-bottom:1.5px solid ${C.ink};">
                <img src="cid:${LOGO_CID}" width="110" alt="Truekin" style="display:block;margin:0 auto 10px;width:110px;max-width:110px;height:auto;border:0;outline:none;text-decoration:none;"/>
                <div style="font-size:10px;letter-spacing:0.32em;color:${C.brand};text-transform:uppercase;font-weight:800;">Faith Worn Well</div>
              </td>
            </tr>

            <tr>
              <td class="content" style="padding:42px 48px;">
                ${bodyHtml}
              </td>
            </tr>

            <tr>
              <td class="footer" style="padding:28px 48px;background-color:${C.paper};border-top:1.5px solid ${C.ink};text-align:center;font-family:${SANS};">
                <div style="font-weight:800;font-size:10px;color:${C.ink};letter-spacing:0.22em;text-transform:uppercase;margin-bottom:10px;">Small-batch &middot; Made to order &middot; Pressed by hand</div>
                <p style="margin:0;font-size:13px;color:${C.body};line-height:1.65;">
                  Questions? Just reply to this email &mdash; it reaches a real person.<br/>
                  Every Truekin order is collected in person. We&rsquo;ll arrange the handoff with you.
                </p>
                <p style="margin:14px 0 0;font-size:11px;color:${C.muted};letter-spacing:0.06em;">
                  &copy; ${new Date().getFullYear()} Truekin
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

/** Greeting name: pickup orders have no shippingAddress, so use who's collecting. */
function firstName(order) {
  const name = order.pickup?.contactName || order.shippingAddress?.name || '';
  return name.trim().split(/\s+/)[0] || 'friend';
}

/**
 * Pickup (or, for admin-shipped orders, shipping) details.
 *
 * A pickup order may have no location yet — naming a spot is optional at
 * checkout and we coordinate it afterwards — so the no-location case gets its
 * own copy rather than an empty address box.
 */
function fulfillmentBlock(order, { waitNote = true } = {}) {
  const muted = (t) => `<span style="color:${C.body};font-weight:400;">${t}</span>`;

  if (order.fulfillmentMethod === 'pickup' && order.pickup) {
    const p = order.pickup;
    const contact = pickupContact(p);
    const line = (heading, value) => value
      ? `<p style="margin:16px 0 0;color:${C.ink};line-height:1.65;font-size:14px;"><strong>${heading}</strong><br/>${muted(escapeHtml(value).replace(/\n/g, '<br/>'))}</p>`
      : '';

    const place = p.street
      ? `<p style="margin:0;color:${C.ink};line-height:1.65;font-size:15px;font-weight:700;">
          ${escapeHtml(p.name || '')}<br/>
          ${muted(`${escapeHtml(p.street)}<br/>${escapeHtml(p.city || '')}, ${escapeHtml(p.state || '')} ${escapeHtml(p.zip || '')}`)}
        </p>`
      : `<p style="margin:0;color:${C.ink};line-height:1.65;font-size:15px;font-weight:700;">
          We&rsquo;ll arrange your pickup spot<br/>
          ${muted('You didn&rsquo;t need to choose one &mdash; we&rsquo;ll be in touch to sort a place and a time that suits you.')}
        </p>`;

    return panel(`
      ${label('Your pickup')}
      <div style="height:16px;"></div>
      ${place}
      ${line('Hours', p.hours)}
      ${line('Pickup instructions', p.instructions)}
      ${line('Notes on your order', p.orderInstructions)}
      ${line('Your notes to us', p.customerInstructions)}
      <p style="margin:16px 0 0;color:${C.ink};line-height:1.65;font-size:14px;">
        <strong>Coordinating with you</strong><br/>
        ${muted(`${escapeHtml(contact.name)} &middot; <a href="mailto:${escapeHtml(contact.email)}" style="color:${C.brand};text-decoration:none;font-weight:700;">${escapeHtml(contact.email)}</a>`)}
      </p>
      ${waitNote ? `<p style="margin:18px 0 0;padding-top:16px;border-top:1px solid ${C.line};color:${C.muted};font-size:13px;line-height:1.6;">
        Please wait until your order says <strong style="color:${C.ink};">Ready for pickup</strong> before you set out &mdash; we&rsquo;ll email you the moment it is.
      </p>` : ''}
    `);
  }

  return panel(`
    ${label('Shipping to')}
    <div style="height:16px;"></div>
    <p style="margin:0;color:${C.ink};line-height:1.65;font-size:15px;font-weight:700;">
      ${escapeHtml(order.shippingAddress?.name || '')}<br/>
      ${muted(`${escapeHtml(order.shippingAddress?.street || '')}<br/>${escapeHtml(order.shippingAddress?.city || '')}, ${escapeHtml(order.shippingAddress?.state || '')} ${escapeHtml(order.shippingAddress?.zip || '')}`)}
    </p>`);
}

/** Reference + date strip that sits under the headline. */
function metaStrip(order) {
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${C.wash};border:1px solid ${C.line};margin-bottom:30px;">
    <tr>
      <td style="padding:16px 20px;font-family:${SANS};">
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.18em;color:${C.muted};font-weight:800;margin-bottom:5px;">Order</div>
        <div style="font-family:${MONO};font-weight:700;font-size:15px;color:${C.ink};">#${orderRef(order)}</div>
      </td>
      <td style="padding:16px 20px;text-align:right;font-family:${SANS};">
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.18em;color:${C.muted};font-weight:800;margin-bottom:5px;">Placed</div>
        <div style="font-weight:700;font-size:15px;color:${C.ink};">${new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
      </td>
    </tr>
  </table>`;
}

function orderTable(order) {
  const shippingRow = order.shippingRate?.amount
    ? `<tr>
        <td style="padding:12px 0 0;font-family:${SANS};color:${C.body};font-size:14px;">Shipping &middot; ${escapeHtml(order.shippingRate.carrier || '')} ${escapeHtml(order.shippingRate.service || '')}</td>
        <td style="padding:12px 0 0;text-align:right;font-family:${SANS};color:${C.ink};font-size:14px;font-weight:700;">$${order.shippingRate.amount.toFixed(2)}</td>
      </tr>`
    : `<tr>
        <td style="padding:12px 0 0;font-family:${SANS};color:${C.body};font-size:14px;">Local pickup</td>
        <td style="padding:12px 0 0;text-align:right;font-family:${SANS};color:${C.ink};font-size:14px;font-weight:700;">Free</td>
      </tr>`;

  return `
    ${label('What you ordered')}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:6px;">
      ${order.items.map(itemLine).join('')}
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:30px;">
      ${shippingRow}
      <tr>
        <td style="padding:16px 0 0;font-family:${SANS};font-weight:800;font-size:19px;color:${C.ink};border-top:2px solid ${C.ink};">Total</td>
        <td style="padding:16px 0 0;font-family:${SANS};font-weight:800;font-size:19px;text-align:right;color:${C.ink};border-top:2px solid ${C.ink};">${money(order.totalAmount)}</td>
      </tr>
    </table>`;
}

/** Payment callout for pay-at-pickup orders, which owe nothing today. */
function paymentBlock(order) {
  if (order.paymentMethod !== 'pay_on_pickup') return '';
  const settled = order.paymentStatus === 'paid';
  return panel(`
    ${label(settled ? 'Payment' : 'Paying for this order')}
    <div style="height:16px;"></div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="font-family:${SANS};font-size:14px;color:${C.body};">${settled ? 'Paid in full' : 'Due today'}</td>
        <td style="font-family:${SANS};font-size:20px;font-weight:800;text-align:right;color:${C.ink};">${settled ? money(order.totalAmount) : '$0.00'}</td>
      </tr>
    </table>
    ${settled ? '' : `<p style="margin:14px 0 0;color:${C.body};font-size:13px;line-height:1.6;">
      <strong style="color:${C.ink};">${money(order.totalAmount)}</strong> is due when you collect your order. We&rsquo;ll sort the payment method out with you &mdash; nothing to do online.
    </p>`}
  `, { accent: C.brand, background: C.card });
}

/** Text/plain alternative. Same information, no markup. */
function plainText(lines) {
  return lines.filter((l) => l !== null && l !== undefined).join('\n');
}

function plainFooter(order) {
  return [
    '',
    `Track your order: ${trackUrl(order)}`,
    '',
    '--',
    'TRUEKIN — Faith Worn Well',
    'Small-batch. Made to order. Pressed by hand.',
    'Reply to this email and it reaches a real person.',
  ];
}

function plainPickup(order, { waitNote = true } = {}) {
  if (order.fulfillmentMethod !== 'pickup' || !order.pickup) return [];
  const p = order.pickup;
  const contact = pickupContact(p);
  return [
    '',
    'YOUR PICKUP',
    p.street
      ? `${p.name || ''}\n${p.street}\n${p.city || ''}, ${p.state || ''} ${p.zip || ''}`.trim()
      : 'We\'ll arrange your pickup spot — we\'ll be in touch with a place and a time that suits you.',
    p.hours ? `Hours: ${p.hours}` : null,
    p.instructions ? `Pickup instructions: ${p.instructions}` : null,
    p.orderInstructions ? `Notes on your order: ${p.orderInstructions}` : null,
    `Coordinating with you: ${contact.name} (${contact.email})`,
    waitNote ? 'Please wait until your order says "Ready for pickup" before setting out.' : null,
  ];
}

/** One place that knows how to actually put a message on the wire. */
async function deliver({ to, subject, html, text, tag }) {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn(`Email not configured, skipping ${tag}.`);
    return;
  }
  try {
    const info = await transporter.sendMail({
      from: `Truekin <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
      to,
      subject,
      html,
      text,
      attachments: [{
        filename: 'truekin.png',
        path: LOGO_PATH,
        cid: LOGO_CID,
        contentDisposition: 'inline',
      }],
    });
    console.log(`[Email] ${tag} sent: ${info.messageId}`);
  } catch (err) {
    console.error(`[Email] ${tag} failed:`, err.message);
  }
}

exports.sendOrderConfirmation = async function sendOrderConfirmation(order) {
  const to = order.guestEmail || order.user?.email;
  if (!to) return;

  const isPickup = order.fulfillmentMethod === 'pickup';
  const deferred = order.paymentMethod === 'pay_on_pickup' && order.paymentStatus !== 'paid';

  const body = `
    ${headline({
      chip: 'Order received',
      title: 'Thanks,',
      accentTitle: `${escapeHtml(firstName(order))}.`,
      lead: isPickup
        ? `Your order is in and the press is warming up. Everything here is yours to collect &mdash; we&rsquo;ll be in touch to arrange the handoff, and we&rsquo;ll email you again the moment it&rsquo;s ready.`
        : `Your order is in and the press is warming up. We&rsquo;ll email you again as soon as it&rsquo;s on its way.`,
    })}
    ${metaStrip(order)}
    ${orderTable(order)}
    ${fulfillmentBlock(order)}
    ${paymentBlock(order)}
    ${button(trackUrl(order), 'Track your order')}
    <p style="text-align:center;color:${C.muted};font-size:12px;margin:20px 0 0;font-family:${SANS};line-height:1.6;">
      Keep order <strong style="color:${C.ink};font-family:${MONO};">#${orderRef(order)}</strong> handy &mdash; you&rsquo;ll want it when you collect.
    </p>
  `;

  const text = plainText([
    `Thanks, ${firstName(order)}.`,
    '',
    isPickup
      ? 'Your order is in and the press is warming up. We\'ll be in touch to arrange the handoff, and we\'ll email you again the moment it\'s ready to collect.'
      : 'Your order is in and the press is warming up. We\'ll email you again as soon as it\'s on its way.',
    '',
    `Order #${orderRef(order)} — ${new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
    '',
    'WHAT YOU ORDERED',
    ...order.items.map((i) => `- ${i.title} x${i.quantity}${i.size ? ` (${i.size})` : ''} — ${money(i.price * i.quantity)}`),
    isPickup ? 'Local pickup — Free' : null,
    `Total: ${money(order.totalAmount)}`,
    ...plainPickup(order),
    ...(deferred ? ['', `Due today: $0.00. ${money(order.totalAmount)} is due when you collect.`] : []),
    ...plainFooter(order),
  ]);

  await deliver({
    to,
    subject: `Order #${orderRef(order)} received — Truekin`,
    html: wrapEmail(body, isPickup
      ? `We've got your order. We'll arrange your pickup and let you know when it's ready.`
      : `We've got your order. We'll let you know when it's on its way.`),
    text,
    tag: `order confirmation #${orderRef(order)}`,
  });
};

/**
 * Ready for pickup — the counterpart to a shipping notification for a shop
 * where every storefront order is collected in person. Fired when an admin
 * moves the order to ready_for_pickup.
 */
exports.sendPickupReadyNotification = async function sendPickupReadyNotification(order) {
  const to = order.guestEmail || order.user?.email;
  if (!to || order.fulfillmentMethod !== 'pickup') return;

  const contact = pickupContact(order.pickup);
  const owing = order.paymentMethod === 'pay_on_pickup' && order.paymentStatus !== 'paid';

  const body = `
    ${headline({
      chip: 'Ready for pickup',
      title: 'It&rsquo;s pressed.',
      accentTitle: 'Come get it.',
      accent: C.brand,
      lead: `Order <strong style="color:${C.ink};">#${orderRef(order)}</strong> is finished, folded and waiting for you${order.pickup?.name ? ` at ${escapeHtml(order.pickup.name)}` : ''}.`,
    })}
    ${fulfillmentBlock(order, { waitNote: false })}
    ${owing ? panel(`
      ${label('Bring payment')}
      <div style="height:16px;"></div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="font-family:${SANS};font-size:14px;color:${C.body};">Due at pickup</td>
          <td style="font-family:${SANS};font-size:20px;font-weight:800;text-align:right;color:${C.ink};">${money(order.totalAmount)}</td>
        </tr>
      </table>
    `, { accent: C.brand, background: C.card }) : ''}
    ${panel(`
      ${label('Bring this with you')}
      <div style="height:14px;"></div>
      <div style="font-family:${MONO};font-size:26px;font-weight:700;color:${C.ink};letter-spacing:0.08em;">#${orderRef(order)}</div>
      <p style="margin:10px 0 0;color:${C.body};font-size:13px;line-height:1.6;">Your order number is all we need to hand it over.</p>
    `)}
    ${button(trackUrl(order), 'View your order')}
    <p style="text-align:center;color:${C.muted};font-size:12px;margin:20px 0 0;font-family:${SANS};line-height:1.6;">
      Need a different time or place? Email
      <a href="mailto:${escapeHtml(contact.email)}" style="color:${C.brand};text-decoration:none;font-weight:700;">${escapeHtml(contact.email)}</a>
      and we&rsquo;ll work around you.
    </p>
  `;

  const text = plainText([
    `It's pressed. Come get it.`,
    '',
    `Order #${orderRef(order)} is finished, folded and waiting for you${order.pickup?.name ? ` at ${order.pickup.name}` : ''}.`,
    ...plainPickup(order, { waitNote: false }),
    '',
    `Bring this with you: #${orderRef(order)}`,
    ...(owing ? [`Due at pickup: ${money(order.totalAmount)}`] : []),
    '',
    `Need a different time or place? Email ${contact.email} and we'll work around you.`,
    ...plainFooter(order),
  ]);

  await deliver({
    to,
    subject: `Order #${orderRef(order)} is ready for pickup — Truekin`,
    html: wrapEmail(body, `Your Truekin order is pressed and waiting for you.`),
    text,
    tag: `pickup ready #${orderRef(order)}`,
  });
};

/**
 * Shipped — only for orders an admin ships by hand from the order console.
 * The storefront is pickup-only, so nothing here is reachable by a customer.
 */
exports.sendShippingNotification = async function sendShippingNotification(order) {
  const to = order.guestEmail || order.user?.email;
  if (!to || !order.shippoTrackingNumber) return;

  const carrier = [order.shippingRate?.carrier, order.shippingRate?.service].filter(Boolean).join(' &middot; ');

  const body = `
    ${headline({
      chip: 'In transit',
      title: 'On the',
      accentTitle: 'way.',
      lead: `Order <strong style="color:${C.ink};">#${orderRef(order)}</strong> has left the press and is with the carrier.`,
    })}
    ${panel(`
      ${label('Tracking number')}
      <div style="height:14px;"></div>
      <div style="font-family:${MONO};font-size:22px;font-weight:700;color:${C.ink};letter-spacing:0.06em;word-break:break-all;">${escapeHtml(order.shippoTrackingNumber)}</div>
      ${carrier ? `<p style="margin:10px 0 0;color:${C.body};font-size:13px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;">${carrier}</p>` : ''}
      ${order.trackingEta ? `<p style="margin:8px 0 0;color:${C.body};font-size:13px;">Estimated delivery ${new Date(order.trackingEta).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>` : ''}
    `)}
    ${button(order.shippoTrackingUrl || trackUrl(order), 'Track shipment')}
    <p style="text-align:center;color:${C.muted};font-size:12px;margin:20px 0 0;font-family:${SANS};">
      Need the full history? <a href="${trackUrl(order)}" style="color:${C.brand};text-decoration:none;font-weight:700;">View your order</a>
    </p>
  `;

  const text = plainText([
    'On the way.',
    '',
    `Order #${orderRef(order)} has left the press and is with the carrier.`,
    '',
    `Tracking number: ${order.shippoTrackingNumber}`,
    [order.shippingRate?.carrier, order.shippingRate?.service].filter(Boolean).join(' · ') || null,
    order.trackingEta ? `Estimated delivery: ${new Date(order.trackingEta).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : null,
    order.shippoTrackingUrl ? `Track: ${order.shippoTrackingUrl}` : null,
    ...plainFooter(order),
  ]);

  await deliver({
    to,
    subject: `Order #${orderRef(order)} is on the way — Truekin`,
    html: wrapEmail(body, `Your Truekin package has been handed to the carrier.`),
    text,
    tag: `shipping notification #${orderRef(order)}`,
  });
};
