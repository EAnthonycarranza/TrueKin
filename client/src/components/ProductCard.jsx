import { Link } from 'react-router-dom';
import { Eye, Cross } from 'lucide-react';
import { ShieldMark } from './brand/Logo';

export default function ProductCard({ product }) {
  const price = (product.price / 100).toFixed(2);
  const hasSecondImage = product.imageUrls?.length > 1;
  const colors = product.availableColors?.slice(0, 5) || [];

  return (
    <Link to={`/product/${product._id}`} className="tt-product-card">
      <div className="tt-product-img">
        {product.imageUrls?.[0] ? (
          <>
            <img
              src={product.imageUrls[0]}
              alt={product.title}
              className="tt-product-img-main"
              loading="lazy"
            />
            {hasSecondImage && (
              <img
                src={product.imageUrls[1]}
                alt=""
                aria-hidden="true"
                className="tt-product-img-hover"
                loading="lazy"
              />
            )}
          </>
        ) : (
          <div className="img-placeholder">
            <ShieldMark size={56} style={{ color: 'var(--ink)', opacity: 0.35 }} />
          </div>
        )}

        {product.featured && (
          <span className="tt-product-featured">
            <Cross size={11} strokeWidth={2.4} /> The Kin
          </span>
        )}

        <span className="tt-product-quickview">
          <Eye size={14} /> Quick View
        </span>
      </div>

      <div className="tt-product-info">
        <div className="tt-product-row">
          <h3 className="tt-product-title">{product.title}</h3>
          <p className="tt-product-price">${price}</p>
        </div>

        <div className="tt-product-meta">
          {colors.length > 0 ? (
            <div className="tt-color-dots">
              {colors.map((c) => (
                <span
                  key={c}
                  className="tt-color-dot"
                  style={{ background: c }}
                  title={c}
                />
              ))}
              {product.availableColors?.length > 5 && (
                <span className="tt-color-more">+{product.availableColors.length - 5}</span>
              )}
            </div>
          ) : (
            <span className="tt-product-sub">Heat-pressed · Premium blank</span>
          )}
        </div>
      </div>

      <style>{`
        .tt-product-card {
          display: block;
          background: var(--surface);
          border-radius: 6px;
          overflow: hidden;
          border: 1.5px solid var(--border);
          transition: transform 0.3s var(--ease), box-shadow 0.3s var(--ease), border-color 0.3s var(--ease);
          text-decoration: none;
          color: inherit;
        }
        .tt-product-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-md);
          border-color: var(--ink);
        }
        .tt-product-img {
          position: relative;
          aspect-ratio: 1;
          overflow: hidden;
          background: linear-gradient(135deg, #f4f1ea 0%, #e3ddcd 100%);
        }
        .tt-product-img-main,
        .tt-product-img-hover {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: opacity 0.4s var(--ease), transform 0.6s var(--ease);
        }
        .tt-product-img-hover { opacity: 0; }
        .tt-product-card:hover .tt-product-img-main { transform: scale(1.06); opacity: 0; }
        .tt-product-card:hover .tt-product-img-hover { opacity: 1; transform: scale(1.06); }

        .tt-product-featured {
          position: absolute;
          top: 12px;
          left: 12px;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: var(--ink);
          color: #fff;
          font-family: var(--font-secondary);
          font-size: 10.5px;
          font-weight: 600;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          padding: 5px 10px;
          border-radius: 2px;
          border: 1px solid #1f1f1f;
          box-shadow: var(--shadow-sm);
        }

        .tt-product-quickview {
          position: absolute;
          left: 12px;
          right: 12px;
          bottom: 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          background: #fff;
          color: var(--ink);
          font-family: var(--font-secondary);
          font-size: 11.5px;
          font-weight: 600;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          padding: 10px 12px;
          border-radius: 4px;
          border: 1.5px solid var(--ink);
          opacity: 0;
          transform: translateY(10px);
          transition: opacity 0.25s var(--ease), transform 0.25s var(--ease);
          box-shadow: var(--shadow-sm);
          pointer-events: none;
        }
        .tt-product-card:hover .tt-product-quickview {
          opacity: 1;
          transform: translateY(0);
        }

        .tt-product-info { padding: 16px 18px 18px; }
        .tt-product-row {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 12px;
          margin-bottom: 8px;
        }
        .tt-product-title {
          font-family: var(--font-secondary);
          font-size: 14.5px;
          font-weight: 600;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          line-height: 1.3;
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .tt-product-price {
          font-family: var(--font-secondary);
          font-size: 14.5px;
          font-weight: 600;
          letter-spacing: 0.02em;
          flex-shrink: 0;
        }
        .tt-product-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          min-height: 20px;
        }
        .tt-color-dots {
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .tt-color-dot {
          display: inline-block;
          width: 14px;
          height: 14px;
          border-radius: 2px;
          border: 1px solid rgba(0,0,0,0.1);
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.2);
        }
        .tt-color-more {
          font-size: 11px;
          color: var(--text-muted);
          font-weight: 600;
          margin-left: 2px;
          font-family: var(--font-secondary);
        }
        .tt-product-sub {
          font-family: var(--font-secondary);
          font-size: 11.5px;
          color: var(--text-muted);
          letter-spacing: 0.12em;
          text-transform: uppercase;
          font-weight: 500;
        }
        @media (max-width: 520px) {
          .tt-product-info { padding: 12px 12px 14px; }
          .tt-product-row {
            display: block;
            margin-bottom: 9px;
          }
          .tt-product-title {
            display: -webkit-box;
            min-height: 34px;
            overflow: hidden;
            font-size: 13px;
            line-height: 1.3;
            white-space: normal;
            -webkit-box-orient: vertical;
            -webkit-line-clamp: 2;
          }
          .tt-product-price {
            margin-top: 5px;
            font-size: 14px;
          }
          .tt-product-featured {
            top: 8px;
            left: 8px;
            padding: 4px 7px;
            font-size: 9px;
          }
          .tt-product-quickview { display: none; }
          .tt-color-dots { gap: 4px; }
          .tt-color-dot { width: 12px; height: 12px; }
        }
      `}</style>
    </Link>
  );
}
