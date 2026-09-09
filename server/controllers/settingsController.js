const mongoose = require('mongoose');
const SiteSettings = require('../models/SiteSettings');
const Product = require('../models/Product');
const { inputError, readText } = require('../utils/fulfillment');

/** The hero has three fixed card positions in the layout. */
const HERO_CARD_COUNT = 3;

/** Shape a product for the homepage hero — never the whole document. */
function heroProduct(product) {
  if (!product) return null;
  return {
    _id: product._id,
    title: product.title,
    price: product.price,
    imageUrl: product.imageUrls?.[0] || '',
  };
}

async function loadSettings() {
  return (await SiteSettings.findOne({ key: 'site' })) || null;
}

/**
 * Public: the homepage's editable content.
 *
 * Cards are always returned as a fixed-length array so the client can map
 * slot → layout position without bookkeeping. A slot resolves to `product:
 * null` when nothing is chosen, and *also* when the chosen product has since
 * been deleted or deactivated — the client falls back to its built-in
 * placeholder for that slot either way, so a hidden product can never leave a
 * dead card (or a live link to a hidden product) on the homepage.
 */
exports.getHomeSettings = async (req, res) => {
  try {
    const settings = await loadSettings();
    const ids = (settings?.heroCards || []).map((card) => card.product).filter(Boolean);
    const products = ids.length
      ? await Product.find({ _id: { $in: ids }, active: true }).select('title price imageUrls')
      : [];
    const byId = new Map(products.map((p) => [p._id.toString(), p]));

    const heroCards = Array.from({ length: HERO_CARD_COUNT }, (_, i) => {
      const card = settings?.heroCards?.[i];
      return {
        tag: card?.tag || '',
        product: heroProduct(card?.product ? byId.get(card.product.toString()) : null),
      };
    });

    res.json({ heroCards });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Admin: replace the homepage settings.
 *
 * Products are validated here rather than trusted from the form, so a stale
 * admin tab cannot pin the hero to a product that no longer exists.
 */
exports.updateHomeSettings = async (req, res) => {
  try {
    const incoming = req.body.heroCards;
    if (!Array.isArray(incoming)) throw inputError('heroCards must be a list');
    if (incoming.length > HERO_CARD_COUNT) throw inputError(`At most ${HERO_CARD_COUNT} hero cards`);

    const heroCards = [];
    for (const card of incoming) {
      const tag = readText(card?.tag, 'Card tag', 40);
      let product = null;
      if (card?.product) {
        if (!mongoose.isValidObjectId(card.product)) throw inputError('Choose a valid product');
        const found = await Product.findById(card.product).select('_id');
        if (!found) throw inputError('That product no longer exists');
        product = found._id;
      }
      heroCards.push({ tag, product });
    }

    await SiteSettings.findOneAndUpdate(
      { key: 'site' },
      { $set: { heroCards } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Reply with the same resolved shape the storefront reads, so the admin
    // page can render its preview from the server's answer rather than guessing.
    return exports.getHomeSettings(req, res);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
};

/** Admin: the raw stored selection, for populating the edit form. */
exports.getHomeSettingsAdmin = async (req, res) => {
  try {
    const settings = await loadSettings();
    const heroCards = Array.from({ length: HERO_CARD_COUNT }, (_, i) => ({
      tag: settings?.heroCards?.[i]?.tag || '',
      product: settings?.heroCards?.[i]?.product?.toString() || '',
    }));
    res.json({ heroCards });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
