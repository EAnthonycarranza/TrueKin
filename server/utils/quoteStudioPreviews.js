const crypto = require('crypto');

const STUDIO_SIDES = {
  tshirt: ['front', 'back', 'left', 'right'],
  sticker: ['front'],
};

function createStudioPreviewToken() {
  return crypto.randomBytes(24).toString('hex');
}

const STUDIO_SIDE_LABELS = {
  front: 'Front',
  back: 'Back',
  left: 'Left sleeve',
  right: 'Right sleeve',
};

function getStudioPreviews(quote) {
  const saved = quote.designSidePreviews || [];
  if (saved.length) {
    return saved.map((preview) => ({
      side: preview.side,
      label: STUDIO_SIDE_LABELS[preview.side] || preview.side,
      imageUrl: preview.imageUrl,
    }));
  }
  return quote.designPreviewUrl
    ? [{ side: 'front', label: 'Front', imageUrl: quote.designPreviewUrl }]
    : [];
}

module.exports = { STUDIO_SIDES, createStudioPreviewToken, getStudioPreviews };
