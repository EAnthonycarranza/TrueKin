import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Shirt, ClipboardList, PlusCircle, Settings, ArrowUpRight, MapPin, Home,
} from 'lucide-react';
import { ShieldMark, Wordmark } from './brand/Logo';

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/admin/products', label: 'Products', icon: Shirt },
  { to: '/admin/products/new', label: 'New Drop', icon: PlusCircle },
  { to: '/admin/orders', label: 'Orders', icon: ClipboardList },
  { to: '/admin/pickup-locations', label: 'Pickup Locations', icon: MapPin },
  { to: '/admin/homepage', label: 'Storefront', icon: Home },
];

export default function AdminLayout({ children, title, description, action }) {
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar" aria-label="Admin navigation">
        <div className="admin-brand" style={{ padding: '0 12px 12px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '6px 0 24px',
          }}>
            <div style={{ color: '#f4f1ea', lineHeight: 0 }}>
              <ShieldMark size={40} cutoutColor="#0a0a0a" />
            </div>
            <div>
              <div style={{ color: '#f4f1ea', marginBottom: 5 }}>
                <Wordmark height={18} />
              </div>
              <p style={{
                fontFamily: 'var(--font-secondary)',
                fontSize: 10,
                color: '#bcb7aa',
                letterSpacing: '0.24em',
                textTransform: 'uppercase',
                fontWeight: 600,
              }}>Admin Console</p>
            </div>
          </div>
        </div>

        <h4>Operations</h4>
        <nav className="admin-nav-primary">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              className={({ isActive }) =>
                `admin-nav-link ${isActive ? 'active' : ''}`
              }
            >
              <item.icon size={17} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="admin-nav-secondary">
          <h4>Account</h4>
          <NavLink to="/" className="admin-nav-link">
            <ArrowUpRight size={17} />
            <span>View Store</span>
          </NavLink>
          <NavLink to="#" className="admin-nav-link" onClick={(e) => e.preventDefault()}>
            <Settings size={17} />
            <span>Settings</span>
          </NavLink>
        </div>
      </aside>

      <main className="admin-main">
        {(title || action) && (
          <header className="admin-page-header" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            gap: 20,
            marginBottom: 32,
            flexWrap: 'wrap',
            paddingBottom: 24,
            borderBottom: '1.5px solid var(--ink)',
          }}>
            <div className="admin-page-heading">
              {title && (
                <h1 style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 44,
                  fontWeight: 400,
                  letterSpacing: '0.01em',
                  textTransform: 'uppercase',
                  lineHeight: 0.95,
                }}>
                  {title}
                </h1>
              )}
              {description && (
                <p style={{
                  color: 'var(--text-secondary)',
                  marginTop: 10,
                  fontSize: 14,
                  fontFamily: 'var(--font-secondary)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}>
                  {description}
                </p>
              )}
            </div>
            {action && <div className="admin-page-action">{action}</div>}
          </header>
        )}
        <div className="fade-in">{children}</div>
      </main>
    </div>
  );
}
