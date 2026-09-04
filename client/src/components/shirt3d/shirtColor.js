/**
 * shirtColor – colour calibration between the 2D mockup photos and the 3D tee.
 *
 * The swatch hex (e.g. #1f40d3) is only an ID. The mockup photo for that swatch
 * is a lit, shaded photograph whose fabric is a very different pixel value
 * (#014063 for that blue). The legacy 3D model painted the raw swatch hex through
 * tone mapping and an HDRI, so the two views never agreed.
 *
 * Here the 3D shirt's albedo is READ FROM THE PHOTO: we sample the fabric at the
 * centre of the print zone and hand that colour to the mesh. Combined with a
 * colour-exact render (no tone mapping, key+fill summing to 1.0) the chest of the
 * 3D tee renders at the same pixel value as the photo.
 */
import { useEffect, useState } from 'react';
import { getMockupUrl, COLOR_MOCKUPS } from '../designer/designerMockups';
import { MATCH_PROBE_CENTER } from './printArea';

export const SHIRT_COLOR_NAMES = {
  '#FFFFFF': 'White', '#000000': 'Black', '#929292': 'Gray',
  '#e02d27': 'Red', '#1f40d3': 'Blue', '#43d31f': 'Green',
  '#f7ec1e': 'Yellow', '#f88d28': 'Orange', '#e524ef': 'Purple',
  '#1fd3ca': 'Teal', '#FFC0CB': 'Pink', '#8B4513': 'Brown',
};

/**
 * Measured fabric colour at the print-zone centre of each FRONT mockup photo.
 * Used for the first paint and as a fallback; the live sample replaces it as
 * soon as the photo has decoded.
 */
export const FABRIC_COLOR_FALLBACK = {
  '#FFFFFF': '#d1d3d3',
  '#000000': '#171717',
  '#929292': '#414141',
  '#e02d27': '#b33231',
  '#1f40d3': '#014063',
  '#43d31f': '#018018',
  '#f7ec1e': '#b27d0d',
  '#f88d28': '#a65201',
  '#e524ef': '#8645b9',
  '#1fd3ca': '#007c9a',
  '#FFC0CB': '#eaa7b0',
  '#8B4513': '#7e4116',
};

export function fabricColorFor(nominalHex) {
  return FABRIC_COLOR_FALLBACK[nominalHex] || nominalHex || '#d1d3d3';
}

/** '#abc' / 'ABCDEF' / '#aabbcc' → '#aabbcc', or null when not a colour. */
export function normalizeHex(input) {
  if (typeof input !== 'string') return null;
  let h = input.trim().replace(/^#/, '');
  if (/^[0-9a-f]{3}$/i.test(h)) h = h.split('').map((c) => c + c).join('');
  if (!/^[0-9a-f]{6}$/i.test(h)) return null;
  return `#${h.toLowerCase()}`;
}

/**
 * The swatch key of a colour that has a studio photo (case-insensitive), or
 * null for a custom colour that must be tinted instead.
 */
export function presetKeyFor(hex) {
  const n = normalizeHex(hex);
  if (!n) return null;
  return Object.keys(COLOR_MOCKUPS).find((k) => k.toLowerCase() === n) || null;
}

export function isPresetColor(hex) {
  return presetKeyFor(hex) !== null;
}

/* ---------- small colour helpers ---------- */

export function hexToRgb(hex) {
  if (!hex) return null;
  const h = hex.replace('#', '');
  const v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(v, 16);
  if (Number.isNaN(n)) return null;
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgbToHex({ r, g, b }) {
  const c = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Per-channel difference between two hex colours (8-bit units). */
export function colorDelta(a, b) {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  if (!A || !B) return null;
  const dr = Math.abs(A.r - B.r);
  const dg = Math.abs(A.g - B.g);
  const db = Math.abs(A.b - B.b);
  return { r: dr, g: dg, b: db, max: Math.max(dr, dg, db), avg: (dr + dg + db) / 3 };
}

/** Median RGB of the opaque pixels in an RGBA byte array. */
export function medianColor(data, minAlpha = 200) {
  const rs = [];
  const gs = [];
  const bs = [];
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < minAlpha) continue;
    rs.push(data[i]);
    gs.push(data[i + 1]);
    bs.push(data[i + 2]);
  }
  if (rs.length === 0) return null;
  const med = (arr) => {
    arr.sort((x, y) => x - y);
    return arr[arr.length >> 1];
  };
  return { r: med(rs), g: med(gs), b: med(bs) };
}

/* ---------- mockup sampling ---------- */

const imageCache = new Map();
const IMAGE_CACHE_MAX = 40; // sleeve mockups are data URLs; keep the map bounded

export function loadImage(url) {
  if (!imageCache.has(url)) {
    while (imageCache.size >= IMAGE_CACHE_MAX) imageCache.delete(imageCache.keys().next().value);
    imageCache.set(
      url,
      new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => {
          imageCache.delete(url);
          reject(new Error(`Failed to load mockup ${url}`));
        };
        img.src = url;
      })
    );
  }
  return imageCache.get(url);
}

/**
 * Median colour of a small patch of a mockup photo.
 * `probe` is { x, y } as fractions of the image; `radiusFrac` of image width.
 */
export async function sampleMockupAt(url, probe, radiusFrac = 0.03) {
  const img = await loadImage(url);
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const r = Math.max(2, Math.round(w * radiusFrac));
  const size = r * 2;
  const sx = Math.round(w * probe.x) - r;
  const sy = Math.round(h * probe.y) - r;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, sx, sy, size, size, 0, 0, size, size);
  return medianColor(ctx.getImageData(0, 0, size, size).data);
}

const sampleCache = new Map();

/** Fabric colour (hex) at the print-zone centre of a mockup photo. Cached per URL. */
export function sampleFabricColor(url, probe = MATCH_PROBE_CENTER) {
  const key = `${url}|${probe.x}|${probe.y}`;
  if (!sampleCache.has(key)) {
    while (sampleCache.size >= IMAGE_CACHE_MAX) sampleCache.delete(sampleCache.keys().next().value);
    sampleCache.set(
      key,
      sampleMockupAt(url, probe).then((rgb) => (rgb ? rgbToHex(rgb) : null))
    );
  }
  return sampleCache.get(key);
}

export const PROBES = { center: MATCH_PROBE_CENTER };

/**
 * Hook: the fabric colour the 3D tee should be painted for a swatch + side.
 * Returns the measured fallback immediately, then the live photo sample.
 */
export function useFabricColor(nominalHex, side = 'front') {
  // Custom colours (no photo) are painted with their exact hex — the 2D side
  // tints the white tee so its chest is that same hex (see mockupTint.js).
  const preset = presetKeyFor(nominalHex);
  const url = preset ? getMockupUrl(preset, side) : null;
  // Keyed by URL so a sample for the previous swatch is never shown for this one.
  const [sampled, setSampled] = useState({ url: null, hex: null });

  useEffect(() => {
    if (!url) return undefined;
    let alive = true;
    sampleFabricColor(url)
      .then((hex) => { if (alive && hex) setSampled({ url, hex }); })
      .catch(() => {});
    return () => { alive = false; };
  }, [url]);

  if (!preset) return normalizeHex(nominalHex) || '#d1d3d3';
  return sampled.url === url && sampled.hex ? sampled.hex : fabricColorFor(preset);
}
