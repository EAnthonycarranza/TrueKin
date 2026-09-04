import { Link, NavLink, useLocation } from 'react-router-dom';
import { ShoppingBag, User, LogOut, LayoutDashboard, Menu, X, Search, Store } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import { ShieldMark, Wordmark } from './brand/Logo';

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const items = useCartStore((s) => s.items);
  const openCart = useCartStore((s) => s.openCart);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const isAdminRoute = location.pathname.startsWith('/admin');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  return (
    <>
      {/* Scripture / shipping announcement strip */}
      {!isAdminRoute && (
        <div style={styles.announce}>
          <div style={styles.announceInner} className="announce-marquee">
            <span>FAITH WORN WELL</span>
            <span style={styles.announceDot}>✦</span>
            <span>HEAT-PRESSED BY HAND</span>
            <span style={styles.announceDot}>✦</span>
            <span>FREE SHIPPING OVER $50</span>
            <span style={styles.announceDot}>✦</span>
            <span>SMALL-BATCH · MADE TO ORDER</span>
            <span style={styles.announceDot}>✦</span>
            <span>BELLA + CANVAS · GILDAN · COMFORT COLORS</span>
            <span style={styles.announceDot}>✦</span>
            <span>FAITH WORN WELL</span>
            <span style={styles.announceDot}>✦</span>
            <span>HEAT-PRESSED BY HAND</span>
            <span style={styles.announceDot}>✦</span>
            <span>FREE SHIPPING OVER $50</span>
            <span style={styles.announceDot}>✦</span>
            <span>SMALL-BATCH · MADE TO ORDER</span>
          </div>
        </div>
      )}

      <nav className={`tk-navbar ${isAdminRoute ? 'tk-navbar--admin' : ''}`} style={{
        ...styles.nav,
        background: scrolled ? 'rgba(244,241,234,0.82)' : 'rgba(244,241,234,0.96)',
        borderBottomColor: scrolled ? 'rgba(10,10,10,0.14)' : 'rgba(10,10,10,0.08)',
        backdropFilter: 'saturate(180%) blur(18px)',
        WebkitBackdropFilter: 'saturate(180%) blur(18px)',
      }}>
        <div className="container tk-navbar-inner" style={styles.inner}>
          <Link to={isAdminRoute ? '/admin' : '/'} className="tk-navbar-logo" style={styles.logo} aria-label={isAdminRoute ? 'Admin dashboard' : 'Truekin home'}>
            <ShieldMark size={36} />
            <span style={styles.logoText}>
              <Wordmark height={19} />
            </span>
            {isAdminRoute && <span className="tk-navbar-admin-label">Admin</span>}
          </Link>

          <div style={styles.linksDesktop} className="nav-links-desktop">
            <NavLink to="/shop" style={({ isActive }) => ({
              ...styles.link, ...(isActive ? styles.linkActive : {}),
            })}>Shop</NavLink>
            <NavLink to="/shop?sort=newest" style={styles.link}>New Drop</NavLink>
            <NavLink to="/shop?featured=true" style={styles.link}>The Kin</NavLink>
            <NavLink to="/quote" style={({ isActive }) => ({
              ...styles.link, ...(isActive ? styles.linkActive : {}),
            })}>Custom Quote</NavLink>
            <NavLink to="/track" style={({ isActive }) => ({
              ...styles.link, ...(isActive ? styles.linkActive : {}),
            })}>Track Order</NavLink>
            {user && (
              <NavLink to="/my-orders" style={({ isActive }) => ({
                ...styles.link, ...(isActive ? styles.linkActive : {}),
              })}>My Orders</NavLink>
            )}
            {user?.role === 'admin' && (
              <NavLink to="/admin" style={({ isActive }) => ({
                ...styles.link,
                ...(isActive ? styles.linkActive : {}),
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              })}>
                <LayoutDashboard size={15} /> Admin
              </NavLink>
            )}
          </div>

          <div className="tk-navbar-actions" style={styles.actions}>
            {isAdminRoute ? (
              <Link to="/" style={styles.iconBtn} aria-label="View storefront" title="View storefront">
                <Store size={19} />
              </Link>
            ) : (
              <>
                <Link to="/shop" style={styles.iconBtn} aria-label="Search" title="Search">
                  <Search size={19} />
                </Link>

                <button onClick={openCart} style={styles.iconBtn} aria-label="Cart">
                  <ShoppingBag size={19} />
                  {totalItems > 0 && (
                    <span style={styles.cartBadge} className="cart-pulse">{totalItems}</span>
                  )}
                </button>
              </>
            )}

            {user ? (
              <div className="tk-navbar-auth" style={styles.userMenu}>
                <div style={styles.avatar} title={user.name}>
                  {user.name?.[0]?.toUpperCase() || 'U'}
                </div>
                <button onClick={logout} style={styles.iconBtn} aria-label="Logout" title="Logout">
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <Link to="/login" className="btn btn-primary btn-sm tk-navbar-auth" style={{ padding: '9px 18px' }}>
                Sign In
              </Link>
            )}

            <button
              style={styles.menuBtn}
              className="nav-menu-btn"
              onClick={() => setMobileOpen((o) => !o)}
              aria-label="Menu"
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div style={styles.mobileOverlay} onClick={() => setMobileOpen(false)} />
          <aside style={styles.mobileDrawer} className="tk-mobile-drawer">
            <div className="tk-mobile-drawer-head">
              <Link to="/" className="tk-mobile-drawer-brand" aria-label="Truekin home">
                <ShieldMark size={34} />
                <Wordmark height={18} />
              </Link>
              <button
                type="button"
                className="tk-mobile-drawer-close"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
              >
                <X size={22} />
              </button>
            </div>
            <nav style={styles.mobileNav}>
              <Link to="/shop" style={styles.mobileLink}>Shop</Link>
              <Link to="/shop?sort=newest" style={styles.mobileLink}>New Drop</Link>
              <Link to="/shop?featured=true" style={styles.mobileLink}>The Kin (Featured)</Link>
              <Link to="/quote" style={styles.mobileLink}>Custom Quote</Link>
              <Link to="/track" style={styles.mobileLink}>Track Order</Link>
              {user && <Link to="/my-orders" style={styles.mobileLink}>My Orders</Link>}
              {user?.role === 'admin' && (
                <Link to="/admin" style={styles.mobileLink}>
                  <LayoutDashboard size={17} /> Admin
                </Link>
              )}
              <hr className="divider" />
              {user ? (
                <button onClick={logout} style={{ ...styles.mobileLink, color: 'var(--danger)' }}>
                  <LogOut size={17} /> Sign Out
                </button>
              ) : (
                <>
                  <Link to="/login" style={styles.mobileLink}><User size={17} /> Sign In</Link>
                  <Link to="/register" style={styles.mobileLink}>Create Account</Link>
                </>
              )}
            </nav>
          </aside>
        </>
      )}

      <style>{`
        @keyframes cartPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.18); }
        }
        .cart-pulse { animation: cartPulse 2s var(--ease) infinite; }
        .announce-marquee {
          animation: marquee 42s linear infinite;
        }
        .nav-menu-btn { display: none !important; }
        @media (max-width: 860px) {
          .nav-links-desktop { display: none !important; }
          .nav-menu-btn { display: inline-flex !important; }
        }
        .tk-mobile-drawer-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 16px 18px;
          border-bottom: 1px solid var(--border);
        }
        .tk-mobile-drawer-brand {
          display: inline-flex;
          align-items: center;
          gap: 10px;
        }
        .tk-navbar-admin-label {
          display: inline-flex;
          align-items: center;
          min-height: 24px;
          padding: 3px 8px;
          border: 1px solid var(--border-strong);
          border-radius: 3px;
          color: var(--text-secondary);
          font-family: var(--font-secondary);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.16em;
          line-height: 1;
          text-transform: uppercase;
        }
        .tk-mobile-drawer-close {
          display: inline-flex;
          width: 44px;
          height: 44px;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          background: var(--accent-light);
        }
        @media (max-width: 680px) {
          .tk-navbar { height: 64px !important; }
          .tk-navbar-inner { gap: 10px !important; padding-inline: 16px !important; }
          .tk-navbar-logo { gap: 8px !important; min-width: 0; }
          .tk-navbar-logo > svg:first-child { width: 31px; height: 31px; }
          .tk-navbar-logo span svg { width: 73px; height: auto; }
          .tk-navbar--admin .tk-navbar-logo span svg { width: 68px; }
          .tk-navbar--admin .tk-navbar-admin-label { display: none; }
          .tk-navbar-actions { gap: 2px !important; }
          .tk-navbar-actions > a:not(.tk-navbar-auth),
          .tk-navbar-actions > button {
            width: 42px;
            height: 42px;
            padding: 0 !important;
            align-items: center;
            justify-content: center;
          }
          .tk-navbar-auth { display: none !important; }
          .tk-mobile-drawer {
            top: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            left: auto !important;
            width: min(88vw, 380px) !important;
            padding: 0 0 max(18px, env(safe-area-inset-bottom)) !important;
            border-radius: 0 !important;
            overflow-y: auto;
            animation: slideInMenu 0.26s var(--ease);
          }
          .tk-mobile-drawer nav { padding: 10px; }
          @keyframes slideInMenu {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
          }
        }
      `}</style>
    </>
  );
}

