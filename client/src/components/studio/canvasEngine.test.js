// Run from the repository root:
// node --import ./client/src/components/studio/canvas-test-register.mjs --test ./client/src/components/studio/canvasEngine.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import { createCanvas, loadImage } from 'canvas';
import * as fabric from 'fabric/node';
import CanvasEngine from './canvasEngine.js';
import { BOARD, emptyDocument, normalizeDocument } from './studioDocument.js';

async function createEngine(t, document = emptyDocument()) {
  const changes = [], errors = [], snaps = [];
  const node = fabric.getEnv().document.createElement('canvas');
  const engine = new CanvasEngine(node, document, value => changes.push(value), error => errors.push(error), value => snaps.push(value));
  t.after(async () => { if (!engine.disposed) await engine.dispose(); });
  await engine.ready;
  return { engine, changes, errors, snaps };
}

function addSnapRectangle(engine, values = {}) {
  engine.add(new fabric.Rect({ width: 40, height: 40, fill: '#245846', strokeWidth: 0 }), 'Snap artwork');
  engine.update({ scaleX: 1, scaleY: 1, ...values });
  return engine.selected;
}

function moveArtwork(engine, object, values, event = {}) {
  object.set(values);
  object.setCoords();
  engine.canvas.fire('object:moving', { target: object, e: event });
}

function near(actual, expected, message) {
  assert.ok(Math.abs(actual - expected) < 0.001, message || `expected ${actual} to equal ${expected}`);
}

test('native dragging locks both print-center axes and publishes transient guide feedback', async t => {
  const { engine, snaps } = await createEngine(t);
  engine.resize(900);
  const object = addSnapRectangle(engine);
  const cx = engine.rect.left + engine.rect.width / 2;
  const cy = engine.rect.top + engine.rect.height / 2;
  engine.canvas.fire('mouse:down', {});
  moveArtwork(engine, object, { left: cx + 4, top: cy - 3 });
  near(object.getCenterPoint().x, cx);
  near(object.getCenterPoint().y, cy);
  assert.equal(snaps.at(-1).phase, 'dragging');
  assert.deepEqual([...snaps.at(-1).lockedAxes].sort(), ['x', 'y']);
  assert.equal(snaps.at(-1).guides.length, 2);
  assert.equal(object.studioLocked, undefined, 'alignment is magnetic placement, not a permanently locked layer');
  assert.equal(object.lockMovementX, false);
  assert.equal(object.lockMovementY, false);
});

test('snap capture uses the same visible pixel distance at desktop and mobile canvas widths', async t => {
  const { engine, snaps } = await createEngine(t);
  const object = addSnapRectangle(engine, { width: 80, height: 60, top: 330 });
  const cx = engine.rect.left + engine.rect.width / 2;
  for (const width of [900, 450, 270]) {
    engine.resize(width);
    const scale = width / BOARD.width;
    engine.canvas.fire('mouse:down', {});
    moveArtwork(engine, object, { left: cx + 6 / scale, top: 330 });
    near(object.left, cx, `six visible pixels must capture at ${width}px canvas width`);
    assert.ok(snaps.at(-1).lockedAxes.includes('x'));
    engine.canvas.fire('mouse:down', {});
    const outside = cx + 20 / scale;
    moveArtwork(engine, object, { left: outside, top: 330 });
    near(object.left, outside, `twenty visible pixels must not capture at ${width}px canvas width`);
    assert.ok(!snaps.at(-1)?.lockedAxes.includes('x'));
  }
});

test('native dragging aligns peer edges and centers while ignoring hidden and transparent peers', async t => {
  const { engine, snaps } = await createEngine(t);
  engine.resize(900);
  const peer = addSnapRectangle(engine, { left: 340, top: 300, width: 80, height: 60 });
  const object = addSnapRectangle(engine, { left: 329, top: 550, width: 50, height: 50 });
  engine.canvas.fire('mouse:down', {});
  moveArtwork(engine, object, { left: 329, top: 550 });
  near(object.getBoundingRect().left, peer.getBoundingRect().left, 'left edges align with another visible layer');
  assert.ok(snaps.at(-1).lockedAxes.includes('x'));
  engine.canvas.fire('mouse:down', {});
  moveArtwork(engine, object, { left: 344, top: 550 });
  near(object.getCenterPoint().x, peer.getCenterPoint().x, 'horizontal centers align with another visible layer');
  for (const visibility of [{ visible: false, opacity: 1 }, { visible: true, opacity: 0 }]) {
    peer.set(visibility);
    engine.canvas.fire('mouse:down', {});
    moveArtwork(engine, object, { left: 344, top: 550 });
    near(object.left, 344);
    assert.equal(snaps.at(-1), null, 'non-rendered artwork must not create a magnetic guide');
  }
});

