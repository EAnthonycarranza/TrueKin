/**
 * palette – the editable shirt-colour swatch list, shared by both studios.
 *
 * Entries are { hex, preset }. `preset` remembers which studio photo the
 * swatch started from, so an edited swatch can be restored to it. A swatch
 * whose hex still equals its preset renders that photo; any other hex is
 * tinted from the white tee at render time (see mockupTint.buildMockupUrl).
 *
 * Extracted from Shirt3DStudio so the 2D studio offers the same custom
 * colours from the same stored palette — edit a swatch in one editor and it
 * is the same swatch in the other.
 */
import { TSHIRT_COLORS } from '../designer/designerConstants';
import { presetKeyFor, normalizeHex, hexToRgb, FABRIC_COLOR_FALLBACK } from './shirtColor';

export const PALETTE_KEY = 'truking.shirtPalette.v1';

export function canonicalColor(hex) {
  return presetKeyFor(hex) || normalizeHex(hex);
}

export function defaultPalette() {
  return TSHIRT_COLORS.map((c) => ({ hex: c, preset: c }));
}

export function normalizePalette(list) {
  if (!Array.isArray(list)) return null;
  const out = list
    .map((e) => {
      const hex = canonicalColor(typeof e === 'string' ? e : e?.hex);
      if (!hex) return null;
      const preset = e && typeof e === 'object' && e.preset ? presetKeyFor(e.preset) : presetKeyFor(hex);
      return { hex, preset };
    })
    .filter(Boolean);
  return out.length ? out : null;
}

export function loadStoredPalette() {
  try {
    return normalizePalette(JSON.parse(window.localStorage.getItem(PALETTE_KEY)));
  } catch {
    return null;
  }
}

export function storePalette(palette) {
  try {
    window.localStorage.setItem(PALETTE_KEY, JSON.stringify(palette));
  } catch { /* private mode */ }
}

/**
 * Build a palette from a product's in-stock colours.
 *
 * When a drop names the blanks it ships in (The Palette, section 02 of the
 * product editor), those colours ARE the studio's palette — there is no point
 * designing against a green tee the shop does not stock. Returns null when the
 * product names none, which is the signal to fall back to the editable stored
 * palette.
 *
 * Duplicates are dropped rather than rendered twice, since the admin's list is
 * free-form and a hex may appear in more than one case.
 */
export function paletteFromColors(colors) {
  if (!Array.isArray(colors)) return null;
  const seen = new Set();
  const out = [];
  for (const raw of colors) {
    const hex = canonicalColor(raw);
    if (!hex || seen.has(hex)) continue;
    seen.add(hex);
    out.push({ hex, preset: presetKeyFor(hex) });
  }
  return out.length ? out : null;
}

/** What a swatch looks like on screen: the photo's fabric for presets, the hex otherwise. */
export function swatchDisplayColor(entry) {
  return entry.hex === entry.preset ? FABRIC_COLOR_FALLBACK[entry.preset] || entry.hex : entry.hex;
}

export function isLight(hex) {
  const c = hexToRgb(hex);
  return c ? (0.299 * c.r + 0.587 * c.g + 0.114 * c.b) / 255 > 0.6 : true;
}
