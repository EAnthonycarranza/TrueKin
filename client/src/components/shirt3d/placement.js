/**
 * placement – named positions for elements inside a print zone, plus the
 * align / size / nudge helpers behind the studio's Position panel.
 *
 * Presets are fractions of the print zone (cx, cy = where the element's
 * centre goes; w = the element width as a fraction of the zone width). They
 * follow common decoration standards: left-chest logo, centre chest, full
 * front, upper back (yoke), full back, sleeve hits. "Left chest" means the
 * wearer's left, which is the viewer's right on the front mockup.
 */
import * as fabric from 'fabric';
import { getPrintRectPx } from './printArea';

export const PLACEMENTS = {
  front: [
    { id: 'left-chest', label: 'Left chest', cx: 0.76, cy: 0.16, w: 0.3, hint: "Wearer's left · logo size" },
    { id: 'right-chest', label: 'Right chest', cx: 0.24, cy: 0.16, w: 0.3, hint: "Wearer's right · logo size" },
    { id: 'center-chest', label: 'Centre chest', cx: 0.5, cy: 0.32, w: 0.62 },
    { id: 'center', label: 'Centre', cx: 0.5, cy: 0.5 },
    { id: 'full-front', label: 'Full front', cx: 0.5, cy: 0.5, fit: true },
    { id: 'top', label: 'Top centre', cx: 0.5, cy: 0.14, w: 0.62 },
    { id: 'bottom', label: 'Bottom centre', cx: 0.5, cy: 0.86, w: 0.62 },
    { id: 'lower-left', label: 'Lower left', cx: 0.76, cy: 0.86, w: 0.3 },
    { id: 'lower-right', label: 'Lower right', cx: 0.24, cy: 0.86, w: 0.3 },
  ],
  back: [
    { id: 'upper-back', label: 'Upper back', cx: 0.5, cy: 0.12, w: 0.5, hint: 'Below the collar' },
    { id: 'left-shoulder', label: 'Left shoulder', cx: 0.24, cy: 0.12, w: 0.3 },
    { id: 'right-shoulder', label: 'Right shoulder', cx: 0.76, cy: 0.12, w: 0.3 },
    { id: 'center-back', label: 'Centre back', cx: 0.5, cy: 0.45, w: 0.7 },
    { id: 'center', label: 'Centre', cx: 0.5, cy: 0.5 },
    { id: 'full-back', label: 'Full back', cx: 0.5, cy: 0.5, fit: true },
    { id: 'bottom-back', label: 'Bottom back', cx: 0.5, cy: 0.88, w: 0.5 },
  ],
  sleeve: [
    { id: 'sleeve-center', label: 'Centre', cx: 0.5, cy: 0.5, w: 0.8 },
    { id: 'sleeve-top', label: 'Top', cx: 0.5, cy: 0.2, w: 0.8 },
    { id: 'sleeve-bottom', label: 'Bottom', cx: 0.5, cy: 0.8, w: 0.8 },
    { id: 'sleeve-full', label: 'Fill sleeve', cx: 0.5, cy: 0.5, fit: true },
  ],
};

export const SIZE_PRESETS = [
  { id: 'xs', label: 'XS', w: 0.18 },
  { id: 's', label: 'S', w: 0.3 },
  { id: 'm', label: 'M', w: 0.5 },
  { id: 'l', label: 'L', w: 0.75 },
  { id: 'fit', label: 'Fit', fit: true },
];

export function placementsFor(viewKind, viewId) {
  if (viewKind === 'sleeve') return PLACEMENTS.sleeve;
  return PLACEMENTS[viewId] || PLACEMENTS.front;
}

function activeTarget(canvas) {
  return canvas?.getActiveObject() || null;
}

function commit(canvas, obj) {
  obj.setCoords();
  canvas.requestRenderAll();
  canvas.fire('object:modified', { target: obj });
}

/** Scale the active element uniformly so its width is `frac` of the zone (height capped to the zone). */
export function sizeActive(canvas, area, frac) {
  const obj = activeTarget(canvas);
  if (!obj) return;
  const zone = getPrintRectPx(canvas.width, canvas.height, area);
  const w = obj.getScaledWidth();
  const h = obj.getScaledHeight();
  if (!w || !h) return;
  let k = (zone.width * frac) / w;
  if (h * k > zone.height * 0.98) k = (zone.height * 0.98) / h;
  const centre = obj.getCenterPoint();
  obj.scale((obj.scaleX || 1) * k);
  obj.setPositionByOrigin(centre, 'center', 'center');
  commit(canvas, obj);
}

/** Scale the active element to fill the zone while keeping its aspect. */
export function fitActive(canvas, area, margin = 0.98) {
  const obj = activeTarget(canvas);
  if (!obj) return;
  const zone = getPrintRectPx(canvas.width, canvas.height, area);
  const w = obj.getScaledWidth();
  const h = obj.getScaledHeight();
  if (!w || !h) return;
  const k = Math.min((zone.width * margin) / w, (zone.height * margin) / h);
  obj.scale((obj.scaleX || 1) * k);
  obj.setPositionByOrigin(new fabric.Point(zone.left + zone.width / 2, zone.top + zone.height / 2), 'center', 'center');
  commit(canvas, obj);
}

