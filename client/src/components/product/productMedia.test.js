import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProductMedia, readProductDesign } from './productMedia.js';

const design = overrides => ({ studio: 'truekin-unified', version: 1, productType: 'tshirt', garmentColor: '#FFFFFF', prints: { front: '/front-art.png', back: '/back-art.png' }, ...overrides });
const product = overrides => ({ _id: 'shirt', title: 'Shield', availableColors: ['#FFFFFF', '#FFC0CB'], imageUrls: ['/gallery.png'], designData: design(), ...overrides });

test('unified designs show photo mockup angles, not a 3D canvas by default', () => {
  const media = buildProductMedia(product(), '#FFFFFF');
  assert.deepEqual(media.items.map(item => item.id), ['render-front', 'render-back', 'photo-0']);
  assert.equal(media.canExplore3D, true);
});

test('only decorated sleeves are included in the photo gallery', () => {
  const media = buildProductMedia(product({ designData: design({ prints: { front: '/f.png', left: '/l.png' } }) }));
  assert.deepEqual(media.items.filter(item => item.kind === 'render').map(item => item.view), ['front', 'back', 'left']);
});

test('hat photos use the front panel without shirt backs or sleeve controls', () => {
  const media = buildProductMedia(product({ productType: 'hat', designData: design({ productType: 'hat' }), imageUrls: [] }));
  assert.equal(media.productType, 'hat');
  assert.deepEqual(media.items.map(item => item.view), ['front']);
});

test('sticker media exposes its decorated front and dimensional viewer only', () => {
  const media = buildProductMedia(product({ productType: 'sticker', designData: design({ productType: 'sticker', prints: { front: '/sticker-art.png' } }), imageUrls: [] }));
  assert.equal(media.productType, 'sticker');
  assert.deepEqual(media.items.map(item => item.view), ['front']);
  assert.equal(media.canExplore3D, true);
});

test('selected-color photographs are matched regardless of hex case', () => {
  const media = buildProductMedia(product({ colorImages: { '#ffc0cb': { front: '/pink-front.png', back: '/pink-back.png' } } }), '#FFC0CB');
  assert.deepEqual(media.items.map(item => item.url), ['/pink-front.png', '/pink-back.png']);
  assert.equal(media.color, '#FFC0CB');
});

test('partial color photo sets get a rendered missing angle, not a different-color photo', () => {
  const media = buildProductMedia(product({ colorImages: { '#ffc0cb': { front: '/pink.png' } } }), '#ffc0cb');
  assert.deepEqual(media.items.map(item => item.id), ['photo-front', 'render-back']);
});

test('changing color excludes unlabelled default-color gallery photos', () => {
  const p = product();
  assert.ok(buildProductMedia(p, '#FFFFFF').items.some(item => item.url === '/gallery.png'));
  assert.ok(buildProductMedia(p, '#FFC0CB').items.every(item => item.kind === 'render'));
});

test('duplicate image URLs and missing entries are not repeated', () => {
  const media = buildProductMedia(product({ designData: null, imageUrls: ['/a.png', null, '', '/a.png', '/b.png'] }));
  assert.deepEqual(media.items.map(item => item.url), ['/a.png', '/b.png']);
});

test('products without saved designs retain ordinary photos and no 3D action', () => {
  const media = buildProductMedia(product({ designData: null }));
  assert.equal(media.canExplore3D, false);
  assert.equal(media.items[0].kind, 'photo');
});

test('empty and malformed products fail gracefully', () => {
  for (const bad of [null, '{', 'null', '[]', '42', {}, { prints: [] }, { productType: 'hat' }]) {
    const media = buildProductMedia({ designData: bad });
    assert.equal(media.design, null);
    assert.deepEqual(media.items, []);
    assert.equal(media.canExplore3D, false);
  }
});

test('unsupported newer studio versions fall back to uploaded photographs', () => {
  const media = buildProductMedia(product({ designData: design({ version: 100 }) }));
  assert.equal(media.design, null);
  assert.equal(media.items[0].url, '/gallery.png');
});

test('valid blank studio garments remain viewable', () => {
  const media = buildProductMedia(product({ designData: design({ prints: {} }), imageUrls: [] }));
  assert.equal(media.canExplore3D, true);
  assert.equal(media.items.length, 2);
});

test('unexported artwork is never silently replaced with a blank garment', () => {
  const data = design({ prints: {}, surfaces: { front: { objects: [{ type: 'text', text: 'Faith' }] } } });
  const media = buildProductMedia(product({ designData: data }));
  assert.equal(media.canExplore3D, false);
  assert.deepEqual(media.items.map(item => item.url), ['/gallery.png']);
});

test('legacy cropped prints and full-board textures stay distinguishable', () => {
  const data = readProductDesign(JSON.stringify({ frontPrint: '/front.png', frontTexture: '/obsolete.png', backTexture: '/back-full.png', tshirtColor: '#ffc0cb' }));
  assert.deepEqual(data.prints, { front: '/front.png' });
  assert.deepEqual(data.legacyTextures, { back: '/back-full.png' });
  assert.equal(data.garmentColor, '#FFC0CB');
});

test('saved raster imports retain their cropped/full-board meaning', () => {
  const data = readProductDesign(design({ prints: {}, surfaces: { front: { raster: { src: '/cropped.png', cropped: true } }, back: { raster: { src: '/full.png', cropped: false } } } }));
  assert.equal(data.prints.front, '/cropped.png');
  assert.equal(data.legacyTextures.back, '/full.png');
});

test('photos can still follow color choices without any live design', () => {
  const media = buildProductMedia(product({ designData: null, colorImages: { '#ffc0cb': { front: '/pink.png' } } }), '#FFC0CB');
  assert.deepEqual(media.items.map(item => item.url), ['/pink.png']);
  assert.equal(media.canExplore3D, false);
});

test('input products and saved design objects are never modified', () => {
  const p = product(), original = structuredClone(p);
  buildProductMedia(p, '#FFC0CB');
  assert.deepEqual(p, original);
});
