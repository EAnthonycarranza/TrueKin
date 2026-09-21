const { test, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const Quote = require('../models/Quote');
const SiteSettings = require('../models/SiteSettings');
const storage = require('../utils/storage');
const email = require('../utils/email');
const sharp = require('sharp');
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
  assert.equal(created.requestType, 'basic');
});

test('studio quote recalculates the estimate and stores editable art with a durable preview', async () => {
  const png = await sharp({ create: { width: 24, height: 24, channels: 4, background: '#446343' } }).png().toBuffer();
  mock.method(SiteSettings, 'findOne', () => ({ select: async () => ({ studioTools: { stickerEnabled: true } }) }));
  mock.method(storage, 'saveImage', async () => '/uploads/quote-design-test.png');
  const design = { studio: 'truekin-unified', version: 1, productType: 'sticker', surfaces: { front: { objects: [] } }, prints: {} };
  const res = response();
  await quotes.createQuote({
    body: body({ requestType: 'studio', productType: 'sticker', quantity: '50', designData: JSON.stringify(design), specifications: JSON.stringify({ stickerSize: '4in', rush: true }), estimate: { total: 1 } }),
    file: { buffer: png, mimetype: 'image/png' },
    ip: '127.0.0.1',
  }, res);
  assert.equal(res.code, 201);
  assert.equal(created.requestType, 'studio');
  assert.equal(created.productType, 'sticker');
  assert.equal(created.designData, JSON.stringify(design));
  assert.equal(created.designPreviewUrl, '/uploads/quote-design-test.png');
  assert.equal(created.specifications.rush, true);
  assert.ok(created.estimate.subtotal > 50);
  assert.equal(created.estimate.subtotal, created.estimate.production + created.estimate.setup + created.estimate.rush);
});

test('studio quote requires a matching editable design and preview before creating anything', async () => {
  const missingDesign = response();
  await quotes.createQuote({ body: body({ requestType: 'studio', productType: 'tshirt' }), ip: '127.0.0.1' }, missingDesign);
  assert.equal(missingDesign.code, 400);
  assert.equal(created, null);

  const mismatched = response();
  await quotes.createQuote({ body: body({ requestType: 'studio', productType: 'tshirt', designData: JSON.stringify({ studio: 'truekin-unified', productType: 'sticker' }) }), ip: '127.0.0.1' }, mismatched);
  assert.equal(mismatched.code, 400);
  assert.equal(created, null);
});

test('sticker studio quotes honor the admin availability switch', async () => {
  mock.method(SiteSettings, 'findOne', () => ({ select: async () => ({ studioTools: { stickerEnabled: false } }) }));
  const res = response();
  await quotes.getEstimate({ body: { productType: 'sticker', quantity: 50 } }, res);
  assert.equal(res.code, 400);
  assert.match(res.data.message, /unavailable/i);
});

test('admin quote builder computes money on the server and never trusts client totals', async () => {
  const quote = { _id: '507f1f77bcf86cd799439011', quantity: 24, status: 'new', adminQuote: { concepts: [] }, save: async () => {} };
  mock.method(Quote, 'findById', async () => quote);
  const res = response();
  await quotes.adminSaveQuoteBuilder({
    params: { id: quote._id },
    body: { payload: JSON.stringify({ quoteNumber: 'TKQ-001', lineItems: [{ description: 'Stickers', quantity: 50, unitPrice: 200 }], setupFee: 2500, shipping: 500, discount: 1000, taxRate: 8, total: 1 }) },
    files: [],
  }, res);
  assert.equal(res.code, 200);
  assert.equal(quote.adminQuote.subtotal, 12500);
  assert.equal(quote.adminQuote.tax, 960);
  assert.equal(quote.adminQuote.total, 12960);
  assert.equal(quote.status, 'new');
});

test('sending a saved proposal only marks it quoted after delivery succeeds', async () => {
  const quote = { _id: '507f1f77bcf86cd799439011', email: 'alex@example.test', status: 'new', adminQuote: { lineItems: [{ description: 'Stickers', quantity: 1, unitPrice: 200 }] }, save: async () => {} };
  mock.method(Quote, 'findById', async () => quote);
  mock.method(email, 'sendQuoteProposal', async () => false);
  const failed = response();
  await quotes.adminSendQuoteProposal({ params: { id: quote._id } }, failed);
  assert.equal(failed.code, 503);
  assert.equal(quote.status, 'new');
  email.sendQuoteProposal.mock.mockImplementation(async () => true);
  const sent = response();
  await quotes.adminSendQuoteProposal({ params: { id: quote._id } }, sent);
  assert.equal(sent.code, 200);
  assert.equal(quote.status, 'quoted');
  assert.ok(quote.adminQuote.lastSentAt instanceof Date);
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
