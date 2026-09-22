// Run from the repository root:
// node --import ./client/src/components/studio/canvas-test-register.mjs --test ./client/src/components/studio/canvasEngine.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setImmediate } from 'node:timers/promises';
import { createCanvas, loadImage } from 'canvas';
import * as fabric from 'fabric/node';
import * as THREE from 'three';
import CanvasEngine from './canvasEngine.js';
import { BOARD, emptyDocument, normalizeDocument } from './studioDocument.js';
import { computeShirtLayout } from '../shirt3d/shirtLayout.js';
import { PRINT_DEPTH } from '../shirt3d/printArea.js';
import { createShirtPrintGeometry, SHIRT_PRINT_LIFT } from './shirtPrintGeometry.js';

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
  const data = context.getImageData(0, 0, image.width, image.height).data;
  return {
    width: image.width,
    height: image.height,
    data,
    pixel: (x, y) => [...data.slice((y * image.width + x) * 4, (y * image.width + x) * 4 + 4)],
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

test('curved text remains editable through spacing changes, save, reopen, and undo', async t => {
  const { engine } = await createEngine(t);
  engine.addText('TRUEKIN');
  const originalCenter = engine.selected.getCenterPoint();
  engine.update({ studioCurve: 66 });
  assert.equal(engine.selected.studioCurve, 66);
  assert.ok(engine.selected.path, 'arched text has an editable vector path');
  assert.ok(engine.selected.path.path[1][2] < 0, 'positive values arch upward');
  assert.ok(engine.selected.getCenterPoint().distanceFrom(originalCenter) < 0.01);
  const originalPathWidth = engine.selected.path.width;
  engine.update({ charSpacing: 180 });
  assert.ok(engine.selected.path.width > originalPathWidth, 'letter spacing rebuilds the curve around the text');
  const saved = engine.getDocument();
  assert.equal(saved.surfaces.front.objects[0].studioCurve, 66);
  assert.ok(saved.surfaces.front.objects[0].path);
  assert.ok(saved.prints.front?.startsWith('data:image/png;base64,'));
  const { engine: reopened } = await createEngine(t, saved);
  assert.equal(reopened.canvas.getObjects()[0].studioCurve, 66);
  assert.ok(reopened.canvas.getObjects()[0].path);
  reopened.canvas.setActiveObject(reopened.canvas.getObjects()[0]);
  reopened.update({ studioCurve: -60 });
  assert.ok(reopened.selected.path.path[1][2] > 0, 'negative values arch downward');
  await reopened.history('undo');
  assert.equal(reopened.canvas.getObjects()[0].studioCurve, 66);
  reopened.canvas.setActiveObject(reopened.canvas.getObjects()[0]);
  reopened.update({ studioCurve: 0 });
  assert.equal(reopened.selected.path, undefined, 'straight text has no path');
});

test('curved lettering stays inside the printable crop used by both previews', async t => {
  const { engine } = await createEngine(t);
  const rect = engine.rect;
  const outsideInk = async object => {
    const canvas = new fabric.StaticCanvas(null, { width: BOARD.width, height: BOARD.height, enableRetinaScaling: false });
    try {
      canvas.add(...await fabric.util.enlivenObjects([object.toObject(['studioCurve'])]));
      const image = await loadImage(canvas.toDataURL({ format: 'png', enableRetinaScaling: false }));
      const pixels = createCanvas(image.width, image.height);
      const context = pixels.getContext('2d');
      context.drawImage(image, 0, 0);
      const data = context.getImageData(0, 0, image.width, image.height).data;
      let outside = 0;
      for (let y = 0; y < image.height; y++) for (let x = 0; x < image.width; x++) {
        if (data[(y * image.width + x) * 4 + 3] > 32 &&
          (x < rect.left || x >= rect.left + rect.width || y < rect.top || y >= rect.top + rect.height)) outside++;
      }
      return outside;
    } finally { await canvas.dispose(); }
  };

  engine.addText('STAND TRUE. STAY LOYAL.');
  engine.command('position', 'top-center');
  engine.update({ studioCurve: 100 });
  assert.equal(await outsideInk(engine.selected), 0, 'arch up stays fully printable after shaping near the top');
  engine.command('position', 'top-center');
  assert.equal(await outsideInk(engine.selected), 0, 'top quick positioning respects curved glyphs');
  engine.command('align', 'top');
  assert.equal(await outsideInk(engine.selected), 0, 'aligning an arch to the print edge keeps its letters visible');
  engine.command('position', 'bottom-center');
  engine.update({ studioCurve: -100 });
  assert.equal(await outsideInk(engine.selected), 0, 'arch down stays fully printable near the bottom');
  assert.ok(engine.getDocument().prints.front?.startsWith('data:image/png;base64,'), 'the 3D texture uses the fitted artwork');

  const { engine: reopened } = await createEngine(t, engine.getDocument());
  assert.equal(await outsideInk(reopened.canvas.getObjects()[0]), 0, 'saved curved text remains printable when reopened');

  const clippedDraft = engine.getDocument();
  clippedDraft.surfaces.front.objects[0].top = rect.top;
  const { engine: repaired } = await createEngine(t, clippedDraft);
  assert.equal(await outsideInk(repaired.canvas.getObjects()[0]), 0, 'an older cropped draft is repaired on load');
});

test('arch-up 100 exports complete middle glyphs after a clipped text cache and on reopen', async t => {
  const { engine } = await createEngine(t);
  engine.addText('STAND TRUE. STAY LOYAL.');
  engine.update({ studioCurve: 100 });
  const complete = engine.getDocument().prints.front;
  const text = engine.selected;
  assert.equal(text.objectCaching, false);

  // This is the exact failure mode of the downloaded artwork: Fabric's cache
  // is sized from the path and clips the upper strokes near the arch's apex.
  text.set({ objectCaching: true, dirty: true });
  engine.sync();
  const clipped = await decodePng(engine.getDocument().prints.front);
  const intact = await decodePng(complete);
  let missingInk = 0;
  for (let i = 3; i < intact.data.length; i += 4) {
    if (intact.data[i] > 128 && clipped.data[i] < 64) missingInk++;
  }
  assert.ok(missingInk > 100, 'the cached export reproduces visibly cropped letter strokes');

  engine.update({ studioCurve: 100 });
  assert.equal(text.objectCaching, false, 'reshaping must disable the undersized cache');
  assert.ok(engine.getDocument().prints.front === complete, 'the PNG and 3D texture regain the missing ink');

  const draft = engine.getDocument();
  draft.surfaces.front.objects[0].objectCaching = true;
  const { engine: reopened } = await createEngine(t, draft);
  assert.equal(reopened.canvas.getObjects()[0].objectCaching, false, 'older cached text is repaired on load');
  const reopenedPrint = await decodePng(reopened.getDocument().prints.front);
  const countInk = image => {
    let count = 0;
    for (let i = 3; i < image.data.length; i += 4) if (image.data[i] > 128) count++;
    return count;
  };
  assert.ok(Math.abs(countInk(reopenedPrint) - countInk(intact)) < 50,
    'the restored PNG retains the complete arch despite a tiny printable-fit adjustment');
});

function shirtGeometryFromModel() {
  const bytes = readFileSync(new URL('../../../public/models/shirt_baked_collapsed.glb', import.meta.url));
  const jsonLength = bytes.readUInt32LE(12);
  const model = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString());
  const binaryStart = 28 + jsonLength;
  const attribute = (id, components) => {
    const accessor = model.accessors[id];
    const view = model.bufferViews[accessor.bufferView];
    const ArrayType = accessor.componentType === 5126 ? Float32Array : Uint16Array;
    return new THREE.BufferAttribute(new ArrayType(
      bytes.buffer, bytes.byteOffset + binaryStart + (view.byteOffset || 0) + (accessor.byteOffset || 0),
      accessor.count * components,
    ), components);
  };
  const primitive = model.meshes[0].primitives[0];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', attribute(primitive.attributes.POSITION, 3));
  geometry.setAttribute('normal', attribute(primitive.attributes.NORMAL, 3));
  geometry.setIndex(attribute(primitive.indices, 1));
  return geometry;
}

