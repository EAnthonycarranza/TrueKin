/**
 * imageTone — decide whether an uploaded image is flat enough to re-ink, and
 * do it without touching its shape.
 *
 * Most of what a customer sends a heat-press shop is a one-colour mark: a
 * church crest, a team wordmark, a logo exported as black-on-transparent. Those
 * are exactly as safe to recolour as text — a single value over an alpha mask —
 * and leaving them to a warning meant the common case was the one the studio
 * could not help with.
 *
 * A photograph or a two-tone illustration is a different thing entirely, and
 * flattening one to a single colour destroys it. So the question this module
 * answers is narrow and conservative: *is every opaque pixel essentially the
 * same colour?* Anything else is reported rather than guessed at.
 */

/** Opaque enough to count. Antialiased edges sit below this and are ignored. */
const ALPHA_FLOOR = 200;

/**
 * How far a pixel may sit from the mean and still count as the same colour,
 * as a Euclidean distance in RGB.
 *
 * Deliberately tight. A black mark whose edges have been resampled a few times
 * stays well inside 34; a mark with a second colour in it — the red in a crest,
 * a two-tone monogram — does not, and lands in the warning instead. Erring
 * loose here is how you silently flatten someone's artwork.
 */
const FLATNESS_TOLERANCE = 34;

/** Below this share of opaque pixels there is not enough to judge. */
const MIN_OPAQUE_RATIO = 0.005;

/** Long edge used for sampling. Detection does not need full resolution. */
const SAMPLE_EDGE = 96;

function toHex(r, g, b) {
  return `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

/**
 * Is this image a single colour over transparency, and if so which colour?
 *
 * Two passes rather than one: the mean alone cannot tell a uniform grey from a
 * black-and-white checkerboard, which average to the same thing. The second
 * pass measures how far pixels actually sit from that mean.
 *
 * @param {HTMLImageElement|HTMLCanvasElement} source
 * @returns {{flat: boolean, hex: string|null, reason?: string}}
 */
export function analyzeArtwork(source) {
  const w = source.naturalWidth || source.width;
  const h = source.naturalHeight || source.height;
  if (!w || !h) return { flat: false, hex: null, reason: 'empty' };

  const scale = Math.min(1, SAMPLE_EDGE / Math.max(w, h));
  const sw = Math.max(1, Math.round(w * scale));
  const sh = Math.max(1, Math.round(h * scale));

  const canvas = document.createElement('canvas');
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(source, 0, 0, sw, sh);

  let data;
  try {
    data = ctx.getImageData(0, 0, sw, sh).data;
  } catch {
    // A cross-origin image taints the canvas. Unknowable, so treat it as a
    // photograph and warn rather than assuming.
    return { flat: false, hex: null, reason: 'tainted' };
  }

  let count = 0;
  let sr = 0;
  let sg = 0;
  let sb = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < ALPHA_FLOOR) continue;
    count += 1;
    sr += data[i];
    sg += data[i + 1];
    sb += data[i + 2];
  }
  if (count / (sw * sh) < MIN_OPAQUE_RATIO) return { flat: false, hex: null, reason: 'too transparent' };

  const mr = sr / count;
  const mg = sg / count;
  const mb = sb / count;

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < ALPHA_FLOOR) continue;
    const dr = data[i] - mr;
    const dg = data[i + 1] - mg;
    const db = data[i + 2] - mb;
    if (Math.sqrt(dr * dr + dg * dg + db * db) > FLATNESS_TOLERANCE) {
      return { flat: false, hex: null, reason: 'multi-colour' };
    }
  }

  return { flat: true, hex: toHex(mr, mg, mb) };
}

/**
 * Repaint flat artwork in a new colour, keeping its alpha exactly.
 *
 * `source-in` fills only where the artwork already is, so the silhouette and
 * every antialiased edge survive untouched — the mark keeps its shape, it just
 * changes ink. Always rendered from the pristine original rather than from the
 * last recolour, so repeated colour changes cannot accumulate fringing.
 *
 * @param {HTMLImageElement|HTMLCanvasElement} original
 * @param {string} hex
 * @returns {HTMLCanvasElement}
 */
export function recolorArtwork(original, hex) {
  const w = original.naturalWidth || original.width;
  const h = original.naturalHeight || original.height;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(original, 0, 0, w, h);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = hex;
  ctx.fillRect(0, 0, w, h);
  return canvas;
}
