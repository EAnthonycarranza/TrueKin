const { test, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const Quote = require('../models/Quote');
const quotes = require('../controllers/quoteController');

const response = () => ({
  code: 200,
  status(code) { this.code = code; return this; },
  json(data) { this.data = data; return this; },
});

const body = (extra = {}) => ({
  name: 'Alex',
  email: 'alex@example.test',
  quantity: 24,
  details: 'Two-color shirts for our fall event.',
  recaptchaToken: 'quote-token',
  ...extra,
});

let recaptchaResult;
let created;

beforeEach(() => {
  process.env.RECAPTCHA_SECRET_KEY = 'recaptcha-test-secret';
  process.env.RECAPTCHA_MIN_SCORE = '0.5';
  recaptchaResult = { success: true, score: 0.9, action: 'quote_submit', hostname: 'localhost' };
  created = null;
  mock.method(global, 'fetch', async (_url, options) => {
    assert.equal(options.body.get('response'), 'quote-token');
    return { ok: true, status: 200, json: async () => recaptchaResult };
  });
  mock.method(Quote, 'create', async (data) => {
    created = { _id: 'quote-id', createdAt: new Date(), ...data };
    return created;
  });
});

afterEach(() => { mock.restoreAll(); });

test('a verified quote action creates the inquiry', async () => {
  const res = response();
  await quotes.createQuote({ body: body(), ip: '127.0.0.1' }, res);
  assert.equal(res.code, 201);
  assert.equal(created.email, 'alex@example.test');
  assert.equal(created.quantity, 24);
});

test('quotes reject missing, mismatched, and low-score reCAPTCHA results', async () => {
  const missing = response();
  await quotes.createQuote({ body: body({ recaptchaToken: undefined }), ip: '127.0.0.1' }, missing);
  assert.equal(missing.code, 400);
  assert.equal(created, null);

  recaptchaResult = { success: true, score: 0.9, action: 'checkout_submit', hostname: 'localhost' };
  const mismatched = response();
  await quotes.createQuote({ body: body(), ip: '127.0.0.1' }, mismatched);
  assert.equal(mismatched.code, 403);
  assert.equal(created, null);

  recaptchaResult = { success: true, score: 0.1, action: 'quote_submit', hostname: 'localhost' };
  const suspicious = response();
  await quotes.createQuote({ body: body(), ip: '127.0.0.1' }, suspicious);
  assert.equal(suspicious.code, 403);
  assert.equal(created, null);
});
