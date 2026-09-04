/**
 * snapping – magnetic alignment while dragging and rotating.
 *
 * Fabric recomputes an element's position from the pointer on every mouse
 * move, so a naive "if within N px then align" releases the moment the pointer
 * drifts. This module keeps per-canvas snap state with HYSTERESIS: a line is
 * caught within `attach` px and only released once the pointer-derived
 * position is more than `release` px away. The same applies to rotation:
 * angles lock to the 45° family (horizontal / vertical / diagonal) first and
 * to 15° steps second, and stay locked until the handle is turned well past.
 */
import { getPrintRectPx } from './printArea';

export const MOVE_ATTACH = 8;    // px: catch a guide line
export const MOVE_RELEASE = 11;  // px: let go of it
export const ROT_COARSE = { step: 45, attach: 7, release: 9 };  // horizontal / vertical / diagonal
export const ROT_FINE = { step: 15, attach: 3, release: 4.5 };  // 15° ticks

/**
 * Edge/centre lines of a rect, tagged by kind so centres only snap to centres
 * and edges only to edges (mixing the two feels random while dragging).
 */
function lines(rect) {
  return {
    xs: [
      { at: rect.left, kind: 'edge' },
      { at: rect.left + rect.width / 2, kind: 'center' },
      { at: rect.left + rect.width, kind: 'edge' },
    ],
    ys: [
      { at: rect.top, kind: 'edge' },
      { at: rect.top + rect.height / 2, kind: 'center' },
      { at: rect.top + rect.height, kind: 'edge' },
    ],
  };
}

/**
 * Pick the snap for one axis. `own` are the element's lines, `targets` the
 * candidate lines, `held` the currently held snap (or null).
 * Returns { d, at, edge } where d moves the element onto the line.
 */
function axisSnap(own, targets, held) {
  let best = null;
  for (let edge = 0; edge < own.length; edge++) {
    for (const t of targets) {
      if (t.kind !== own[edge].kind) continue;
      const d = t.at - own[edge].at;
      if (Math.abs(d) <= MOVE_ATTACH && (!best || Math.abs(d) < Math.abs(best.d))) best = { d, at: t.at, edge };
    }
  }
  if (held) {
    const d = held.at - own[held.edge].at;
    // Keep the held line while close, unless a strictly closer line appeared.
    if (Math.abs(d) <= MOVE_RELEASE && (!best || Math.abs(best.d) >= Math.abs(d))) return { ...held, d };
  }
  return best;
}

function angleDiff(a, b) {
  return Math.abs((((a - b) % 360) + 540) % 360 - 180);
}

/**
 * Snap an angle (deg) to the 45° family first, then 15° ticks, with
 * hysteresis so a caught angle holds until the handle is turned clearly past.
 * `held` is the previous result ({ angle, rule }) or null.
 */
export function snapAngle(angle, held) {
  const norm = ((angle % 360) + 360) % 360;
  if (held && angleDiff(norm, held.angle) <= held.rule.release) return { angle: held.angle, snapped: true, rule: held.rule };
  for (const rule of [ROT_COARSE, ROT_FINE]) {
    const target = (Math.round(norm / rule.step) * rule.step) % 360;
    if (angleDiff(norm, target) <= rule.attach) return { angle: target, snapped: true, rule };
  }
  return { angle: norm, snapped: false, rule: null };
}

/**
 * Attach snapping to a Fabric canvas.
 * @param canvas Fabric canvas
 * @param opts.getArea  () => print zone (canvas fractions) for this canvas
 * @param opts.isEnabled () => boolean
 * @param opts.onGuides ({ x, y } | null) => void   guide lines to draw (canvas px)
 * @param opts.onAngle  ({ angle, snapped } | null) => void
 * @returns detach()
 */
export function attachSnapping(canvas, { getArea, isEnabled, onGuides, onAngle }) {
  const held = { x: null, y: null, angle: null };

  const onMoving = (e) => {
    const obj = e.target;
    if (!obj || !isEnabled?.()) { held.x = held.y = null; onGuides?.(null); return; }
    const targetsX = [];
    const targetsY = [];
    const area = getArea?.();
    if (area) {
      const z = lines(getPrintRectPx(canvas.width, canvas.height, area));
      targetsX.push(...z.xs);
      targetsY.push(...z.ys);
    }
    const active = new Set(canvas.getActiveObjects());
    for (const o of canvas.getObjects()) {
      if (active.has(o) || o === obj || o.visible === false) continue;
      const l = lines(o.getBoundingRect());
      targetsX.push(...l.xs);
      targetsY.push(...l.ys);
    }
    // Fabric has already moved the element for this event but its cached
    // corner coordinates still describe the previous position; refresh them
    // or every offset below is measured from the wrong place.
    obj.setCoords();
    const own = lines(obj.getBoundingRect());
    const sx = axisSnap(own.xs, targetsX, held.x);
    const sy = axisSnap(own.ys, targetsY, held.y);
    held.x = sx ? { at: sx.at, edge: sx.edge } : null;
    held.y = sy ? { at: sy.at, edge: sy.edge } : null;
    if (sx) obj.set('left', (obj.left || 0) + sx.d);
    if (sy) obj.set('top', (obj.top || 0) + sy.d);
    if (sx || sy) obj.setCoords();
    onGuides?.(sx || sy ? { x: sx ? sx.at : null, y: sy ? sy.at : null } : null);
  };

  const onRotating = (e) => {
    const obj = e.target;
    if (!obj) return;
    if (!isEnabled?.()) { held.angle = null; onAngle?.({ angle: obj.angle, snapped: false }); return; }
    const r = snapAngle(obj.angle || 0, held.angle);
    held.angle = r.snapped ? { angle: r.angle, rule: r.rule } : null;
    if (r.snapped && angleDiff(obj.angle || 0, r.angle) > 1e-6) {
      // Fabric rotates around the centre when centeredRotation is on (default).
      obj.rotate(r.angle);
      obj.setCoords();
    }
    onAngle?.(r);
  };

  const clear = () => {
    held.x = held.y = held.angle = null;
    onGuides?.(null);
    onAngle?.(null);
  };

  canvas.on('object:moving', onMoving);
  canvas.on('object:rotating', onRotating);
  canvas.on('mouse:up', clear);
  canvas.on('object:modified', clear);
  canvas.on('selection:cleared', clear);
  return () => {
    canvas.off('object:moving', onMoving);
    canvas.off('object:rotating', onRotating);
    canvas.off('mouse:up', clear);
    canvas.off('object:modified', clear);
    canvas.off('selection:cleared', clear);
  };
}