test('multi-selection snaps as a unit without using its own children as guide targets', async t => {
  const { engine, snaps } = await createEngine(t);
  engine.resize(900);
  addSnapRectangle(engine, { left: 360, top: 320 });
  addSnapRectangle(engine, { left: 420, top: 380 });
  engine.command('selectAll');
  const selection = engine.selected;
  assert.equal(selection.type, 'activeselection');
  engine.canvas.fire('mouse:down', {});
  const position = { left: selection.left, top: selection.top };
  moveArtwork(engine, selection, position);
  near(selection.left, position.left);
  near(selection.top, position.top);
  assert.equal(snaps.at(-1), null, 'selected member bounds cannot snap back onto their parent bounds');
  const cx = engine.rect.left + engine.rect.width / 2;
  const cy = engine.rect.top + engine.rect.height / 2;
  moveArtwork(engine, selection, { left: cx + 3, top: cy - 4 });
  near(selection.getCenterPoint().x, cx);
  near(selection.getCenterPoint().y, cy);
  assert.deepEqual([...snaps.at(-1).lockedAxes].sort(), ['x', 'y']);
  assert.equal(selection.getObjects().length, 2);
});

test('Alt bypass and switching snapping off release guides immediately without locking artwork', async t => {
  const { engine, snaps } = await createEngine(t);
  engine.resize(900);
  const object = addSnapRectangle(engine);
  const cx = engine.rect.left + engine.rect.width / 2;
  const cy = engine.rect.top + engine.rect.height / 2;
  moveArtwork(engine, object, { left: cx + 3, top: cy + 4 });
  assert.ok(snaps.at(-1));
  moveArtwork(engine, object, { left: cx + 3, top: cy + 4 }, { altKey: true });
  near(object.left, cx + 3);
  near(object.top, cy + 4);
  assert.equal(snaps.at(-1), null);
  moveArtwork(engine, object, { left: cx + 3, top: cy + 4 });
  assert.ok(snaps.at(-1));
  engine.setSnap(false);
  assert.equal(snaps.at(-1), null);
  moveArtwork(engine, object, { left: cx + 3, top: cy + 4 });
  near(object.left, cx + 3);
  near(object.top, cy + 4);
  assert.equal(snaps.at(-1), null);
  engine.setSnap(true);
  moveArtwork(engine, object, { left: cx + 3, top: cy + 4 });
  near(object.left, cx);
  near(object.top, cy);
  assert.equal(object.studioLocked, undefined);
});

test('mouse release confirms placement and surface changes clear the settled snap state', async t => {
  const { engine, snaps } = await createEngine(t);
  const object = addSnapRectangle(engine);
  moveArtwork(engine, object, { left: 453, top: 443 });
  assert.equal(snaps.at(-1).phase, 'dragging');
  engine.canvas.fire('object:modified', { target: object });
  engine.canvas.fire('mouse:up', { target: object });
  assert.equal(snaps.at(-1).phase, 'settled');
  await engine.loadView('back');
  assert.equal(snaps.at(-1), null);
  assert.equal(engine.snapFeedback, null);
  await engine.loadView('front');
  near(engine.canvas.getObjects()[0].left, 450);
  near(engine.canvas.getObjects()[0].top, 440);
});

test('native rotation locks useful angles, supports Alt, and clears when scaling begins', async t => {
  const { engine, snaps } = await createEngine(t);
  const object = addSnapRectangle(engine);
  object.set({ angle: 88 });
  engine.canvas.fire('object:rotating', { target: object, e: {} });
  near(object.angle, 90);
  assert.equal(snaps.at(-1).angle, 90);
  assert.equal(snaps.at(-1).phase, 'dragging');
  object.set({ angle: 88 });
  engine.canvas.fire('object:rotating', { target: object, e: { altKey: true } });
  near(object.angle, 88);
  assert.equal(snaps.at(-1), null);
  object.set({ angle: 2 });
  engine.canvas.fire('object:rotating', { target: object, e: {} });
  near(object.angle, 0);
  assert.ok(snaps.at(-1));
  engine.canvas.fire('object:scaling', { target: object });
  assert.equal(snaps.at(-1), null);
});

