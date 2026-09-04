/**
 * backgroundRemoval – removes a flat background from an uploaded photo or
 * logo, entirely in the browser (nothing is uploaded anywhere).
 *
 * How it works: the background colour is read from the image corners; every
 * pixel close to it (within `tolerance`) that is CONNECTED to the image border
 * is cleared, so the inside of letters and shapes survives. With
 * `removeEnclosed` every matching pixel goes, connected or not (for logos on
 * white with holes). Edge pixels are feathered and their colour is
 * de-contaminated so no bright fringe is left around the artwork.
 *
 * Good for product shots on white/solid backdrops and logos; a busy photo
 * background needs a matting model, which this deliberately does not ship.
 */

function medianPatch(d, w, h, x0, y0, size = 6) {
  const rs = [];
  const gs = [];
  const bs = [];
  for (let y = y0; y < Math.min(h, y0 + size); y++) {
    for (let x = x0; x < Math.min(w, x0 + size); x++) {
      const i = (y * w + x) * 4;
      if (d[i + 3] < 8) continue;
      rs.push(d[i]);
      gs.push(d[i + 1]);
      bs.push(d[i + 2]);
    }
  }
  if (!rs.length) return null;
  const med = (a) => { a.sort((p, q) => p - q); return a[a.length >> 1]; };
  return [med(rs), med(gs), med(bs)];
}

/** Background seed colours from the four corners (de-duplicated). */
export function detectBackgroundColors(d, w, h) {
  const s = 6;
  const seeds = [
    medianPatch(d, w, h, 0, 0, s),
    medianPatch(d, w, h, w - s, 0, s),
    medianPatch(d, w, h, 0, h - s, s),
    medianPatch(d, w, h, w - s, h - s, s),
  ].filter(Boolean);
  const out = [];
  for (const c of seeds) {
    if (!out.some((o) => Math.hypot(o[0] - c[0], o[1] - c[1], o[2] - c[2]) < 12)) out.push(c);
  }
  return out;
}

function nearestDistance(d, i, seeds) {
  let best = Infinity;
  for (const s of seeds) {
    const dist = Math.hypot(d[i] - s[0], d[i + 1] - s[1], d[i + 2] - s[2]);
    if (dist < best) best = dist;
  }
  return best;
}

/**
 * Remove the background of an image element / data URL.
 * @param {HTMLImageElement|string} source
 * @param {{ tolerance?: number, removeEnclosed?: boolean, feather?: number, maxSize?: number }} opts
 *   tolerance 0–100 (default 30), feather in pixels (default 1.5)
 * @returns {Promise<string>} PNG data URL with transparency
 */
export async function removeBackground(source, opts = {}) {
  const { tolerance = 30, removeEnclosed = false, feather = 1.5, maxSize = 2400 } = opts;
  const img = typeof source === 'string' ? await loadImage(source) : source;
  let w = img.naturalWidth || img.width;
  let h = img.naturalHeight || img.height;
  const k = Math.min(1, maxSize / Math.max(w, h));
  w = Math.round(w * k);
  h = Math.round(h * k);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);
  const im = ctx.getImageData(0, 0, w, h);
  const d = im.data;

  const seeds = detectBackgroundColors(d, w, h);
  if (!seeds.length) return canvas.toDataURL('image/png');
  // tolerance 100 ≈ the full RGB diagonal
  const thr = (Math.max(0, Math.min(100, tolerance)) / 100) * 441.67 * 0.6;

  const n = w * h;
  const dist = new Float32Array(n);
  for (let p = 0; p < n; p++) dist[p] = nearestDistance(d, p * 4, seeds);

  const removed = new Uint8Array(n);
  if (removeEnclosed) {
    for (let p = 0; p < n; p++) if (dist[p] <= thr && d[p * 4 + 3] > 0) removed[p] = 1;
  } else {
    // Flood fill from every border pixel through matching pixels.
    const stack = [];
    const push = (p) => { if (!removed[p] && dist[p] <= thr) { removed[p] = 1; stack.push(p); } };
    for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
    for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
    while (stack.length) {
      const p = stack.pop();
      const x = p % w;
      const y = (p - x) / w;
      if (x > 0) push(p - 1);
      if (x < w - 1) push(p + 1);
      if (y > 0) push(p - w);
      if (y < h - 1) push(p + w);
    }
  }

  // Feather + de-contaminate the fringe: pixels next to removed ones fade by
  // how close their colour is to the background, and their colour is pulled
  // away from the background so the edge does not glow.
  const soft = thr * 1.35;
  for (let p = 0; p < n; p++) {
    const i = p * 4;
    if (removed[p]) { d[i + 3] = 0; continue; }
    if (feather <= 0) continue;
    const x = p % w;
    const y = (p - x) / w;
    const edge = (x > 0 && removed[p - 1]) || (x < w - 1 && removed[p + 1]) || (y > 0 && removed[p - w]) || (y < h - 1 && removed[p + w]);
    if (!edge) continue;
    const a = Math.max(0, Math.min(1, (dist[p] - thr * 0.35) / (soft - thr * 0.35)));
    if (a >= 1) continue;
    const s = seeds[0];
    // un-mix: c = a*fg + (1-a)*bg → fg = (c - (1-a)*bg) / a
    const aa = Math.max(a, 0.15);
    d[i] = Math.max(0, Math.min(255, (d[i] - (1 - aa) * s[0]) / aa));
    d[i + 1] = Math.max(0, Math.min(255, (d[i + 1] - (1 - aa) * s[1]) / aa));
    d[i + 2] = Math.max(0, Math.min(255, (d[i + 2] - (1 - aa) * s[2]) / aa));
    d[i + 3] = Math.round(d[i + 3] * a);
  }

  ctx.putImageData(im, 0, 0);
  return canvas.toDataURL('image/png');
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not decode image'));
    img.src = src;
  });
}
