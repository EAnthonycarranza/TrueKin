import test from 'node:test';
import assert from 'node:assert/strict';
import { createSnapSession, resetSnapSession, solveMoveSnap, solveAngleSnap } from './smartSnapping.js';

const area = { left: 100, top: 100, width: 400, height: 500 };
const box = (left, top, width = 40, height = 40) => ({ left, top, width, height });
const peer = (id, left, top, width = 40, height = 40) => ({ id, name: id, box: box(left, top, width, height) });

test('print-area centers magnetically lock both axes and produce red-guide coordinates', () => {
  const result = solveMoveSnap({ box: box(276, 336), area });
  assert.equal(result.dx, 4);
  assert.equal(result.dy, -6);
  assert.deepEqual(result.lockedAxes, ['x', 'y']);
  assert.equal(result.label, 'Centered in print area');
  assert.deepEqual(result.guides.map(({ axis, at, kind }) => ({ axis, at, kind })), [
    { axis: 'x', at: 300, kind: 'center' },
    { axis: 'y', at: 350, kind: 'center' },
  ]);
});

test('matching print edges align artwork inside the printable rectangle', () => {
  assert.equal(solveMoveSnap({ box: box(105, 240), area }).dx, -5);
  assert.equal(solveMoveSnap({ box: box(457, 240), area }).dx, 3);
  assert.equal(solveMoveSnap({ box: box(190, 563), area }).dy, -3);
  assert.equal(solveMoveSnap({ box: box(65, 240), area }).dx, 0, 'do not snap outside print edge');
});

test('peer centers and opposite edges are available for aligning and adjoining layers', () => {
  const peers = [peer('Star', 200, 300, 100, 100)];
  const centered = solveMoveSnap({ box: box(232, 410), peers });
  assert.equal(centered.dx, -2);
  assert.equal(centered.guides[0].kind, 'center');
  const adjacent = solveMoveSnap({ box: box(305, 430), peers });
  assert.equal(adjacent.dx, -5);
  assert.equal(adjacent.guides[0].at, 300);
  assert.match(adjacent.label, /Star right edge/);
});

test('center anchors and then print anchors win equally distant ties', () => {
  const targets = [peer('Edge', 295, 800), peer('Center', 285, 800)];
  const result = solveMoveSnap({ box: box(278, 230), area, peers: targets });
  assert.equal(result.dx, 2);
  assert.equal(result.guides[0].at, 300);
  assert.equal(result.guides[0].label, 'Print area center');
});

test('capture distance is consistent in displayed mobile and desktop pixels', () => {
  const mobile = solveMoveSnap({ box: box(258, 230), area, scale: 0.3 });
  assert.equal(mobile.dx, 22, '6.6 screen px snaps on mobile');
  assert.equal(solveMoveSnap({ box: box(258, 230), area, scale: 1 }).dx, 0, '22 desktop px does not snap');
  assert.equal(solveMoveSnap({ box: box(277, 230), area, scale: 2 }).dx, 3, '6 high-density display px snaps');
  assert.equal(solveMoveSnap({ box: box(275, 230), area, scale: 2 }).dx, 0);
});

test('hysteresis holds an acquired anchor beyond capture, then releases it', () => {
  const session = createSnapSession();
  solveMoveSnap({ box: box(276, 230), area, session });
  assert.equal(solveMoveSnap({ box: box(268, 230), area, session }).dx, 12);
  assert.equal(session.x.ownAnchor, 'center');
  assert.equal(solveMoveSnap({ box: box(264, 230), area, session }).dx, 0);
  assert.equal(session.x, null);
});

test('a nearby new anchor does not steal a held lock', () => {
  const session = createSnapSession();
  const peers = [peer('Other', 304, 800, 40, 40)];
  solveMoveSnap({ box: box(276, 230), area, peers, session });
  const result = solveMoveSnap({ box: box(290, 230), area, peers, session });
  assert.equal(result.dx, -10);
  assert.equal(result.guides[0].at, 300);
});

test('held locks refresh moving targets and survive peer array reorder', () => {
  const session = createSnapSession();
  const selected = box(229, 500);
  solveMoveSnap({ box: selected, peers: [peer('Target', 200, 300, 100, 60)], session });
  const result = solveMoveSnap({ box: selected, peers: [peer('Unrelated', 900, 900), peer('Target', 206, 300, 100, 60)], session });
  assert.equal(result.dx, 7);
  assert.equal(result.guides[0].at, 256);
});

