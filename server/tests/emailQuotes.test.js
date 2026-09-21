const { test, mock, after } = require('node:test');
const assert = require('node:assert/strict');
const nodemailer = require('nodemailer');

const originalEnvironment = {
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASSWORD: process.env.SMTP_PASSWORD,
  EMAIL_FROM: process.env.EMAIL_FROM,
  CLIENT_URL: process.env.CLIENT_URL,
};

after(() => {
  mock.restoreAll();
  for (const [key, value] of Object.entries(originalEnvironment)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

test('a saved custom quote uses the requested sender and includes proof, concepts and pricing', async () => {
  process.env.SMTP_USER = 'anthony@codingcarranza.com';
  process.env.SMTP_PASSWORD = 'test-only-password';
  process.env.EMAIL_FROM = 'Truekin <anthony@codingcarranza.com>';
  process.env.CLIENT_URL = 'https://truekin.example.test';

  let message;
  mock.method(nodemailer, 'createTransport', () => ({
    sendMail: async (input) => { message = input; return { messageId: 'test-message' }; },
  }));
  const email = require('../utils/email');
  const sent = await email.sendQuoteProposal({
    _id: '507f1f77bcf86cd799439011',
    name: 'Alex <Customer>',
    email: 'alex@example.test',
    designPreviewUrl: '/uploads/customer-proof.png',
    adminQuote: {
      quoteNumber: 'TKQ-TEST',
      validUntil: '2026-10-01',
      lineItems: [{ description: '50 custom stickers', quantity: 50, unitPrice: 200 }],
      concepts: [{ label: 'Alternate finish', imageUrl: '/uploads/concept.png' }],
      subtotal: 12500,
      shipping: 0,
      discount: 0,
      tax: 0,
      total: 12500,
      leadTime: '7 business days after approval',
      paymentTerms: 'Deposit due after approval',
      customerMessage: 'Ready for your review.',
    },
  });

  assert.equal(sent, true);
  assert.equal(message.from, 'Truekin <anthony@codingcarranza.com>');
  assert.equal(message.to, 'alex@example.test');
  assert.match(message.subject, /TKQ-TEST/);
  assert.match(message.html, /https:\/\/truekin\.example\.test\/uploads\/customer-proof\.png/);
  assert.match(message.html, /https:\/\/truekin\.example\.test\/uploads\/concept\.png/);
  assert.match(message.html, /50 custom stickers/);
  assert.match(message.html, /Alex &lt;Customer&gt;/);
  assert.match(message.text, /Quote total: \$125\.00/);
});
