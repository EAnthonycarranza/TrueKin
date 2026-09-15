import { Component, lazy, Suspense, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, Box, Check, Image as ImageIcon, Maximize2, X, ZoomIn, ZoomOut } from 'lucide-react';
import { buildProductMedia, readProductDesign } from './productMedia';
import './ProductGallery.css';

const ProductViewer = lazy(() => import('../studio/ProductViewer'));
const ANGLES = [['front', 'Front'], ['back', 'Back'], ['left', 'Left'], ['right', 'Right']];
const COLOR_NAMES = { '#FFFFFF': 'White', '#000000': 'Black', '#181818': 'Ink', '#929292': 'Gray', '#6D706F': 'Stone', '#EEE4CE': 'Bone', '#233C53': 'Navy', '#6F302B': 'Oxblood', '#245846': 'Forest', '#C28B32': 'Mustard', '#D4A8AE': 'Rose', '#6C5683': 'Violet', '#E02D27': 'Red', '#1F40D3': 'Blue', '#43D31F': 'Green', '#F7EC1E': 'Yellow', '#F88D28': 'Orange', '#E524EF': 'Purple', '#1FD3CA': 'Teal', '#FFC0CB': 'Pink', '#8B4513': 'Brown' };
const galleryColorName = color => COLOR_NAMES[color?.toUpperCase()] || color;

function Photo({ item, design, color, title, thumbnail = false }) {
  const [result, setResult] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const request = `${item.id}|${color}|${attempt}`;
  useEffect(() => {
    if (item.kind !== 'render') return;
    let active = true;
    import('./renderProductPhoto').then(module => module.renderProductPhoto(design, item.view, color))
      .then(src => { if (active) setResult({ request, design, src }); })
      .catch(() => { if (active) setResult({ request, design, error: true }); });
    return () => { active = false; };
  }, [item.kind, item.view, design, color, request]);
  const current = result?.request === request && result.design === design ? result : null;
  const src = item.kind === 'photo' ? item.url : current?.src;
  if (current?.error) return (
    <span className="pg-photo-status" role={thumbnail ? undefined : 'status'}>
      <ImageIcon size={thumbnail ? 18 : 26} aria-hidden="true" />
      {!thumbnail && <><span>This image couldn’t load.</span><button type="button" className="pg-text-button" onClick={() => setAttempt(n => n + 1)}>Try again</button></>}
    </span>
  );
  if (!src) return <span className="pg-photo-status pg-photo-loading" role={thumbnail ? undefined : 'status'}>{!thumbnail && 'Preparing your product image…'}</span>;
  return <img key={request} src={src} alt={thumbnail ? '' : `${title} — ${item.label}${item.view ? `, ${galleryColorName(color)}` : ''}`} loading={thumbnail ? 'lazy' : 'eager'} decoding="async" draggable="false" onError={() => setResult({ request, design, error: true })} />;
}

function MediaDialog({ title, subtitle, onClose, onKeyDown, children, className = '' }) {
  const ref = useRef(null), titleId = useId();
  useEffect(() => {
    const dialog = ref.current, previous = document.activeElement;
    const overflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close(); document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);
  return createPortal(
    <dialog ref={ref} className={`pg-dialog ${className}`} aria-labelledby={titleId} onKeyDown={onKeyDown} onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="pg-dialog-content">
        <header className="pg-dialog-header"><div><h2 id={titleId}>{title}</h2><p>{subtitle}</p></div><button type="button" className="pg-icon-button" aria-label="Close product viewer" onClick={onClose}><X size={22} /></button></header>
        {children}
      </div>
    </dialog>, document.body,
  );
}

class ViewerBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <div className="pg-viewer-status" role="alert"><Box size={30} /><strong>3D isn’t available right now.</strong><p>You can still explore every product photo.</p><button type="button" className="pg-text-button" onClick={this.props.onClose}>Back to photos</button></div> : this.props.children;
  }
}

