import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BOARD, STUDIO_ID, STUDIO_VERSION, SURFACES, emptyDocument, makeHistory,
  normalizeDocument, parseDesign, printRect, serializableDocument, surfaceInfo,
} from './studioDocument.js';

const artwork = (id, extra = {}) => ({
  type: 'IText', studioId: id, studioName: id, text: id,
  left: 310, top: 420, scaleX: 1.3, scaleY: 0.8, angle: 18,
  fill: '#181818', ...extra,
});
const raster = `data:image/png;base64,${'A'.repeat(160)}`;
const roundTrip = document => normalizeDocument(JSON.stringify(serializableDocument(document)));

test('new products have separate documents and only supported surfaces', () => {
  const shirt = emptyDocument('tshirt');
  const secondShirt = emptyDocument('tshirt');
  const hat = emptyDocument('hat');
  const sticker = emptyDocument('sticker');
  assert.deepEqual(Object.keys(shirt.surfaces), ['front', 'back', 'left', 'right']);
  assert.deepEqual(Object.keys(hat.surfaces), ['front']);
  assert.deepEqual(Object.keys(sticker.surfaces), ['front']);
  shirt.surfaces.front.objects.push(artwork('front'));
  shirt.prints.front = raster;
  assert.deepEqual(shirt.surfaces.back.objects, []);
  assert.deepEqual(secondShirt.surfaces.front.objects, []);
  assert.deepEqual(hat.surfaces.front.objects, []);
  assert.deepEqual(secondShirt.prints, {});
  assert.deepEqual(hat.prints, {});
  assert.deepEqual(sticker.prints, {});
});

test('all print rectangles stay inside the shared artboard', () => {
  for (const [product, surfaces] of Object.entries(SURFACES)) {
    for (const surface of surfaces) {
      const rect = printRect(product, surface.id);
      assert.ok(rect.width > 0 && rect.height > 0, `${product}/${surface.id} has positive dimensions`);
      assert.ok(rect.left >= 0 && rect.top >= 0);
      assert.ok(rect.left + rect.width <= BOARD.width);
      assert.ok(rect.top + rect.height <= BOARD.height);
    }
  }
  const hat = printRect('hat');
  assert.ok(Math.abs(hat.width / hat.height - 1.5) < 0.001, 'hat front print is 3:2');
  assert.equal(surfaceInfo('hat', 'back').id, 'front');
  assert.equal(surfaceInfo('sticker', 'back').id, 'front');
  assert.equal(surfaceInfo('unknown', 'back').id, 'back');
});

test('sticker artwork and print survive saving with a single front surface', () => {
  const original = emptyDocument('sticker');
  original.garmentColor = '#c28b32';
  original.surfaces.front.objects.push(artwork('sticker-wordmark'));
  original.prints.front = raster;
  const reopened = roundTrip(original);
  assert.equal(reopened.productType, 'sticker');
  assert.deepEqual(Object.keys(reopened.surfaces), ['front']);
  assert.equal(reopened.garmentColor, '#c28b32');
  assert.deepEqual(reopened.surfaces.front.objects, original.surfaces.front.objects);
  assert.equal(reopened.prints.front, raster);
});

test('empty and malformed inputs have predictable outcomes without mutating input', () => {
  assert.equal(parseDesign(null), null);
  assert.deepEqual(normalizeDocument(null, 'hat'), emptyDocument('hat'));
  assert.deepEqual(normalizeDocument(''), emptyDocument('tshirt'));
  assert.throws(() => normalizeDocument('{invalid'), /could not be read/);
  const future = { ...emptyDocument(), version: STUDIO_VERSION + 1 };
  assert.throws(() => normalizeDocument(future), /newer studio version/);
  assert.equal(future.version, STUDIO_VERSION + 1);
});