test('deleted or distant moved targets release existing locks', () => {
  const session = createSnapSession();
  const selected = box(229, 500);
  solveMoveSnap({ box: selected, peers: [peer('Target', 200, 300, 100, 60)], session });
  assert.equal(solveMoveSnap({ box: selected, peers: [], session }).dx, 0);
  assert.equal(session.x, null);
  solveMoveSnap({ box: selected, peers: [peer('Target', 200, 300, 100, 60)], session });
  assert.equal(solveMoveSnap({ box: selected, peers: [peer('Target', 700, 300, 100, 60)], session }).dx, 0);
});

test('horizontal equal spacing produces matching gap guide segments', () => {
  const result = solveMoveSnap({ box: box(153, 200), peers: [peer('Left', 50, 195), peer('Right', 250, 205)] });
  assert.equal(result.dx, -3);
  assert.match(result.label, /Equal horizontal spacing/);
  const guides = result.guides.filter(guide => guide.kind === 'spacing');
  assert.equal(guides.length, 2);
  assert.ok(guides.every(guide => guide.axis === 'y'));
  assert.equal(guides[0].to - guides[0].from, 60);
  assert.equal(guides[1].to - guides[1].from, 60);
});

test('vertical equal spacing locks y and draws vertical gap segments', () => {
  const result = solveMoveSnap({ box: box(200, 156), peers: [peer('Top', 200, 50), peer('Bottom', 200, 250)] });
  assert.equal(result.dy, -6);
  assert.match(result.label, /Equal vertical spacing/);
  const guides = result.guides.filter(guide => guide.kind === 'spacing');
  assert.equal(guides.length, 2);
  assert.ok(guides.every(guide => guide.axis === 'x' && guide.to - guide.from === 60));
});

test('equal spacing ignores overlapping neighbors and unrelated rows', () => {
  const overlapping = solveMoveSnap({ box: box(151, 200), peers: [peer('Left', 140, 200), peer('Right', 200, 200)] });
  assert.ok(overlapping.guides.every(guide => guide.kind !== 'spacing'));
  const unrelated = solveMoveSnap({ box: box(153, 200), peers: [peer('Left', 50, 600), peer('Right', 250, 650)] });
  assert.ok(unrelated.guides.every(guide => guide.kind !== 'spacing'));
});

test('equal spacing cannot skip an intervening layer to use distant neighbors', () => {
  const result = solveMoveSnap({
    box: box(153, 200),
    peers: [peer('Distant left', 50, 200), peer('Near left', 110, 200, 20, 40), peer('Right', 250, 200)],
  });
  assert.equal(result.dx, 0, 'the distant pair would falsely attract x by -3');
  assert.ok(result.guides.every(guide => guide.kind !== 'spacing'));
  const unrelated = solveMoveSnap({
    box: box(153, 200),
    peers: [peer('Left', 50, 200), peer('Different row', 110, 500, 20, 40), peer('Right', 250, 200)],
  });
  assert.equal(unrelated.dx, -3, 'layers in a different row do not block the gap');
  assert.ok(unrelated.guides.some(guide => guide.kind === 'spacing'));
});

test('overlapping artwork prevents phantom empty-gap spacing', () => {
  const result = solveMoveSnap({
    box: box(153, 200),
    peers: [peer('Left', 50, 200), peer('Overlaid layer', 158, 200, 15, 40), peer('Right', 250, 200)],
  });
  assert.ok(result.guides.every(guide => guide.kind !== 'spacing'));
});

test('equal spacing retains a lock until its larger release distance is crossed', () => {
  const session = createSnapSession();
  const peers = [peer('Left', 50, 200), peer('Right', 250, 200)];
  solveMoveSnap({ box: box(153, 200), peers, session });
  assert.equal(solveMoveSnap({ box: box(161, 200), peers, session }).dx, -11);
  assert.equal(solveMoveSnap({ box: box(166, 200), peers, session }).dx, 0);
});