const styles = {
  announce: {
    background: 'var(--ink)',
    color: '#f4f1ea',
    fontFamily: 'var(--font-secondary)',
    fontSize: 11.5,
    fontWeight: 600,
    letterSpacing: '0.22em',
    padding: '10px 0',
    overflow: 'hidden',
    textTransform: 'uppercase',
    borderBottom: '1px solid #1f1f1f',
  },
  announceInner: {
    display: 'flex',
    gap: 28,
    whiteSpace: 'nowrap',
    width: 'max-content',
  },
  announceDot: { opacity: 0.55, color: 'var(--brand)' },
  nav: {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    height: 'var(--nav-h)',
    borderBottom: '1px solid',
    transition: 'background 0.2s var(--ease), border-color 0.2s var(--ease)',
  },
  inner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '100%',
    gap: 32,
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    textDecoration: 'none',
    color: 'var(--ink)',
  },
  logoText: {
    display: 'inline-flex',
    alignItems: 'center',
    whiteSpace: 'nowrap',
  },
  linksDesktop: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    marginLeft: 16,
  },
  link: {
    fontFamily: 'var(--font-secondary)',
    fontSize: 12.5,
    fontWeight: 600,
    color: 'var(--text-secondary)',
    padding: '8px 14px',
    borderRadius: 4,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    transition: 'background 0.15s, color 0.15s',
  },
  linkActive: {
    color: '#fff',
    background: 'var(--ink)',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  iconBtn: {
    padding: 9,
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text)',
    borderRadius: 'var(--radius)',
    transition: 'background 0.15s',
  },
  cartBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    background: 'var(--brand)',
    color: 'white',
    fontSize: 10,
    fontWeight: 800,
    minWidth: 18,
    height: 18,
    padding: '0 4px',
    borderRadius: '9px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid var(--bg)',
    lineHeight: 1,
  },
  userMenu: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginLeft: 4,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 4,
    background: 'linear-gradient(135deg, #0a0a0a, #333)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 13,
    fontWeight: 700,
    fontFamily: 'var(--font-secondary)',
    letterSpacing: '0.04em',
  },
  menuBtn: {
    display: 'none',
    padding: 8,
    borderRadius: 6,
  },
  mobileOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    zIndex: 150,
    backdropFilter: 'blur(4px)',
  },
  mobileDrawer: {
    position: 'fixed',
    top: 'calc(var(--nav-h) + 40px)',
    right: 16,
    left: 16,
    background: 'var(--surface)',
    borderRadius: 'var(--radius-md)',
    padding: 12,
    zIndex: 151,
    boxShadow: 'var(--shadow-xl)',
    border: '1px solid var(--border)',
  },
  mobileNav: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  mobileLink: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '14px 18px',
    fontSize: 14,
    fontFamily: 'var(--font-secondary)',
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    borderRadius: 'var(--radius)',
    color: 'var(--text)',
    textAlign: 'left',
  },
};
