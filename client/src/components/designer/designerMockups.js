/**
 * Per-color photorealistic mockup image mappings for the 2D editor.
 *
 * Each TSHIRT_COLOR hex maps to { front, back } image URLs.
 * These images are pre-colored, so no tinting is needed —
 * FabricCanvas should use preColored={true} when displaying them.
 *
 * Image source: client/src/assets/images/
 */

// Front mockup imports
import frontBlack from '../../assets/images/front-black.png';
import frontBlue from '../../assets/images/blue-front.png';
import frontBrown from '../../assets/images/front-brown.png';
import frontCyan from '../../assets/images/front-cyan.png';
import frontGray from '../../assets/images/front-gray.png';
import frontGreen from '../../assets/images/front-green.png';
import frontOrange from '../../assets/images/front-orange.png';
import frontPink from '../../assets/images/front-pink.png';
import frontPurple from '../../assets/images/front-purple.png';
import frontRed from '../../assets/images/front-red.png';
import frontWhite from '../../assets/images/font-white.png';
import frontYellow from '../../assets/images/front-yellow.png';

// Women's mockup imports (black base — dynamically recolored, white — used directly)
import womensFrontBlack from '../../assets/images/Women-Front-Black.png';
import womensBackBlack from '../../assets/images/Women-Back-Black.png';
import womensFrontWhite from '../../assets/images/Women-Front-White.png';
import womensBackWhite from '../../assets/images/Women-Back-White.png';

// Back mockup imports
import backBlack from '../../assets/images/back-black.png';
import backBlue from '../../assets/images/back-blue.png';
import backBrown from '../../assets/images/back-brown.png';
import backCyan from '../../assets/images/back-cyan.png';
import backGray from '../../assets/images/back-gray.png';
import backGreen from '../../assets/images/back-green.png';
import backOrange from '../../assets/images/back-orange.png';
import backPink from '../../assets/images/back-pink.png';
import backPurple from '../../assets/images/back-purple.png';
import backRed from '../../assets/images/back-red.png';
import backWhite from '../../assets/images/back-white.png';
import backYellow from '../../assets/images/back-yellow.png';

/**
 * Maps hex color → { front: imageURL, back: imageURL }
 * Matches the TSHIRT_COLORS array in designerConstants.js
 */
export const COLOR_MOCKUPS = {
  '#FFFFFF': { front: frontWhite, back: backWhite },
  '#000000': { front: frontBlack, back: backBlack },
  '#929292': { front: frontGray, back: backGray },
  '#e02d27': { front: frontRed, back: backRed },
  '#1f40d3': { front: frontBlue, back: backBlue },
  '#43d31f': { front: frontGreen, back: backGreen },
  '#f7ec1e': { front: frontYellow, back: backYellow },
  '#f88d28': { front: frontOrange, back: backOrange },
  '#e524ef': { front: frontPurple, back: backPurple },
  '#1fd3ca': { front: frontCyan, back: backCyan },
  '#FFC0CB': { front: frontPink, back: backPink },
  '#8B4513': { front: frontBrown, back: backBrown },
};

/**
 * Get the mockup image URL for a given color and side.
 * Falls back to white if color not found.
 */
export function getMockupUrl(color, side) {
  const entry = COLOR_MOCKUPS[color];
  if (entry) return entry[side];
  return COLOR_MOCKUPS['#FFFFFF']?.[side] || null;
}

/* ------------------------------------------------------------------ */
/*  Women's mockup — dynamically recolored from a single black base   */
/* ------------------------------------------------------------------ */

export const WOMENS_BASE = {
  front: womensFrontBlack,
  back: womensBackBlack,
};

// Cache recolored data-URLs so we don't re-render the same color+side twice
const _womensCache = {};

// Parse a hex color string to [r, g, b]
function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

/**
 * Recolor the black women's shirt mockup to any target color.
 *
 * Uses screen blending: screen(src, tgt) = src + tgt - (src * tgt / 255)
 * - Black pixels (0) → target color
 * - Dark shadow pixels → darker shade of target (preserves detail)
 * - White/light background pixels → stay white
 * - Transparent pixels → untouched
 *
 * Returns a Promise<string> that resolves to a data-URL of the recolored image.
 */
export function getWomensMockupUrl(color, side) {
  const key = `${color}_${side}`;
  if (_womensCache[key]) return Promise.resolve(_womensCache[key]);

  // For black, just return the original black image directly
  if (color === '#000000') {
    const url = WOMENS_BASE[side];
    _womensCache[key] = url;
    return Promise.resolve(url);
  }

  // For white, use the dedicated white shirt images
  if (color === '#FFFFFF') {
    const url = side === 'front' ? womensFrontWhite : womensBackWhite;
    _womensCache[key] = url;
    return Promise.resolve(url);
  }

  const src = WOMENS_BASE[side];
  if (!src) return Promise.resolve(null);

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const cvs = document.createElement('canvas');
      cvs.width = img.width;
      cvs.height = img.height;
      const ctx = cvs.getContext('2d');

      // Draw the original black shirt
      ctx.drawImage(img, 0, 0);

      const [tr, tg, tb] = hexToRgb(color);
      const imageData = ctx.getImageData(0, 0, cvs.width, cvs.height);
      const d = imageData.data;

      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] === 0) continue; // skip transparent

        const r = d[i], g = d[i + 1], b = d[i + 2];

        // Screen blend: a + b - (a*b)/255
        d[i]     = Math.min(255, r + tr - Math.round((r * tr) / 255));
        d[i + 1] = Math.min(255, g + tg - Math.round((g * tg) / 255));
        d[i + 2] = Math.min(255, b + tb - Math.round((b * tb) / 255));
      }

      ctx.putImageData(imageData, 0, 0);
      const dataUrl = cvs.toDataURL('image/png');
      _womensCache[key] = dataUrl;
      resolve(dataUrl);
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}
