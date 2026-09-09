/**
 * Admin → Homepage.
 *
 * Edits the three cards floating in the storefront hero. Each slot picks a real
 * product, so the card's title, price and photo always come from the catalogue;
 * the only thing stored per slot is the little tag above it ("Bestseller",
 * "New Drop"), which is editorial rather than a property of the product.
 *
 * Leaving a slot on "No product" is a supported state, not an empty one — the
 * homepage falls back to its built-in brand-mark card for that position.
 */
import { useEffect, useState } from 'react';
import { Save, Loader, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import AdminLayout from '../../components/AdminLayout';
import { api } from '../../api/client';
import { ShieldMark, KnotMark, StackMark } from '../../components/brand/Logo';

const SLOTS = [
  { label: 'Card one', hint: 'Top right — sits behind the other two', Mark: ShieldMark, style: { background: 'linear-gradient(145deg, #0a0a0a, #232323)', color: '#f4f1ea' }, fallbackTag: 'Bestseller', fallbackTitle: 'Kingdom Heavyweight', fallbackPrice: 3400 },
  { label: 'Card two', hint: 'Left — the largest of the three', Mark: KnotMark, style: { background: 'linear-gradient(145deg, #f4f1ea, #d9d3c2)', color: '#0a0a0a' }, fallbackTag: 'New Drop', fallbackTitle: 'Bone Cross Tee', fallbackPrice: 3200 },
  { label: 'Card three', hint: 'Bottom right — overlaps card one', Mark: StackMark, style: { background: 'linear-gradient(145deg, #c8301f, #8b3a2a)', color: '#f4f1ea' }, fallbackTag: 'Limited', fallbackTitle: 'Ember Standard', fallbackPrice: 3600 },
];

const BLANK = SLOTS.map(() => ({ tag: '', product: '' }));

export default function AdminHomepage() {
  const [cards, setCards] = useState(BLANK);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let ignore = false;
    Promise.all([api.adminGetHomeSettings(), api.adminGetProducts()])
      .then(([settings, catalogue]) => {
        if (ignore) return;
        setCards(settings.heroCards?.length ? settings.heroCards : BLANK);
        setProducts(catalogue.products || []);
      })
      .catch((err) => { if (!ignore) toast.error(err.message || 'Could not load the homepage settings'); })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, []);

  const update = (index, field) => (event) => {
    const value = event.target.value;
    setCards((current) => current.map((card, i) => (i === index ? { ...card, [field]: value } : card)));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.adminSaveHomeSettings({ heroCards: cards });
      toast.success('Homepage updated');
    } catch (err) {
      toast.error(err.message || 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const productById = (id) => products.find((p) => p._id === id) || null;

  return (
    <AdminLayout
      title="The Storefront"
      description="What people see first — the three cards in the homepage hero"
      action={
        <button className="btn btn-primary" onClick={handleSave} disabled={saving || loading}>
          {saving ? <><Loader size={15} className="spin" /> Saving…</> : <><Save size={15} /> Save changes</>}
        </button>
      }
    >
      {loading ? (
        <p role="status">Loading…</p>
      ) : (
        <>
          <div className="card" style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 24, padding: 18 }}>
            <Info size={17} style={{ flexShrink: 0, marginTop: 2, color: 'var(--text-muted)' }} />
            <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Each card shows a real product — its photo, title and price come straight from the catalogue,
              so they stay correct when you change a price. The tag is the small label above the card.
              Leave a slot on <strong>No product</strong> and the homepage uses its built-in placeholder there.
            </p>
          </div>

          <div className="tk-hero-slots">
            {SLOTS.map((slot, i) => {
              const card = cards[i] || { tag: '', product: '' };
              const chosen = productById(card.product);
              const tag = card.tag.trim() || slot.fallbackTag;
              return (
                <section className="card" key={slot.label} style={{ padding: 22 }}>
                  <header style={{ marginBottom: 18 }}>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, margin: 0 }}>{slot.label}</h2>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{slot.hint}</p>
                  </header>

                  {/* Live preview. The homepage's own .home-hero-* rules live
                      inside its component <style> block, so they are not
                      available here — these classes restate them. */}
                  <div className="tk-hero-preview">
                    <div className="tk-hero-preview-tag">{tag}</div>
                    <div className="tk-hero-preview-mock" style={chosen?.imageUrls?.[0] ? { background: 'var(--bg-soft)' } : slot.style}>
                      {chosen?.imageUrls?.[0]
                        ? <img src={chosen.imageUrls[0]} alt="" />
                        : <slot.Mark size={62} />}
                    </div>
                    <div className="tk-hero-preview-info">
                      <strong>{chosen ? chosen.title : slot.fallbackTitle}</strong>
                      <span>${((chosen ? chosen.price : slot.fallbackPrice) / 100).toFixed(0)}</span>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor={`hero-product-${i}`}>Product</label>
                    <select id={`hero-product-${i}`} className="input" value={card.product} onChange={update(i, 'product')}>
                      <option value="">No product — use the placeholder</option>
                      {products.map((product) => (
                        <option key={product._id} value={product._id}>
                          {product.title} — ${(product.price / 100).toFixed(2)}{product.active ? '' : ' (hidden)'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor={`hero-tag-${i}`}>Tag <span className="text-muted">(optional)</span></label>
                    <input
                      id={`hero-tag-${i}`}
                      className="input"
                      maxLength={40}
                      value={card.tag}
                      onChange={update(i, 'tag')}
                      placeholder={slot.fallbackTag}
                    />
                  </div>

                  {chosen && !chosen.active && (
                    <p className="pickup-status-note" style={{ marginTop: 14 }}>
                      This product is hidden from the store, so the homepage will show the placeholder instead.
                    </p>
                  )}
                </section>
              );
            })}
          </div>
        </>
      )}

      <style>{`
        .tk-hero-slots {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
        }
        .tk-hero-preview {
          background: var(--surface);
          border: 1.5px solid var(--ink);
          border-radius: 6px;
          padding: 14px;
          margin-bottom: 20px;
          box-shadow: var(--shadow-sm);
        }
        .tk-hero-preview-tag {
          font-family: var(--font-secondary);
          font-size: 10.5px;
          font-weight: 600;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--brand);
          margin-bottom: 10px;
        }
        .tk-hero-preview-mock {
          aspect-ratio: 1;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 12px;
          overflow: hidden;
        }
        .tk-hero-preview-mock img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .tk-hero-preview-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          font-family: var(--font-secondary);
          font-size: 12px;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .tk-hero-preview-info strong { font-weight: 600; }
        .tk-hero-preview-info span { color: var(--text-muted); font-weight: 600; white-space: nowrap; }
      `}</style>
    </AdminLayout>
  );
}
