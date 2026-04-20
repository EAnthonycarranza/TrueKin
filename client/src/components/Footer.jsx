import { Link } from 'react-router-dom';
import { Instagram, Facebook, Mail, ArrowUpRight } from 'lucide-react';
import { ShieldMark, Wordmark } from './brand/Logo';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="tk-footer">
      <div className="container">
        <div className="tk-footer-grid">
          {/* Brand */}
          <div className="tk-footer-brand">
            <div className="tk-footer-logo">
              <ShieldMark size={40} />
              <Wordmark height={22} />
            </div>
            <p>
              Christian custom tees — heat-pressed by hand on premium blanks
              from Bella + Canvas, Gildan, and Comfort Colors. Designed,
              printed, and prayed over in-house. Every tee for the kin.
            </p>
            <div className="tk-footer-verse stamp">
              "So if the Son sets you free, you will be free indeed." — John 8:36
            </div>
            <div className="tk-footer-social" role="list">
              <a
                href="https://www.instagram.com/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                title="Instagram"
              >
                <Instagram size={18} />
              </a>
              <a
                href="https://www.facebook.com/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                title="Facebook"
              >
                <Facebook size={18} />
              </a>
              <a
                href="mailto:hello@truekin.co"
                aria-label="Email"
                title="Email us"
              >
                <Mail size={18} />
              </a>
            </div>
          </div>

          {/* Shop */}
          <div className="tk-footer-col">
            <h5>Shop</h5>
            <Link to="/shop">All Tees</Link>
            <Link to="/shop?sort=newest">New Drop</Link>
            <Link to="/shop?featured=true">The Kin</Link>
            <Link to="/quote">Custom Quote</Link>
          </div>

          {/* Support */}
          <div className="tk-footer-col">
            <h5>Support</h5>
            <a href="mailto:hello@truekin.co">Contact</a>
            <Link to="/quote">Request a Quote</Link>
            <a href="#">Shipping</a>
            <a href="#">Returns</a>
          </div>

          {/* Story */}
          <div className="tk-footer-col">
            <h5>Our Story</h5>
            <a href="#">Mission</a>
            <a href="#">Ministry Partners</a>
            <a href="#">Sustainability</a>
            <a href="#">Press</a>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="tk-footer-bottom">
          <p className="tk-footer-copy">
            © {year} Truekin. All rights reserved. <span>Soli Deo gloria.</span>
          </p>

          <p className="tk-footer-credit">
            Website created by{' '}
            <a
              href="https://www.codingcarranza.com"
              target="_blank"
              rel="noopener noreferrer"
              className="tk-footer-credit-link"
            >
              Coding Carranza LLC
              <ArrowUpRight size={12} strokeWidth={2.5} />
            </a>
          </p>

          <div className="tk-footer-legal">
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
          </div>
        </div>
      </div>

      <style>{`
        .tk-footer {
          padding: 80px 0 32px;
          background: var(--bg-soft, #efece4);
          border-top: 1px solid var(--border, #e5e5e0);
          color: var(--text, #222);
        }
        .tk-footer-grid {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr;
          gap: 44px;
          padding-bottom: 44px;
          border-bottom: 1px solid var(--border, #e5e5e0);
        }
        @media (max-width: 900px) {
          .tk-footer-grid { grid-template-columns: 1fr 1fr; gap: 32px; }
        }
        @media (max-width: 520px) {
          .tk-footer-grid { grid-template-columns: 1fr; gap: 28px; }
        }

        .tk-footer-brand { max-width: 380px; }
        .tk-footer-logo {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 14px;
          color: var(--ink, #0a0a0a);
        }
        .tk-footer-brand p {
          color: var(--text-secondary, #555);
          font-size: 14px;
          line-height: 1.7;
          margin-bottom: 14px;
        }
        .tk-footer-verse {
          font-size: 12.5px;
          color: var(--text-muted, #777);
          font-style: italic;
          border-left: 2px solid var(--ink, #0a0a0a);
          padding-left: 12px;
          line-height: 1.5;
        }

        .tk-footer-social {
          display: flex;
          gap: 10px;
          margin-top: 22px;
        }
        .tk-footer-social a {
          width: 40px;
          height: 40px;
          border-radius: 6px;
          background: var(--surface, #fafaf5);
          border: 1.5px solid var(--ink, #0a0a0a);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--ink, #0a0a0a);
          transition: transform 0.15s var(--ease, ease),
                      background 0.15s, color 0.15s,
                      box-shadow 0.15s;
        }
        .tk-footer-social a:hover {
          background: var(--ink, #0a0a0a);
          color: #fff;
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0,0,0,0.12);
        }
        .tk-footer-social a:focus-visible {
          outline: 2px solid var(--brand, #c8301f);
          outline-offset: 2px;
        }

        .tk-footer-col h5 {
          font-family: var(--font-secondary, inherit);
          font-size: 11.5px;
          text-transform: uppercase;
          letter-spacing: 0.22em;
          color: var(--text-muted, #777);
          margin-bottom: 18px;
          font-weight: 700;
        }
        .tk-footer-col a {
          display: block;
          font-size: 14px;
          color: var(--text, #222);
          padding: 5px 0;
          transition: color 0.15s, transform 0.15s;
        }
        .tk-footer-col a:hover {
          color: var(--brand, #c8301f);
          transform: translateX(2px);
        }

        .tk-footer-bottom {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 20px;
          padding-top: 28px;
          font-size: 13px;
          color: var(--text-muted, #777);
        }
        @media (max-width: 780px) {
          .tk-footer-bottom {
            grid-template-columns: 1fr;
            text-align: center;
            gap: 14px;
          }
        }
        .tk-footer-copy {
          margin: 0;
          font-size: 13px;
        }
        .tk-footer-copy span { opacity: 0.75; }

        .tk-footer-credit {
          margin: 0;
          justify-self: center;
          font-family: var(--font-secondary, inherit);
          font-size: 11.5px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--text-muted, #777);
        }
        .tk-footer-credit-link {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          color: var(--ink, #0a0a0a);
          font-weight: 700;
          padding: 4px 8px;
          margin-left: 4px;
          border-radius: 4px;
          border: 1px solid transparent;
          transition: color 0.15s, border-color 0.15s, background 0.15s;
        }
        .tk-footer-credit-link:hover {
          color: var(--brand, #c8301f);
          border-color: var(--brand, #c8301f);
          background: rgba(200,48,31,0.06);
        }
        .tk-footer-credit-link svg {
          transition: transform 0.15s var(--ease, ease);
        }
        .tk-footer-credit-link:hover svg {
          transform: translate(1px, -1px);
        }

        .tk-footer-legal {
          display: flex;
          gap: 18px;
          justify-self: end;
        }
        @media (max-width: 780px) {
          .tk-footer-legal { justify-self: center; }
        }
        .tk-footer-legal a {
          color: var(--text-muted, #777);
          transition: color 0.15s;
          font-size: 13px;
        }
        .tk-footer-legal a:hover { color: var(--ink, #0a0a0a); }
      `}</style>
    </footer>
  );
}