function frontmostZAt(geometry, x, y) {
  const positions = geometry.getAttribute('position');
  const indices = geometry.index;
  const count = indices?.count || positions.count;
  let highest = -Infinity;
  for (let i = 0; i < count; i += 3) {
    const a = indices ? indices.getX(i) : i;
    const b = indices ? indices.getX(i + 1) : i + 1;
    const c = indices ? indices.getX(i + 2) : i + 2;
    const ax = positions.getX(a), ay = positions.getY(a);
    const bx = positions.getX(b), by = positions.getY(b);
    const cx = positions.getX(c), cy = positions.getY(c);
    const denominator = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
    if (Math.abs(denominator) < 1e-12) continue;
    const u = ((by - cy) * (x - cx) + (cx - bx) * (y - cy)) / denominator;
    const v = ((cy - ay) * (x - cx) + (ax - cx) * (y - cy)) / denominator;
    if (u < -1e-6 || v < -1e-6 || u + v > 1.000001) continue;
    highest = Math.max(highest, u * positions.getZ(a) + v * positions.getZ(b) + (1 - u - v) * positions.getZ(c));
  }
  return highest;
}

test('arch-up 100 ink projects in front of the actual 3D shirt across the whole phrase', async t => {
  const { engine } = await createEngine(t);
  engine.addText('STAND TRUE. STAY LOYAL.');
  engine.update({ studioCurve: 100 });
  const print = await decodePng(engine.getDocument().prints.front);
  const shirt = shirtGeometryFromModel();
  const placement = computeShirtLayout(shirt).front;
  const decal = createShirtPrintGeometry(shirt, placement, PRINT_DEPTH);
  t.after(() => { decal.dispose(); shirt.dispose(); });

  const bands = [[], [], []];
  for (let y = 0; y < print.height; y += 12) for (let x = 0; x < print.width; x += 12) {
    if (print.pixel(x, y)[3] < 180) continue;
    const fraction = x / print.width;
    bands[fraction < 0.4 ? 0 : fraction < 0.6 ? 1 : 2].push({ x, y });
  }
  for (const [band, samples] of bands.entries()) {
    assert.ok(samples.length > 0, `the 100-curve texture has ink in band ${band}`);
    for (let i = 0; i < 5; i += 1) {
      const sample = samples[Math.floor((i + 0.5) * samples.length / 5)];
      const x = placement.position[0] + (sample.x / print.width - 0.5) * placement.size[0];
      const y = placement.position[1] + (0.5 - sample.y / print.height) * placement.size[1];
      const fabricZ = frontmostZAt(shirt, x, y);
      const inkZ = frontmostZAt(decal, x, y);
      assert.ok(Number.isFinite(fabricZ) && Number.isFinite(inkZ), `ink in band ${band} lands on the shirt`);
      assert.ok(inkZ - fabricZ >= SHIRT_PRINT_LIFT * 0.9, `ink in band ${band} clears the shirt depth buffer`);
    }
  }
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
