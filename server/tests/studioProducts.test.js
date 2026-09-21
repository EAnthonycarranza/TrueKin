const { test, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const Product = require('../models/Product');
const SiteSettings = require('../models/SiteSettings');
const products = require('../controllers/productController');
const settings = require('../controllers/settingsController');

const response = () => ({
  code: 200,
  status(code) { this.code = code; return this; },
  json(data) { this.data = data; return this; },
});

const productBody = (type) => ({
  title: 'Custom drop', description: 'Artfully made', price: '12.00', productType: type,
  sizes: JSON.stringify([{ size: 'One Size', quantity: 20, style: 'unisex' }]),
});

afterEach(() => mock.restoreAll());

test('sticker creation defaults on and produces a one-size sticker product', async () => {
  let saved;
  mock.method(SiteSettings, 'findOne', () => ({ select: async () => null }));
  mock.method(Product, 'create', async (input) => { saved = input; return input; });
  const res = response();
  await products.createProduct({ body: productBody('sticker'), files: [] }, res);
  assert.equal(res.code, 201);
  assert.equal(saved.productType, 'sticker');
  assert.equal(saved.category, 'Sticker');
  assert.deepEqual(saved.sizes.map((size) => size.size), ['One Size']);
});

test('new hats stay off by default while existing hats remain editable', async () => {
  mock.method(SiteSettings, 'findOne', () => ({ select: async () => null }));
  const blocked = response();
  await products.createProduct({ body: productBody('hat'), files: [] }, blocked);
  assert.equal(blocked.code, 400);
  assert.match(blocked.data.message, /disabled/i);

  const existing = { productType: 'hat', sizes: [], imageUrls: [], save: async () => {} };
  mock.method(Product, 'findById', async () => existing);
  const updated = response();
  await products.updateProduct({ params: { id: 'hat-id' }, body: { title: 'Still editable' }, files: [] }, updated);
  assert.equal(updated.code, 200);
  assert.equal(existing.title, 'Still editable');
});

test('admin switch enables new hats and can pause new stickers', async () => {
  mock.method(SiteSettings, 'findOne', () => ({ select: async () => ({ studioTools: { hatEnabled: true, stickerEnabled: false } }) }));
  let saved;
  mock.method(Product, 'create', async (input) => { saved = input; return input; });
  const hat = response();
  await products.createProduct({ body: productBody('hat'), files: [] }, hat);
  assert.equal(hat.code, 201);
  assert.equal(saved.category, 'Hat');

  const sticker = response();
  await products.createProduct({ body: productBody('sticker'), files: [] }, sticker);
  assert.equal(sticker.code, 400);
  assert.match(sticker.data.message, /disabled/i);
});

test('studio availability saves booleans and rejects malformed switches', async () => {
  let update;
  mock.method(SiteSettings, 'findOneAndUpdate', async (_filter, change) => { update = change.$set.studioTools; });
  const saved = response();
  await settings.updateStudioSettings({ body: { hatEnabled: true, stickerEnabled: true } }, saved);
  assert.equal(saved.code, 200);
  assert.deepEqual(update, { hatEnabled: true, stickerEnabled: true });

  const invalid = response();
  await settings.updateStudioSettings({ body: { hatEnabled: 'true', stickerEnabled: true } }, invalid);
  assert.equal(invalid.code, 400);
});
