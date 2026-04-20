const Review = require('../models/Review');
const Order = require('../models/Order');

// Build a rating summary (count + average + 1..5 distribution).
function summarize(reviews) {
  const count = reviews.length;
  if (!count) {
    return { count: 0, average: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
  }
  const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let total = 0;
  for (const r of reviews) {
    total += r.rating;
    dist[r.rating] = (dist[r.rating] || 0) + 1;
  }
  return {
    count,
    average: Math.round((total / count) * 10) / 10,
    distribution: dist,
  };
}

// Public: list reviews for a product (newest first) + summary
exports.listByProduct = async (req, res) => {
  try {
    const reviews = await Review.find({ product: req.params.productId })
      .sort({ createdAt: -1 });
    res.json({ reviews, summary: summarize(reviews) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Auth: create or update the current user's review for a product
exports.createOrUpdate = async (req, res) => {
  try {
    const { productId, rating, title, comment } = req.body;
    if (!productId || !rating || !comment) {
      return res.status(400).json({
        message: 'Product, rating, and comment are required.',
      });
    }
    const r = parseInt(rating, 10);
    if (!Number.isFinite(r) || r < 1 || r > 5) {
      return res.status(400).json({ message: 'Rating must be 1–5.' });
    }

    // Mark verified if the user has an order containing this product.
    let verified = false;
    try {
      const owned = await Order.exists({
        user: req.user._id,
        'items.product': productId,
      });
      verified = Boolean(owned);
    } catch { /* non-fatal */ }

    const review = await Review.findOneAndUpdate(
      { product: productId, user: req.user._id },
      {
        product: productId,
        user: req.user._id,
        userName: req.user.name,
        rating: r,
        title: (title || '').trim().slice(0, 140),
        comment: String(comment).trim().slice(0, 2000),
        verified,
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    res.status(201).json({ review });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: 'You already reviewed this product.',
      });
    }
    res.status(500).json({ message: error.message });
  }
};

// Auth: delete the current user's review (by review id, owner only)
exports.deleteOwn = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found.' });

    const isOwner = String(review.user) === String(req.user._id);
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Not allowed.' });
    }

    await review.deleteOne();
    res.json({ message: 'Review deleted.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
