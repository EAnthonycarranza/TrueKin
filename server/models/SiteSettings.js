const mongoose = require('mongoose');

/**
 * SiteSettings — a single document holding storefront content the admin edits
 * without touching code. Right now that is the three cards floating in the
 * homepage hero, which were hardcoded placeholders with invented titles and
 * prices.
 *
 * A hero card names a real product; its title, price and photo are read from
 * that product at request time so they can never drift from the catalogue.
 * Only the little tag above the card ("Bestseller", "New Drop") is stored here,
 * because it is editorial rather than a property of the product.
 *
 * `key` makes the singleton explicit and unique-indexed, so a race between two
 * admins saving at once upserts the same document instead of creating a second
 * one that the reader might then pick at random.
 */
const heroCardSchema = new mongoose.Schema({
  tag: { type: String, trim: true, maxlength: 40, default: '' },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
}, { _id: false });

const siteSettingsSchema = new mongoose.Schema({
  key: { type: String, default: 'site', unique: true, index: true },
  heroCards: { type: [heroCardSchema], default: [] },
}, { timestamps: true });

module.exports = mongoose.model('SiteSettings', siteSettingsSchema);
