/**
 * designState – identifiers and helpers for the studio's saved design format.
 */
import { getPrintRectPx, PRINT_TEXTURE_MULTIPLIER, PRINT_AREA } from './printArea';

export const STUDIO_ID = 'truking-3d';
export const STUDIO_VERSION = 2;

/** Rasterise just the print zone of a Fabric canvas. Null when the canvas is empty. */
export function renderPrintTexture(canvas, area = PRINT_AREA) {
  if (!canvas || canvas.getObjects().length === 0) return null;
  const rect = getPrintRectPx(canvas.width, canvas.height, area);
  canvas.renderAll();
  return canvas.toDataURL({
    format: 'png',
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
    multiplier: PRINT_TEXTURE_MULTIPLIER,
  });
}
