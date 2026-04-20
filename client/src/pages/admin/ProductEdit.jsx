import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  X, Save, ArrowLeft, Paintbrush, ChevronDown, ChevronUp,
  Box, Layers, Upload, Check, AlertTriangle, Info, Ruler,
  Palette, Package, Sparkles, Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../api/client';
import { TSHIRT_COLORS } from '../../components/designer/designerConstants';
import AdminLayout from '../../components/AdminLayout';
import { ShieldMark } from '../../components/brand/Logo';
import ImageCropModal from '../../components/ImageCropModal';

const ALL_SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'];

const COLOR_NAMES = {
  '#FFFFFF': 'Bone', '#000000': 'Ink', '#929292': 'Stone',
  '#e02d27': 'Ember', '#1f40d3': 'Deep Blue', '#43d31f': 'Field',
  '#f7ec1e': 'Sulfur', '#f88d28': 'Rust', '#e524ef': 'Royal',
  '#1fd3ca': 'Turquoise', '#FFC0CB': 'Blush', '#8B4513': 'Sable',
};

const DesignerPanel = lazy(() => import('../../components/designer/DesignerPanel'));
const Designer2DPanel = lazy(() => import('../../components/designer/Designer2DPanel'));

export default function AdminProductEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [form, setForm] = useState({
    title: '',
    description: '',
    price: '',
    featured: false,
    active: true,
  });
  const [editorType, setEditorType] = useState('3d');
  const [availableColors, setAvailableColors] = useState([]);
  const [sizes, setSizes] = useState([]); // [{ size, quantity, unlimited, style: 'unisex' }]
  const [showUnlimitedWarning, setShowUnlimitedWarning] = useState(null);
  const [existingImages, setExistingImages] = useState([]);
  const [snapshotPreviews, setSnapshotPreviews] = useState([]);
  const [snapshotBlobs, setSnapshotBlobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingDesign, setSavingDesign] = useState(false);
  const [showDesigner, setShowDesigner] = useState(false);
  const [designData, setDesignData] = useState(null);

  useEffect(() => {
    if (isEditing) {
      setLoading(true);
      api.getProduct(id)
        .then((d) => {
          const p = d.product;
          setForm({
            title: p.title,
            description: p.description,
            price: (p.price / 100).toFixed(2),
            featured: p.featured,
            active: p.active,
          });
          setExistingImages(p.imageUrls);
          setDesignData(p.designData || null);
          setEditorType(p.editorType || '3d');
          setAvailableColors(p.availableColors || []);
          // Collapse any legacy per-style inventory into a single unisex row per size
          // (sums mens+womens quantities; retains unlimited if either was unlimited)
          const raw = p.sizes || [];
          const merged = new Map();
          for (const entry of raw) {
            const key = entry.size;
            const existing = merged.get(key);
            if (!existing) {
              merged.set(key, {
                size: entry.size,
                style: 'unisex',
                quantity: entry.quantity || 0,
                unlimited: Boolean(entry.unlimited),
              });
            } else {
              existing.quantity += entry.quantity || 0;
              existing.unlimited = existing.unlimited || Boolean(entry.unlimited);
            }
          }
          setSizes(Array.from(merged.values()));
        })
        .catch(() => toast.error('Product not found'))
        .finally(() => setLoading(false));
    }
  }, [id, isEditing]);

  const removeExistingImage = async (imageUrl) => {
    try {
      await api.adminRemoveImage(id, imageUrl);
      setExistingImages((prev) => prev.filter((url) => url !== imageUrl));
      toast.success('Image removed');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const removeSnapshotPreview = (index) => {
    setSnapshotPreviews((prev) => prev.filter((_, i) => i !== index));
    setSnapshotBlobs((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSnapshot = (blob) => {
    const url = URL.createObjectURL(blob);
    setSnapshotPreviews((prev) => [...prev, url]);
    setSnapshotBlobs((prev) => [...prev, blob]);
    toast.success('Snapshot captured');
  };

  const [cropFile, setCropFile] = useState(null);
  const cropQueueRef = useRef([]);

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    e.target.value = '';
    cropQueueRef.current = files.slice(1);
    setCropFile(files[0]);
  };

  const handleCropConfirm = (blob) => {
    const url = URL.createObjectURL(blob);
    setSnapshotPreviews((prev) => [...prev, url]);
    setSnapshotBlobs((prev) => [...prev, blob]);
    toast.success('Image cropped · added to the drop');
    if (cropQueueRef.current.length > 0) {
      const next = cropQueueRef.current.shift();
      setCropFile(next);
    } else {
      setCropFile(null);
    }
  };

  const handleCropCancel = () => {
    if (cropQueueRef.current.length > 0) {
      const next = cropQueueRef.current.shift();
      setCropFile(next);
    } else {
      setCropFile(null);
    }
  };

  const handleSaveDesign = async (blob, designState) => {
    if (!isEditing) {
      toast.error('Save the drop first, then save the design');
      return;
    }
    setSavingDesign(true);
    try {
      const formData = new FormData();
      formData.append('designImage', blob, 'design.png');
      formData.append('designData', JSON.stringify(designState));
      const result = await api.adminSaveDesign(id, formData);
      setDesignData(JSON.stringify(designState));
      setExistingImages(result.product.imageUrls);
      toast.success('Design pressed to the record');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingDesign(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.description || !form.price) {
      toast.error('Title, description, and price are required');
      return;
    }
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('title', form.title);
      formData.append('description', form.description);
      formData.append('price', form.price);
      formData.append('featured', form.featured);
      formData.append('active', form.active);
      formData.append('editorType', editorType);
      formData.append('shirtStyle', 'unisex');
      formData.append('availableColors', JSON.stringify(availableColors));
      // Ensure every size carries style: 'unisex'
      const normalizedSizes = sizes.map((s) => ({ ...s, style: 'unisex' }));
      formData.append('sizes', JSON.stringify(normalizedSizes));
      snapshotBlobs.forEach((blob, i) => {
        formData.append('images', blob, `snapshot-${i}.png`);
      });
      if (isEditing) {
        await api.adminUpdateProduct(id, formData);
        toast.success('Drop updated');
      } else {
        await api.adminCreateProduct(formData);
        toast.success('New drop released');
      }
      navigate('/admin/products');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEditorTypeChange = (type) => {
    if (type === editorType) return;
    if (designData) {
      const confirmSwitch = window.confirm(
        'Switching editor types will not transfer the existing design. Continue?'
      );
      if (!confirmSwitch) return;
    }
    setEditorType(type);
  };

  const totalUnits = sizes.reduce((sum, s) => sum + (s.unlimited ? 0 : (s.quantity || 0)), 0);
  const hasUnlimited = sizes.some((s) => s.unlimited);

  if (loading) {
    return (
      <AdminLayout>
        <div className="loading-page"><div className="spinner" /></div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="tk-pe">
        {/* Back link */}
        <button
          onClick={() => navigate('/admin/products')}
          className="tk-pe-back"
        >
          <ArrowLeft size={14} /> Back to Drops
        </button>

        {/* Hero / header */}
        <header className="tk-pe-hero">
          <div className="tk-pe-hero-mark">
            <ShieldMark size={52} />
          </div>
          <div className="tk-pe-hero-text">
            <span className="tk-pe-eyebrow">
              {isEditing ? 'Edit · Drop Record' : 'New · Drop Record'}
            </span>
            <h1 className="tk-pe-title display">
              {isEditing ? 'Edit The Drop' : 'Design A New Drop'}
            </h1>
            <span className="rule rule-brand" aria-hidden />
            <p className="tk-pe-sub">
              Every Truekin tee is a <strong>unisex</strong> fit — one cut, built for the Kin.
              Heat-pressed by hand on premium blanks from Bella + Canvas, Gildan, and Comfort Colors.
            </p>
          </div>
          <div className="tk-pe-hero-seal">
            <Users size={14} />
            UNISEX FIT
          </div>
        </header>

        <form onSubmit={handleSubmit} className="tk-pe-form">
          {/* The Record — product info */}
          <section className="tk-pe-card">
            <SectionHead
              num="01"
              title="The Record"
              sub="Name it, describe it, price it"
              icon={<Sparkles size={15} />}
            />
            <div className="tk-pe-grid-2">
              <div className="tk-field">
                <label>Title <span className="req">*</span></label>
                <input
                  className="tk-input"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Wear The Truth · Ember"
                  required
                />
              </div>
              <div className="tk-field">
                <label>Price (USD) <span className="req">*</span></label>
                <div className="tk-input-wrap">
                  <span className="tk-input-prefix">$</span>
                  <input
                    className="tk-input tk-input-prefixed"
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    placeholder="32.00"
                    required
                  />
                </div>
              </div>
            </div>
            <div className="tk-field">
              <label>Description <span className="req">*</span></label>
              <textarea
                className="tk-input"
                rows={4}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Heat-pressed by hand on a Bella + Canvas 3001 unisex tee. 100% ringspun cotton. Pre-shrunk, side-seamed, built to last."
                required
              />
              <span className="tk-field-hint">
                Name the blank (Bella + Canvas 3001 / Gildan 5000 / Comfort Colors 1717) and the press story.
              </span>
            </div>
            <div className="tk-toggles">
              <label className={`tk-toggle ${form.featured ? 'on' : ''}`}>
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                />
                <span className="tk-toggle-dot" />
                <span className="tk-toggle-label">Feature in The Kin</span>
                <span className="tk-toggle-hint">Pins to featured row</span>
              </label>
              <label className={`tk-toggle ${form.active ? 'on' : ''}`}>
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                />
                <span className="tk-toggle-dot" />
                <span className="tk-toggle-label">Visible in store</span>
                <span className="tk-toggle-hint">Uncheck to hide</span>
              </label>
            </div>
          </section>

          {/* The Palette — colors */}
          <section className="tk-pe-card">
            <SectionHead
              num="02"
              title="The Palette"
              sub="Which blank colors ship with this drop"
              icon={<Palette size={15} />}
            />
            <div className="tk-colors">
              {TSHIRT_COLORS.map((hex) => {
                const isSelected = availableColors.includes(hex);
                const isLight = hex === '#FFFFFF' || hex === '#f7ec1e' || hex === '#FFC0CB';
                return (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => {
                      setAvailableColors((prev) =>
                        isSelected ? prev.filter((c) => c !== hex) : [...prev, hex]
                      );
                    }}
                    title={COLOR_NAMES[hex] || hex}
                    className={`tk-color ${isSelected ? 'on' : ''}`}
                    style={{ background: hex }}
                  >
                    {isSelected && (
                      <Check size={16} strokeWidth={3} color={isLight ? '#0a0a0a' : '#fff'} />
                    )}
                    <span className="tk-color-name">{COLOR_NAMES[hex] || hex}</span>
                  </button>
                );
              })}
            </div>
            {availableColors.length > 0 && (
              <div className="tk-chips-row">
                <span className="tk-chips-label">Shipping in:</span>
                {availableColors.map((hex) => (
                  <span key={hex} className="tk-color-chip">
                    <span className="tk-color-swatch" style={{ background: hex }} />
                    {COLOR_NAMES[hex] || hex}
                  </span>
                ))}
                <button
                  type="button"
                  onClick={() => setAvailableColors([])}
                  className="tk-clear"
                >
                  Clear
                </button>
              </div>
            )}
            {availableColors.length === 0 && (
              <p className="tk-empty-note">
                <Info size={13} /> No colors selected — product will ship in one default color.
              </p>
            )}
          </section>

          {/* The Cut — unisex sizes */}
          <section className="tk-pe-card">
            <SectionHead
              num="03"
              title="The Cut & Inventory"
              sub="One unisex fit · one inventory line"
              icon={<Ruler size={15} />}
            />

            <div className="tk-unisex-banner">
              <div className="tk-unisex-banner-icon">
                <Users size={20} />
              </div>
              <div>
                <strong>Unisex fit only.</strong>
                <p>
                  Truekin tees are cut on one unisex last — no Men's vs. Women's SKUs.
                  Enable the sizes you'll stock, set quantities for each.
                </p>
              </div>
              <div className="tk-unisex-banner-stat">
                <span className="tk-stat-num">{sizes.length}</span>
                <span className="tk-stat-label">sizes</span>
              </div>
              <div className="tk-unisex-banner-stat">
                <span className="tk-stat-num">
                  {hasUnlimited ? '∞' : totalUnits}
                </span>
                <span className="tk-stat-label">units</span>
              </div>
            </div>

            {/* Size pills */}
            <div className="tk-size-pills">
              {ALL_SIZES.map((size) => {
                const isEnabled = sizes.some((s) => s.size === size);
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => {
                      if (isEnabled) {
                        setSizes((prev) => prev.filter((s) => s.size !== size));
                      } else {
                        setSizes((prev) => [
                          ...prev,
                          { size, style: 'unisex', quantity: 0, unlimited: false },
                        ]);
                      }
                    }}
                    className={`tk-size-pill ${isEnabled ? 'on' : ''}`}
                  >
                    {size}
                  </button>
                );
              })}
            </div>

            {sizes.length === 0 ? (
              <div className="tk-empty-row">
                <Package size={20} />
                <p>No sizes enabled yet — tap a size above to stock it.</p>
                <button
                  type="button"
                  className="tk-btn-outline"
                  onClick={() =>
                    setSizes(
                      ALL_SIZES.map((s) => ({ size: s, style: 'unisex', quantity: 0, unlimited: false }))
                    )
                  }
                >
                  Enable All Sizes
                </button>
              </div>
            ) : (
              <div className="tk-inv-table">
                <div className="tk-inv-head">
                  <span>Size</span>
                  <span>Fit</span>
                  <span>Quantity</span>
                  <span>Unlimited</span>
                </div>
                {ALL_SIZES.filter((s) => sizes.some((sz) => sz.size === s)).map((sizeName) => {
                  const entry = sizes.find((s) => s.size === sizeName);
                  if (!entry) return null;
                  return (
                    <div key={sizeName} className="tk-inv-row">
                      <span className="tk-inv-size">{sizeName}</span>
                      <span className="tk-inv-fit">
                        <Users size={12} /> Unisex
                      </span>
                      <div>
                        <input
                          type="number"
                          min="0"
                          className="tk-input tk-input-sm"
                          value={entry.unlimited ? '' : entry.quantity}
                          disabled={entry.unlimited}
                          placeholder={entry.unlimited ? '∞ unlimited' : '0'}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10) || 0;
                            setSizes((prev) =>
                              prev.map((s) => (s.size === sizeName ? { ...s, quantity: val } : s))
                            );
                          }}
                        />
                      </div>
                      <label className="tk-inv-unlimited">
                        <input
                          type="checkbox"
                          checked={entry.unlimited}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setShowUnlimitedWarning({ size: sizeName });
                            } else {
                              setSizes((prev) =>
                                prev.map((s) =>
                                  s.size === sizeName ? { ...s, unlimited: false } : s
                                )
                              );
                            }
                          }}
                        />
                        <span className={entry.unlimited ? 'on' : ''}>
                          {entry.unlimited ? 'On' : 'Off'}
                        </span>
                      </label>
                    </div>
                  );
                })}
                <div className="tk-inv-actions">
                  <button
                    type="button"
                    className="tk-link-danger"
                    onClick={() => setSizes([])}
                  >
                    Remove all sizes
                  </button>
                  <button
                    type="button"
                    className="tk-link"
                    onClick={() => {
                      setSizes(
                        ALL_SIZES.map((s) => {
                          const existing = sizes.find((sz) => sz.size === s);
                          return existing || { size: s, style: 'unisex', quantity: 0, unlimited: false };
                        })
                      );
                    }}
                  >
                    Enable all sizes
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Editor pick */}
          <section className="tk-pe-card">
            <SectionHead
              num="04"
              title="The Studio"
              sub="Pick your design canvas"
              icon={<Paintbrush size={15} />}
            />
            <div className="tk-editor-grid">
              <button
                type="button"
                onClick={() => handleEditorTypeChange('3d')}
                className={`tk-editor-card ${editorType === '3d' ? 'on' : ''}`}
              >
                <div className="tk-editor-icon">
                  <Box size={26} />
                </div>
                <div className="tk-editor-info">
                  <span className="tk-editor-name">3D Press Studio</span>
                  <span className="tk-editor-desc">
                    Fabric canvas + live 3D mockup. Customers rotate the tee on the product page.
                  </span>
                </div>
                {editorType === '3d' && <span className="tk-editor-badge">Selected</span>}
              </button>
              <button
                type="button"
                onClick={() => handleEditorTypeChange('2d')}
                className={`tk-editor-card ${editorType === '2d' ? 'on' : ''}`}
              >
                <div className="tk-editor-icon">
                  <Layers size={26} />
                </div>
                <div className="tk-editor-info">
                  <span className="tk-editor-name">2D Mockup Studio</span>
                  <span className="tk-editor-desc">
                    Front/back flat mockups — lighter, faster, no 3D model needed.
                  </span>
                </div>
                {editorType === '2d' && <span className="tk-editor-badge">Selected</span>}
              </button>
            </div>
          </section>

          {/* Designer */}
          <section className="tk-pe-card">
            <div
              className="tk-designer-head"
              onClick={() => setShowDesigner(!showDesigner)}
              role="button"
              tabIndex={0}
            >
              <div>
                <SectionHead
                  num="05"
                  title={editorType === '3d' ? 'The Press (3D)' : 'The Press (2D)'}
                  sub={designData ? 'Design saved · ready to ship' : 'Cut, place, and press the design'}
                  icon={<Paintbrush size={15} />}
                  inline
                />
              </div>
              <div className="tk-designer-head-right">
                {designData && (
                  <span className="tk-saved-pill">
                    <Check size={12} /> Design Saved
                  </span>
                )}
                {showDesigner ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </div>
            </div>

            {showDesigner && (
              <div className="tk-designer-body">
                {!isEditing && (
                  <div className="tk-callout">
                    <AlertTriangle size={14} />
                    Save the drop first to enable the "Save Design" button. You can still capture snapshot images.
                  </div>
                )}

                {editorType === '3d' ? (
                  <Suspense fallback={
                    <div className="tk-loading-block">
                      <div className="spinner" />
                      <p>Loading 3D studio…</p>
                    </div>
                  }>
                    <DesignerPanel
                      designData={designData}
                      onSave={handleSaveDesign}
                      onSnapshot={handleSnapshot}
                      saving={savingDesign}
                      shirtStyle={'unisex'}
                    />
                  </Suspense>
                ) : (
                  <Suspense fallback={
                    <div className="tk-loading-block">
                      <div className="spinner" />
                      <p>Loading 2D studio…</p>
                    </div>
                  }>
                    <Designer2DPanel
                      designData={designData}
                      onSave={handleSaveDesign}
                      onSnapshot={handleSnapshot}
                      saving={savingDesign}
                    />
                  </Suspense>
                )}
              </div>
            )}
          </section>

          {/* Product images */}
          <section className="tk-pe-card">
            <SectionHead
              num="06"
              title="The Shots"
              sub="Lifestyle + press-ready photography"
              icon={<Upload size={15} />}
            />

            <label className="tk-upload">
              <Upload size={16} />
              <span>Upload Product Shots</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
              <span className="tk-upload-hint">JPG · PNG · WEBP · 1:1 crop recommended</span>
            </label>

            {existingImages.length > 0 && (
              <div className="tk-shots-group">
                <p className="tk-shots-label">On file</p>
                <div className="tk-shots-grid">
                  {existingImages.map((url, i) => (
                    <div key={i} className="tk-shot">
                      <img src={url} alt="" />
                      {isEditing && (
                        <button
                          type="button"
                          onClick={() => removeExistingImage(url)}
                          className="tk-shot-remove"
                          aria-label="Remove"
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {snapshotPreviews.length > 0 && (
              <div className="tk-shots-group">
                <p className="tk-shots-label">New — ready to upload</p>
                <div className="tk-shots-grid">
                  {snapshotPreviews.map((src, i) => (
                    <div key={i} className="tk-shot">
                      <img src={src} alt="" />
                      <button
                        type="button"
                        onClick={() => removeSnapshotPreview(i)}
                        className="tk-shot-remove"
                        aria-label="Remove"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {existingImages.length === 0 && snapshotPreviews.length === 0 && (
              <p className="tk-empty-note">
                <Info size={13} /> No shots yet — upload product photos or capture snapshots from the studio above.
              </p>
            )}
          </section>

          {/* Submit bar */}
          <div className="tk-submit-bar">
            <div className="tk-submit-summary">
              <ShieldMark size={22} />
              <div>
                <span className="tk-submit-label">
                  {isEditing ? 'Update' : 'Release'} the drop
                </span>
                <span className="tk-submit-meta">
                  Unisex fit · {availableColors.length || 0} colors · {sizes.length} sizes
                </span>
              </div>
            </div>
            <div className="tk-submit-actions">
              <button
                type="button"
                className="tk-btn-outline"
                onClick={() => navigate('/admin/products')}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="tk-btn-primary"
                disabled={saving}
              >
                <Save size={16} />
                {saving ? 'Pressing…' : isEditing ? 'Update Drop' : 'Release Drop'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Crop modal */}
      {cropFile && (
        <ImageCropModal
          file={cropFile}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
        />
      )}

      {/* Unlimited quantity warning */}
      {showUnlimitedWarning && (
        <>
          <div className="tk-modal-overlay" onClick={() => setShowUnlimitedWarning(null)} />
          <div className="tk-modal">
            <div className="tk-modal-icon">
              <AlertTriangle size={22} />
            </div>
            <h3 className="tk-modal-title">Enable Unlimited Stock?</h3>
            <p className="tk-modal-body">
              Size <strong>{showUnlimitedWarning?.size}</strong> will <strong>never show as out of stock.</strong>
              That's fine for made-to-order drops — risky if you forget to restock blanks.
            </p>
            <div className="tk-modal-actions">
              <button
                type="button"
                className="tk-btn-outline"
                onClick={() => setShowUnlimitedWarning(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="tk-btn-primary tk-btn-warn"
                onClick={() => {
                  setSizes((prev) =>
                    prev.map((s) =>
                      s.size === showUnlimitedWarning?.size ? { ...s, unlimited: true } : s
                    )
                  );
                  setShowUnlimitedWarning(null);
                }}
              >
                Enable Unlimited
              </button>
            </div>
          </div>
        </>
      )}

      <style>{`
        .tk-pe { max-width: 1180px; }

        .tk-pe-back {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          background: transparent;
          border: 1.5px solid var(--border-strong);
          border-radius: 999px;
          color: var(--text-secondary);
          font-family: var(--font-secondary);
          font-size: 11.5px;
          font-weight: 600;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          margin-bottom: 20px;
          transition: all 0.15s var(--ease);
        }
        .tk-pe-back:hover {
          border-color: var(--ink);
          color: var(--ink);
          background: var(--surface);
        }

        /* Hero */
        .tk-pe-hero {
          display: grid;
          grid-template-columns: auto 1fr auto;
          gap: 24px;
          align-items: center;
          padding: 28px 30px;
          background: var(--surface);
          border: 1.5px solid var(--border);
          border-radius: 10px;
          margin-bottom: 28px;
          position: relative;
          overflow: hidden;
        }
        .tk-pe-hero::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 20% 10%, rgba(200,48,31,0.05), transparent 40%),
            radial-gradient(circle at 90% 90%, rgba(10,10,10,0.05), transparent 40%);
          pointer-events: none;
        }
        .tk-pe-hero-mark {
          width: 76px;
          height: 76px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--ink);
          color: #f4f1ea;
          border-radius: 10px;
          flex-shrink: 0;
          position: relative;
        }
        .tk-pe-hero-text { position: relative; }
        .tk-pe-eyebrow {
          display: inline-block;
          font-family: var(--font-secondary);
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--brand);
          margin-bottom: 6px;
        }
        .tk-pe-title {
          font-size: clamp(30px, 4vw, 44px);
          font-weight: 400;
          line-height: 0.95;
          letter-spacing: 0.01em;
          margin-bottom: 12px;
        }
        .tk-pe-sub {
          color: var(--text-secondary);
          font-size: 13.5px;
          line-height: 1.55;
          max-width: 560px;
          margin-top: 8px;
        }
        .tk-pe-hero-seal {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 9px 14px;
          background: var(--ink);
          color: #f4f1ea;
          font-family: var(--font-secondary);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          border-radius: 4px;
          border: 1px solid #1f1f1f;
          flex-shrink: 0;
          position: relative;
          box-shadow: var(--shadow-sm);
        }

        /* Section cards */
        .tk-pe-form { display: flex; flex-direction: column; gap: 22px; }
        .tk-pe-card {
          background: var(--surface);
          border: 1.5px solid var(--border);
          border-radius: 10px;
          padding: 26px 28px;
          transition: border-color 0.2s var(--ease), box-shadow 0.2s var(--ease);
        }
        .tk-pe-card:hover { border-color: var(--border-strong); }

        .tk-section-head {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 1px solid var(--border);
        }
        .tk-section-head.inline {
          margin-bottom: 0;
          padding-bottom: 0;
          border-bottom: none;
        }
        .tk-section-num {
          font-family: var(--font-display);
          font-size: 32px;
          line-height: 1;
          color: var(--brand);
          letter-spacing: 0.02em;
          flex-shrink: 0;
        }
        .tk-section-text { flex: 1; }
        .tk-section-title {
          font-family: var(--font-secondary);
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--ink);
          display: flex;
          align-items: center;
          gap: 8px;
          line-height: 1.2;
        }
        .tk-section-sub {
          font-size: 12.5px;
          color: var(--text-muted);
          margin-top: 2px;
          font-family: var(--font-secondary);
          letter-spacing: 0.04em;
        }

        /* Fields */
        .tk-pe-grid-2 {
          display: grid;
          grid-template-columns: 1.5fr 1fr;
          gap: 18px;
          margin-bottom: 16px;
        }
        @media (max-width: 760px) {
          .tk-pe-grid-2 { grid-template-columns: 1fr; }
        }
        .tk-field {
          display: flex;
          flex-direction: column;
          margin-bottom: 16px;
        }
        .tk-field label {
          font-family: var(--font-secondary);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--ink);
          margin-bottom: 8px;
        }
        .req { color: var(--brand); }
        .tk-field-hint {
          font-size: 11.5px;
          color: var(--text-muted);
          margin-top: 6px;
          font-family: var(--font-secondary);
          letter-spacing: 0.04em;
        }
        .tk-input {
          font-family: var(--font-secondary);
          font-size: 14px;
          padding: 11px 14px;
          background: #fff;
          border: 1.5px solid var(--border-strong);
          border-radius: 4px;
          color: var(--ink);
          transition: border-color 0.15s, box-shadow 0.15s;
          width: 100%;
        }
        .tk-input:focus {
          outline: none;
          border-color: var(--ink);
          box-shadow: 0 0 0 3px rgba(10,10,10,0.08);
        }
        textarea.tk-input { resize: vertical; font-family: inherit; font-size: 14px; line-height: 1.5; }
        .tk-input-wrap { position: relative; }
        .tk-input-prefix {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          font-family: var(--font-display);
          font-size: 18px;
          color: var(--text-muted);
          pointer-events: none;
        }
        .tk-input-prefixed { padding-left: 28px; }
        .tk-input-sm { padding: 7px 10px; font-size: 13px; }

        /* Toggles */
        .tk-toggles { display: flex; gap: 14px; flex-wrap: wrap; margin-top: 4px; }
        .tk-toggle {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 4px 12px;
          align-items: center;
          padding: 12px 16px;
          background: #fff;
          border: 1.5px solid var(--border-strong);
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s var(--ease);
          flex: 1;
          min-width: 240px;
          position: relative;
        }
        .tk-toggle input { position: absolute; opacity: 0; pointer-events: none; }
        .tk-toggle-dot {
          grid-row: 1 / span 2;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          border: 2px solid var(--border-strong);
          background: #fff;
          transition: all 0.15s;
          position: relative;
        }
        .tk-toggle.on {
          border-color: var(--ink);
          background: #fafaf5;
        }
        .tk-toggle.on .tk-toggle-dot {
          border-color: var(--ink);
          background: var(--ink);
          box-shadow: inset 0 0 0 3px #fff;
        }
        .tk-toggle-label {
          font-family: var(--font-secondary);
          font-size: 12.5px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--ink);
        }
        .tk-toggle-hint {
          font-size: 11.5px;
          color: var(--text-muted);
          grid-column: 2;
        }

        /* Colors */
        .tk-colors {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
          gap: 10px;
        }
        .tk-color {
          position: relative;
          aspect-ratio: 1;
          border-radius: 6px;
          border: 2px solid var(--border-strong);
          cursor: pointer;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding: 0 0 8px;
          transition: all 0.18s var(--ease);
          overflow: hidden;
        }
        .tk-color::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 4px;
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.15);
          pointer-events: none;
        }
        .tk-color:hover {
          transform: translateY(-2px);
          border-color: var(--ink);
          box-shadow: var(--shadow-md);
        }
        .tk-color.on {
          border-color: var(--brand);
          box-shadow: 0 0 0 3px rgba(200,48,31,0.25), var(--shadow-md);
        }
        .tk-color-name {
          font-family: var(--font-secondary);
          font-size: 9.5px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          background: rgba(10,10,10,0.75);
          color: #f4f1ea;
          padding: 3px 7px;
          border-radius: 2px;
          opacity: 0;
          transform: translateY(4px);
          transition: all 0.2s;
        }
        .tk-color:hover .tk-color-name,
        .tk-color.on .tk-color-name { opacity: 1; transform: translateY(0); }

        .tk-chips-row {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
          margin-top: 16px;
          padding-top: 14px;
          border-top: 1px dashed var(--border);
        }
        .tk-chips-label {
          font-family: var(--font-secondary);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--text-muted);
          margin-right: 4px;
        }
        .tk-color-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 10px 5px 6px;
          background: #fff;
          border: 1px solid var(--border-strong);
          border-radius: 999px;
          font-family: var(--font-secondary);
          font-size: 11.5px;
          font-weight: 600;
          letter-spacing: 0.06em;
        }
        .tk-color-swatch {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          border: 1px solid rgba(0,0,0,0.1);
        }
        .tk-clear {
          background: none;
          border: none;
          padding: 4px 8px;
          font-family: var(--font-secondary);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--brand);
          cursor: pointer;
          text-decoration: underline;
        }
        .tk-empty-note {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-top: 12px;
          padding: 10px 14px;
          background: rgba(200,48,31,0.05);
          border: 1px dashed rgba(200,48,31,0.3);
          border-radius: 6px;
          font-size: 12.5px;
          color: var(--text-secondary);
          font-family: var(--font-secondary);
          letter-spacing: 0.04em;
        }

        /* Unisex banner */
        .tk-unisex-banner {
          display: grid;
          grid-template-columns: auto 1fr auto auto;
          gap: 18px;
          align-items: center;
          padding: 18px 22px;
          background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
          color: #f4f1ea;
          border-radius: 8px;
          margin-bottom: 20px;
          position: relative;
          overflow: hidden;
          border: 1px solid #1f1f1f;
        }
        .tk-unisex-banner::before {
          content: 'UNISEX · UNISEX · UNISEX · UNISEX · UNISEX';
          position: absolute;
          top: 8px;
          right: -20px;
          font-family: var(--font-display);
          font-size: 68px;
          color: rgba(200,48,31,0.07);
          letter-spacing: 0.1em;
          white-space: nowrap;
          pointer-events: none;
        }
        .tk-unisex-banner-icon {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: var(--brand);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          flex-shrink: 0;
          position: relative;
        }
        .tk-unisex-banner strong {
          font-family: var(--font-display);
          font-size: 20px;
          letter-spacing: 0.03em;
          display: block;
          margin-bottom: 2px;
          position: relative;
        }
        .tk-unisex-banner p {
          font-size: 12.5px;
          color: rgba(244,241,234,0.7);
          line-height: 1.45;
          position: relative;
        }
        .tk-unisex-banner-stat {
          text-align: center;
          padding: 0 14px;
          border-left: 1px solid rgba(244,241,234,0.15);
          position: relative;
        }
        .tk-stat-num {
          display: block;
          font-family: var(--font-display);
          font-size: 24px;
          line-height: 1;
          color: #fff;
        }
        .tk-stat-label {
          font-family: var(--font-secondary);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: rgba(244,241,234,0.55);
          margin-top: 3px;
          display: block;
        }
        @media (max-width: 720px) {
          .tk-unisex-banner { grid-template-columns: auto 1fr; gap: 12px; }
          .tk-unisex-banner-stat { border-left: none; padding: 6px 0 0; }
          .tk-unisex-banner::before { display: none; }
        }

        /* Size pills */
        .tk-size-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 18px;
        }
        .tk-size-pill {
          min-width: 52px;
          padding: 10px 18px;
          font-family: var(--font-secondary);
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.1em;
          background: #fff;
          border: 1.5px solid var(--border-strong);
          border-radius: 4px;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.15s var(--ease);
        }
        .tk-size-pill:hover {
          border-color: var(--ink);
          color: var(--ink);
        }
        .tk-size-pill.on {
          background: var(--ink);
          border-color: var(--ink);
          color: #fff;
        }

        .tk-empty-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 22px;
          background: #fafaf5;
          border: 1.5px dashed var(--border-strong);
          border-radius: 8px;
          color: var(--text-muted);
        }
        .tk-empty-row p {
          flex: 1;
          font-family: var(--font-secondary);
          font-size: 13px;
          letter-spacing: 0.04em;
        }

        /* Inventory table */
        .tk-inv-table {
          border: 1.5px solid var(--border);
          border-radius: 8px;
          overflow: hidden;
        }
        .tk-inv-head, .tk-inv-row {
          display: grid;
          grid-template-columns: 90px 120px 1fr 140px;
          gap: 12px;
          padding: 11px 18px;
          align-items: center;
        }
        .tk-inv-head {
          background: var(--ink);
          color: #f4f1ea;
          font-family: var(--font-secondary);
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }
        .tk-inv-row {
          background: #fff;
          border-top: 1px solid var(--border);
        }
        .tk-inv-row:first-of-type { border-top: none; }
        .tk-inv-size {
          font-family: var(--font-display);
          font-size: 22px;
          line-height: 1;
          letter-spacing: 0.02em;
        }
        .tk-inv-fit {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 10px;
          background: var(--ink);
          color: #f4f1ea;
          font-family: var(--font-secondary);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          border-radius: 3px;
          justify-self: start;
        }
        .tk-inv-unlimited {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: var(--font-secondary);
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--text-muted);
          cursor: pointer;
        }
        .tk-inv-unlimited input { accent-color: var(--ink); width: 16px; height: 16px; }
        .tk-inv-unlimited span.on { color: var(--brand); }

        .tk-inv-actions {
          display: flex;
          gap: 18px;
          padding: 12px 18px;
          background: #fafaf5;
          border-top: 1px solid var(--border);
        }
        .tk-link, .tk-link-danger {
          background: none;
          border: none;
          padding: 0;
          font-family: var(--font-secondary);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          cursor: pointer;
          text-decoration: underline;
        }
        .tk-link { color: var(--ink); }
        .tk-link-danger { color: var(--brand); }

        @media (max-width: 720px) {
          .tk-inv-head { display: none; }
          .tk-inv-row { grid-template-columns: 60px 1fr; grid-template-rows: auto auto; gap: 8px 12px; }
          .tk-inv-row > div, .tk-inv-row .tk-inv-unlimited { grid-column: 2; }
          .tk-inv-row .tk-inv-fit { grid-column: 2; grid-row: 1; }
          .tk-inv-size { grid-row: 1 / span 3; }
        }

        /* Editor cards */
        .tk-editor-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }
        @media (max-width: 760px) {
          .tk-editor-grid { grid-template-columns: 1fr; }
        }
        .tk-editor-card {
          display: flex;
          gap: 16px;
          padding: 20px;
          background: #fff;
          border: 2px solid var(--border-strong);
          border-radius: 8px;
          text-align: left;
          cursor: pointer;
          transition: all 0.18s var(--ease);
          position: relative;
        }
        .tk-editor-card:hover {
          border-color: var(--ink);
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }
        .tk-editor-card.on {
          border-color: var(--ink);
          background: #fafaf5;
        }
        .tk-editor-icon {
          width: 46px;
          height: 46px;
          border-radius: 8px;
          background: var(--ink);
          color: #f4f1ea;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .tk-editor-info { flex: 1; }
        .tk-editor-name {
          display: block;
          font-family: var(--font-secondary);
          font-size: 13.5px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--ink);
          margin-bottom: 6px;
        }
        .tk-editor-desc {
          display: block;
          font-size: 12.5px;
          color: var(--text-secondary);
          line-height: 1.45;
        }
        .tk-editor-badge {
          position: absolute;
          top: 10px;
          right: 10px;
          background: var(--brand);
          color: #fff;
          font-family: var(--font-secondary);
          font-size: 9.5px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          padding: 3px 8px;
          border-radius: 2px;
        }

        /* Designer */
        .tk-designer-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          cursor: pointer;
          user-select: none;
        }
        .tk-designer-head-right {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .tk-saved-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: var(--ink);
          color: #f4f1ea;
          font-family: var(--font-secondary);
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          padding: 5px 10px;
          border-radius: 2px;
        }
        .tk-designer-body { margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--border); }
        .tk-callout {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          background: #fff7e6;
          border: 1px solid #f5c784;
          border-radius: 4px;
          font-size: 12.5px;
          color: #7a4d00;
          margin-bottom: 16px;
          font-family: var(--font-secondary);
          letter-spacing: 0.04em;
        }
        .tk-loading-block {
          padding: 40px;
          text-align: center;
          color: var(--text-muted);
        }

        /* Upload */
        .tk-upload {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 28px 22px;
          background: #fafaf5;
          border: 2px dashed var(--border-strong);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s var(--ease);
          color: var(--ink);
          margin-bottom: 20px;
        }
        .tk-upload:hover {
          border-color: var(--ink);
          background: #fff;
        }
        .tk-upload span:first-of-type,
        .tk-upload > span {
          font-family: var(--font-secondary);
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }
        .tk-upload-hint {
          font-size: 11px !important;
          font-weight: 500 !important;
          letter-spacing: 0.12em !important;
          color: var(--text-muted) !important;
        }

        .tk-shots-group { margin-bottom: 20px; }
        .tk-shots-label {
          font-family: var(--font-secondary);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--text-muted);
          margin-bottom: 10px;
        }
        .tk-shots-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
          gap: 10px;
        }
        .tk-shot {
          position: relative;
          aspect-ratio: 1;
          border-radius: 6px;
          overflow: hidden;
          border: 1.5px solid var(--border);
          background: #fafaf5;
        }
        .tk-shot img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .tk-shot-remove {
          position: absolute;
          top: 6px;
          right: 6px;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: var(--ink);
          color: #fff;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.15s;
        }
        .tk-shot-remove:hover { background: var(--brand); }

        /* Submit bar */
        .tk-submit-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          padding: 20px 26px;
          background: var(--ink);
          color: #f4f1ea;
          border-radius: 10px;
          position: sticky;
          bottom: 16px;
          z-index: 50;
          box-shadow: var(--shadow-lg);
          border: 1px solid #1f1f1f;
        }
        .tk-submit-summary {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .tk-submit-summary > :first-child { color: #f4f1ea; flex-shrink: 0; }
        .tk-submit-label {
          display: block;
          font-family: var(--font-display);
          font-size: 22px;
          line-height: 1;
          letter-spacing: 0.02em;
        }
        .tk-submit-meta {
          display: block;
          font-family: var(--font-secondary);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(244,241,234,0.65);
          margin-top: 4px;
        }
        .tk-submit-actions {
          display: flex;
          gap: 10px;
          flex-shrink: 0;
        }

        .tk-btn-primary, .tk-btn-outline {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 22px;
          font-family: var(--font-secondary);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.15s var(--ease);
          border: 1.5px solid;
        }
        .tk-btn-primary {
          background: var(--brand);
          border-color: var(--brand);
          color: #fff;
        }
        .tk-btn-primary:hover:not(:disabled) {
          background: #a82819;
          border-color: #a82819;
          transform: translateY(-1px);
          box-shadow: var(--shadow-md);
        }
        .tk-btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .tk-btn-primary.tk-btn-warn { background: #c98524; border-color: #c98524; }
        .tk-btn-primary.tk-btn-warn:hover { background: #a86a1c; border-color: #a86a1c; }
        .tk-btn-outline {
          background: transparent;
          border-color: rgba(244,241,234,0.25);
          color: #f4f1ea;
        }
        .tk-btn-outline:hover {
          border-color: #f4f1ea;
          background: rgba(244,241,234,0.08);
        }
        .tk-pe-card .tk-btn-outline {
          border-color: var(--border-strong);
          color: var(--ink);
        }
        .tk-pe-card .tk-btn-outline:hover {
          border-color: var(--ink);
          background: var(--surface);
        }

        @media (max-width: 720px) {
          .tk-submit-bar { flex-direction: column; align-items: stretch; gap: 14px; }
          .tk-submit-actions { justify-content: stretch; }
          .tk-submit-actions button { flex: 1; justify-content: center; }
        }

        /* Modal */
        .tk-modal-overlay {
          position: fixed; inset: 0;
          background: rgba(10,10,10,0.6);
          backdrop-filter: blur(4px);
          z-index: 300;
        }
        .tk-modal {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: var(--surface);
          border-radius: 10px;
          padding: 30px 32px;
          max-width: 460px;
          width: 90%;
          z-index: 301;
          box-shadow: var(--shadow-xl);
          border: 1.5px solid var(--border);
        }
        .tk-modal-icon {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: #fff7e6;
          color: #c98524;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
        }
        .tk-modal-title {
          font-family: var(--font-display);
          font-size: 28px;
          line-height: 1.05;
          letter-spacing: 0.02em;
          margin-bottom: 10px;
        }
        .tk-modal-body {
          font-size: 14px;
          color: var(--text-secondary);
          line-height: 1.55;
          margin-bottom: 22px;
        }
        .tk-modal-actions {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
        }
        .tk-modal .tk-btn-outline {
          border-color: var(--border-strong);
          color: var(--ink);
        }
        .tk-modal .tk-btn-outline:hover {
          border-color: var(--ink);
          background: var(--surface);
        }
      `}</style>
    </AdminLayout>
  );
}

function SectionHead({ num, title, sub, icon, inline = false }) {
  return (
    <div className={`tk-section-head ${inline ? 'inline' : ''}`}>
      <span className="tk-section-num">{num}</span>
      <div className="tk-section-text">
        <h3 className="tk-section-title">
          {icon} {title}
        </h3>
        <p className="tk-section-sub">{sub}</p>
      </div>
    </div>
  );
}
