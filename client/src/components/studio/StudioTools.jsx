import { useDeferredValue, useRef, useState } from 'react';
import { Check, Eye, EyeOff, ImagePlus, Layers, LockKeyhole, Plus, Search, Shirt, Sticker as StickerIcon, Upload, X } from 'lucide-react';
import { CLIPART_CATEGORIES, FONT_OPTIONS, SHAPE_DEFS } from '../designer/designerConstants';
import { COLORS, COLOR_NAMES } from './studioDocument';
import { mockupSource } from './mockups';

const CATEGORIES = CLIPART_CATEGORIES.filter(c => c.name !== 'Shapes');
const ALL_ASSETS = CATEGORIES.flatMap(c => c.items.map(item => ({ ...item, category: c.name })));

export default function StudioTools({ tool, productType, availableProductTypes = ['tshirt', 'hat', 'sticker'], color, onProductChange, onColorChange, onAddText, onAddImage, onAddShape, layers, selected, onCommand, onClose, busy }) {
  const [text, setText] = useState('STAND TRUE. STAY LOYAL.');
  const [font, setFont] = useState('Oswald');
  const [ink, setInk] = useState('#181818');
  const [category, setCategory] = useState('Studio Picks');
  const [search, setSearch] = useState('');
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef(null);
  const query = useDeferredValue(search.trim().toLowerCase());
  const assets = query ? ALL_ASSETS.filter(a => `${a.label} ${a.category}`.toLowerCase().includes(query)) : CATEGORIES.find(c => c.name === category).items;
  const titles = { product: 'Make it yours', text: 'Say it your way', uploads: 'Your artwork', assets: 'The asset library', shapes: 'Build with shapes', layers: 'Your layers' };

  return <>
    <div className="us-panel-heading"><div><span className="us-eyebrow">CREATIVE TOOLKIT</span><h3>{titles[tool]}</h3></div><button type="button" className="us-icon-button us-mobile-only" aria-label="Close toolkit" onClick={onClose}><X size={18} /></button></div>
    {tool === 'product' && <>
      <p className="us-muted">Choose your canvas. Each product keeps its own artwork while you explore.</p>
      <div className="us-product-options">{[['tshirt', 'T-shirt', 'Front, back & sleeves'], ['sticker', 'Sticker', 'Durable full-color face'], ['hat', 'Baseball hat', 'Signature front panel']].filter(([id]) => availableProductTypes.includes(id)).map(([id, label, sub]) => <button type="button" key={id} className={`us-product-option ${productType === id ? 'is-active' : ''}`} aria-pressed={productType === id} disabled={busy} onClick={() => onProductChange(id)}>
        {id === 'sticker' ? <span className="us-sticker-thumb"><StickerIcon size={31} /></span> : <img src={mockupSource(id, 'front')} alt="" />}<span><strong>{label}</strong><small>{sub}</small></span>{productType === id && <Check size={16} />}
      </button>)}</div>
      <div className="us-panel-divider" />
      <div className="us-field-row"><span className="us-label">{productType === 'sticker' ? 'Sticker base' : 'Garment color'}</span><span className="us-muted">{COLOR_NAMES[COLORS.findIndex(c => c.toLowerCase() === color.toLowerCase())] || 'Custom'}</span></div>
      <div className="us-swatches">{COLORS.map((hex, i) => <button type="button" key={hex} style={{ '--swatch': hex }} className={`us-swatch ${color.toLowerCase() === hex.toLowerCase() ? 'is-active' : ''}`} onClick={() => onColorChange(hex)} aria-label={`${COLOR_NAMES[i]} garment`} aria-pressed={color.toLowerCase() === hex.toLowerCase()} disabled={busy}>{color.toLowerCase() === hex.toLowerCase() && <Check size={16} color={i === 0 || i === 3 || i === 8 ? '#181818' : '#fff'} />}</button>)}</div>
      <label className="us-color-field"><input type="color" value={color} onChange={e => onColorChange(e.target.value)} disabled={busy} /><span>Custom color</span><code>{color.toUpperCase()}</code></label>
      <div className="us-tip">{productType === 'sticker' ? <StickerIcon size={19} /> : <Shirt size={19} />}<p>One shared design powers your photo and 3D previews. Changes appear in both.</p></div>
    </>}
    {tool === 'text' && <>
      <p className="us-muted">A bold statement or a little reminder. Add text, then make it your own.</p>
      <label className="us-field">Your words<textarea rows={3} value={text} maxLength={500} placeholder="Type something meaningful…" onChange={e => setText(e.target.value)} /></label>
      <label className="us-field">Typeface<select value={font} onChange={e => setFont(e.target.value)}>{FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}</select></label>
      <label className="us-color-field"><input aria-label="New text ink color" type="color" value={ink} onChange={e => setInk(e.target.value)} /><span>Ink color</span><code>{ink.toUpperCase()}</code></label>
      <div className="us-type-preview" style={{ fontFamily: font, color: ink }}>{text || 'Your words'}</div>
      <button type="button" className="us-button us-primary us-full" onClick={() => onAddText(text, font, ink)} disabled={busy || !text.trim()}><Plus size={17} /> Add text</button>
      <p className="us-caption">Double-tap text on the canvas to edit it. Use the selection controls to refine it.</p>
    </>}
    {tool === 'uploads' && <>
      <p className="us-muted">Bring your logo, illustration, or photo into the studio.</p>
      <button type="button" className={`us-upload-zone ${dragging ? 'is-dragging' : ''}`} disabled={busy} onClick={() => fileInput.current.click()} onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={e => { e.preventDefault(); setDragging(false); if (!busy && e.dataTransfer.files[0]) onAddImage(e.dataTransfer.files[0]); }}><span className="us-upload-icon"><Upload size={26} /></span><strong>Drop artwork here</strong><span>or tap to browse your files</span><small>PNG, JPG, WebP or SVG · up to 10 MB</small></button>
      <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden onChange={e => { if (e.target.files[0]) onAddImage(e.target.files[0]); e.target.value = ''; }} />
      <div className="us-tip"><ImagePlus size={19} /><p>Transparent PNGs work beautifully for logos. Use a high-resolution original for crisp results.</p></div>
    </>}
    {tool === 'assets' && <>
      <label className="us-search"><Search size={16} /><input aria-label="Search artwork" type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Find your next design…" /></label>
      {!query && <div className="us-categories" aria-label="Asset categories">{CATEGORIES.map(c => <button type="button" key={c.name} onClick={() => setCategory(c.name)} aria-pressed={category === c.name} className={category === c.name ? 'is-active' : ''}>{c.name}</button>)}</div>}
      <div className="us-field-row"><span className="us-label">{query ? 'Search results' : category}</span><span className="us-caption">{assets.length} designs</span></div>
      <div className="us-assets">{assets.map((a, i) => <button type="button" className="us-asset" key={`${a.label}-${i}`} aria-label={`Add ${a.label}`} disabled={busy} onClick={() => onAddImage(a.src, a.label)}><span className="us-asset-art" style={{ background: a.previewBackground || undefined }}><img src={a.thumbnail || a.src} loading="lazy" alt="" /><span className="us-asset-add"><Plus size={14} /></span></span><span>{a.label}</span></button>)}</div>
      {!assets.length && <p className="us-empty-panel">No artwork found. Try “Western”, “shield”, or “flower”.</p>}
    </>}
    {tool === 'shapes' && <>
      <p className="us-muted">Layer, recolor, and combine editable shapes into something original.</p>
      <label className="us-color-field"><input type="color" value={ink} aria-label="New shape color" onChange={e => setInk(e.target.value)} /><span>Shape color</span><code>{ink.toUpperCase()}</code></label>
      <div className="us-shapes">{SHAPE_DEFS.map(shape => <button type="button" key={shape.id} disabled={busy} onClick={() => onAddShape(shape, ink)}><span style={{ color: ink }}>{shape.icon}</span><small>{shape.label}</small></button>)}</div>
    </>}
    {tool === 'layers' && <>
      <p className="us-muted">Top of this list is the front of your design. Select a layer to adjust it.</p>
      {layers.length ? <div className="us-layers">{layers.map(layer => <div key={layer.id} className={`us-layer ${selected?.id === layer.id ? 'is-active' : ''}`}><button type="button" className="us-layer-name" onClick={() => onCommand('select', layer.id)}><span>{layer.type === 'text' ? 'T' : <Layers size={16} />}</span><span>{layer.name || 'Artwork'}</span>{layer.locked && <LockKeyhole size={12} />}</button><button type="button" className="us-icon-button" aria-label={`${layer.hidden ? 'Show' : 'Hide'} ${layer.name}`} onClick={() => { onCommand('select', layer.id); onCommand('visibility'); }}>{layer.hidden ? <EyeOff size={16} /> : <Eye size={16} />}</button></div>)}</div> : <div className="us-empty-panel"><Layers size={28} /><strong>A fresh canvas</strong><p>Your text, images, and shapes will appear here.</p></div>}
    </>}
  </>;
}