function InteractiveProduct({ design, color, view }) {
  const [result, setResult] = useState(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    import('./renderProductPhoto').then(module => module.prepareProductPrints(design))
      .then(prints => { if (active) setResult({ design, prints, attempt }); })
      .catch(() => { if (active) setResult({ design, error: true, attempt }); });
    return () => { active = false; };
  }, [design, attempt]);
  const current = result?.design === design && result.attempt === attempt ? result : null;
  if (current?.error) return <div className="pg-viewer-status" role="alert"><ImageIcon size={28} /><strong>The artwork couldn’t load.</strong><button type="button" className="pg-text-button" onClick={() => setAttempt(n => n + 1)}>Try again</button></div>;
  if (!current) return <div className="pg-viewer-status" role="status">Preparing the artwork…</div>;
  return <Suspense fallback={<div className="pg-viewer-status" role="status"><Box size={30} />Loading your interactive preview…</div>}><ProductViewer customerView productType={design.productType} color={color} prints={current.prints} view={view} /></Suspense>;
}

export default function ProductGallery({ product, color, onColorChange }) {
  const design = useMemo(() => readProductDesign(product.designData, product.productType), [product.designData, product.productType]);
  const media = useMemo(() => buildProductMedia(product, color, design), [product, color, design]);
  const [selection, setSelection] = useState(null);
  const [modal, setModal] = useState(null);
  const [view3D, setView3D] = useState('front');
  const [zoomed, setZoomed] = useState(false);
  const swipe = useRef(null);
  const zoomScroll = useRef(null);
  const index = selection?.color === media.color ? Math.max(0, media.items.findIndex(item => item.id === selection.id)) : 0;
  const item = media.items[index];
  const choose = next => {
    const target = media.items[(next + media.items.length) % media.items.length];
    if (target) { setSelection({ color: media.color, id: target.id }); setZoomed(false); }
  };
  const close = () => { setModal(null); setZoomed(false); };
  const toggleZoom = () => {
    const next = !zoomed;
    setZoomed(next);
    requestAnimationFrame(() => {
      const node = zoomScroll.current;
      if (node) node.scrollTo({ left: next ? (node.scrollWidth - node.clientWidth) / 2 : 0, top: next ? (node.scrollHeight - node.clientHeight) / 2 : 0 });
    });
  };
  const open3D = () => { setView3D(item?.view || 'front'); setModal('3d'); };
  const navigateKey = event => {
    if (modal === 'photo' && zoomed) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault(); choose(index + (event.key === 'ArrowLeft' ? -1 : 1));
    }
  };
  const photo = thumbnail => item && <Photo key={`${item.id}|${media.color}`} item={item} design={design} color={media.color} title={product.title} thumbnail={thumbnail} />;
  const navigation = <div className="pg-pagination"><button type="button" className="pg-icon-button" disabled={media.items.length < 2} aria-label="Previous product image" onClick={() => choose(index - 1)}><ArrowLeft size={18} /></button><span aria-live="polite" aria-atomic="true">{index + 1} / {media.items.length}</span><button type="button" className="pg-icon-button" disabled={media.items.length < 2} aria-label="Next product image" onClick={() => choose(index + 1)}><ArrowRight size={18} /></button></div>;

  return <section className="pg-gallery" aria-label={`${product.title} product gallery`}>
    <div className="pg-hero" onKeyDown={navigateKey} onPointerDown={event => { if (event.pointerType === 'touch') swipe.current = event.isPrimary && !event.target.closest('button') ? { x: event.clientX, y: event.clientY } : null; }} onPointerCancel={() => { swipe.current = null; }} onPointerUp={event => {
      const start = swipe.current; swipe.current = null;
      if (!start) return;
      const dx = event.clientX - start.x, dy = event.clientY - start.y;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.5) choose(index + (dx < 0 ? 1 : -1));
    }}>
      {item ? <>
        <div className="pg-image">{photo(false)}</div>
        <div className="pg-image-label"><span>{item.label}</span>{item.view && <span>{galleryColorName(media.color)}</span>}</div>
        <button type="button" className="pg-icon-button pg-expand" aria-label="Enlarge product image" title="Take a closer look" onClick={() => setModal('photo')}><Maximize2 size={19} /></button>
        <div className="pg-image-footer"><span><ZoomIn size={14} /> Take a closer look</span>{navigation}</div>
      </> : <div className="pg-viewer-status"><ImageIcon size={36} /><p>Product photos are coming soon.</p></div>}
    </div>

    {media.items.length > 1 && <div className="pg-thumbnails" aria-label="Product images">{media.items.map((shot, i) => <button key={shot.id} type="button" aria-label={`Show ${shot.label.toLowerCase()} image`} aria-pressed={i === index} className="pg-thumbnail" onClick={() => choose(i)}><span><Photo item={shot} design={design} color={media.color} title={product.title} thumbnail /></span><span>{shot.label}</span></button>)}</div>}

    {media.canExplore3D && <button type="button" className="pg-explore" onClick={open3D}><span className="pg-explore-icon"><Box size={25} strokeWidth={1.5} /></span><span><strong>Explore in 3D</strong><span>Rotate it. See every angle.</span></span><ArrowRight size={21} aria-hidden="true" /></button>}
    {item?.view && <p className="pg-disclaimer">Design preview · Colors and placement may vary slightly in person.</p>}

    {modal === 'photo' && item && <MediaDialog title="A closer look" subtitle={`${product.title} · ${item.label}`} onClose={close} onKeyDown={navigateKey} className="pg-photo-dialog">
      <div ref={zoomScroll} className="pg-lightbox-scroll"><div className={`pg-lightbox-image ${zoomed ? 'is-zoomed' : ''}`}>{photo(false)}</div></div>
      <footer className="pg-dialog-footer"><button type="button" className="pg-text-button" aria-pressed={zoomed} onClick={toggleZoom}>{zoomed ? <ZoomOut size={18} /> : <ZoomIn size={18} />}{zoomed ? 'Fit image' : 'Zoom in'}</button>{navigation}</footer>
    </MediaDialog>}

    {modal === '3d' && design && <MediaDialog title="Explore in 3D" subtitle={product.title} onClose={close} className="pg-3d-dialog">
      <div className="pg-3d-stage"><ViewerBoundary onClose={close}><InteractiveProduct design={design} color={media.color} view={view3D} /></ViewerBoundary><span className="pg-interaction-hint">Drag to rotate · Pinch or scroll to zoom</span></div>
      <div className="pg-3d-angles" role="group" aria-label="3D viewing angle">{ANGLES.map(([id, label]) => <button type="button" key={id} aria-pressed={view3D === id} onClick={() => setView3D(id)}>{label}</button>)}</div>
      <footer className="pg-dialog-footer pg-3d-footer"><div><span className="pg-color-label">Color · {galleryColorName(media.color)}</span><div className="pg-viewer-colors" role="group" aria-label="Preview garment color">{(product.availableColors || []).map(hex => <button type="button" key={hex} aria-label={`Preview ${galleryColorName(hex)}`} aria-pressed={hex.toUpperCase() === media.color} onClick={() => onColorChange?.(hex)}><span style={{ background: hex }}>{hex.toUpperCase() === media.color && <Check size={15} color={['#FFFFFF', '#FFC0CB', '#F7EC1E', '#EEE4CE'].includes(media.color) ? '#111' : '#fff'} />}</span></button>)}</div></div><button type="button" className="pg-text-button" onClick={close}>Back to product <ArrowRight size={16} /></button></footer>
      <p className="pg-disclaimer">Interactive design preview · Colors and placement may vary slightly in person.</p>
    </MediaDialog>}
  </section>;
}
