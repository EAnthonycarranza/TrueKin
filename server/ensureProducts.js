// Non-destructive: if the Products collection is empty, insert a small
// starter catalog so the storefront (and reviews flow) has something to render.
// Run:  node ensureProducts.js
require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./models/Product');

const STARTER_PRODUCTS = [
  {
    title: 'Truekin Classic Tee',
    description:
      'Our signature unisex tee. Heavyweight cotton, ring-spun, garment-washed for a broken-in feel from day one.',
    price: 3200,
    imageUrls: [],
    category: 'T-Shirt',
    featured: true,
    editorType: '2d',
    shirtStyle: 'unisex',
    availableColors: ['#000000', '#FFFFFF', '#929292'],
    sizes: [
      { size: 'S', quantity: 0, unlimited: true },
      { size: 'M', quantity: 0, unlimited: true },
      { size: 'L', quantity: 0, unlimited: true },
      { size: 'XL', quantity: 0, unlimited: true },
    ],
  },
  {
    title: 'Word from the Kin Tee',
    description:
      'Story-first graphic tee. Screen-printed by hand, built to soften with every wash.',
    price: 3600,
    imageUrls: [],
    category: 'T-Shirt',
    featured: true,
    editorType: '2d',
    shirtStyle: 'unisex',
    availableColors: ['#000000', '#f7ec1e'],
    sizes: [
      { size: 'M', quantity: 0, unlimited: true },
      { size: 'L', quantity: 0, unlimited: true },
      { size: 'XL', quantity: 0, unlimited: true },
    ],
  },
];

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('[ensureProducts] Connected to MongoDB');

    const count = await Product.countDocuments();
    if (count > 0) {
      console.log(`[ensureProducts] ${count} product(s) already exist — leaving collection alone.`);
      process.exit(0);
    }

    const created = await Product.insertMany(STARTER_PRODUCTS);
    console.log(`[ensureProducts] Inserted ${created.length} starter product(s):`);
    for (const p of created) {
      console.log(`  • ${p.title}  (${p._id})`);
    }
    process.exit(0);
  } catch (err) {
    console.error('[ensureProducts] Failed:', err.message || err);
    process.exit(1);
  }
})();
