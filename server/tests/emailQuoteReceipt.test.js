const { test, mock, after } = require('node:test');
const assert = require('node:assert/strict');
const nodemailer = require('nodemailer');

const originalEnvironment = {
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASSWORD: process.env.SMTP_PASSWORD,
  EMAIL_FROM: process.env.EMAIL_FROM,
};

after(() => {
  mock.restoreAll();
  for (const [key, value] of Object.entries(originalEnvironment)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

test('without SMTP, a quote receipt reports that it was not sent', async () => {
  delete process.env.SMTP_USER;
  delete process.env.SMTP_PASSWORD;
  const email = require('../utils/email');
  const sent = await email.sendQuoteRequestConfirmation({
    _id: '507f1f77bcf86cd799439010',
    requestType: 'basic',
    name: 'Alex',
    email: 'alex@example.test',
    quantity: 24,
  });
  assert.equal(sent, false);
});

test('quick and studio submissions receive a branded acknowledgment without a price', async () => {
  process.env.SMTP_USER = 'anthony@codingcarranza.com';
  process.env.SMTP_PASSWORD = 'test-only-password';
  process.env.EMAIL_FROM = 'Truekin <anthony@codingcarranza.com>';

  const messages = [];
  mock.method(nodemailer, 'createTransport', () => ({
    sendMail: async (input) => { messages.push(input); return { messageId: `test-${messages.length}` }; },
  }));
  const email = require('../utils/email');
  const basicSent = await email.sendQuoteRequestConfirmation({
    _id: '507f1f77bcf86cd799439011',
    requestType: 'basic',
    name: 'Alex <Customer>',
    email: 'alex@example.test',
    quantity: 24,
    neededBy: 'October <event>',
  });
  const studioSent = await email.sendQuoteRequestConfirmation({
    _id: '507f1f77bcf86cd799439012',
    requestType: 'studio',
    productType: 'sticker',
    name: 'Sam',
    email: 'sam@example.test',
    quantity: 50,
  });

  assert.equal(basicSent, true);
  assert.equal(studioSent, true);
  assert.equal(messages.length, 2);
  assert.equal(messages[0].from, 'Truekin <anthony@codingcarranza.com>');
  assert.equal(messages[0].to, 'alex@example.test');
  assert.match(messages[0].subject, /Your request was sent to Truekin/);
  assert.match(messages[0].html, /Alex &lt;Customer&gt;/);
  assert.match(messages[0].html, /October &lt;event&gt;/);
  assert.doesNotMatch(messages[0].html, /Alex <Customer>/);
  assert.match(messages[0].text, /Your request was sent to Truekin/);
  assert.match(messages[0].text, /Quick quote request/);
  assert.equal(messages[1].to, 'sam@example.test');
  assert.match(messages[1].html, /Sticker studio design/);
  assert.match(messages[1].text, /Quantity: 50/);
  for (const message of messages) {
    assert.match(message.html, /within one business day/);
    assert.doesNotMatch(message.html, /\$\d/);
    assert.doesNotMatch(message.text, /\$\d/);
    assert.ok(message.attachments.some((attachment) => attachment.cid === 'truekin-logo'));
  }
});
