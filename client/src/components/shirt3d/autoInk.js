/**
 * autoInk — keep what is on the canvas readable against the blank underneath it.
 *
 * Applied when an object is placed and again whenever the shirt colour changes,
 * so a design approved on white still reads when the same artwork is shot on
 * black. What happens depends on what the object *is*:
 *
 *   text            recoloured. A fill is one value and changing it is lossless.
 *   paired mark     swapped for its authored twin (Shield · Ink ⇄ Bone). Real
 *                   artwork, so it always looks right.
 *   flat artwork    re-inked over its own alpha. Most of what a customer sends
 *                   is a one-colour logo, which is as safe to recolour as text;
 *                   see imageTone for how narrowly "flat" is judged.
 *   anything else   left alone and reported, for the studio to warn about. A
 *                   photograph or a multi-colour illustration cannot be
 *                   recoloured without wrecking it, and guessing is worse than
 *                   saying so.
 *
 * Nothing is touched once `inkLocked` is set, which happens the moment the
 * admin picks a colour by hand. Auto-contrast is a safety net, not an argument.
 */
import { readableInk, readsAgainst, prefersLightInk, variantFor } from './contrast';
import { analyzeArtwork, recolorArtwork } from './imageTone';

const isText = (obj) => obj?.type === 'textbox' || obj?.type === 'text' || obj?.type === 'i-text';

/** Fabric fills can be gradients or patterns; only a plain hex is comparable. */
const solidFill = (fill) => (typeof fill === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(fill) ? fill : null);

/**
 * Re-ink one canvas against a fabric colour.
 *
 * @param {object} canvas  Fabric canvas
 * @param {string} fabricHex
 * @returns {{changed: number, unreadable: Array<{type: string, name: string}>}}
 */
export function applyAutoInk(canvas, fabricHex) {
  const result = { changed: 0, unreadable: [] };
  if (!canvas || !fabricHex) return result;

  for (const obj of canvas.getObjects()) {
    if (obj.inkLocked) continue;

    if (isText(obj)) {
      // A stroked outline carries its own contrast, so leave those alone.
      if (!obj.stroke && reinkText(obj, fabricHex)) result.changed += 1;
      continue;
    }

    if (obj.type === 'image' && obj.assetAltSrc && obj.assetTone) {
      const wantLight = prefersLightInk(fabricHex);
      if ((obj.assetTone === 'light') === wantLight) continue;   // already right
      swapImageSource(obj, obj.assetAltSrc);
      result.changed += 1;
      continue;
    }

    // Vector clipart carries a flat fill, same as text.
    if (obj.type === 'path' || obj.type === 'group') {
      const fill = solidFill(obj.fill);
      if (fill && !readsAgainst(fill, fabricHex)) {
        obj.set('fill', readableInk(fabricHex));
        result.changed += 1;
      }
      continue;
    }

    if (obj.type === 'image') {
      if (reinkFlatImage(obj, fabricHex)) result.changed += 1;
      else if (obj._inkFlat === false) {
        result.unreadable.push({ type: 'image', name: obj.assetLabel || 'an image' });
      }
    }
  }

  if (result.changed) canvas.renderAll();
  return result;
}

/**
 * Re-ink text, remembering the colour it was actually authored in.
 *
 * Without that memory a navy heading pushed to Bone on a navy tee comes back as
 * flat black on white — readable, but not the colour anyone chose. The original
 * is restored the moment a shirt it reads against comes round again.
 */
function reinkText(obj, fabricHex) {
  const fill = solidFill(obj.fill);
  if (!fill) return false;
  if (obj._inkOriginalFill === undefined) obj._inkOriginalFill = fill;

  const original = obj._inkOriginalFill;
  const target = readsAgainst(original, fabricHex) ? original : readableInk(fabricHex);
  if (target === fill) return false;
  obj.set('fill', target);
  return true;
}

/**
 * Re-ink an uploaded image that is a single colour over transparency.
 *
 * The pristine element is kept and every repaint derives from it, so switching
 * colours repeatedly cannot accumulate fringing, and a shirt the original reads
 * against restores the artwork exactly as supplied — a navy crest comes back
 * navy rather than settling on whichever ink it was last forced to.
 *
 * On a design reloaded from a save these fields are gone and the analysis runs
 * against whatever was stored. The mark still stays readable; it just treats
 * the saved colour as its original, which is the best that can be known.
 *
 * @returns {boolean} whether the object was repainted
 */
function reinkFlatImage(obj, fabricHex) {
  if (obj._inkFlat === undefined) {
    const source = obj._inkOriginalEl || obj.getElement?.();
    if (!source) { obj._inkFlat = false; return false; }
    const analysis = analyzeArtwork(source);
    obj._inkFlat = analysis.flat;
    obj._inkOriginalHex = analysis.hex;
    if (analysis.flat) obj._inkOriginalEl = source;
  }
  if (!obj._inkFlat || !obj._inkOriginalEl || !obj._inkOriginalHex) return false;

  // The original reads here — put the customer's own colour back.
  const wantOriginal = readsAgainst(obj._inkOriginalHex, fabricHex);
  const target = wantOriginal ? null : readableInk(fabricHex);
  if (obj._inkAppliedHex === (target || null)) return false;

  obj.setElement(wantOriginal ? obj._inkOriginalEl : recolorArtwork(obj._inkOriginalEl, target));
  obj._inkAppliedHex = target || null;
  obj.dirty = true;
  return true;
}

/**
 * Point a Fabric image at a different file, keeping its box.
 *
 * The twin is the same artwork trimmed to the same alpha bounds, so reusing the
 * scale keeps the mark exactly where and how big it was — reloading it as a new
 * object would re-centre and re-fit it, and the print would jump.
 */
function swapImageSource(obj, src) {
  const previous = obj.getSrc?.();
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    obj.setElement(img);
    obj.assetTone = obj.assetTone === 'light' ? 'dark' : 'light';
    // The twin pointer has to flip with the artwork, or swapping back lands on
    // the file we just left and the mark sticks on one tone.
    if (previous) obj.assetAltSrc = previous;
    obj.dirty = true;
    obj.canvas?.renderAll();
  };
  img.src = src;
}

/**
 * Which file of a pair to load for this fabric, and how the resulting object
 * should be tagged.
 *
 * The tags describe the file actually used, not the one in the library: place
 * Shield · Ink on a black tee and Bone is what loads, so the object is `light`
 * with Ink as its twin. Tagging it from the library entry instead would leave
 * it convinced it was dark, and the next colour change would swap it the wrong
 * way.
 */
export function sourceFor(asset, fabricHex) {
  const chosen = variantFor(asset, fabricHex);
  if (!chosen || !asset.tone) return { src: asset.src, tone: null, altSrc: null };
  const swapped = chosen !== asset.src;
  return {
    src: chosen,
    tone: swapped ? (asset.tone === 'light' ? 'dark' : 'light') : asset.tone,
    altSrc: swapped ? asset.src : asset.altSrc,
  };
}

/**
 * Tag a freshly created object so the studio can manage it later, and give text
 * the right ink for the shirt it is landing on.
 *
 * @param {object} obj
 * @param {{tone: string|null, altSrc: string|null, label?: string}} tags
 * @param {string} fabricHex
 */
export function inkNewObject(obj, tags, fabricHex) {
  if (tags?.tone && tags.altSrc) {
    obj.assetTone = tags.tone;
    obj.assetAltSrc = tags.altSrc;
    if (tags.label) obj.assetLabel = tags.label;
  }
  if (isText(obj) && !obj.stroke) reinkText(obj, fabricHex);
  return obj;
}
