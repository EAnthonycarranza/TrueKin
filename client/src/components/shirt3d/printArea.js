/**
 * printArea – the single source of truth for WHERE a design sits on the shirt.
 *
 * Both editors share one rule: the printable zone is a rectangle expressed as
 * fractions of the 450×500 design canvas. Everything else is derived from it:
 *
 *   2D  → the Fabric clipPath, the dashed on-canvas guide, and the crop that is
 *         rasterised into a "print" texture.
 *   3D  → the decal's centre and width/height on the mesh, computed from the
 *         mesh bounding box using the SAME rectangle, re-expressed relative to
 *         the shirt silhouette instead of the canvas.
 *
 * Because the 3D placement is derived (not hand-tuned), an object at the
 * top-left of the print zone in 2D lands at the top-left of the chest in 3D.
 */
import { CANVAS_CONFIG } from '../designer/designerConstants';

/** Printable zone as fractions of the design canvas. */
export const PRINT_AREA = { x: 0.27, y: 0.2, w: 0.46, h: 0.48 };

/** FabricCanvas draws the mockup photo scaled to fit the canvas × this padding. */
export const MOCKUP_FIT = 0.92;

/** Every mockup photo in designerMockups is cut to this silhouette aspect. */
export const MOCKUP_ASPECT = 815 / 948;

/** Print textures are rasterised at this multiple of canvas resolution. */
export const PRINT_TEXTURE_MULTIPLIER = 3;

/** Depth (in model units, shirt is ~0.61 tall) the decal projects through. */
export const PRINT_DEPTH = 0.22;

/**
 * The side-view mockup photo (assets/images/side-white.png): the wearer's LEFT
 * side, front of the tee on the left of the image. Mirrored for the right
 * sleeve. `bbox` is the shirt silhouette inside the image (fractions).
 */
export const SIDE_MOCKUP = { width: 1024, height: 1536, bbox: { x: 0.278, y: 0.066, w: 0.46, h: 0.844 } };

/**
 * Sleeve print zone as fractions of the side-view silhouette box (x/w across
 * the shirt's depth, y/h down from the collar). The 3D sleeve decal takes its
 * height from `h` and its width from this zone's pixel aspect, so artwork is
 * never stretched between the two views.
 */
export const SLEEVE_PRINT = { x: 0.352, y: 0.182, w: 0.391, h: 0.166 };

/** Sleeve zone as fractions of the side photo, mirrored for the right sleeve. */
export function sleeveZoneImage(side = 'left') {
  const b = SIDE_MOCKUP.bbox;
  let x = b.x + SLEEVE_PRINT.x * b.w;
  const y = b.y + SLEEVE_PRINT.y * b.h;
  const w = SLEEVE_PRINT.w * b.w;
  const h = SLEEVE_PRINT.h * b.h;
  if (side === 'right') x = 1 - x - w;
  return { x, y, w, h };
}

/** Centre of the sleeve zone in photo fractions — the sleeve colour probe. */
export function sleeveProbeImage(side = 'left') {
  const z = sleeveZoneImage(side);
  return { x: z.x + z.w / 2, y: z.y + z.h / 2 };
}

/** Pixel aspect (w/h) of the sleeve zone on the photo. */
export function sleeveZoneAspect() {
  const z = sleeveZoneImage('left');
  return (z.w * SIDE_MOCKUP.width) / (z.h * SIDE_MOCKUP.height);
}

/** Image-fraction rectangle → canvas-fraction rectangle, the way FabricCanvas fits a mockup. */
export function imageAreaToCanvasArea(area, imgW, imgH) {
  const draw = getMockupDrawRect(imgW, imgH);
  const W = CANVAS_CONFIG.width;
  const H = CANVAS_CONFIG.height;
  return {
    x: (draw.x + area.x * draw.w) / W,
    y: (draw.y + area.y * draw.h) / H,
    w: (area.w * draw.w) / W,
    h: (area.h * draw.h) / H,
  };
}

/** Sleeve zone as fractions of the design canvas (the Fabric clip + guide). */
export function sleeveZoneCanvas(side = 'left') {
  return imageAreaToCanvasArea(sleeveZoneImage(side), SIDE_MOCKUP.width, SIDE_MOCKUP.height);
}

/** The sleeve is a tube ~0.12 across; keep the decal on the outer face only. */
export const SLEEVE_PRINT_DEPTH = 0.08;

/** Every printable view, with the camera azimuth the 3D viewer swings to. */
export const VIEWS = [
  { id: 'front', label: 'Front', theta: 0, kind: 'body' },
  { id: 'back', label: 'Back', theta: Math.PI, kind: 'body' },
  { id: 'left', label: 'Left sleeve', theta: Math.PI / 2, kind: 'sleeve' },
  { id: 'right', label: 'Right sleeve', theta: -Math.PI / 2, kind: 'sleeve' },
];
export const VIEW_IDS = VIEWS.map((v) => v.id);
export const SLEEVE_VIEW_IDS = VIEWS.filter((v) => v.kind === 'sleeve').map((v) => v.id);
export function viewInfo(id) {
  return VIEWS.find((v) => v.id === id) || VIEWS[0];
}

export function getPrintRectPx(w = CANVAS_CONFIG.width, h = CANVAS_CONFIG.height, area = PRINT_AREA) {
  return {
    left: w * area.x,
    top: h * area.y,
    width: w * area.w,
    height: h * area.h,
  };
}

/** Where FabricCanvas paints the mockup photo inside the canvas (same math as drawMockupDirect). */
export function getMockupDrawRect(imgW, imgH, w = CANVAS_CONFIG.width, h = CANVAS_CONFIG.height, fit = MOCKUP_FIT) {
  const scale = Math.min(w / imgW, h / imgH) * fit;
  const iw = imgW * scale;
  const ih = imgH * scale;
  return { x: (w - iw) / 2, y: (h - ih) / 2, w: iw, h: ih };
}

/** The print zone expressed as fractions of the shirt silhouette (photo bounds). */
export function printRectOnShirt(imgW = 815, imgH = 948) {
  const draw = getMockupDrawRect(imgW, imgH);
  const pr = getPrintRectPx();
  return {
    x: (pr.left - draw.x) / draw.w,
    y: (pr.top - draw.y) / draw.h,
    w: pr.width / draw.w,
    h: pr.height / draw.h,
  };
}

export const PRINT_RECT_ON_SHIRT = printRectOnShirt();

/** Centre of the print zone on the shirt silhouette — the colour-calibration point. */
export const MATCH_PROBE_CENTER = {
  x: PRINT_RECT_ON_SHIRT.x + PRINT_RECT_ON_SHIRT.w / 2,
  y: PRINT_RECT_ON_SHIRT.y + PRINT_RECT_ON_SHIRT.h / 2,
};
