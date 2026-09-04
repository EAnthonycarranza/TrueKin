import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X, Grid3X3, Grid2X2, Check } from 'lucide-react';
import { api } from '../api/client';
import ProductCard from '../components/ProductCard';

const COLOR_OPTIONS = [
  { hex: '#000000', name: 'Black' },
  { hex: '#FFFFFF', name: 'White' },
  { hex: '#929292', name: 'Gray' },
  { hex: '#e02d27', name: 'Red' },
  { hex: '#1f40d3', name: 'Blue' },
  { hex: '#43d31f', name: 'Green' },
  { hex: '#f7ec1e', name: 'Yellow' },
  { hex: '#f88d28', name: 'Orange' },
  { hex: '#e524ef', name: 'Purple' },
  { hex: '#1fd3ca', name: 'Teal' },
  { hex: '#FFC0CB', name: 'Pink' },
  { hex: '#8B4513', name: 'Brown' },
];
const SIZE_OPTIONS = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'];
// Colors that need a dark check mark (light swatches)
const LIGHT_SWATCHES = new Set(['#FFFFFF', '#f7ec1e', '#FFC0CB']);

// Case-insensitive hex compare
const normHex = (h) => (h || '').toUpperCase();

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlSort = searchParams.get('sort') || 'newest';
  const urlFeatured = searchParams.get('featured') === 'true';
  const urlSearch = searchParams.get('search') || '';

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(urlSearch);
  const [sort, setSort] = useState(urlSort);
  const [featured, setFeatured] = useState(urlFeatured);
  const [gridCols, setGridCols] = useState(4);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Client-side filter state — multi-select, toggled by clicking.
  // Uses uppercase hex so '#ffffff' and '#FFFFFF' both match.
  const [selectedColors, setSelectedColors] = useState(() => new Set());
  const [selectedSizes, setSelectedSizes] = useState(() => new Set());

  const toggleColor = (hex) => {
    setSelectedColors((prev) => {
      const next = new Set(prev);
      const k = normHex(hex);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };
  const toggleSize = (size) => {
    setSelectedSizes((prev) => {
      const next = new Set(prev);
      if (next.has(size)) next.delete(size);
      else next.add(size);
      return next;
    });
  };
  const clearColorSize = () => {
    setSelectedColors(new Set());
    setSelectedSizes(new Set());
  };

  // Sync internal state when URL query params change (e.g. user clicks New Drop / The Kin)
  useEffect(() => {
    setSort(urlSort);
    setFeatured(urlFeatured);
    setSearch(urlSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlSort, urlFeatured, urlSearch]);

  const fetchProducts = (overrides = {}) => {
    setLoading(true);
    const params = new URLSearchParams();
    const s = overrides.search ?? search;
    const so = overrides.sort ?? sort;
    const f = overrides.featured ?? featured;
    if (s) params.append('search', s);
    if (so) params.append('sort', so);
    if (f) params.append('featured', 'true');
    api.getProducts(params.toString())
      .then((d) => setProducts(d.products || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort, featured]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchProducts();
  };

  // Update URL when sort changes (but don't clobber featured)
  const updateSort = (next) => {
    setSort(next);
    const sp = new URLSearchParams(searchParams);
    if (next && next !== 'newest') sp.set('sort', next);
    else sp.delete('sort');
    setSearchParams(sp, { replace: true });
  };

  const clearFeatured = () => {
    setFeatured(false);
    const sp = new URLSearchParams(searchParams);
    sp.delete('featured');
    setSearchParams(sp, { replace: true });
  };

  // Contextualize banner based on URL intent
  const arrivedViaNewDrop = urlSort === 'newest' && searchParams.has('sort') && !featured;
  const bannerEyebrow = featured
    ? 'Featured · The Kin'
    : arrivedViaNewDrop
      ? 'Latest'
      : 'Shop the Kin';
  const bannerTitle = featured ? 'The Kin' : arrivedViaNewDrop ? 'New Drop' : 'Every Drop';
  const bannerSub = featured
    ? 'Our most-worn designs — faith worn well'
    : arrivedViaNewDrop
      ? 'Fresh off the press — newest first'
      : 'faith worn well';

  const gridClass = useMemo(() => `shop-grid shop-grid-${gridCols}`, [gridCols]);

  // Apply color/size filters in-memory.
  // Within a group: OR (selecting Black + Red = products that come in either).
  // Across groups: AND (selected color AND selected size must both match).
  const filtered = useMemo(() => {
    if (selectedColors.size === 0 && selectedSizes.size === 0) return products;
    return products.filter((p) => {
      if (selectedColors.size > 0) {
        const have = new Set((p.availableColors || []).map(normHex));
        const anyMatch = [...selectedColors].some((c) => have.has(c));
        if (!anyMatch) return false;
      }
      if (selectedSizes.size > 0) {
        const sizes = new Set((p.sizes || []).map((s) => s.size));
        const anyMatch = [...selectedSizes].some((s) => sizes.has(s));
        if (!anyMatch) return false;
      }
      return true;
    });
  }, [products, selectedColors, selectedSizes]);

  const hasColorSizeFilters = selectedColors.size > 0 || selectedSizes.size > 0;

  return (
    <div className="page shop-page">
      <div className="container">
        {/* Banner */}
        <div className="shop-banner">
          <div>
            <span className="section-eyebrow">{bannerEyebrow}</span>
            <h1 className="shop-title display">{bannerTitle}</h1>
            <span className="rule" aria-hidden />
            <p className="shop-sub">
              {loading
                ? 'Loading…'
                : `${filtered.length} ${filtered.length === 1 ? 'design' : 'designs'} · ${bannerSub}`}
            </p>
            {(featured || hasColorSizeFilters) && (
              <div className="shop-active-filters">
                {featured && (
                  <button type="button" className="shop-chip" onClick={clearFeatured}>
                    The Kin · Featured only
                    <X size={12} />
                  </button>
                )}
                {[...selectedColors].map((hex) => {
                  const opt = COLOR_OPTIONS.find((o) => normHex(o.hex) === hex);
                  return (
                    <button
                      key={`c-${hex}`}
                      type="button"
                      className="shop-chip"
                      onClick={() => toggleColor(hex)}
                    >
                      <span
                        className="shop-chip-swatch"
                        style={{ background: opt?.hex || hex }}
                        aria-hidden
                      />
                      {opt?.name || hex}
                      <X size={12} />
                    </button>
                  );
                })}
                {[...selectedSizes].map((s) => (
                  <button
                    key={`s-${s}`}
                    type="button"
                    className="shop-chip"
                    onClick={() => toggleSize(s)}
                  >
                    Size {s}
                    <X size={12} />
                  </button>
                ))}
                {hasColorSizeFilters && (
                  <button
                    type="button"
                    className="shop-chip shop-chip-clear"
                    onClick={clearColorSize}
                  >
                    Clear all
                    <X size={12} />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Toolbar */}
        <div className="shop-toolbar">
          <form onSubmit={handleSearch} className="shop-search">
            <Search size={17} />
            <input
              placeholder="Search tees, designs, drops…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                className="shop-search-clear"
                onClick={() => { setSearch(''); fetchProducts({ search: '' }); }}
                aria-label="Clear"
              >
                <X size={14} />
              </button>
            )}
          </form>

          <button
            type="button"
            className="btn btn-secondary btn-sm shop-filter-btn"
            onClick={() => setMobileFiltersOpen(true)}
          >
            <SlidersHorizontal size={15} /> Filters
          </button>

          <div className="shop-grid-toggle" role="group" aria-label="Grid size">
            <button
              onClick={() => setGridCols(3)}
              className={gridCols === 3 ? 'active' : ''}
              aria-label="3 columns"
            >
              <Grid2X2 size={16} />
            </button>
            <button
              onClick={() => setGridCols(4)}
              className={gridCols === 4 ? 'active' : ''}
              aria-label="4 columns"
            >
              <Grid3X3 size={16} />
            </button>
          </div>

          <select
            className="input shop-sort"
            value={sort}
            onChange={(e) => updateSort(e.target.value)}
          >
            <option value="newest">Newest</option>
            <option value="price_asc">Price · Low to High</option>
            <option value="price_desc">Price · High to Low</option>
          </select>
        </div>

        <div className="shop-layout">
          {/* Sidebar filters */}
          <aside
            className={`shop-sidebar ${mobileFiltersOpen ? 'shop-sidebar-open' : ''}`}
          >
            <div className="shop-sidebar-head">
              <h3>Filters</h3>
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="shop-sidebar-close"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="shop-filter-group">
              <h4>Sort</h4>
              {[
                { v: 'newest', l: 'Newest' },
                { v: 'price_asc', l: 'Price · Low to High' },
                { v: 'price_desc', l: 'Price · High to Low' },
              ].map((o) => (
                <label key={o.v} className="shop-filter-option">
                  <input
                    type="radio"
                    checked={sort === o.v}
                    onChange={() => updateSort(o.v)}
                    name="sort"
                  />
                  <span>{o.l}</span>
                </label>
              ))}
            </div>

            <div className="shop-filter-group">
              <h4>Collection</h4>
              <label className="shop-filter-option">
                <input
                  type="checkbox"
                  checked={featured}
                  onChange={(e) => {
                    const next = e.target.checked;
                    setFeatured(next);
                    const sp = new URLSearchParams(searchParams);
                    if (next) sp.set('featured', 'true');
                    else sp.delete('featured');
                    setSearchParams(sp, { replace: true });
                  }}
                />
                <span>The Kin (Featured)</span>
              </label>
            </div>

            <div className="shop-filter-group">
              <h4>Fit</h4>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  background: 'var(--ink, #0a0a0a)',
                  color: '#f4f1ea',
                  fontFamily: 'var(--font-secondary, "Oswald", sans-serif)',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  borderRadius: 4,
                  border: '1px solid #1f1f1f',
                }}
              >
                Unisex Only · One Cut
              </div>
            </div>

            <div className="shop-filter-group">
              <div className="shop-filter-group-head">
                <h4>Color</h4>
                {selectedColors.size > 0 && (
                  <button
                    type="button"
                    className="shop-filter-reset"
                    onClick={() => setSelectedColors(new Set())}
                  >
                    Reset
                  </button>
                )}
              </div>
              <div className="shop-color-swatches">
                {COLOR_OPTIONS.map(({ hex, name }) => {
                  const active = selectedColors.has(normHex(hex));
                  const checkColor = LIGHT_SWATCHES.has(hex) ? '#0a0a0a' : '#fff';
                  return (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => toggleColor(hex)}
                      className={`shop-color-swatch ${active ? 'active' : ''}`}
                      style={{ background: hex }}
                      title={name}
                      aria-label={`${name}${active ? ' (selected)' : ''}`}
                      aria-pressed={active}
                    >
                      {active && <Check size={14} strokeWidth={3} color={checkColor} />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="shop-filter-group">
              <div className="shop-filter-group-head">
                <h4>Size</h4>
                {selectedSizes.size > 0 && (
                  <button
                    type="button"
                    className="shop-filter-reset"
                    onClick={() => setSelectedSizes(new Set())}
                  >
                    Reset
                  </button>
                )}
              </div>
              <div className="shop-size-grid">
                {SIZE_OPTIONS.map((s) => {
                  const active = selectedSizes.has(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleSize(s)}
                      className={`shop-size-btn ${active ? 'active' : ''}`}
                      aria-pressed={active}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
            <button
              type="button"
              className="btn btn-primary shop-filter-apply"
              onClick={() => setMobileFiltersOpen(false)}
            >
              Show {filtered.length} {filtered.length === 1 ? 'design' : 'designs'}
            </button>
          </aside>
          {mobileFiltersOpen && (
            <div className="shop-sidebar-overlay" onClick={() => setMobileFiltersOpen(false)} />
          )}

          {/* Products */}
          <main className="shop-main">
            {loading ? (
              <div className="loading-page"><div className="spinner" /></div>
            ) : filtered.length === 0 ? (
              <div className="shop-empty">
                <Search size={32} />
                <h3>No products found</h3>
                <p>
                  {hasColorSizeFilters
                    ? 'Nothing matches these color / size filters.'
                    : 'Try a different search or clear filters.'}
                </p>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                  {hasColorSizeFilters && (
                    <button className="btn btn-secondary" onClick={clearColorSize}>
                      Clear color & size
                    </button>
                  )}
                  <button
                    className="btn btn-primary"
                    onClick={() => { setSearch(''); fetchProducts({ search: '' }); }}
                  >
                    Clear search
                  </button>
                </div>
              </div>
            ) : (
              <div className={`${gridClass} stagger`}>
                {filtered.map((p) => (
                  <ProductCard key={p._id} product={p} />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      <style>{`
        .shop-page { padding-top: 40px; }

        .shop-banner {
          padding: 16px 0 30px;
          margin-bottom: 24px;
          border-bottom: 1px solid var(--border);
        }
        .shop-title {
          font-size: clamp(48px, 6vw, 80px);
          font-weight: 400;
          letter-spacing: 0.01em;
          line-height: 0.95;
          margin-top: 14px;
        }
        .shop-sub {
          color: var(--text-secondary);
          font-family: var(--font-secondary);
          font-size: 12.5px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          font-weight: 500;
        }
        .shop-active-filters {
          margin-top: 14px;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .shop-chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 7px 12px;
          background: var(--ink);
          color: #fff;
          font-family: var(--font-secondary);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          border-radius: 999px;
          border: 1px solid #1f1f1f;
          transition: background 0.15s, transform 0.15s;
        }
        .shop-chip:hover {
          background: var(--brand);
          transform: translateY(-1px);
        }
        .shop-chip-swatch {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.35);
          display: inline-block;
        }
        .shop-chip-clear {
          background: transparent;
          color: var(--ink);
          border: 1px dashed var(--border-strong);
        }
        .shop-chip-clear:hover {
          background: var(--ink);
          color: #fff;
          border-color: var(--ink);
        }

        .shop-toolbar {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 32px;
          flex-wrap: wrap;
        }
        .shop-search {
          flex: 1;
          min-width: 220px;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 16px;
          background: var(--surface);
          border: 1px solid var(--border-strong);
          border-radius: var(--radius-pill);
          color: var(--text-muted);
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .shop-search:focus-within {
          border-color: var(--ink);
          box-shadow: var(--ring);
        }
        .shop-search input {
          flex: 1;
          padding: 12px 0;
          background: transparent;
          border: none;
          outline: none;
          font-size: 14px;
          color: var(--text);
        }
        .shop-search-clear {
          color: var(--text-muted);
          padding: 2px;
          border-radius: 999px;
          transition: color 0.15s, background 0.15s;
        }
        .shop-search-clear:hover { color: var(--text); background: var(--accent-light); }

        .shop-filter-btn { display: none; }
        @media (max-width: 900px) {
          .shop-filter-btn { display: inline-flex; }
        }

        .shop-grid-toggle {
          display: inline-flex;
          background: var(--surface);
          border: 1px solid var(--border-strong);
          border-radius: var(--radius);
          padding: 2px;
        }
        .shop-grid-toggle button {
          padding: 8px 10px;
          border-radius: 7px;
          color: var(--text-muted);
          transition: background 0.15s, color 0.15s;
        }
        .shop-grid-toggle button.active {
          background: var(--ink);
          color: #fff;
        }
        @media (max-width: 600px) { .shop-grid-toggle { display: none; } }

        .shop-sort { width: 200px; border-radius: var(--radius-pill); }
        @media (max-width: 600px) { .shop-sort { width: 100%; } }

        .shop-layout {
          display: grid;
          grid-template-columns: 240px 1fr;
          gap: 40px;
          align-items: flex-start;
        }
        @media (max-width: 900px) {
          .shop-layout { grid-template-columns: 1fr; }
        }

        .shop-sidebar {
          position: sticky;
          top: calc(var(--nav-h) + 24px);
        }
        .shop-filter-apply { display: none; }
        .shop-sidebar-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 14px;
        }
        .shop-sidebar-head h3 {
          font-size: 14px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }
        .shop-sidebar-close { display: none; padding: 4px; color: var(--text-muted); }

        .shop-filter-group {
          padding: 20px 0;
          border-top: 1px solid var(--border);
        }
        .shop-filter-group:first-of-type { border-top: none; padding-top: 0; }
        .shop-filter-group h4 {
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 12px;
          letter-spacing: -0.005em;
        }
        .shop-filter-group-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        .shop-filter-group-head h4 { margin-bottom: 0; }
        .shop-filter-reset {
          font-family: var(--font-secondary);
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--brand);
          padding: 2px 4px;
          background: none;
          border: none;
          cursor: pointer;
        }
        .shop-filter-reset:hover { color: var(--ink); }
        .shop-filter-option {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 6px 0;
          font-size: 14px;
          color: var(--text-secondary);
          cursor: pointer;
          transition: color 0.15s;
        }
        .shop-filter-option:hover { color: var(--text); }
        .shop-filter-option input {
          width: 15px;
          height: 15px;
          accent-color: var(--ink);
        }

        .shop-color-swatches {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 8px;
        }
        .shop-color-swatch {
          position: relative;
          aspect-ratio: 1;
          border-radius: 50%;
          border: 1px solid rgba(0,0,0,0.1);
          box-shadow: var(--shadow-xs);
          transition: transform 0.15s, box-shadow 0.15s;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
        }
        .shop-color-swatch:hover { transform: scale(1.12); }
        .shop-color-swatch.active {
          box-shadow:
            0 0 0 2px var(--bg, #fff),
            0 0 0 4px var(--ink, #0a0a0a);
          transform: scale(1.05);
        }

        .shop-size-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 6px;
        }
        .shop-size-btn {
          padding: 9px 0;
          font-size: 13px;
          font-weight: 600;
          border: 1px solid var(--border-strong);
          background: var(--surface);
          border-radius: var(--radius-sm);
          transition: all 0.15s;
          cursor: pointer;
          color: var(--text);
        }
        .shop-size-btn:hover {
          background: var(--ink);
          color: #fff;
          border-color: var(--ink);
        }
        .shop-size-btn.active {
          background: var(--ink);
          color: #fff;
          border-color: var(--ink);
          box-shadow: 0 1px 3px rgba(0,0,0,0.15);
        }

        /* Mobile sidebar */
        @media (max-width: 900px) {
          .shop-sidebar {
            position: fixed;
            top: 0;
            right: 0;
            bottom: 0;
            width: 320px;
            max-width: 85vw;
            background: var(--surface);
            padding: 24px;
            transform: translateX(100%);
            transition: transform 0.3s var(--ease);
            z-index: 201;
            overflow-y: auto;
            border-left: 1px solid var(--border);
          }
          .shop-sidebar-open { transform: translateX(0); }
          .shop-sidebar-close { display: inline-flex; }
          .shop-filter-apply {
            position: sticky;
            bottom: 0;
            display: flex;
            width: 100%;
            min-height: 50px;
            margin-top: 12px;
            box-shadow: 0 -10px 24px var(--surface);
          }
          .shop-sidebar-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.4);
            backdrop-filter: blur(3px);
            z-index: 200;
            animation: fadeIn 0.2s var(--ease);
          }
        }

        /* Grid sizing */
        .shop-grid {
          display: grid;
          gap: 24px;
        }
        .shop-grid-3 { grid-template-columns: repeat(3, 1fr); }
        .shop-grid-4 { grid-template-columns: repeat(4, 1fr); }
        @media (max-width: 1100px) {
          .shop-grid-4 { grid-template-columns: repeat(3, 1fr); }
        }
        @media (max-width: 780px) {
          .shop-grid-3, .shop-grid-4 { grid-template-columns: repeat(2, 1fr); gap: 16px; }
        }
        @media (max-width: 440px) {
          .shop-grid-3, .shop-grid-4 { grid-template-columns: repeat(2, 1fr); gap: 12px; }
        }

        @media (max-width: 640px) {
          .shop-page { padding-top: 24px; }
          .shop-banner { padding: 8px 0 22px; margin-bottom: 20px; }
          .shop-title { font-size: 52px; }
          .shop-toolbar {
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto;
            gap: 10px;
            margin-bottom: 22px;
          }
          .shop-search {
            min-width: 0;
            padding-inline: 13px;
          }
          .shop-search input { min-width: 0; min-height: 46px; font-size: 16px; }
          .shop-filter-btn { min-width: 96px; min-height: 46px; }
          .shop-sort { grid-column: 1 / -1; min-height: 46px; font-size: 16px; }
          .shop-sidebar {
            width: min(90vw, 360px);
            max-width: none;
            padding: 20px 18px max(18px, env(safe-area-inset-bottom));
          }
          .shop-sidebar-close {
            width: 44px;
            height: 44px;
            align-items: center;
            justify-content: center;
            margin: -10px -8px -10px 0;
          }
          .shop-filter-option { min-height: 44px; padding: 9px 0; }
          .shop-filter-option input { width: 20px; height: 20px; }
          .shop-color-swatches { gap: 12px; }
          .shop-color-swatch { min-width: 40px; min-height: 40px; }
          .shop-size-btn { min-height: 44px; }
        }

        .shop-empty {
          text-align: center;
          padding: 80px 20px;
          color: var(--text-muted);
        }
        .shop-empty svg {
          margin: 0 auto 16px;
          opacity: 0.5;
        }
        .shop-empty h3 { font-size: 20px; font-weight: 700; color: var(--text); margin-bottom: 6px; }
        .shop-empty p { margin-bottom: 20px; }
      `}</style>
    </div>
  );
}