/** Move (and optionally size) the active element to a named placement. */
export function applyPlacement(canvas, area, preset) {
  const obj = activeTarget(canvas);
  if (!obj) return;
  if (preset.fit) { fitActive(canvas, area); return; }
  if (preset.w) sizeActive(canvas, area, preset.w);
  const zone = getPrintRectPx(canvas.width, canvas.height, area);
  const target = new fabric.Point(zone.left + zone.width * preset.cx, zone.top + zone.height * preset.cy);
  // Keep the element inside the zone if the preset would push it over an edge.
  const w = obj.getScaledWidth();
  const h = obj.getScaledHeight();
  target.x = Math.min(Math.max(target.x, zone.left + w / 2), zone.left + zone.width - w / 2);
  target.y = Math.min(Math.max(target.y, zone.top + h / 2), zone.top + zone.height - h / 2);
  obj.setPositionByOrigin(target, 'center', 'center');
  commit(canvas, obj);
}

/** Align the active element to an edge or the middle of the zone: left|center|right|top|middle|bottom. */
export function alignActive(canvas, area, where) {
  const obj = activeTarget(canvas);
  if (!obj) return;
  const zone = getPrintRectPx(canvas.width, canvas.height, area);
  const w = obj.getScaledWidth();
  const h = obj.getScaledHeight();
  const c = obj.getCenterPoint();
  const pad = 2;
  if (where === 'left') c.x = zone.left + w / 2 + pad;
  if (where === 'center') c.x = zone.left + zone.width / 2;
  if (where === 'right') c.x = zone.left + zone.width - w / 2 - pad;
  if (where === 'top') c.y = zone.top + h / 2 + pad;
  if (where === 'middle') c.y = zone.top + zone.height / 2;
  if (where === 'bottom') c.y = zone.top + zone.height - h / 2 - pad;
  obj.setPositionByOrigin(c, 'center', 'center');
  commit(canvas, obj);
}

/* ---------- lock in place ---------- */

const LOCK_PROPS = ['lockMovementX', 'lockMovementY', 'lockRotation', 'lockScalingX', 'lockScalingY', 'lockSkewingX', 'lockSkewingY'];

export function isLocked(obj) {
  return !!obj?.locked;
}

/** Lock keeps the element selectable (so it can be unlocked) but frozen. */
export function setLocked(obj, locked) {
  const props = { locked, hasControls: !locked, hoverCursor: locked ? 'not-allowed' : 'move' };
  LOCK_PROPS.forEach((k) => { props[k] = locked; });
  if (obj.type === 'activeselection' || obj.type === 'activeSelection') obj.getObjects().forEach((o) => o.set(props));
  obj.set(props);
}

/** Rotate the active element to an absolute angle around its centre. */
export function rotateActive(canvas, angle) {
  const obj = activeTarget(canvas);
  if (!obj || isLocked(obj)) return;
  const centre = obj.getCenterPoint();
  obj.rotate(((angle % 360) + 360) % 360);
  obj.setPositionByOrigin(centre, 'center', 'center');
  commit(canvas, obj);
}

/** Nudge the active element by whole canvas pixels. */
export function nudgeActive(canvas, dx, dy) {
  const obj = activeTarget(canvas);
  if (!obj || isLocked(obj)) return;
  obj.set({ left: (obj.left || 0) + dx, top: (obj.top || 0) + dy });
  commit(canvas, obj);
}

/** Duplicate the active element(s) slightly offset. */
export async function duplicateActive(canvas) {
  const obj = activeTarget(canvas);
  if (!obj) return;
  const clone = await obj.clone();
  canvas.discardActiveObject();
  const add = (o) => {
    o.set({ left: (o.left || 0) + 16, top: (o.top || 0) + 16 });
    setLocked(o, false);
    canvas.add(o);
  };
  if (clone.type === 'activeselection' || clone.type === 'activeSelection') {
    const parts = clone.getObjects();
    clone.removeAll?.();
    parts.forEach(add);
    canvas.setActiveObject(new fabric.ActiveSelection(parts, { canvas }));
  } else {
    add(clone);
    canvas.setActiveObject(clone);
  }
  canvas.requestRenderAll();
}

/** Select every element on the canvas. */
export function selectAll(canvas) {
  const objs = canvas.getObjects().filter((o) => o.selectable !== false);
  if (!objs.length) return;
  canvas.discardActiveObject();
  const sel = objs.length === 1 ? objs[0] : new fabric.ActiveSelection(objs, { canvas });
  canvas.setActiveObject(sel);
  canvas.requestRenderAll();
}

/** Bigger, clearer handles for every Fabric object created after this call. */
export function installSelectionStyle() {
  const target = fabric.InteractiveFabricObject?.ownDefaults || fabric.FabricObject?.ownDefaults;
  if (!target) return;
  Object.assign(target, {
    cornerSize: 12,
    touchCornerSize: 22,
    cornerStyle: 'circle',
    cornerColor: '#ffffff',
    cornerStrokeColor: '#0a0a0a',
    transparentCorners: false,
    borderColor: '#0a0a0a',
    borderScaleFactor: 2,
    borderDashArray: [4, 3],
    padding: 4,
    // Rotation snapping is done in snapping.js (with hysteresis); keep
    // Fabric's own snap off so the two never fight.
    snapAngle: 0,
    snapThreshold: 0,
  });
}
