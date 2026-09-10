/**
 * colorways — render one product photo per shirt colour, off-screen.
 *
 * A drop is pressed on every blank it stocks, so the shop needs a front and a
 * back shot of each. Driving the live studio round the palette to screenshot it
 * would be slow and fragile: the mockup image loads asynchronously, so a
 * capture is a race against a decode, and the admin would watch their tee
 * flicker through twelve colours.
 *
 * Instead the artwork is composited over each colour's mockup on a detached
 * canvas. The artwork layer comes from FabricCanvas.getTextureDataURL(), which
 * is the design alone on transparency at exactly canvas resolution — so it
 * lands 1:1 over the mockup with no scaling maths of its own.
 *
 * The mockup is drawn with the same fit as FabricCanvas.drawMockupDirect
 * (contain, × MOCKUP_FIT). Those two must agree or the print sits off the
 * chest; MOCKUP_FIT is imported from printArea rather than copied so they
 * cannot drift.
 */
import { CANVAS_CONFIG } from '../designer/designerConstants';
import { MOCKUP_FIT } from './printArea';
import { buildMockupUrl } from './mockupTint';

/** Sides captured for every colour. Sleeves are not product photography. */
export const COLORWAY_SIDES = ['front', 'back'];

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load image'));
    img.src = src;
  });
}

function toBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not encode image'))), 'image/png');
  });
}

/**
 * Composite one colourway.
 *
 * @param {string} hex           shirt colour
 * @param {'front'|'back'} side
 * @param {string|null} texture  data URL of the artwork alone, or null for a blank tee
 * @returns {Promise<Blob>} PNG
 */
export async function renderColorway(hex, side, texture) {
  const w = CANVAS_CONFIG.width;
  const h = CANVAS_CONFIG.height;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);

  const mockup = await loadImage(await buildMockupUrl(hex, side));
  const imgW = mockup.naturalWidth || mockup.width;
  const imgH = mockup.naturalHeight || mockup.height;
  const scale = Math.min(w / imgW, h / imgH) * MOCKUP_FIT;
  const iw = imgW * scale;
  const ih = imgH * scale;
  ctx.drawImage(mockup, (w - iw) / 2, (h - ih) / 2, iw, ih);

  if (texture) {
    ctx.drawImage(await loadImage(texture), 0, 0, w, h);
  }

  return toBlob(canvas);
}

/**
 * Render front and back for every colour.
 *
 * Sequential rather than parallel: each colour that has no studio photo is
 * re-shaded from the white tee, which is real pixel work, and firing twelve of
 * them at once on a laptop janks the whole tab for the duration.
 *
 * A colour that fails to render is reported rather than thrown, so one bad
 * blank cannot cost the admin the other eleven.
 *
 * @param {string[]} colors
 * @param {{front: string|null, back: string|null}} textures
 * @param {(done: number, total: number, hex: string) => void} [onProgress]
 */
export async function renderColorways(colors, textures, onProgress) {
  const results = [];
  const failed = [];
  const total = colors.length * COLORWAY_SIDES.length;
  let done = 0;

  for (const hex of colors) {
    for (const side of COLORWAY_SIDES) {
      try {
        const blob = await renderColorway(hex, side, textures?.[side] || null);
        results.push({ hex, side, blob });
      } catch {
        failed.push({ hex, side });
      }
      done += 1;
      onProgress?.(done, total, hex);
    }
  }

  return { results, failed };
}
