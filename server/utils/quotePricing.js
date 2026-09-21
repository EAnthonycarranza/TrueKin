const PRODUCTS = Object.freeze({
  tshirt: {
    label: 'Custom T-shirt',
    tiers: [[12, 2400], [24, 1900], [48, 1600], [100, 1400], [Infinity, 1200]],
    setup: 3500,
  },
  sticker: {
    label: 'Custom sticker',
    tiers: [[25, 350], [50, 250], [100, 175], [250, 125], [Infinity, 85]],
    setup: 2500,
  },
});

function inputError(message) {
  return Object.assign(new Error(message), { status: 400 });
}

function wholeNumber(value, field, min, max) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw inputError(`${field} must be a whole number from ${min.toLocaleString()} to ${max.toLocaleString()}.`);
  }
  return parsed;
}

function quoteEstimate(input = {}) {
  const productType = String(input.productType || '');
  const product = PRODUCTS[productType];
  if (!product) throw inputError('Choose a T-shirt or sticker for your studio estimate.');

  const quantity = wholeNumber(input.quantity, 'Quantity', 1, 100000);
  const printLocations = productType === 'tshirt'
    ? wholeNumber(input.printLocations || 1, 'Print locations', 1, 4)
    : 1;
  const stickerSize = productType === 'sticker' && ['2in', '3in', '4in'].includes(input.stickerSize)
    ? input.stickerSize
    : productType === 'sticker' ? '3in' : '';
  const rush = input.rush === true || input.rush === 'true';

  const baseUnit = product.tiers.find(([limit]) => quantity < limit)[1];
  const locationUnit = productType === 'tshirt' ? (printLocations - 1) * 350 : 0;
  const sizeMultiplier = productType === 'sticker'
    ? ({ '2in': 0.82, '3in': 1, '4in': 1.36 }[stickerSize])
    : 1;
  const unitPrice = Math.round((baseUnit + locationUnit) * sizeMultiplier);
  const production = unitPrice * quantity;
  const setup = product.setup;
  const rushFee = rush ? Math.round((production + setup) * 0.2) : 0;
  const subtotal = production + setup + rushFee;

  return {
    productType,
    productLabel: product.label,
    quantity,
    printLocations,
    stickerSize,
    rushRequested: rush,
    unitPrice,
    production,
    setup,
    rush: rushFee,
    subtotal,
    low: Math.round(subtotal * 0.9),
    high: Math.round(subtotal * 1.12),
    assumptions: [
      productType === 'tshirt'
        ? `${printLocations} print ${printLocations === 1 ? 'location' : 'locations'} on a standard unisex blank`
        : `${stickerSize.replace('in', ' inch')} full-color sticker on weather-resistant stock`,
      'Production-ready artwork or artwork prepared in the Truekin studio',
      rush ? 'Rush review requested; final availability must be confirmed' : 'Standard production timing after art approval',
      'Shipping, specialty finishes, and sales tax are not included',
    ],
  };
}

module.exports = { quoteEstimate };
