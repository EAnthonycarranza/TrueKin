import { useState, useEffect, lazy, Suspense } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShoppingBag, Check, Star, Trash2, ShieldCheck, User as UserIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../api/client';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';

const COLOR_NAMES = {
  '#FFFFFF': 'White', '#000000': 'Black', '#929292': 'Gray',
  '#e02d27': 'Red', '#1f40d3': 'Blue', '#43d31f': 'Green',
  '#f7ec1e': 'Yellow', '#f88d28': 'Orange', '#e524ef': 'Purple',
  '#1fd3ca': 'Teal', '#FFC0CB': 'Pink', '#8B4513': 'Brown',
};

const TshirtPreview = lazy(() => import('../components/designer/TshirtPreview'));
const Tshirt2DPreview = lazy(() => import('../components/designer/Tshirt2DPreview'));

export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [showDesignPreview, setShowDesignPreview] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedShirtStyle, setSelectedShirtStyle] = useState(null);
  const addItem = useCartStore((s) => s.addItem);
  const openCart = useCartStore((s) => s.openCart);
  const authUser = useAuthStore((s) => s.user);

  // Reviews
  const [reviews, setReviews] = useState([]);
  const [reviewSummary, setReviewSummary] = useState({ count: 0, average: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } });
  const [reviewForm, setReviewForm] = useState({ rating: 0, title: '', comment: '' });
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewSending, setReviewSending] = useState(false);

  useEffect(() => {
    api.getProduct(id)
      .then((d) => {
        setProduct(d.product);
        setShowDesignPreview(!!d.product.designData);
        if (d.product.availableColors?.length > 0) {
          setSelectedColor(d.product.availableColors[0]);
        }
        if (d.product.sizes?.length > 0) {
          setSelectedSize(d.product.sizes[0].size);
        }
      })
      .catch(() => toast.error('Product not found'))
      .finally(() => setLoading(false));
  }, [id]);

  const loadReviews = async () => {
    try {
      const d = await api.getReviews(id);
      setReviews(d.reviews || []);
      setReviewSummary(d.summary || { count: 0, average: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } });
      // If the current user already has a review, prefill the form for edit.
      if (authUser) {
        const mine = (d.reviews || []).find((r) => r.user === authUser._id || r.user?._id === authUser._id);
        if (mine) {
          setReviewForm({ rating: mine.rating, title: mine.title || '', comment: mine.comment || '' });
        }
      }
    } catch { /* silent */ }
  };

  useEffect(() => {
    loadReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, authUser?._id]);

  const myReview = authUser
    ? reviews.find((r) => r.user === authUser._id || r.user?._id === authUser._id)
    : null;

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!authUser) {
      toast.error('Please sign in to leave a review.');
      return;
    }
    if (!reviewForm.rating) {
      toast.error('Tap a star to pick a rating.');
      return;
    }
    if (!reviewForm.comment.trim()) {
      toast.error('Please add a short comment.');
      return;
    }
    setReviewSending(true);
    try {
      await api.submitReview({
        productId: id,
        rating: reviewForm.rating,
        title: reviewForm.title,
        comment: reviewForm.comment,
      });
      toast.success(myReview ? 'Review updated' : 'Thanks for the review!');
      await loadReviews();
    } catch (err) {
      toast.error(err.message || 'Could not save your review.');
    } finally {
      setReviewSending(false);
    }
  };

  const handleReviewDelete = async (reviewId) => {
    if (!window.confirm('Delete your review?')) return;
    try {
      await api.deleteReview(reviewId);
      toast.success('Review deleted');
      setReviewForm({ rating: 0, title: '', comment: '' });
      await loadReviews();
    } catch (err) {
      toast.error(err.message || 'Could not delete review.');
    }
  };

  if (loading) return <div className="loading-page"><div className="spinner" /></div>;
  if (!product) return <div className="page container"><p>Product not found.</p></div>;

  const hasDesign = !!product.designData;
  const hasImages = product.imageUrls.length > 0;
  const is2D = product.editorType === '2d';
  const savedShirtStyle = product.shirtStyle || 'mens';

  const hasColors = product?.availableColors?.length > 0;
  const hasSizes = product?.sizes?.length > 0;

  const handleAddToCart = () => {
    if (hasColors && !selectedColor) {
      toast.error('Please select a color');
      return;
    }
    if (hasSizes && !selectedSize) {
      toast.error('Please select a size');
      return;
    }
    // Check inventory — sum across any legacy styles for the same size (unisex)
    if (hasSizes && selectedSize) {
      const entries = product.sizes.filter((s) => s.size === selectedSize);
      const anyUnlimited = entries.some((s) => s.unlimited);
      const total = entries.reduce((sum, s) => sum + (s.quantity || 0), 0);
      if (!anyUnlimited && total < quantity) {
        toast.error(`Only ${total} left in size ${selectedSize}`);
        return;
      }
    }
    addItem(product, quantity, selectedColor, selectedSize, 'unisex');
    toast.success('Added to cart!');
    openCart();
  };

  // Determine the preview label based on editor type
  const previewLabel = is2D ? '2D View' : '3D View';

  return (
    <div className="page">
      <div className="container">
        <div style={styles.layout}>
          {/* Images / Design Preview */}
          <div style={styles.images}>
            {/* Main view: 3D/2D design preview or static image */}
            {showDesignPreview && hasDesign ? (
              <Suspense fallback={
                <div style={{ ...styles.mainImage, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div className="spinner" />
                </div>
              }>
                {is2D ? (
                  <Tshirt2DPreview
                    designData={product.designData}
                    colorOverride={selectedColor}
                    style={{ minHeight: 400 }}
                  />
                ) : (
                  <TshirtPreview
                    designData={product.designData}
                    colorOverride={selectedColor}
                    shirtStyleOverride={selectedShirtStyle || savedShirtStyle}
                    style={{ aspectRatio: '1', minHeight: 400 }}
                  />
                )}
              </Suspense>
            ) : (
              <div style={styles.mainImage}>
                {product.imageUrls[selectedImage] ? (
                  <img
                    src={product.imageUrls[selectedImage]}
                    alt={product.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12 }}
                  />
                ) : (
                  <div className="img-placeholder" style={{ height: 500, borderRadius: 12, fontSize: 24 }}>
                    {product.title.charAt(0)}
                  </div>
                )}
              </div>
            )}

            {/* Thumbnail strip: design preview toggle + image thumbs */}
            {(hasDesign || hasImages) && (
              <div style={styles.thumbs}>
                {hasDesign && (
                  <button
                    onClick={() => setShowDesignPreview(true)}
                    style={{
                      ...styles.thumbBtn,
                      border: showDesignPreview ? '2px solid var(--accent)' : '2px solid var(--border)',
                      background: showDesignPreview ? 'var(--accent)' : '#f9fafb',
                      color: showDesignPreview ? '#fff' : '#666',
                    }}
                  >
                    {previewLabel}
                  </button>
                )}
                {product.imageUrls.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt=""
                    onClick={() => {
                      setSelectedImage(i);
                      setShowDesignPreview(false);
                    }}
                    style={{
                      ...styles.thumb,
                      border: !showDesignPreview && i === selectedImage ? '2px solid var(--accent)' : '2px solid transparent',
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div style={styles.info}>
            <h1 style={styles.title}>{product.title}</h1>
            <p style={styles.price}>${(product.price / 100).toFixed(2)}</p>
            <p style={styles.desc}>{product.description}</p>

            {/* Color Selection */}
            {hasColors && (
              <div style={styles.optionGroup}>
                <label style={styles.optionLabel}>
                  Color — {COLOR_NAMES[selectedColor] || selectedColor || 'Select a color'}
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {product.availableColors.map((hex) => {
                    const isActive = selectedColor === hex;
                    return (
                      <button
                        key={hex}
                        type="button"
                        onClick={() => setSelectedColor(hex)}
                        title={COLOR_NAMES[hex] || hex}
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          border: isActive ? '3px solid var(--accent)' : '2px solid #d1d5db',
                          background: hex,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: isActive ? '0 0 0 2px rgba(59,130,246,0.3)' : 'none',
                          transition: 'all 0.15s',
                          padding: 0,
                        }}
                      >
                        {isActive && (
                          <Check
                            size={16}
                            strokeWidth={3}
                            color={hex === '#FFFFFF' || hex === '#f7ec1e' || hex === '#FFC0CB' ? '#000' : '#fff'}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Fit: unisex only — Truekin tees are cut on one unisex last. */}
            <div style={styles.optionGroup}>
              <label style={styles.optionLabel}>Fit</label>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '9px 14px',
                  background: 'var(--ink, #0a0a0a)',
                  color: '#f4f1ea',
                  fontFamily: 'var(--font-secondary, "Oswald", sans-serif)',
                  fontSize: 11.5,
                  fontWeight: 700,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  borderRadius: 4,
                  border: '1px solid #1f1f1f',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                Unisex Fit · One Cut For The Kin
              </div>
            </div>

            {/* Size Selection — unisex; collapse legacy per-style entries into one per size */}
            {hasSizes && (() => {
              // Merge legacy mens/womens inventory into a single unisex row per size.
              const merged = new Map();
              for (const s of product.sizes) {
                const existing = merged.get(s.size);
                if (!existing) {
                  merged.set(s.size, {
                    size: s.size,
                    quantity: s.quantity || 0,
                    unlimited: Boolean(s.unlimited),
                  });
                } else {
                  existing.quantity += s.quantity || 0;
                  existing.unlimited = existing.unlimited || Boolean(s.unlimited);
                }
              }
              const styleSizes = Array.from(merged.values());
              if (styleSizes.length === 0) return (
                <div style={styles.optionGroup}>
                  <label style={styles.optionLabel}>Size</label>
                  <p style={{ fontSize: 13, color: '#9ca3af', fontStyle: 'italic' }}>
                    No sizes available.
                  </p>
                </div>
              );
              return (
                <div style={styles.optionGroup}>
                  <label style={styles.optionLabel}>
                    Size — {selectedSize || 'Select a size'}
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {styleSizes.map(({ size, quantity: qty, unlimited }) => {
                      const isActive = selectedSize === size;
                      const outOfStock = !unlimited && qty === 0;
                      return (
                        <button
                          key={size}
                          type="button"
                          onClick={() => !outOfStock && setSelectedSize(size)}
                          disabled={outOfStock}
                          style={{
                            minWidth: 48,
                            height: 40,
                            padding: '0 14px',
                            borderRadius: 8,
                            border: isActive ? '2px solid var(--accent)' : '2px solid #d1d5db',
                            background: outOfStock ? '#f3f4f6' : isActive ? 'var(--accent)' : '#fff',
                            color: outOfStock ? '#9ca3af' : isActive ? '#fff' : 'var(--text)',
                            cursor: outOfStock ? 'not-allowed' : 'pointer',
                            fontWeight: 600,
                            fontSize: 14,
                            textDecoration: outOfStock ? 'line-through' : 'none',
                            transition: 'all 0.15s',
                            position: 'relative',
                          }}
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>
                  {selectedSize && (() => {
                    const entry = styleSizes.find((s) => s.size === selectedSize);
                    if (!entry) return null;
                    if (entry.unlimited) return null;
                    if (entry.quantity <= 5) {
                      return (
                        <p style={{ fontSize: 12, color: 'var(--danger)', marginTop: 6 }}>
                          Only {entry.quantity} left in stock
                        </p>
                      );
                    }
                    return null;
                  })()}
                </div>
              );
            })()}

            {/* Quantity */}
            <div style={styles.optionGroup}>
              <label style={styles.optionLabel}>Quantity</label>
              <div style={styles.qtyGroup}>
                <button className="btn btn-secondary btn-sm" onClick={() => setQuantity(Math.max(1, quantity - 1))}>-</button>
                <span style={{ padding: '0 16px', fontWeight: 600 }}>{quantity}</span>
                <button className="btn btn-secondary btn-sm" onClick={() => setQuantity(quantity + 1)}>+</button>
              </div>
            </div>

            <button
              className="btn btn-primary btn-lg"
              style={{ width: '100%', marginTop: 24 }}
              onClick={handleAddToCart}
            >
              <ShoppingBag size={18} />
              Add to Cart
            </button>
          </div>
        </div>

        {/* ====================  REVIEWS  ==================== */}
        <section className="tk-reviews">
          <header className="tk-reviews-head">
            <div>
              <span className="tk-reviews-eyebrow">Word from the Kin</span>
              <h2 className="tk-reviews-title">Reviews</h2>
            </div>
            <div className="tk-reviews-summary">
              <div className="tk-reviews-avg">
                {reviewSummary.count > 0 ? reviewSummary.average.toFixed(1) : '—'}
              </div>
              <div>
                <Stars value={reviewSummary.average} size={16} />
                <p className="tk-reviews-count">
                  {reviewSummary.count} {reviewSummary.count === 1 ? 'review' : 'reviews'}
                </p>
              </div>
            </div>
          </header>

          {/* Review form */}
          <div className="tk-reviews-form-wrap">
            {authUser ? (
              <form onSubmit={handleReviewSubmit} className="tk-reviews-form">
                <div className="tk-reviews-form-head">
                  <strong>{myReview ? 'Update your review' : 'Leave a review'}</strong>
                  <span className="tk-reviews-form-user">
                    <UserIcon size={12} /> {authUser.name}
                  </span>
                </div>

                <div className="tk-reviews-rate-row">
                  <span className="tk-reviews-label">Your rating <em>*</em></span>
                  <div
                    className="tk-reviews-stars"
                    onMouseLeave={() => setHoverRating(0)}
                  >
                    {[1, 2, 3, 4, 5].map((n) => {
                      const active = (hoverRating || reviewForm.rating) >= n;
                      return (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setReviewForm((f) => ({ ...f, rating: n }))}
                          onMouseEnter={() => setHoverRating(n)}
                          className={`tk-reviews-star-btn ${active ? 'on' : ''}`}
                          aria-label={`${n} star${n > 1 ? 's' : ''}`}
                        >
                          <Star size={22} fill={active ? 'currentColor' : 'none'} strokeWidth={1.8} />
                        </button>
                      );
                    })}
                    {reviewForm.rating > 0 && (
                      <span className="tk-reviews-rate-text">
                        {reviewForm.rating} / 5
                      </span>
                    )}
                  </div>
                </div>

                <label className="tk-reviews-field">
                  <span>Title (optional)</span>
                  <input
                    type="text"
                    maxLength={140}
                    value={reviewForm.title}
                    onChange={(e) => setReviewForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. Crisp press, honest fit"
                  />
                </label>

                <label className="tk-reviews-field">
                  <span>Review <em>*</em></span>
                  <textarea
                    required
                    rows={4}
                    maxLength={2000}
                    value={reviewForm.comment}
                    onChange={(e) => setReviewForm((f) => ({ ...f, comment: e.target.value }))}
                    placeholder="How's the press, the fit, the fabric? What should other folks know?"
                  />
                </label>

                <div className="tk-reviews-form-actions">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={reviewSending}
                  >
                    {reviewSending ? 'Saving…' : myReview ? 'Update Review' : 'Post Review'}
                  </button>
                  {myReview && (
                    <button
                      type="button"
                      className="tk-reviews-del-btn"
                      onClick={() => handleReviewDelete(myReview._id)}
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  )}
                </div>
              </form>
            ) : (
              <div className="tk-reviews-signin">
                <strong>Want to leave a review?</strong>
                <p>
                  <Link to="/login">Sign in</Link> or{' '}
                  <Link to="/register">create an account</Link> to share your
                  thoughts on this drop.
                </p>
              </div>
            )}
          </div>

          {/* Review list */}
          <div className="tk-reviews-list">
            {reviews.length === 0 ? (
              <div className="tk-reviews-empty">
                <Star size={18} />
                <p>No reviews yet — be the first to share yours.</p>
              </div>
            ) : (
              reviews.map((r) => (
                <article key={r._id} className="tk-review">
                  <div className="tk-review-head">
                    <div className="tk-review-avatar">
                      {(r.userName || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="tk-review-meta">
                      <strong>{r.userName}</strong>
                      <div className="tk-review-sub">
                        <Stars value={r.rating} size={12} />
                        {r.verified && (
                          <span className="tk-review-verified">
                            <ShieldCheck size={11} /> Verified buyer
                          </span>
                        )}
                        <span className="tk-review-date">
                          {new Date(r.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </div>
                  {r.title && <h4 className="tk-review-title">{r.title}</h4>}
                  <p className="tk-review-body">{r.comment}</p>
                </article>
              ))
            )}
          </div>
        </section>
      </div>

      <style>{`
        .tk-reviews {
          margin-top: 64px;
          padding-top: 40px;
          border-top: 1.5px solid var(--border, #e5e5e0);
        }
        .tk-reviews-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 20px;
          flex-wrap: wrap;
          margin-bottom: 28px;
        }
        .tk-reviews-eyebrow {
          display: block;
          font-family: var(--font-secondary, inherit);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--brand, #c8301f);
          margin-bottom: 6px;
        }
        .tk-reviews-title {
          font-family: var(--font-display, inherit);
          font-size: 36px;
          font-weight: 400;
          letter-spacing: 0.01em;
          line-height: 1;
        }
        .tk-reviews-summary {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 12px 18px;
          background: var(--surface, #fafaf5);
          border: 1.5px solid var(--border, #e5e5e0);
          border-radius: 8px;
        }
        .tk-reviews-avg {
          font-family: var(--font-display, inherit);
          font-size: 34px;
          line-height: 1;
          color: var(--ink, #0a0a0a);
          letter-spacing: 0.02em;
        }
        .tk-reviews-count {
          font-size: 12px;
          color: var(--text-muted, #777);
          margin-top: 4px;
          letter-spacing: 0.04em;
        }

        .tk-reviews-form-wrap {
          margin-bottom: 36px;
        }
        .tk-reviews-form {
          background: var(--surface, #fafaf5);
          border: 1.5px solid var(--border, #e5e5e0);
          border-radius: 10px;
          padding: 22px 24px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .tk-reviews-form-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--border, #e5e5e0);
        }
        .tk-reviews-form-head strong {
          font-family: var(--font-secondary, inherit);
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }
        .tk-reviews-form-user {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11.5px;
          color: var(--text-muted, #777);
          letter-spacing: 0.04em;
        }
        .tk-reviews-label {
          display: block;
          font-family: var(--font-secondary, inherit);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--ink, #0a0a0a);
          margin-bottom: 6px;
        }
        .tk-reviews-label em {
          color: var(--brand, #c8301f);
          font-style: normal;
          margin-left: 2px;
        }
        .tk-reviews-rate-row {
          display: flex;
          flex-direction: column;
        }
        .tk-reviews-stars {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          color: #d1a300;
        }
        .tk-reviews-star-btn {
          background: none;
          border: none;
          padding: 2px;
          cursor: pointer;
          color: #c8c8c0;
          transition: transform 0.1s ease, color 0.1s ease;
          line-height: 0;
        }
        .tk-reviews-star-btn:hover { transform: scale(1.08); }
        .tk-reviews-star-btn.on { color: #d1a300; }
        .tk-reviews-rate-text {
          margin-left: 10px;
          font-family: var(--font-secondary, inherit);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: var(--text-muted, #777);
        }
        .tk-reviews-field {
          display: flex;
          flex-direction: column;
        }
        .tk-reviews-field span {
          font-family: var(--font-secondary, inherit);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--ink, #0a0a0a);
          margin-bottom: 6px;
        }
        .tk-reviews-field span em {
          color: var(--brand, #c8301f);
          font-style: normal;
          margin-left: 2px;
        }
        .tk-reviews-field input,
        .tk-reviews-field textarea {
          font-family: inherit;
          font-size: 14px;
          padding: 10px 12px;
          background: #fff;
          border: 1.5px solid var(--border-strong, #c7c7bf);
          border-radius: 4px;
          color: var(--ink, #0a0a0a);
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
          width: 100%;
        }
        .tk-reviews-field textarea {
          resize: vertical;
          min-height: 100px;
          line-height: 1.5;
        }
        .tk-reviews-field input:focus,
        .tk-reviews-field textarea:focus {
          border-color: var(--ink, #0a0a0a);
          box-shadow: 0 0 0 3px rgba(10,10,10,0.08);
        }
        .tk-reviews-form-actions {
          display: flex;
          gap: 10px;
          align-items: center;
          margin-top: 4px;
        }
        .tk-reviews-del-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: none;
          border: none;
          color: var(--brand, #c8301f);
          font-family: var(--font-secondary, inherit);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          cursor: pointer;
          padding: 6px 10px;
          border-radius: 4px;
        }
        .tk-reviews-del-btn:hover { background: rgba(200,48,31,0.08); }

        .tk-reviews-signin {
          background: var(--surface, #fafaf5);
          border: 1.5px dashed var(--border-strong, #c7c7bf);
          border-radius: 10px;
          padding: 22px 24px;
          text-align: center;
        }
        .tk-reviews-signin strong {
          display: block;
          font-family: var(--font-secondary, inherit);
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          margin-bottom: 6px;
        }
        .tk-reviews-signin p { color: var(--text-secondary, #555); font-size: 14px; }
        .tk-reviews-signin a { color: var(--brand, #c8301f); font-weight: 600; }

        .tk-reviews-empty {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 18px 22px;
          background: var(--surface, #fafaf5);
          border: 1.5px dashed var(--border-strong, #c7c7bf);
          border-radius: 8px;
          color: var(--text-muted, #777);
          font-size: 14px;
        }

        .tk-reviews-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .tk-review {
          background: #fff;
          border: 1.5px solid var(--border, #e5e5e0);
          border-radius: 8px;
          padding: 18px 20px;
        }
        .tk-review-head {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 10px;
        }
        .tk-review-avatar {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: var(--ink, #0a0a0a);
          color: #f4f1ea;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-secondary, inherit);
          font-weight: 700;
          letter-spacing: 0.04em;
          flex-shrink: 0;
        }
        .tk-review-meta strong {
          display: block;
          font-size: 14px;
          letter-spacing: 0.01em;
        }
        .tk-review-sub {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 4px;
        }
        .tk-review-verified {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-family: var(--font-secondary, inherit);
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #2d7a3c;
          background: rgba(45,122,60,0.08);
          padding: 3px 7px;
          border-radius: 2px;
        }
        .tk-review-date {
          font-size: 12px;
          color: var(--text-muted, #888);
        }
        .tk-review-title {
          font-size: 15px;
          font-weight: 600;
          margin-bottom: 6px;
        }
        .tk-review-body {
          color: var(--text, #222);
          font-size: 14.5px;
          line-height: 1.6;
          white-space: pre-wrap;
        }
      `}</style>
    </div>
  );
}

function Stars({ value, size = 14 }) {
  const v = Math.max(0, Math.min(5, Number(value) || 0));
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, color: '#d1a300' }}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = v >= n;
        const half = !filled && v >= n - 0.5;
        return (
          <Star
            key={n}
            size={size}
            strokeWidth={1.8}
            fill={filled ? 'currentColor' : half ? 'url(#half)' : 'none'}
            color={filled || half ? '#d1a300' : '#c8c8c0'}
          />
        );
      })}
    </span>
  );
}

const styles = {
  layout: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'start' },
  images: {},
  mainImage: { aspectRatio: '1', borderRadius: 12, overflow: 'hidden', background: '#f9fafb' },
  thumbs: { display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' },
  thumb: { width: 72, height: 72, objectFit: 'cover', borderRadius: 8, cursor: 'pointer' },
  thumbBtn: {
    width: 72,
    height: 72,
    borderRadius: 8,
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: 13,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {},
  title: { fontSize: 28, fontWeight: 700, marginBottom: 8 },
  price: { fontSize: 24, fontWeight: 700, marginBottom: 16 },
  desc: { fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 24 },
  optionGroup: { marginBottom: 20 },
  optionLabel: { display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 8 },
  qtyGroup: { display: 'flex', alignItems: 'center' },
};