test('snap guides never become canvas objects, printed pixels, serialized properties or undo steps', async t => {
  const { engine, snaps } = await createEngine(t);
  const object = addSnapRectangle(engine);
  const originalSurface = engine.serializeSurface();
  const originalPrint = engine.getDocument().prints.front;
  const originalObjects = [...engine.canvas.getObjects()];
  moveArtwork(engine, object, { left: 450, top: 440 });
  assert.ok(snaps.at(-1)?.guides.length);
  assert.deepEqual(engine.canvas.getObjects(), originalObjects);
  assert.equal(engine.serializeSurface(), originalSurface, 'guide state is not stored on Fabric objects');
  assert.equal(engine.getDocument().prints.front, originalPrint, 'visible alignment feedback is excluded from print PNGs');
  engine.canvas.fire('object:modified', { target: object });
  engine.canvas.fire('mouse:up', { target: object });
  assert.equal(engine.serializeSurface(), originalSurface);
  engine.setSnap(false);
  assert.equal(engine.serializeSurface(), originalSurface);
  const restored = await createEngine(t, engine.getDocument());
  assert.equal(restored.engine.snapFeedback, null, 'guide state is not part of portable saved documents');
  assert.equal(restored.engine.canvas.getObjects().length, 1);
  await engine.history('undo');
  assert.equal(engine.canvas.getObjects().length, 1, 'one undo reaches the pre-size artwork edit, not a guide-only state');
  await engine.history('undo');
  assert.equal(engine.canvas.getObjects().length, 0, 'a second undo removes the one added layer without extra alignment states');
});

async function decodePng(src) {
  const image = await loadImage(src);
  const canvas = createCanvas(image.width, image.height);
  const context = canvas.getContext('2d');
  context.drawImage(image, 0, 0);
  return {
    width: image.width,
    height: image.height,
    pixel: (x, y) => [...context.getImageData(x, y, 1, 1).data],
  };
}

test('multi-selection duplicates independent members and persists every lock', async t => {
  const { engine } = await createEngine(t);
  engine.addShape('circle', '#111111'); engine.addShape('star', '#ff0000');
  const originalIds = engine.canvas.getObjects().map(item => item.studioId);
  engine.command('selectAll'); engine.command('duplicate');
  await setImmediate();
  assert.equal(engine.canvas.getObjects().length, 4);
  const doc = engine.getDocument();
  assert.equal(new Set(doc.surfaces.front.objects.map(item => item.studioId)).size, 4);
  assert.deepEqual(doc.surfaces.front.objects.slice(0, 2).map(item => item.studioId), originalIds);
  engine.command('selectAll'); engine.command('lock');
  assert.ok(engine.canvas.getObjects().every(item => item.studioLocked && item.lockMovementX));
  await engine.loadView('back'); await engine.loadView('front');
  assert.ok(engine.canvas.getObjects().every(item => item.studioLocked && item.lockScalingX));
});

test('saving a transformed multi-selection preserves canvas-space positions without disrupting selection', async t => {
  const { engine } = await createEngine(t);
  engine.addShape('circle', '#111111'); engine.command('nudge', [-45, 0]);
  engine.addShape('star', '#ff0000'); engine.command('nudge', [45, 20]);
  engine.command('selectAll');
  const selection = engine.selected;
  selection.set({ left: selection.left + 17, top: selection.top - 12, angle: 25, scaleX: 0.7, scaleY: 0.9 });
  const centers = engine.canvas.getObjects().map(item => item.getCenterPoint());
  const saved = engine.getDocument();
  assert.equal(engine.selected, selection, 'live preview sync must not dismantle a drag selection');
  const { engine: reopened } = await createEngine(t, saved);
  reopened.canvas.getObjects().forEach((item, index) => {
    assert.ok(item.getCenterPoint().distanceFrom(centers[index]) < 0.01);
  });
});

test('actual canvas clips oversized artwork to the print area and exports a filled transparent PNG crop', async t => {
  const { engine, errors } = await createEngine(t);
  assert.deepEqual(errors, []);
  const rect = engine.rect;
  engine.add(new fabric.Rect({ width: BOARD.width, height: BOARD.height, fill: '#ff0000', strokeWidth: 0 }), 'Oversized art');
  engine.update({ scaleX: 1, scaleY: 1 });
  const board = await decodePng(engine.canvas.toDataURL({ multiplier: 1, enableRetinaScaling: false }));
  assert.equal(board.width, BOARD.width);
  assert.equal(board.height, BOARD.height);
  assert.deepEqual(board.pixel(rect.left + 10, rect.top + 10), [255, 0, 0, 255]);
  assert.equal(board.pixel(rect.left - 10, rect.top + 10)[3], 0, 'art outside the left boundary is clipped');
  assert.equal(board.pixel(rect.left + 10, rect.top - 10)[3], 0, 'art above the boundary is clipped');
  assert.equal(board.pixel(rect.left + rect.width + 10, rect.top + 10)[3], 0);
  assert.equal(board.pixel(rect.left + 10, rect.top + rect.height + 10)[3], 0);
  const crop = await decodePng(engine.getDocument().prints.front);
  assert.equal(crop.width, rect.width * 3);
  assert.equal(crop.height, rect.height * 3);
  assert.deepEqual(crop.pixel(2, 2), [255, 0, 0, 255]);
  assert.deepEqual(crop.pixel(crop.width - 3, crop.height - 3), [255, 0, 0, 255]);
});

