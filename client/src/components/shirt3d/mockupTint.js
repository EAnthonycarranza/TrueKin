/**
 * mockupTint – the 2D body mockup for any shirt colour.
 *
 * A studio photo when the colour is one of the 12 presets, otherwise the
 * white tee photo re-shaded so the chest is EXACTLY the hex.
 *
 * "Re-shaded" means each pixel's brightness is taken relative to the fabric
 * at the print-zone centre of the white photo and multiplied into the target
 * colour — so the calibration point lands on the exact hex, which is also
 * what the 3D tee is painted with. Custom colours match by construction.
 */
import { getMockupUrl } from '../designer/designerMockups';
import sideWhite from '../../assets/images/side-white.png';
import { hexToRgb, loadImage, normalizeHex, presetKeyFor, sampleFabricColor, sampleMockupAt } from './shirtColor';
import { sleeveProbeImage } from './printArea';

const MOCKUP_CACHE_MAX = 24;
const mockupCache = new Map();
const whiteCache = new Map();

function luma(r, g, b) {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function imageDataOf(img, w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h);
}

/** The white tee photo as a shading map at the requested size. */
function whiteShading(side, w, h) {
  const url = getMockupUrl('#FFFFFF', side);
  const key = `${side}|${w || 0}x${h || 0}`;
  if (!whiteCache.has(key)) {
    whiteCache.set(
      key,
      Promise.all([loadImage(url), sampleFabricColor(url)]).then(([img, refHex]) => {
        const W = w || img.naturalWidth || img.width;
        const H = h || img.naturalHeight || img.height;
        const ref = hexToRgb(refHex || '#d1d3d3');
        return {
          width: W,
          height: H,
          data: imageDataOf(img, W, H).data,
          refLuma: Math.max(0.05, luma(ref.r, ref.g, ref.b)),
        };
      })
    );
  }
  return whiteCache.get(key);
}

/** Keep the cache bounded: evict the oldest entries and free their blob URLs. */
function evictMockupCache() {
  while (mockupCache.size > MOCKUP_CACHE_MAX) {
    const [oldestKey, oldestJob] = mockupCache.entries().next().value;
    mockupCache.delete(oldestKey);
    oldestJob.then((url) => { if (url.startsWith('blob:')) URL.revokeObjectURL(url); }).catch(() => {});
  }
}

/** Object URL of the body mockup for `hex` on `side`. Cached per colour+side. */
export function buildMockupUrl(hex, side = 'front') {
  const bodyKey = presetKeyFor(hex) || normalizeHex(hex) || '#d1d3d3';
  const key = `${side}|${bodyKey}`;
  if (mockupCache.has(key)) return mockupCache.get(key);

  const job = (async () => {
    const preset = presetKeyFor(bodyKey);
    if (preset) return getMockupUrl(preset, side);

    const white = await whiteShading(side);
    const { width, height } = white;
    const out = new ImageData(new Uint8ClampedArray(white.data), width, height);
    const t = hexToRgb(bodyKey);
    const d = out.data;
    const wd = white.data;
    for (let i = 0; i < d.length; i += 4) {
      if (wd[i + 3] === 0) continue;
      const shade = luma(wd[i], wd[i + 1], wd[i + 2]) / white.refLuma;
      d[i] = Math.min(255, t.r * shade);
      d[i + 1] = Math.min(255, t.g * shade);
      d[i + 2] = Math.min(255, t.b * shade);
    }
    const c = document.createElement('canvas');
    c.width = width;
    c.height = height;
    c.getContext('2d').putImageData(out, 0, 0);
    const blob = await new Promise((resolve) => c.toBlob(resolve, 'image/png'));
    return URL.createObjectURL(blob);
  })();

  mockupCache.set(key, job);
  job.catch(() => mockupCache.delete(key));
  evictMockupCache();
  return job;
}

export const resolveMockupUrl = buildMockupUrl;

/* ---------- sleeve mockups ----------
 * One side-view photo of the white tee (wearer's left side) is the shading
 * map for every colour: each pixel's brightness relative to the fabric at the
 * sleeve print zone is multiplied into the fabric colour, so the zone centre
 * is exactly the colour the 3D tee is painted with. Mirrored for the right
 * sleeve. The photo's soft halo (low alpha) is dropped.
 */
const HALO_ALPHA = 200;
let sideShadingJob = null;

function sideShading() {
  if (!sideShadingJob) {
    sideShadingJob = Promise.all([
      loadImage(sideWhite),
      sampleMockupAt(sideWhite, sleeveProbeImage('left'), 0.02),
    ]).then(([img, ref]) => {
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;
      const r = ref || { r: 239, g: 236, b: 238 };
      return { width, height, data: imageDataOf(img, width, height).data, refLuma: Math.max(0.05, luma(r.r, r.g, r.b)) };
    });
    sideShadingJob.catch(() => { sideShadingJob = null; });
  }
  return sideShadingJob;
}

/** Object URL of the side-view sleeve mockup painted in `fabricHex`. */
export function buildSleeveMockupUrl(fabricHex, side = 'left') {
  const colour = normalizeHex(fabricHex) || '#d1d3d3';
  const key = `sleeve|${side}|${colour}`;
  if (mockupCache.has(key)) return mockupCache.get(key);

  const job = (async () => {
    const white = await sideShading();
    const { width, height } = white;
    const out = new ImageData(new Uint8ClampedArray(white.data), width, height);
    const t = hexToRgb(colour);
    const d = out.data;
    const wd = white.data;
    for (let i = 0; i < d.length; i += 4) {
      if (wd[i + 3] < HALO_ALPHA) { d[i + 3] = 0; continue; }
      const shade = luma(wd[i], wd[i + 1], wd[i + 2]) / white.refLuma;
      d[i] = Math.min(255, t.r * shade);
      d[i + 1] = Math.min(255, t.g * shade);
      d[i + 2] = Math.min(255, t.b * shade);
      d[i + 3] = 255;
    }
    const src = document.createElement('canvas');
    src.width = width;
    src.height = height;
    src.getContext('2d').putImageData(out, 0, 0);
    let result = src;
    if (side === 'right') {
      result = document.createElement('canvas');
      result.width = width;
      result.height = height;
      const ctx = result.getContext('2d');
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(src, 0, 0);
    }
    const blob = await new Promise((resolve) => result.toBlob(resolve, 'image/png'));
    return URL.createObjectURL(blob);
  })();

  mockupCache.set(key, job);
  job.catch(() => mockupCache.delete(key));
  evictMockupCache();
  return job;
}
