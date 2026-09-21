const { test } = require('node:test');
const assert = require('node:assert/strict');
const { quoteEstimate } = require('../utils/quotePricing');

test('T-shirt tiers and print locations change the nonbinding estimate', () => {
  const small = quoteEstimate({ productType: 'tshirt', quantity: 10, printLocations: 1 });
  const bulk = quoteEstimate({ productType: 'tshirt', quantity: 100, printLocations: 2 });
  assert.equal(small.unitPrice, 2400);
  assert.equal(bulk.unitPrice, 1550);
  assert.equal(small.rush, 0);
  assert.equal(bulk.low, Math.round(bulk.subtotal * 0.9));
  assert.equal(bulk.high, Math.round(bulk.subtotal * 1.12));
});

test('sticker size and rush allowance are included in the estimate', () => {
  const standard = quoteEstimate({ productType: 'sticker', quantity: 50, stickerSize: '3in' });
  const largeRush = quoteEstimate({ productType: 'sticker', quantity: 50, stickerSize: '4in', rush: true });
  assert.ok(largeRush.unitPrice > standard.unitPrice);
  assert.ok(largeRush.rush > 0);
  assert.equal(largeRush.rushRequested, true);
  assert.equal(largeRush.subtotal, largeRush.production + largeRush.setup + largeRush.rush);
});

test('estimation rejects invalid products, quantities, and print locations', () => {
  assert.throws(() => quoteEstimate({ productType: 'hat', quantity: 20 }), /T-shirt or sticker/);
  assert.throws(() => quoteEstimate({ productType: 'sticker', quantity: 0 }), /Quantity/);
  assert.throws(() => quoteEstimate({ productType: 'tshirt', quantity: 20, printLocations: 5 }), /Print locations/);
});
