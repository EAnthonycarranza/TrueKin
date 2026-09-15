// node --import ./client/src/components/studio/canvas-test-register.mjs --test ./client/src/components/studio/quickPositioning.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import * as fabric from 'fabric/node';
import CanvasEngine from './canvasEngine.js';
import { emptyDocument, SURFACES } from './studioDocument.js';
import { QUICK_POSITIONS, getQuickPosition, safePrintRect } from './quickPositioning.js';

async function createEngine(t, product = 'tshirt') {
  const changes = [], snaps = [], errors = [];
  const node = fabric.getEnv().document.createElement('canvas');
  const engine = new CanvasEngine(node, emptyDocument(product), change => changes.push(change), error => errors.push(error), snap => snaps.push(snap));
  t.after(async () => { if (!engine.disposed) await engine.dispose(); });
  await engine.ready;
  assert.deepEqual(errors, []);
  return { engine, changes, snaps };
}

function near(actual, expected, message) {
  assert.ok(Math.abs(actual - expected) < .001, message || `expected ${actual} to equal ${expected}`);
}

function expectPosition(object, rect, position) {
  const box = object.getBoundingRect(), safe = safePrintRect(rect);
  near(box.left, safe.left + (safe.width - box.width) * position.x);
  near(box.top, safe.top + (safe.height - box.height) * position.y);
  assert.ok(box.width <= safe.width + .001, 'artwork fits safe width');
  assert.ok(box.height <= safe.height + .001, 'artwork fits safe height');
}

function addArtwork(engine, values = {}) {
  engine.add(new fabric.Rect({ width: 40, height: 20, strokeWidth: 0, fill: '#245846' }), 'Position test');
  engine.update({ scaleX: 1, scaleY: 1, ...values });
  return engine.selected;
}

test('the 3 × 3 placement grid has unique viewer-relative positions', () => {
  assert.equal(QUICK_POSITIONS.length, 9);
  assert.equal(new Set(QUICK_POSITIONS.map(position => position.id)).size, 9);
  assert.deepEqual(QUICK_POSITIONS.map(position => [position.x, position.y]), [
    [0, 0], [.5, 0], [1, 0], [0, .5], [.5, .5], [1, .5], [0, 1], [.5, 1], [1, 1],
  ]);
  assert.equal(getQuickPosition(null, { left: 0, top: 0, width: 10, height: 10 }), null);
});

for (const product of ['tshirt', 'hat']) {
  for (const surface of SURFACES[product]) {
    test(`all nine quick positions use the current ${product} ${surface.id} print area`, async t => {
      const { engine, changes, snaps } = await createEngine(t, product);
      await engine.loadView(surface.id);
      const object = addArtwork(engine, { angle: 23, scaleX: 1.1, scaleY: .9 });
      for (const position of QUICK_POSITIONS) {
        const count = changes.length;
        engine.command('position', position.id);
        expectPosition(object, engine.rect, position);
        near(object.angle, 23);
        near(object.scaleX, 1.1);
        near(object.scaleY, .9);
        assert.equal(changes.length, count + 1, 'one document/preview notification per placement');
        assert.equal(changes.at(-1).selected.quickPosition, position.id);
        assert.equal(snaps.at(-1).phase, 'settled');
        assert.deepEqual(snaps.at(-1).guides.map(guide => guide.axis), ['x', 'y']);
        const safe = safePrintRect(engine.rect);
        near(snaps.at(-1).guides[0].at, safe.left + safe.width * position.x);
        near(snaps.at(-1).guides[1].at, safe.top + safe.height * position.y);
        assert.equal(object.studioLocked, undefined, 'quick placement does not permanently lock the layer');
      }
    });
  }
}

test('oversized rotated artwork shrinks uniformly including its visible stroke, never enlarging', async t => {
  const { engine } = await createEngine(t, 'hat');
  const object = addArtwork(engine, { width: 480, height: 210, angle: 37, scaleX: 1.4, scaleY: .8, stroke: '#000000', strokeWidth: 12 });
  const position = QUICK_POSITIONS.find(item => item.id === 'bottom-right');
  engine.command('position', position.id);
  expectPosition(object, engine.rect, position);
  near(object.angle, 37);
  near(object.scaleX / object.scaleY, 1.4 / .8);
  assert.ok(object.scaleX < 1.4);
  const scale = object.scaleX;
  engine.command('position', 'top-left');
  near(object.scaleX, scale, 'repositioning fitted art must not enlarge or repeatedly shrink it');
});

test('uniform strokes are measured at the fitted scale rather than clipped after scaling', async t => {
  const { engine } = await createEngine(t);
  await engine.loadView('left');
  const object = addArtwork(engine, { width: 420, height: 150, angle: -32, scaleX: 1.3, scaleY: .9, stroke: '#000000', strokeWidth: 14, strokeUniform: true });
  const position = QUICK_POSITIONS.find(item => item.id === 'top-right');
  engine.command('position', position.id);
  expectPosition(object, engine.rect, position);
  near(object.scaleX / object.scaleY, 1.3 / .9);
  near(object.angle, -32);
  assert.equal(object.strokeUniform, true);
  assert.equal(object.strokeWidth, 14);
});

