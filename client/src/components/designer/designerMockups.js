/**
 * Per-color photorealistic mockup image mappings for the 2D editor.
 *
 * Truekin ships a single unisex cut, so there is one mockup set — the former
 * women's base (and the screen-blend recolour it needed) has been removed.
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