test('legacy migration doubles root transforms once while retaining child coordinates', () => {
  const child = artwork('child', { left: 8, top: -5, scaleX: 0.4, scaleY: 0.6 });
  const group = {
    type: 'Group', left: 120, top: 140, scaleX: 0.75, scaleY: 1.25,
    angle: 32, flipX: true, objects: [child],
  };
  const legacy = { tshirtColor: '#233c53', objects: { front: [group] } };
  const before = structuredClone(legacy);
  const document = normalizeDocument(legacy);
  const migrated = document.surfaces.front.objects[0];
  assert.deepEqual(legacy, before, 'migration leaves source data untouched');
  assert.deepEqual(
    { left: migrated.left, top: migrated.top, scaleX: migrated.scaleX, scaleY: migrated.scaleY },
    { left: 240, top: 280, scaleX: 1.5, scaleY: 2.5 },
  );
  assert.deepEqual(migrated.objects[0], child, 'group children do not scale twice');
  assert.equal(migrated.angle, 32);
  assert.equal(migrated.flipX, true);
  assert.equal(document.garmentColor, '#233c53');
  assert.deepEqual(roundTrip(document).surfaces.front.objects, document.surfaces.front.objects,
    'saving and loading migrated objects does not migrate them a second time');
});

test('legacy nested object data is detached from the source and sibling imports', () => {
  const legacy = { frontObjects: [{ type: 'Group', objects: [artwork('nested')] }] };
  const first = normalizeDocument(legacy);
  const second = normalizeDocument(legacy);
  first.surfaces.front.objects[0].objects[0].text = 'edited';
  assert.equal(legacy.frontObjects[0].objects[0].text, 'nested');
  assert.equal(second.surfaces.front.objects[0].objects[0].text, 'nested');
});

test('legacy per-surface fields preserve independent layers and generated names', () => {
  const document = normalizeDocument({
    frontObjects: [{ type: 'IText', text: 'FRONT', left: 0, top: 12 }],
    backObjects: [{ type: 'Rect', left: 33, top: 44, scaleX: 0, scaleY: 0 }],
    leftObjects: [artwork('left')], rightObjects: [artwork('right')],
  });
  assert.equal(document.surfaces.front.objects[0].studioName, 'FRONT');
  assert.equal(document.surfaces.front.objects[0].studioId, 'legacy-0');
  assert.equal(document.surfaces.back.objects[0].studioName, 'Imported artwork');
  assert.equal(document.surfaces.back.objects[0].scaleX, 0);
  assert.equal(document.surfaces.back.objects[0].scaleY, 0);
  assert.equal(document.surfaces.front.objects[0].scaleX, 2);
  assert.equal(document.surfaces.front.objects[0].top, 24);
  assert.equal(document.surfaces.left.objects[0].studioId, 'left');
  assert.equal(document.surfaces.right.objects[0].studioId, 'right');
});

test('legacy cropped prints and full artboard textures retain their placement modes', () => {
  const document = normalizeDocument({ frontPrint: raster, backTexture: raster });
  assert.deepEqual(document.surfaces.front.raster, { src: raster, cropped: true });
  assert.deepEqual(document.surfaces.back.raster, { src: raster, cropped: false });
  assert.equal(document.prints.front, raster);
  assert.deepEqual(document.surfaces.left, { objects: [] });
});

test('legacy raster artwork survives saving and reopening before canvas materialization', () => {
  const migrated = normalizeDocument({ frontPrint: raster, backTexture: raster });
  const reopened = roundTrip(migrated);
  assert.deepEqual(reopened.surfaces.front.raster, migrated.surfaces.front.raster);
  assert.deepEqual(reopened.surfaces.back.raster, migrated.surfaces.back.raster);
});

test('current documents preserve layer order, IDs, editable styles and independent surfaces', () => {
  const original = emptyDocument('tshirt');
  original.garmentColor = '#245846';
  original.surfaces.front.objects = [
    artwork('bottom', { opacity: 0.6, studioLocked: true, visible: false }),
    artwork('top', { fontFamily: 'Oswald', fontWeight: 'bold', styles: { 0: { 0: { fill: '#ffffff' } } } }),
  ];
  original.surfaces.back.objects = [artwork('back')];
  original.surfaces.left.objects = [artwork('left')];
  original.surfaces.right.objects = [artwork('right')];
  original.prints = { front: raster, back: `${raster}back`, left: null, right: null };
  const reopened = roundTrip(original);
  assert.equal(reopened.studio, STUDIO_ID);
  assert.equal(reopened.version, STUDIO_VERSION);
  assert.equal(reopened.garmentColor, '#245846');
  assert.equal(reopened.tshirtColor, '#245846');
  assert.deepEqual(reopened.surfaces, original.surfaces);
  assert.deepEqual(reopened.prints, original.prints);
  reopened.surfaces.front.objects[1].styles[0][0].fill = '#000000';
  assert.equal(original.surfaces.front.objects[1].styles[0][0].fill, '#ffffff');
});