test('a rotated multi-selection positions and shrinks as one unit and round-trips through undo/redo', async t => {
  const { engine } = await createEngine(t, 'hat');
  addArtwork(engine, { left: 200, top: 220, angle: 17 });
  addArtwork(engine, { left: 620, top: 440, angle: -21 });
  engine.command('selectAll');
  const selection = engine.selected;
  engine.update({ angle: 28, scaleX: 1.2, scaleY: .8 });
  const before = engine.serializeSurface();
  const members = selection.getObjects();
  const memberLocal = members.map(member => ({ left: member.left, top: member.top, angle: member.angle, scaleX: member.scaleX, scaleY: member.scaleY }));
  const position = QUICK_POSITIONS.find(item => item.id === 'middle-right');
  engine.command('position', position.id);
  expectPosition(selection, engine.rect, position);
  assert.equal(engine.selected, selection);
  near(selection.angle, 28);
  near(selection.scaleX / selection.scaleY, 1.2 / .8);
  members.forEach((member, index) => {
    for (const key of Object.keys(memberLocal[index])) near(member[key], memberLocal[index][key], `member local ${key} is preserved`);
  });
  const after = engine.serializeSurface();
  const restored = new Map(JSON.parse(after).map(item => [item.studioId, item]));
  await engine.history('undo');
  const previous = new Map(JSON.parse(before).map(item => [item.studioId, item]));
  for (const item of engine.canvas.getObjects()) {
    const saved = previous.get(item.studioId);
    for (const key of ['left', 'top', 'angle', 'scaleX', 'scaleY', 'skewX']) near(item[key], saved[key], `one undo restores ${key}`);
  }
  await engine.history('redo');
  for (const item of engine.canvas.getObjects()) {
    const saved = restored.get(item.studioId);
    for (const key of ['left', 'top', 'angle', 'scaleX', 'scaleY']) near(item[key], saved[key]);
  }
  assert.equal(engine.canvas.getObjects().length, 2);
});

test('positioning does nothing without an editable selection, with invalid input or during loading', async t => {
  const { engine, changes, snaps } = await createEngine(t);
  let count = changes.length;
  engine.command('position', 'top-left');
  assert.equal(changes.length, count);
  const object = addArtwork(engine);
  engine.command('lock');
  const locked = engine.serializeSurface();
  count = changes.length;
  engine.command('position', 'top-right');
  assert.equal(engine.serializeSurface(), locked);
  assert.equal(changes.length, count);
  engine.command('lock');
  const original = engine.serializeSurface();
  count = changes.length;
  engine.command('position', 'not-a-position');
  engine.loading = true;
  engine.command('position', 'bottom-left');
  engine.loading = false;
  engine.failed = true;
  engine.command('position', 'bottom-left');
  engine.failed = false;
  assert.equal(engine.serializeSurface(), original);
  assert.equal(changes.length, count);
  assert.equal(snaps.at(-1), null);
  addArtwork(engine, { left: 400, top: 300 });
  engine.canvas.setActiveObject(new fabric.ActiveSelection([object, engine.selected], { canvas: engine.canvas }));
  object.studioLocked = true;
  const multi = engine.serializeSurface();
  engine.command('position', 'bottom-left');
  assert.equal(engine.serializeSurface(), multi, 'a locked child prevents positioning the selection');
});

test('explicit placement works with smart snapping off and feedback never enters artwork or history', async t => {
  const { engine, changes, snaps } = await createEngine(t);
  const object = addArtwork(engine, { left: 360, top: 310 });
  const before = engine.serializeSurface();
  engine.setSnap(false);
  engine.command('position', 'top-center');
  assert.equal(changes.at(-1).selected.quickPosition, 'top-center');
  assert.equal(snaps.at(-1).guides.length, 2);
  const after = engine.serializeSurface();
  const print = engine.getDocument().prints.front;
  assert.equal(engine.canvas.getObjects().length, 1);
  assert.ok(!after.includes('quickPosition') && !after.includes('guides'));
  engine.clearSnapping();
  assert.equal(engine.serializeSurface(), after);
  assert.equal(engine.getDocument().prints.front, print);
  engine.command('nudge', [4, 0]);
  assert.equal(changes.at(-1).selected.quickPosition, null, 'the selected preset is derived from geometry, not a sticky flag');
  await engine.history('undo');
  assert.equal(engine.serializeSurface(), after);
  await engine.history('undo');
  assert.equal(engine.serializeSurface(), before, 'guide-only feedback adds no undo state');
  assert.equal(object.studioLocked, undefined);
});