test('text, layer order, hidden artwork and deletion update the shared exported document', async t => {
  const { engine, changes } = await createEngine(t);
  engine.addText('ORIGINAL', 'Arial', '#181818');
  const textId = engine.selected.studioId;
  engine.update({ text: 'EDITED', fill: '#245846', fontWeight: 'normal' });
  engine.addShape('circle', '#ff0000');
  const shapeId = engine.selected.studioId;
  assert.deepEqual(changes.at(-1).layers.map(layer => layer.id), [shapeId, textId]);
  engine.command('backward');
  assert.deepEqual(changes.at(-1).layers.map(layer => layer.id), [textId, shapeId]);
  engine.command('visibility');
  assert.equal(changes.at(-1).layers.find(layer => layer.id === shapeId).hidden, true);
  let document = engine.getDocument();
  assert.deepEqual(document.surfaces.front.objects.map(object => object.studioId), [shapeId, textId]);
  assert.equal(document.surfaces.front.objects[0].visible, false);
  assert.equal(document.surfaces.front.objects[1].text, 'EDITED');
  assert.equal(document.surfaces.front.objects[1].fill, '#245846');
  const crop = await decodePng(document.prints.front);
  assert.equal(crop.pixel(0, 0)[3], 0, 'print exports retain transparent unused space');
  engine.command('delete');
  document = engine.getDocument();
  assert.equal(document.surfaces.front.objects.length, 1);
  assert.equal(document.surfaces.front.objects[0].studioId, textId);
  assert.equal(changes.at(-1).changed, true);
});

test('changing sides preserves separate artwork and separate undo/redo histories', async t => {
  const { engine } = await createEngine(t);
  engine.addText('FRONT', 'Arial');
  const frontId = engine.selected.studioId;
  await engine.loadView('back');
  assert.equal(engine.canvas.getObjects().length, 0);
  engine.addShape('rectangle', '#ff0000');
  const backId = engine.selected.studioId;
  engine.update({ fill: '#0000ff' });
  await engine.history('undo');
  assert.equal(engine.canvas.getObjects()[0].fill, '#ff0000');
  await engine.loadView('front');
  assert.equal(engine.canvas.getObjects()[0].studioId, frontId);
  assert.equal(engine.canvas.getObjects()[0].text, 'FRONT');
  await engine.loadView('back');
  await engine.history('redo');
  assert.equal(engine.canvas.getObjects()[0].studioId, backId);
  assert.equal(engine.canvas.getObjects()[0].fill, '#0000ff');
  await engine.loadView('front');
  await engine.history('undo');
  assert.equal(engine.canvas.getObjects().length, 0);
  assert.equal(engine.getDocument().surfaces.back.objects[0].studioId, backId);
  assert.equal(engine.getDocument().prints.front, null);
  await engine.history('redo');
  assert.equal(engine.canvas.getObjects()[0].studioId, frontId);
});

test('saved locks survive a new engine and block edits, dragging commands and deletion', async t => {
  const first = await createEngine(t);
  first.engine.addShape('rectangle', '#233c53');
  first.engine.command('lock');
  const id = first.engine.selected.studioId;
  const saved = first.engine.getDocument();
  const { engine, errors } = await createEngine(t, normalizeDocument(JSON.stringify(saved)));
  assert.deepEqual(errors, []);
  engine.command('select', id);
  const object = engine.selected;
  const position = { left: object.left, top: object.top };
  assert.equal(object.studioLocked, true);
  assert.equal(object.lockMovementX, true);
  assert.equal(object.lockMovementY, true);
  assert.equal(object.lockScalingX, true);
  assert.equal(object.lockRotation, true);
  assert.equal(object.hasControls, false);
  engine.update({ fill: '#ff0000', left: 0 });
  engine.command('nudge', [20, 20]);
  engine.command('delete');
  assert.equal(engine.canvas.getObjects().length, 1);
  assert.equal(object.fill, '#233c53');
  assert.deepEqual({ left: object.left, top: object.top }, position);
  engine.command('select', id);
  engine.command('lock');
  engine.update({ fill: '#ff0000' });
  assert.equal(object.fill, '#ff0000');
});