test('bypass clears magnets immediately and reset clears every interaction axis', () => {
  const session = createSnapSession();
  solveMoveSnap({ box: box(280, 330), area, session });
  solveAngleSnap({ angle: 44, session });
  const result = solveMoveSnap({ box: box(280, 330), area, session, bypass: true });
  assert.deepEqual(result, { dx: 0, dy: 0, guides: [], lockedAxes: [], label: '' });
  assert.deepEqual(session, createSnapSession());
  session.x = { key: 'test' };
  assert.equal(resetSnapSession(session), session);
  assert.deepEqual(session, createSnapSession());
});

test('invalid input is ignored and every emitted guide is finite', () => {
  assert.deepEqual(solveMoveSnap({ box: box(NaN, 30) }).lockedAxes, []);
  const result = solveMoveSnap({
    box: box(280, 330), area,
    peers: [null, peer('Huge', 1e20, 2), peer('Flat', 1, 2, 0, 40), peer('Infinite', 1, Infinity)],
    scale: NaN,
  });
  assert.equal(result.label, 'Centered in print area');
  for (const guide of result.guides) assert.ok([guide.at, guide.from, guide.to].every(Number.isFinite));
  assert.doesNotThrow(() => solveMoveSnap({ box: box(280, 330), area, peers: null, session: null }));
});

test('extreme scales are clamped to avoid excessive or unusable thresholds', () => {
  assert.equal(solveMoveSnap({ box: box(270, 230), area, scale: 100 }).dx, 0);
  assert.equal(solveMoveSnap({ box: box(195, 230), area, scale: 0.000001 }).dx, 0);
});

test('solver never mutates caller geometry or target arrays', () => {
  const data = { box: box(153, 200), area, peers: [peer('Left', 50, 195), peer('Right', 250, 205)] };
  const before = structuredClone(data);
  solveMoveSnap(data);
  assert.deepEqual(data, before);
});

test('long text-layer names are whitespace-normalized and capped in guide labels', () => {
  const result = solveMoveSnap({
    box: box(230, 500),
    peers: [{ ...peer('Text', 200, 300, 100, 60), name: 'A\n\nvery    long text layer title that should never cover the entire studio canvas' }],
  });
  assert.equal(result.guides[0].label, 'A very long text layer title th… center');
  assert.ok(!result.label.includes('\n'));
});

test('primary 45-degree anchors attach within five degrees and hold for eight', () => {
  const session = createSnapSession();
  assert.deepEqual(solveAngleSnap({ angle: 41, session }), { angle: 45, snapped: true, label: '45°' });
  assert.equal(solveAngleSnap({ angle: 52, session }).angle, 45);
  assert.equal(solveAngleSnap({ angle: 54, session }).snapped, false);
  assert.equal(session.angle, null);
});

test('secondary 15-degree anchors have a narrower capture and release range', () => {
  const session = createSnapSession();
  assert.equal(solveAngleSnap({ angle: 13, session }).angle, 15);
  assert.equal(solveAngleSnap({ angle: 18.5, session }).angle, 15);
  assert.equal(solveAngleSnap({ angle: 20, session }).snapped, false);
  assert.equal(solveAngleSnap({ angle: 26, session }).snapped, false);
  assert.equal(solveAngleSnap({ angle: 29, session }).angle, 30);
});

test('angle wrapping, negative angles, and repeated turns stay continuous', () => {
  assert.equal(solveAngleSnap({ angle: 359 }).angle, 360);
  assert.equal(solveAngleSnap({ angle: -1 }).angle, 0);
  assert.equal(solveAngleSnap({ angle: -44 }).angle, -45);
  assert.equal(solveAngleSnap({ angle: 721 }).angle, 720);
  const session = createSnapSession();
  solveAngleSnap({ angle: 359, session });
  assert.equal(solveAngleSnap({ angle: 3, session }).angle, 0);
  assert.equal(solveAngleSnap({ angle: -4, session }).angle, 0);
  assert.equal(solveAngleSnap({ angle: 366, session }).angle, 360);
});

test('angular bypass and invalid angles never leave a stale lock', () => {
  const session = createSnapSession();
  solveAngleSnap({ angle: 43, session });
  assert.deepEqual(solveAngleSnap({ angle: 44, session, bypass: true }), { angle: 44, snapped: false, label: '' });
  assert.equal(session.angle, null);
  assert.deepEqual(solveAngleSnap({ angle: Infinity, session }), { angle: 0, snapped: false, label: '' });
});