test('hat round trip retains its product identity, color and front panel only', () => {
  const original = emptyDocument('hat');
  original.garmentColor = '#6f302b';
  original.surfaces.front.objects.push(artwork('cap-logo'));
  original.prints.front = raster;
  const reopened = roundTrip(original);
  assert.equal(reopened.productType, 'hat');
  assert.equal(reopened.garmentColor, '#6f302b');
  assert.deepEqual(Object.keys(reopened.surfaces), ['front']);
  assert.deepEqual(reopened.surfaces.front.objects, original.surfaces.front.objects);
  assert.equal(reopened.prints.front, raster);
  reopened.surfaces.front.objects[0].left = 99;
  assert.equal(original.surfaces.front.objects[0].left, 310);
});

test('serialization adds compatibility fields without mutating the live document', () => {
  const document = normalizeDocument({ frontObjects: [artwork('imported')] });
  document.garmentColor = '#181818';
  const before = structuredClone(document);
  const saved = serializableDocument(document);
  assert.deepEqual(document, before);
  assert.equal(saved.migrated, undefined);
  assert.equal(saved.tshirtColor, '#181818');
  assert.equal(saved.editorType, '3d');
  assert.equal(saved.shirtStyle, 'unisex');
  saved.surfaces.front.objects[0].text = 'changed';
  assert.equal(document.surfaces.front.objects[0].text, 'imported');
});

test('history supports undo and redo with stable boundary behavior', () => {
  const history = makeHistory('empty');
  assert.equal(history.canUndo, false);
  assert.equal(history.canRedo, false);
  assert.equal(history.undo(), 'empty');
  history.push('text');
  history.push('logo');
  assert.equal(history.canUndo, true);
  assert.equal(history.canRedo, false);
  assert.equal(history.undo(), 'text');
  assert.equal(history.canRedo, true);
  assert.equal(history.undo(), 'empty');
  assert.equal(history.undo(), 'empty');
  assert.equal(history.canUndo, false);
  assert.equal(history.redo(), 'text');
  assert.equal(history.redo(), 'logo');
  assert.equal(history.redo(), 'logo');
  assert.equal(history.canRedo, false);
});

test('new edits after undo discard only the abandoned redo branch', () => {
  const history = makeHistory('empty');
  history.push('text');
  history.push('logo');
  assert.equal(history.undo(), 'text');
  history.push('text');
  assert.equal(history.canRedo, true, 'unchanged snapshots do not destroy redo');
  history.push('shape');
  assert.equal(history.canRedo, false);
  assert.equal(history.redo(), 'shape');
  assert.equal(history.undo(), 'text');
  assert.equal(history.undo(), 'empty');
  assert.equal(history.redo(), 'text');
  assert.equal(history.redo(), 'shape');
});

test('bounded history retains the newest snapshots and stays independent per surface', () => {
  const front = makeHistory('front-empty', 3);
  const back = makeHistory('back-empty', 3);
  front.push('front-1');
  front.push('front-2');
  front.push('front-3');
  back.push('back-1');
  assert.equal(front.undo(), 'front-2');
  assert.equal(front.undo(), 'front-1');
  assert.equal(front.undo(), 'front-1');
  assert.equal(front.canUndo, false);
  assert.equal(back.canUndo, true);
  assert.equal(back.canRedo, false);
  assert.equal(back.undo(), 'back-empty');
  assert.equal(front.redo(), 'front-2');
  assert.equal(back.redo(), 'back-1');
});
