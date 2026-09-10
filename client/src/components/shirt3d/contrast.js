/**
 * contrast — keep artwork readable against whatever blank it is pressed on.
 *
 * A black mark on a black tee is invisible, and now that one design is shot
 * across every colour the shop stocks, that stops being a thing the admin can
 * just notice and fix by hand.
 *
 * Two decisions worth stating:
 *
 * The measure is the WCAG relative-luminance contrast ratio, not "is the hex
 * dark". A ratio compares the two things that actually matter to each other,
 * so it gets mid-tones right: charcoal artwork on a mid-grey blank fails, and
 * a naive lightness threshold on each colour separately does not catch it.
 *
 * It is measured against the *fabric* colour rather than the swatch hex. The
 * swatch is an identifier; the tee photographs as something else (see
 * shirtColor.js), and grey is exactly where the two diverge enough to flip the
 * answer.
 */
import { hexToRgb } from './shirtColor';

/**
 * Below this, artwork and fabric are too close to read apart.
 *
 * WCAG's 4.5:1 is for body text at small sizes; a chest print is enormous by
 * comparison, and holding it to 4.5 would recolour marks that read perfectly
 * well. 3:1 is WCAG's own threshold for large text and graphical objects,
 * which is what a print actually is.
 */
export const MIN_CONTRAST = 3;

/** WCAG relative luminance (0 = black, 1 = white). */
export function relativeLuminance(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const channel = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
}

/** WCAG contrast ratio between two colours: 1 (identical) to 21 (black/white). */
export function contrastRatio(a, b) {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  if (la === null || lb === null) return null;
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Would light artwork read better on this fabric than dark artwork? */
export function prefersLightInk(fabricHex) {
  const light = contrastRatio('#FFFFFF', fabricHex);
  const dark = contrastRatio('#0A0A0A', fabricHex);
  if (light === null || dark === null) return false;
  return light > dark;
}

/** Does this artwork colour read against this fabric? */
export function readsAgainst(inkHex, fabricHex) {
  const ratio = contrastRatio(inkHex, fabricHex);
  return ratio === null ? true : ratio >= MIN_CONTRAST;
}

/**
 * The ink to use for text on this fabric.
 *
 * Bone rather than pure white, and the brand's near-black rather than #000:
 * these are the two inks the shop actually presses, so the preview matches
 * what comes off the press.
 */
export const INK_DARK = '#0A0A0A';
export const INK_LIGHT = '#F4F1EA';

export function readableInk(fabricHex) {
  return prefersLightInk(fabricHex) ? INK_LIGHT : INK_DARK;
}

/**
 * Pick the variant of an asset that reads on this fabric.
 *
 * Returns the asset's own src when it already reads, its authored twin when it
 * does not and one exists, and null when nothing can be done automatically —
 * which is the signal to warn instead of silently mangling a photograph.
 *
 * @param {{src: string, tone?: 'light'|'dark', altSrc?: string}} asset
 * @param {string} fabricHex
 */
export function variantFor(asset, fabricHex) {
  if (!asset?.tone || !asset.altSrc) return null;   // not a two-tone mark
  const wantLight = prefersLightInk(fabricHex);
  const isLight = asset.tone === 'light';
  return wantLight === isLight ? asset.src : asset.altSrc;
}
