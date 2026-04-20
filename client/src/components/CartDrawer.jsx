import { X, Minus, Plus, Trash2, ArrowRight, Truck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useCartStore } from '../store/cartStore';
import { ShieldMark } from './brand/Logo';

const FREE_SHIPPING_THRESHOLD = 5000; // $50.00 in cents

export default function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, updateQuantity } = useCartStore();
  const navigate = useNavigate();

  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - totalPrice);
  const progress = Math.min(100, (totalPrice / FREE_SHIPPING_THRESHOLD) * 100);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && isOpen && closeCart();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, closeCart]);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div className="cart-overlay" onClick={closeCart} />
      <aside className="cart-drawer" role="dialog" aria-label="Shopping cart">
        <header className="cart-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <ShieldMark size={28} />
            <div>
              <h3 className="cart-title">The Bag</h3>
              <p className="cart-subtitle">{items.length} {items.length === 1 ? 'item' : 'items'} · ready to ship</p>
            </div>
          </div>
          <button onClick={closeCart} className="cart-close" aria-label="Close cart">
            <X size={20} />
          </button>
        </header>

        {items.length > 0 && (
          <div className="cart-ship-banner">
            <div className="cart-ship-head">
              <Truck size={15} />
              {remaining > 0 ? (
                <span>
                  You're <strong>${(remaining / 100).toFixed(2)}</strong> away from free shipping
                </span>
              ) : (
                <span><strong>You unlocked free shipping!</strong></span>
              )}
            </div>
            <div className="cart-ship-bar">
              <div className="cart-ship-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        <div className="cart-body">
          {items.length === 0 ? (
            <div className="cart-empty">
              <div className="cart-empty-icon">
                <ShieldMark size={36} style={{ color: 'var(--ink)' }} />
              </div>
              <h4>The bag is empty.</h4>
              <p>Find your next tee — or the one you'll pass to a brother.</p>
              <button
                className="btn btn-primary"
                onClick={() => { closeCart(); navigate('/shop'); }}
                style={{ marginTop: 18 }}
              >
                Browse the Shop <ArrowRight size={16} />
              </button>
            </div>
          ) : (
            items.map((item, i) => (
              <div key={i} className="cart-item">
                <div className="cart-item-img">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.title} />
                  ) : (
                    <div className="img-placeholder" style={{ fontSize: 10 }}>No img</div>
                  )}
                </div>
                <div className="cart-item-info">
                  <div className="cart-item-top">
                    <p className="cart-item-title">{item.title}</p>
                    <button onClick={() => removeItem(i)} className="cart-item-remove" aria-label="Remove">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  {(item.color || item.size || item.shirtStyle) && (
                    <p className="cart-item-meta">
                      {item.shirtStyle && <>{item.shirtStyle === 'womens' ? "Women's" : "Men's"}</>}
                      {item.shirtStyle && (item.color || item.size) && ' · '}
                      {item.color && (
                        <>
                          <span
                            className="cart-item-swatch"
                            style={{ background: item.color }}
                          />
                          {item.color}
                        </>
                      )}
                      {item.color && item.size && ' · '}
                      {item.size && <>Size {item.size}</>}
                    </p>
                  )}
                  <div className="cart-item-bottom">
                    <div className="cart-qty">
                      <button
                        className="cart-qty-btn"
                        onClick={() => updateQuantity(i, item.quantity - 1)}
                        aria-label="Decrease"
                      >
                        <Minus size={13} />
                      </button>
                      <span className="cart-qty-num">{item.quantity}</span>
                      <button
                        className="cart-qty-btn"
                        onClick={() => updateQuantity(i, item.quantity + 1)}
                        aria-label="Increase"
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                    <span className="cart-item-price">
                      ${((item.price * item.quantity) / 100).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <footer className="cart-footer">
            <div className="cart-row">
              <span>Subtotal</span>
              <span>${(totalPrice / 100).toFixed(2)}</span>
            </div>
            <div className="cart-row cart-row-muted">
              <span>Shipping</span>
              <span>{remaining > 0 ? 'Calculated at checkout' : 'Free'}</span>
            </div>
            <hr className="divider" style={{ margin: '12px 0' }} />
            <div className="cart-row cart-row-total">
              <span>Total</span>
              <span>${(totalPrice / 100).toFixed(2)}</span>
            </div>
            <button
              className="btn btn-primary btn-lg"
              style={{ width: '100%', marginTop: 16 }}
              onClick={() => { closeCart(); navigate('/checkout'); }}
            >
              Checkout <ArrowRight size={18} />
            </button>
            <button
              className="btn btn-ghost"
              style={{ width: '100%', marginTop: 6 }}
              onClick={() => { closeCart(); navigate('/cart'); }}
            >
              View full cart
            </button>
          </footer>
        )}
      </aside>

      <style>{`
        .cart-overlay {
          position: fixed;
          inset: 0;
          background: rgba(10,10,10,0.45);
          backdrop-filter: blur(3px);
          z-index: 200;
          animation: fadeIn 0.2s var(--ease);
        }
        .cart-drawer {
          position: fixed;
          top: 0;
          right: 0;
          width: 440px;
          max-width: 100vw;
          height: 100dvh;
          background: var(--surface);
          z-index: 201;
          display: flex;
          flex-direction: column;
          box-shadow: -20px 0 60px rgba(0,0,0,0.18);
          animation: slideInRight 0.28s var(--ease);
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .cart-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          padding: 22px 24px 16px;
          border-bottom: 1px solid var(--border);
        }
        .cart-title {
          font-family: var(--font-display);
          font-size: 26px;
          font-weight: 400;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          line-height: 1;
        }
        .cart-subtitle {
          font-family: var(--font-secondary);
          font-size: 11px;
          color: var(--text-muted);
          margin-top: 4px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        .cart-close {
          padding: 6px;
          border-radius: 8px;
          color: var(--text-secondary);
          transition: background 0.15s;
        }
        .cart-close:hover { background: var(--accent-light); color: var(--text); }

        .cart-ship-banner {
          background: var(--surface-2);
          padding: 14px 24px;
          border-bottom: 1px solid var(--border);
        }
        .cart-ship-head {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: var(--text);
          margin-bottom: 8px;
        }
        .cart-ship-bar {
          height: 4px;
          background: #e8e4dd;
          border-radius: 4px;
          overflow: hidden;
        }
        .cart-ship-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--ink), var(--brand));
          border-radius: 4px;
          transition: width 0.4s var(--ease);
        }

        .cart-body {
          flex: 1;
          overflow-y: auto;
          padding: 8px 24px;
        }
        .cart-empty {
          text-align: center;
          padding: 60px 20px;
        }
        .cart-empty-icon {
          width: 72px;
          height: 72px;
          border-radius: 6px;
          background: var(--accent-light);
          border: 1.5px solid var(--ink);
          color: var(--ink);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 18px;
        }
        .cart-empty h4 {
          font-family: var(--font-display);
          font-size: 22px;
          font-weight: 400;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          margin-bottom: 6px;
        }
        .cart-empty p {
          color: var(--text-muted);
          font-size: 14px;
        }

        .cart-item {
          display: flex;
          gap: 14px;
          padding: 16px 0;
          border-bottom: 1px solid var(--border);
        }
        .cart-item:last-child { border-bottom: none; }
        .cart-item-img {
          width: 76px;
          height: 76px;
          border-radius: var(--radius);
          overflow: hidden;
          background: var(--accent-light);
          flex-shrink: 0;
        }
        .cart-item-img img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .cart-item-info {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .cart-item-top {
          display: flex;
          justify-content: space-between;
          gap: 8px;
        }
        .cart-item-title {
          font-size: 14px;
          font-weight: 600;
          line-height: 1.35;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }
        .cart-item-remove {
          color: var(--text-muted);
          padding: 4px;
          border-radius: 6px;
          transition: color 0.15s, background 0.15s;
          flex-shrink: 0;
        }
        .cart-item-remove:hover { color: var(--danger); background: var(--danger-soft); }
        .cart-item-meta {
          font-size: 12px;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          flex-wrap: wrap;
        }
        .cart-item-swatch {
          display: inline-block;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          border: 1px solid rgba(0,0,0,0.1);
          margin-right: 4px;
        }
        .cart-item-bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 4px;
        }
        .cart-qty {
          display: inline-flex;
          align-items: center;
          border: 1px solid var(--border-strong);
          border-radius: var(--radius);
          overflow: hidden;
        }
        .cart-qty-btn {
          padding: 6px 9px;
          color: var(--text-secondary);
          transition: background 0.15s;
        }
        .cart-qty-btn:hover { background: var(--accent-light); color: var(--text); }
        .cart-qty-num {
          font-size: 13px;
          font-weight: 600;
          padding: 0 10px;
          min-width: 28px;
          text-align: center;
        }
        .cart-item-price {
          font-size: 15px;
          font-weight: 700;
          letter-spacing: -0.01em;
        }

        .cart-footer {
          padding: 20px 24px 24px;
          border-top: 1px solid var(--border);
          background: var(--surface);
        }
        .cart-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 14px;
          font-weight: 500;
          padding: 3px 0;
        }
        .cart-row-muted { color: var(--text-muted); font-size: 13px; }
        .cart-row-total {
          font-size: 17px;
          font-weight: 700;
          letter-spacing: -0.01em;
        }
      `}</style>
    </>
  );
}
