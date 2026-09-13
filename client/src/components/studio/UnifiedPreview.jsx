import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Box, Image as ImageIcon } from 'lucide-react';
import { SURFACES } from './studioDocument';
import { productSnapshot } from './mockups';
const ProductViewer = lazy(() => import('./ProductViewer'));

function FlatPreview({ design, view, color }) {
  const [result, setResult] = useState(null);
  const [retry, setRetry] = useState(0);
  const key = `${view}|${color}`;
  useEffect(() => {
    let alive = true;
    productSnapshot(design, view, color).then(c => { if (alive) setResult({ key, design, src: c.toDataURL() }); }).catch(() => { if (alive) setResult({ key, design, error: true }); });
    return () => { alive = false; };
  }, [design, view, color, key, retry]);
  if (result?.key === key && result.design === design && result.error) return <div role="alert" style={{ padding: 24 }}>The photo preview could not load. <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setResult(null); setRetry(n => n + 1); }}>Retry</button></div>;
  return result?.key === key && result.design === design ? <img src={result.src} alt={`Designed ${design.productType === 'hat' ? 'hat' : 'T-shirt'}, ${view}`} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <div role="status" style={{ padding: 24 }}>Preparing preview…</div>;
}

export default function UnifiedPreview({ designData, colorOverride, height = 500, style = {} }) {
  const [view, setView] = useState('front');
  const [mode, setMode] = useState(() => window.matchMedia('(max-width: 760px)').matches ? '2d' : '3d');
  const design = useMemo(() => {
    try { return typeof designData === 'string' ? JSON.parse(designData) : designData; }
    catch { return null; }
  }, [designData]);
  if (!design) return <div style={{ padding: 24 }}>No design preview available.</div>;
  const type = design.productType === 'hat' ? 'hat' : 'tshirt';
  const views = SURFACES[type];
  const activeView = views.some(v => v.id === view) ? view : 'front';
  const color = colorOverride || design.garmentColor || design.tshirtColor || '#FFFFFF';
  return <div style={{ background: '#f6f4ee', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', ...style }}>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: 10 }}>
      {views.map(v => <button key={v.id} type="button" className={`btn btn-sm ${activeView === v.id ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setView(v.id)} aria-pressed={activeView === v.id} style={{ flex: 1, minHeight: 40, padding: '8px 10px' }}>{v.label}</button>)}
      <button type="button" className="btn btn-secondary btn-sm" onClick={() => setMode(m => m === '3d' ? '2d' : '3d')} style={{ minHeight: 40 }} aria-label={mode === '3d' ? 'Show 2D photo' : 'Show 3D preview'}>{mode === '3d' ? <ImageIcon size={15} /> : <Box size={15} />}{mode === '3d' ? '2D' : '3D'}</button>
    </div>
    <div style={{ height, maxHeight: '80vh', minHeight: 270 }}>
      {mode === '3d' ? <Suspense fallback={<div role="status" style={{ padding: 24 }}>Preparing 3D preview…</div>}><ProductViewer productType={type} color={color} prints={design.prints} view={activeView} /></Suspense> : <FlatPreview design={design} view={activeView} color={color} />}
    </div>
    <p style={{ textAlign: 'center', padding: '0 12px 12px', fontSize: 12, color: 'var(--text-secondary)' }}>{mode === '3d' ? 'Drag to rotate · pinch to zoom' : 'Product photo preview'}</p>
  </div>;
}
