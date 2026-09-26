const { test, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const Quote = require('../models/Quote');
const Product = require('../models/Product');
const SiteSettings = require('../models/SiteSettings');
const storage = require('../utils/storage');
const email = require('../utils/email');
const sharp = require('sharp');
const quotes = require('../controllers/quoteController');
const quoteRoutes = require('../routes/quotes');

const response = () => ({
  code: 200,
  headers: {},
  status(code) { this.code = code; return this; },
  set(name, value) { this.headers[name] = value; return this; },
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
  mock.method(email, 'sendQuoteRequestConfirmation', async () => true);
});

afterEach(() => { mock.restoreAll(); });

test('a verified quote action creates the inquiry', async () => {
  const res = response();
  await quotes.createQuote({ body: body(), ip: '127.0.0.1' }, res);
  assert.equal(res.code, 201);
  assert.equal(created.email, 'alex@example.test');
  assert.equal(created.quantity, 24);
  assert.equal(created.requestType, 'basic');
  assert.equal(email.sendQuoteRequestConfirmation.mock.callCount(), 1);
  assert.equal(email.sendQuoteRequestConfirmation.mock.calls[0].arguments[0], created);
  assert.equal(res.data.confirmationEmailSent, true);
});

test('a mail failure does not lose a saved quote or invite a duplicate submission', async () => {
  email.sendQuoteRequestConfirmation.mock.mockImplementation(async () => false);
  const res = response();
  await quotes.createQuote({ body: body(), ip: '127.0.0.1' }, res);
  assert.equal(res.code, 201);
  assert.equal(res.data.quote.id, 'quote-id');
  assert.equal(res.data.confirmationEmailSent, false);
  assert.ok(created);
});

test('an unexpected mail exception still leaves the submitted quote in the admin workspace', async () => {
  mock.method(console, 'error', () => {});
  email.sendQuoteRequestConfirmation.mock.mockImplementation(async () => { throw new Error('SMTP unavailable'); });
  const res = response();
  await quotes.createQuote({ body: body(), ip: '127.0.0.1' }, res);
  assert.equal(res.code, 201);
  assert.equal(res.data.confirmationEmailSent, false);
  assert.ok(created);
});

test('quote requests require a validly formatted email address before verification or storage', async () => {
  const res = response();
  await quotes.createQuote({ body: body({ email: 'not-an-email' }), ip: '127.0.0.1' }, res);
  assert.equal(res.code, 400);
  assert.match(res.data.message, /valid email address/i);
  assert.equal(created, null);
  assert.equal(global.fetch.mock.callCount(), 0);
  assert.equal(email.sendQuoteRequestConfirmation.mock.callCount(), 0);
});

test('quote quantities must be whole numbers rather than parseable prefixes', async () => {
  for (const quantity of ['24shirts', '2.5', '1e3']) {
    const res = response();
    await quotes.createQuote({ body: body({ quantity }), ip: '127.0.0.1' }, res);
    assert.equal(res.code, 400);
    assert.match(res.data.message, /quantity/i);
  }
  assert.equal(created, null);
  assert.equal(global.fetch.mock.callCount(), 0);
});

test('studio quote stores artwork and specifications without computing or returning a price', async () => {
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
  assert.match(created.designPreviewToken, /^[a-f0-9]{48}$/);
  assert.equal(created.designPreviewUrl, '/uploads/quote-design-test.png');
  assert.deepEqual(created.designSidePreviews, [{ side: 'front', imageUrl: '/uploads/quote-design-test.png' }]);
  assert.equal(created.specifications.rush, true);
  assert.equal(created.specifications.stickerSize, '4in');
  assert.equal(created.estimate, undefined);
  assert.equal(res.data.estimate, undefined);
  assert.equal(res.data.quote.estimate, undefined);
  assert.equal(email.sendQuoteRequestConfirmation.mock.callCount(), 1);
  assert.equal(email.sendQuoteRequestConfirmation.mock.calls[0].arguments[0].designPreviewUrl, '/uploads/quote-design-test.png');
  assert.equal(res.data.confirmationEmailSent, true);
});

test('a private preview token returns only the submitted studio design and side mockups', async () => {
  const token = 'a'.repeat(48);
  const design = { studio: 'truekin-unified', version: 1, productType: 'tshirt', prints: { front: 'data:image/png;base64,abc' } };
  mock.method(Quote, 'findOne', async (filter) => {
    assert.deepEqual(filter, { designPreviewToken: token, requestType: 'studio' });
    return {
      productType: 'tshirt', designData: JSON.stringify(design), email: 'private@example.test', details: 'Private notes',
      designSidePreviews: [{ side: 'front', imageUrl: '/uploads/front.png' }],
      adminQuote: { quoteNumber: 'TKQ-SAFE', total: 9900, internalNotes: 'Never expose this' },
    };
  });
  const res = response();
  await quotes.getQuoteDesignPreview({ params: { token } }, res);
  assert.equal(res.code, 200);
  assert.equal(res.headers['Cache-Control'], 'private, no-store');
  assert.deepEqual(res.data.sample, {
    productType: 'tshirt', design,
    sidePreviews: [{ side: 'front', label: 'Front', imageUrl: '/uploads/front.png' }],
    quoteNumber: 'TKQ-SAFE',
  });
  assert.equal(JSON.stringify(res.data).includes('private@example.test'), false);
  assert.equal(JSON.stringify(res.data).includes('9900'), false);
  assert.equal(JSON.stringify(res.data).includes('Never expose this'), false);
});

test('invalid or unknown design preview links reveal no quote information', async () => {
  mock.method(Quote, 'findOne', async () => null);
  const malformed = response();
  await quotes.getQuoteDesignPreview({ params: { token: 'not-a-token' } }, malformed);
  assert.equal(malformed.code, 404);
  assert.equal(Quote.findOne.mock.callCount(), 0);
  const missing = response();
  await quotes.getQuoteDesignPreview({ params: { token: 'b'.repeat(48) } }, missing);
  assert.equal(missing.code, 404);
  assert.match(missing.data.message, /unavailable/i);
});

test('shirt studio quotes preserve a mockup for every side in the admin brief', async () => {
  const png = await sharp({ create: { width: 24, height: 24, channels: 4, background: '#446343' } }).png().toBuffer();
  mock.method(storage, 'saveImage', async (name) => `/uploads/${name.match(/quote-design-(front|back|left|right)/)[1]}.png`);
  const file = { buffer: png, mimetype: 'image/png' };
  const design = { studio: 'truekin-unified', version: 1, productType: 'tshirt', surfaces: {}, prints: {} };
  const res = response();
  await quotes.createQuote({
    body: body({ requestType: 'studio', productType: 'tshirt', designData: JSON.stringify(design), designSideIds: JSON.stringify(['back', 'left', 'right']) }),
    files: { designPreview: [file], designSidePreviews: [file, file, file] },
    ip: '127.0.0.1',
  }, res);
  assert.equal(res.code, 201);
  assert.equal(created.designPreviewUrl, '/uploads/front.png');
  assert.deepEqual(created.designSidePreviews, [
    { side: 'front', imageUrl: '/uploads/front.png' },
    { side: 'back', imageUrl: '/uploads/back.png' },
    { side: 'left', imageUrl: '/uploads/left.png' },
    { side: 'right', imageUrl: '/uploads/right.png' },
  ]);
  assert.equal(storage.saveImage.mock.callCount(), 4);
});

test('a partial set of shirt side previews cannot be attached as a complete studio proof', async () => {
  const png = await sharp({ create: { width: 24, height: 24, channels: 4, background: '#446343' } }).png().toBuffer();
  mock.method(storage, 'saveImage', async () => '/uploads/unexpected.png');
  const file = { buffer: png, mimetype: 'image/png' };
  const res = response();
  await quotes.createQuote({
    body: body({ requestType: 'studio', productType: 'tshirt', designData: JSON.stringify({ studio: 'truekin-unified', productType: 'tshirt' }), designSideIds: JSON.stringify(['back']) }),
    files: { designPreview: [file], designSidePreviews: [file] },
    ip: '127.0.0.1',
  }, res);
  assert.equal(res.code, 400);
  assert.match(res.data.message, /every product side/i);
  assert.equal(storage.saveImage.mock.callCount(), 0);
  assert.equal(created, null);
});

test('failed side storage removes mockups already uploaded for that request', async () => {
  const png = await sharp({ create: { width: 24, height: 24, channels: 4, background: '#446343' } }).png().toBuffer();
  let savedCount = 0;
  mock.method(storage, 'saveImage', async () => {
    savedCount += 1;
    if (savedCount === 2) throw new Error('Storage unavailable');
    return '/uploads/front.png';
  });
  mock.method(storage, 'deleteImage', async () => {});
  const file = { buffer: png, mimetype: 'image/png' };
  const res = response();
  await quotes.createQuote({
    body: body({ requestType: 'studio', productType: 'tshirt', designData: JSON.stringify({ studio: 'truekin-unified', productType: 'tshirt' }), designSideIds: JSON.stringify(['back', 'left', 'right']) }),
    files: { designPreview: [file], designSidePreviews: [file, file, file] },
    ip: '127.0.0.1',
  }, res);
  assert.equal(res.code, 500);
  assert.equal(created, null);
  assert.deepEqual(storage.deleteImage.mock.calls.map((call) => call.arguments[0]), ['/uploads/front.png']);
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
  await quotes.createQuote({ body: body({ requestType: 'studio', productType: 'sticker' }) }, res);
  assert.equal(res.code, 400);
  assert.match(res.data.message, /unavailable/i);
});

test('the public quote router no longer exposes a pricing endpoint', () => {
  assert.equal(quoteRoutes.stack.some((layer) => layer.route?.path === '/estimate'), false);
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

test('admin can select a catalog product preview without trusting the submitted image URL', async () => {
  const productId = '507f1f77bcf86cd799439012';
  const quote = { _id: '507f1f77bcf86cd799439011', quantity: 24, status: 'new', adminQuote: { concepts: [] }, save: async () => {} };
  mock.method(Quote, 'findById', async () => quote);
  mock.method(Product, 'findById', async () => ({ _id: productId, title: 'Truekin Shirt', description: 'Premium cotton', imageUrls: ['/uploads/real-product.png'] }));
  const res = response();
  await quotes.adminSaveQuoteBuilder({
    params: { id: quote._id },
    body: { payload: JSON.stringify({ lineItems: [{ description: 'Custom shirts', quantity: 24, unitPrice: 2000 }], productPreview: { sourceProductId: productId, imageUrl: 'https://attacker.example/image.png' } }) },
    files: {},
  }, res);
  assert.equal(res.code, 200);
  assert.equal(quote.adminQuote.productPreview.imageUrl, '/uploads/real-product.png');
  assert.equal(quote.adminQuote.total, 48000);
});

test('admin can select a submitted studio side without trusting a forged image URL', async () => {
  const quote = {
    _id: '507f1f77bcf86cd799439011', quantity: 24, productType: 'tshirt', status: 'new',
    designSidePreviews: [{ side: 'front', imageUrl: '/uploads/front.png' }, { side: 'back', imageUrl: '/uploads/back.png' }],
    adminQuote: { concepts: [] }, save: async () => {},
  };
  mock.method(Quote, 'findById', async () => quote);
  const res = response();
  await quotes.adminSaveQuoteBuilder({
    params: { id: quote._id },
    body: { payload: JSON.stringify({ lineItems: [{ description: 'Custom shirts', quantity: 24, unitPrice: 2000 }], productPreview: { sourceStudioSide: 'back', title: 'Back design', imageUrl: 'https://attacker.example/image.png' } }) },
    files: {},
  }, res);
  assert.equal(res.code, 200);
  assert.equal(quote.adminQuote.productPreview.sourceStudioSide, 'back');
  assert.equal(quote.adminQuote.productPreview.imageUrl, '/uploads/back.png');
});

test('admin cannot select a studio side that was not attached to the request', async () => {
  const quote = {
    _id: '507f1f77bcf86cd799439011', quantity: 24, productType: 'tshirt', status: 'new',
    designSidePreviews: [{ side: 'front', imageUrl: '/uploads/front.png' }],
    adminQuote: { concepts: [] }, save: async () => {},
  };
  mock.method(Quote, 'findById', async () => quote);
  const res = response();
  await quotes.adminSaveQuoteBuilder({
    params: { id: quote._id },
    body: { payload: JSON.stringify({ lineItems: [{ description: 'Custom shirts', quantity: 24, unitPrice: 2000 }], productPreview: { sourceStudioSide: 'back', imageUrl: '/uploads/forged.png' } }) },
    files: {},
  }, res);
  assert.equal(res.code, 400);
  assert.match(res.data.message, /attached/i);
});

test('admin can upload a one-off product preview for a custom proposal', async () => {
  const png = await sharp({ create: { width: 24, height: 24, channels: 4, background: '#446343' } }).png().toBuffer();
  const quote = { _id: '507f1f77bcf86cd799439011', quantity: 12, status: 'new', adminQuote: { concepts: [] }, save: async () => {} };
  mock.method(Quote, 'findById', async () => quote);
  mock.method(storage, 'saveImage', async () => '/uploads/custom-product.png');
  const res = response();
  await quotes.adminSaveQuoteBuilder({
    params: { id: quote._id },
    body: { payload: JSON.stringify({ lineItems: [{ description: 'Custom product', quantity: 12, unitPrice: 1200 }], productPreview: { title: 'Embroidered tee', description: 'Black cotton, front logo' } }) },
    files: { productImage: [{ buffer: png, mimetype: 'image/png' }] },
  }, res);
  assert.equal(res.code, 200);
  assert.equal(quote.adminQuote.productPreview.title, 'Embroidered tee');
  assert.equal(quote.adminQuote.productPreview.imageUrl, '/uploads/custom-product.png');
  assert.equal(quote.adminQuote.total, 14400);
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

test('sending a legacy studio proposal saves a private 3D preview token before emailing its link', async () => {
  let saveCount = 0;
  let tokenSeenByEmail = '';
  const quote = {
    _id: '507f1f77bcf86cd799439011', requestType: 'studio', productType: 'tshirt', designData: '{}',
    email: 'alex@example.test', status: 'new', adminQuote: { lineItems: [{ description: 'Shirts', quantity: 1, unitPrice: 200 }] },
    save: async () => { saveCount += 1; },
  };
  mock.method(Quote, 'findById', async () => quote);
  mock.method(email, 'sendQuoteProposal', async (sentQuote) => { tokenSeenByEmail = sentQuote.designPreviewToken; return true; });
  const res = response();
  await quotes.adminSendQuoteProposal({ params: { id: quote._id } }, res);
  assert.equal(res.code, 200);
  assert.match(tokenSeenByEmail, /^[a-f0-9]{48}$/);
  assert.equal(saveCount, 2);
  assert.equal(quote.status, 'quoted');
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
  assert.equal(email.sendQuoteRequestConfirmation.mock.callCount(), 0);
});