test('legacy cropped raster fills the hat print zone and becomes portable editable image data', async t => {
  const source = createCanvas(30, 20);
  const context = source.getContext('2d');
  context.fillStyle = '#00ff00';
  context.fillRect(0, 0, 30, 20);
  const document = normalizeDocument({ productType: 'hat', frontPrint: source.toDataURL() });
  const { engine, errors } = await createEngine(t, document);
  assert.deepEqual(errors, []);
  const saved = engine.getDocument();
  assert.equal(saved.productType, 'hat');
  assert.equal(saved.surfaces.front.objects.length, 1);
  assert.equal(saved.surfaces.front.objects[0].type, 'Image');
  assert.match(saved.surfaces.front.objects[0].src, /^data:image\/png;base64,/);
  assert.equal(saved.surfaces.front.raster, undefined, 'legacy raster is materialized as an image layer');
  const crop = await decodePng(saved.prints.front);
  assert.deepEqual(crop.pixel(3, 3), [0, 255, 0, 255]);
  assert.deepEqual(crop.pixel(crop.width - 4, crop.height - 4), [0, 255, 0, 255]);
  const reopened = await createEngine(t, normalizeDocument(JSON.stringify(saved)));
  assert.deepEqual(reopened.errors, []);
  const secondCrop = await decodePng(reopened.engine.getDocument().prints.front);
  assert.deepEqual(secondCrop.pixel(3, 3), [0, 255, 0, 255]);
});

test('failed initialization preserves original source data and blocks replacement edits', async t => {
  const original = emptyDocument();
  original.surfaces.front.objects = [{ type: 'UnregisteredArtwork', studioId: 'unreadable', customData: { preserved: true } }];
  const { engine, errors, changes } = await createEngine(t, original);
  assert.equal(errors.length, 1);
  assert.equal(changes.at(-1).error, true);
  engine.addText('SHOULD NOT REPLACE SOURCE', 'Arial');
  engine.command('clear');
  engine.sync();
  assert.deepEqual(engine.getDocument().surfaces.front, original.surfaces.front);
  assert.equal(engine.canvas.getObjects().length, 0);
});

test('failed side restoration retains the previous side and can recover without mixing artwork', async t => {
  const { engine, errors } = await createEngine(t);
  engine.addText('FRONT ONLY', 'Arial');
  const front = structuredClone(engine.getDocument().surfaces.front);
  const invalidBack = { objects: [{ type: 'UnregisteredArtwork', studioId: 'back-source' }] };
  engine.document.surfaces.back = structuredClone(invalidBack);
  await engine.loadView('back');
  assert.equal(errors.length, 1);
  assert.equal(engine.view, 'front');
  assert.equal(engine.failed, true);
  assert.deepEqual(engine.getDocument().surfaces.back, invalidBack);
  assert.deepEqual(engine.getDocument().surfaces.front, front);
  engine.document.surfaces.back = { objects: [] };
  await engine.retry();
  assert.equal(engine.failed, false);
  assert.equal(engine.canvas.getObjects()[0].text, 'FRONT ONLY');
  await engine.loadView('back');
  assert.equal(engine.canvas.getObjects().length, 0);
  assert.deepEqual(engine.getDocument().surfaces.front, front);
});

test('a duplicate that finishes after switching sides is disposed instead of added to the wrong surface', async t => {
  const { engine, errors } = await createEngine(t);
  engine.addShape('circle', '#6f302b');
  const original = engine.selected;
  const copy = await original.clone(['studioId', 'studioName']);
  let finishClone, copyDisposed = false;
  const disposeCopy = copy.dispose.bind(copy);
  copy.dispose = () => { copyDisposed = true; disposeCopy(); };
  original.clone = () => new Promise(resolve => { finishClone = resolve; });
  engine.command('duplicate');
  await engine.loadView('back');
  finishClone(copy);
  await setImmediate();
  assert.equal(copyDisposed, true);
  assert.deepEqual(errors, []);
  assert.equal(engine.canvas.getObjects().length, 0);
  const document = engine.getDocument();
  assert.equal(document.surfaces.front.objects.length, 1);
  assert.equal(document.surfaces.front.objects[0].studioId, original.studioId);
  assert.deepEqual(document.surfaces.back.objects, []);
});
