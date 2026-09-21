import { createElement, lazy, Suspense, useCallback, useEffect, useId, useRef, useState } from 'react';
import { ArrowDownToLine, Box, Camera, Check, ChevronDown, Download, FileUp, Grid2X2, Image as ImageIcon, Layers, LoaderCircle, Magnet, MousePointer2, PanelLeftClose, PanelLeftOpen, Plus, Redo2, Save, Shapes, Shirt, Sparkles, Type, Undo2, Upload, X } from 'lucide-react';
import StudioCanvas from './StudioCanvas';
import StudioTools from './StudioTools';
import StudioInspector from './StudioInspector';
import SelectionToolbar from './SelectionToolbar';
import QuickPosition from './QuickPosition';
import { STUDIO_ID, SURFACES, emptyDocument, normalizeDocument } from './studioDocument';
import { canvasBlob, productSnapshot } from './mockups';
import './UnifiedStudio.css';

const ProductViewer = lazy(() => import('./ProductViewer'));
const TOOLS = [
  ['product', Shirt, 'Product'], ['text', Type, 'Text'], ['uploads', Upload, 'Upload'],
  ['assets', Sparkles, 'Assets'], ['shapes', Shapes, 'Shapes'], ['layers', Layers, 'Layers'],
];
const NO_COLORS = [];
const ALL_PRODUCT_TYPES = ['tshirt', 'hat', 'sticker'];

function productName(type) {
  return type === 'hat' ? 'Baseball hat' : type === 'sticker' ? 'Sticker' : 'T-shirt';
}

function usePhoneLayout(root) {
  const [phone, setPhone] = useState(() => window.matchMedia('(max-width: 760px)').matches);
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const observer = new ResizeObserver(entries => setPhone(entries[0].contentRect.width <= 760));
    observer.observe(node);
    return () => observer.disconnect();
  }, [root]);
  return phone;
}

function download(blob, name) {
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function initialState(designData, productType) {
  try { return { document: normalizeDocument(designData, productType || 'tshirt'), error: '' }; }
  catch (error) { return { document: emptyDocument(productType || 'tshirt'), error: error.message }; }
}

function readDraft(key, type) {
  try {
    const raw = JSON.parse(localStorage.getItem(`truekin-studio:${key}:${type}`));
    return raw?.document?.studio === STUDIO_ID ? raw : null;
  } catch { return null; }
}

export default function UnifiedStudio({ designData, productType, onProductTypeChange, onDesignChange, draftKey = 'playground', onSave, onSnapshot, onColorways, availableColors = NO_COLORS, availableProductTypes = ALL_PRODUCT_TYPES, saveLabel = 'Save design', saving = false, compactTools = false }) {
  const snapHelpId = useId();
  const [start] = useState(() => initialState(designData, productType));
  const [initialDocument, setInitialDocument] = useState(start.document);
  const [state, setState] = useState({ document: start.document, loading: true, layers: [], selected: null, canUndo: false, canRedo: false });
  const [view, setView] = useState('front');
  const [tool, setTool] = useState('product');
  const [panelOpen, setPanelOpen] = useState(() => !compactTools && !window.matchMedia('(max-width:760px)').matches);
  const [mode, setMode] = useState(compactTools ? '2d' : 'split');
  const [guides, setGuides] = useState(true);
  const [snap, setSnap] = useState(true);
  const [autoRotate, setAutoRotate] = useState(false);
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState(start.error ? { kind: 'error', text: start.error } : null);
  const [status, setStatus] = useState('Ready to create');
  const [dirty, setDirty] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [draft, setDraft] = useState(() => readDraft(draftKey, start.document.productType));
  const studioRoot = useRef(null), canvasRef = useRef(null), viewerRef = useRef(null), importRef = useRef(null), menuRef = useRef(null);
  const documents = useRef({ [start.document.productType]: start.document });
  const latestDocument = useRef(start.document);
  const draftTimer = useRef(null), revision = useRef(0), dirtyRef = useRef(false);
  const previousPanelOpen = useRef(false);
  const phone = usePhoneLayout(studioRoot);
  const previousPhone = useRef(phone);
  const type = initialDocument.productType;
  const productOptions = [...new Set([...availableProductTypes, type])];
  const displayMode = phone && mode === 'split' ? '2d' : mode;
  const disabled = !!busy || saving || state.loading || state.error;
  const color = state.document.garmentColor;
  const engine = () => canvasRef.current?.getEngine();
  const reportError = useCallback(error => setNotice({ kind: 'error', text: error?.message || 'Something went wrong. Please try again.' }), []);

  useEffect(() => {
    if (phone && !previousPhone.current) setPanelOpen(false);
    previousPhone.current = phone;
  }, [phone]);

  useEffect(() => {
    const closedPanel = previousPanelOpen.current && !panelOpen;
    previousPanelOpen.current = panelOpen;
    if (!phone || (!panelOpen && !closedPanel)) return;
    // Keep mobile tools and the resulting artwork in view without requiring
    // a hunt below the canvas after every add/close action.
    const frame = requestAnimationFrame(() => {
      studioRoot.current?.querySelector(panelOpen ? '.us-tool-panel' : '.us-workspace')?.scrollIntoView({
        block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [phone, panelOpen, tool]);

  const persistDraft = useCallback(doc => {
    try {
      const compact = { ...doc, prints: {} };
      localStorage.setItem(`truekin-studio:${draftKey}:${doc.productType}`, JSON.stringify({ document: compact, updatedAt: Date.now() }));
      setStatus('Draft saved on this device');
    } catch { setStatus('Unsaved · download a design backup'); }
  }, [draftKey]);

  const handleChange = useCallback(next => {
    latestDocument.current = next.document;
    setState(next);
    if (!next.changed) return;
    onDesignChange?.();
    revision.current++;
    dirtyRef.current = true;
    setDirty(true); setStatus('Unsaved changes');
    clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => {
      const e = canvasRef.current?.getEngine();
      if (e && !e.disposed) persistDraft(e.getDocument());
    }, 650);
  }, [persistDraft, onDesignChange]);

  useEffect(() => () => {
    clearTimeout(draftTimer.current);
    if (dirtyRef.current) persistDraft(latestDocument.current);
  }, [persistDraft]);
  useEffect(() => {
    const beforeUnload = event => {
      if (dirtyRef.current) { event.preventDefault(); event.returnValue = ''; }
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, []);

  const replaceDocument = useCallback(doc => {
    clearTimeout(draftTimer.current);
    latestDocument.current = doc;
    setView('front');
    setState({ document: doc, loading: true, layers: [], selected: null, canUndo: false, canRedo: false });
    setInitialDocument(doc);
    setNotice(null);
  }, []);

  const switchProduct = useCallback(nextType => {
    if (!availableProductTypes.includes(nextType) && nextType !== initialDocument.productType) return;
    if (nextType === initialDocument.productType) return;
    const e = canvasRef.current?.getEngine();
    if (e) {
      const current = e.getDocument();
      documents.current[current.productType] = current;
      if (dirtyRef.current) persistDraft(current);
    }
    const next = documents.current[nextType] || emptyDocument(nextType);
    replaceDocument(next);
    onDesignChange?.();
    setDraft(readDraft(draftKey, nextType));
    setStatus('Product changed · save when ready');
    setDirty(true); dirtyRef.current = true;
    revision.current++;
  }, [initialDocument.productType, draftKey, persistDraft, replaceDocument, availableProductTypes, onDesignChange]);

  useEffect(() => {
    // Product type can also be changed by the admin inventory form.
    if (productType && productType !== type) switchProduct(productType);
  }, [productType, type, switchProduct]);

  const run = async (label, action) => {
    if (disabled) return;
    setBusy(label); setNotice(null); setMenuOpen(false);
    try { await action(); }
    catch (error) { reportError(error); }
    finally { setBusy(''); }
  };

  const command = (action, value) => {
    if (!disabled) engine()?.command(action, value);
  };
  const update = values => {
    if (!disabled) engine()?.update(values);
  };

  useEffect(() => {
    const keydown = event => {
      const e = canvasRef.current?.getEngine();
      if (!e || disabled || !event.target.closest('.us-studio')) return;
      if (event.target.closest('input, textarea, select, [contenteditable="true"]') || e.selected?.isEditing) return;
      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.key.toLowerCase() === 'z') { event.preventDefault(); e.history(event.shiftKey ? 'redo' : 'undo'); }
      else if (mod && event.key.toLowerCase() === 'd') { event.preventDefault(); e.command('duplicate'); }
      else if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); e.command('delete'); }
      else if (event.key === 'Escape') { e.command('deselect'); setMenuOpen(false); }
      else if (event.target.tagName === 'CANVAS' && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
        event.preventDefault(); const step = event.shiftKey ? 10 : 2;
        e.command('nudge', { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[event.key]);
      }
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [disabled]);

  useEffect(() => {
    if (!menuOpen) return;
    const outside = event => { if (!menuRef.current?.contains(event.target)) setMenuOpen(false); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [menuOpen]);

  const addImage = (source, name) => run('Adding artwork', async () => {
    if (source instanceof File) {
      if (!['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'].includes(source.type)) throw new Error('Please choose a PNG, JPG, WebP, or SVG image.');
      if (source.size > 10 * 1024 * 1024) throw new Error('Choose an image smaller than 10 MB.');
    }
    await engine().addImage(source, name);
    if (phone) setPanelOpen(false);
    if (displayMode === '3d') setMode('2d');
  });

  const addText = (text, font, ink) => run('Adding text', async () => {
    await document.fonts.load(`bold 72px "${font}"`);
    engine().addText(text, font, ink);
    if (phone) setPanelOpen(false);
    if (displayMode === '3d') setMode('2d');
  });

  const save = () => run('Saving design', async () => {
    const doc = engine().getDocument(), savedRevision = revision.current;
    const blob = await canvasBlob(await productSnapshot(doc));
    const result = onSave ? await onSave(blob, doc) : null;
    if (!onSave) download(new Blob([JSON.stringify(doc)], { type: 'application/json' }), `truekin-${type}-design.json`);
    const persisted = result?.persisted !== false;
    if (revision.current === savedRevision && persisted) {
      clearTimeout(draftTimer.current);
      setDirty(false); dirtyRef.current = false;
      setStatus(onSave ? 'Design saved' : 'Design downloaded');
      try { localStorage.removeItem(`truekin-studio:${draftKey}:${type}`); } catch { /* Storage may be disabled. */ }
      setDraft(null);
    }
    if (!persisted) {
      persistDraft(doc);
      setDirty(true); dirtyRef.current = true;
    }
    setNotice({ kind: 'success', text: !persisted ? (result.message || 'Design prepared. A device draft is kept until you save the product.') : onSave ? 'Design saved. Your photo and 3D preview use the same artwork.' : 'Your editable design file has been downloaded.' });
  });

  const exportImage = (kind = 'mockup') => run('Preparing download', async () => {
    const doc = engine().getDocument();
    if (kind === 'artwork') {
      if (!doc.prints[view]) throw new Error('Add some artwork to this side first.');
      download(await (await fetch(doc.prints[view])).blob(), `truekin-${type}-${view}-artwork.png`);
    } else download(await canvasBlob(await productSnapshot(doc, view)), `truekin-${type}-${view}-mockup.png`);
  });

  const snapshot = () => run('Capturing product', async () => {
    const doc = engine().getDocument();
    const blob = await canvasBlob(await productSnapshot(doc, view));
    await onSnapshot(blob);
    setNotice({ kind: 'success', text: 'Photo added to the product gallery.' });
  });

  const exportColorways = () => run('Generating color photos', async () => {
    const doc = engine().getDocument();
    const colors = [...new Set(availableColors.map(c => typeof c === 'string' ? c : c.hex).filter(c => /^#[0-9a-f]{6}$/i.test(c)))];
    if (!colors.length) throw new Error('Select product colors in the product form first.');
    const results = [], failed = [];
    for (const hex of colors) for (const side of type === 'tshirt' ? ['front', 'back'] : ['front']) {
      try { results.push({ hex, side, blob: await canvasBlob(await productSnapshot(doc, side, hex)) }); }
      catch { failed.push({ hex, side }); }
    }
    if (!results.length) throw new Error('The color photos could not be generated. Please try again.');
    await onColorways(results, failed);
    setNotice({ kind: failed.length ? 'error' : 'success', text: `${results.length} color photos saved.${failed.length ? ` ${failed.length} could not be rendered.` : ''}` });
  });

  const importDesign = file => run('Opening design', async () => {
    if (file.size > 35 * 1024 * 1024) throw new Error('Choose a design file smaller than 35 MB.');
    const raw = JSON.parse(await file.text());
    if (!raw || typeof raw !== 'object' || (!raw.studio && !raw.frontObjects && !raw.frontTexture)) throw new Error('This is not a recognized studio design file.');
    const doc = normalizeDocument(raw);
    if (!availableProductTypes.includes(doc.productType) && doc.productType !== type) throw new Error(`${productName(doc.productType)} designs are not available in this studio.`);
    if (dirtyRef.current && !window.confirm('Open this design in place of the current one? Your current work will be kept as a device draft.')) return;
    if (dirtyRef.current) persistDraft(engine().getDocument());
    documents.current[doc.productType] = doc;
    replaceDocument(doc);
    onDesignChange?.();
    onProductTypeChange?.(doc.productType);
    setDirty(true); dirtyRef.current = true; revision.current++;
    setStatus('Design opened · save when ready');
    setDraft(null);
  });

  const selectTool = id => { setTool(id); setPanelOpen(tool === id ? !panelOpen : true); };

  return <section ref={studioRoot} className="us-studio" aria-label="Truekin design studio" aria-busy={!!busy || saving}>
    <header className="us-header">
      <div className="us-brand"><span className="us-brand-mark"><Shirt size={22} /></span><div><span className="us-eyebrow">TRUEKIN / CREATIVE TOOLS</span><h2>Design studio<span className="us-beta">2D + 3D</span></h2></div></div>
      <div className="us-header-actions"><span className="us-save-status" title={status}>{dirty ? <span className="us-status-dot" /> : <Check size={13} />}{status}</span><div className="us-history"><button type="button" className="us-icon-button" title="Undo artwork (⌘/Ctrl Z)" aria-label="Undo artwork" disabled={disabled || !state.canUndo} onClick={() => engine()?.history('undo')}><Undo2 size={18} /></button><button type="button" className="us-icon-button" title="Redo artwork (⌘/Ctrl Shift Z)" aria-label="Redo artwork" disabled={disabled || !state.canRedo} onClick={() => engine()?.history('redo')}><Redo2 size={18} /></button></div>
        <button type="button" className="us-button us-primary" disabled={disabled} onClick={save}>{busy === 'Saving design' || saving ? <LoaderCircle size={16} className="us-spin" /> : <Save size={16} />}<span>{onSave ? saveLabel : 'Save file'}</span></button>
        <div className="us-export" ref={menuRef}><button type="button" className="us-icon-button us-export-trigger" title="Export and file options" aria-label="Export and file options" aria-expanded={menuOpen} disabled={disabled} onClick={() => setMenuOpen(!menuOpen)}><ChevronDown size={18} /></button>{menuOpen && <div className="us-export-menu">
          <span className="us-label">YOUR DESIGN, READY TO GO</span>
          <button type="button" onClick={() => exportImage()}><ImageIcon size={16} /> Download product photo</button>
          <button type="button" onClick={() => exportImage('artwork')}><ArrowDownToLine size={16} /> Download transparent artwork</button>
          <button type="button" onClick={() => { download(new Blob([JSON.stringify(engine().getDocument())], { type: 'application/json' }), `truekin-${type}-design.json`); setMenuOpen(false); }}><Download size={16} /> Download editable design</button>
          <button type="button" onClick={() => { importRef.current.click(); setMenuOpen(false); }}><FileUp size={16} /> Open design file</button>
          {onSnapshot && <button type="button" onClick={snapshot}><Camera size={16} /> Add photo to gallery</button>}
          {onColorways && <button type="button" onClick={exportColorways}><Grid2X2 size={16} /> Generate color photos</button>}
        </div>}</div>
        <input ref={importRef} type="file" accept="application/json,.json" hidden onChange={e => { if (e.target.files[0]) importDesign(e.target.files[0]); e.target.value = ''; }} />
      </div>
    </header>
    {notice && <div className={`us-notice is-${notice.kind}`} role={notice.kind === 'error' ? 'alert' : 'status'}><span>{notice.text}</span>{state.error && <button type="button" className="us-button" disabled={state.loading} onClick={() => { setView('front'); engine()?.retry(); }}>Retry artwork</button>}<button type="button" className="us-icon-button" aria-label="Dismiss message" disabled={state.error} onClick={() => setNotice(null)}><X size={15} /></button></div>}
    {draft && <div className="us-draft-banner"><div><strong>A device draft is available</strong><span>{new Date(draft.updatedAt).toLocaleString()} · {productName(type)}</span></div><button type="button" className="us-button" disabled={disabled} onClick={() => { const doc = normalizeDocument(draft.document); replaceDocument(doc); setDraft(null); setDirty(true); dirtyRef.current = true; setStatus('Device draft restored'); }}>Restore</button><button type="button" className="us-icon-button" aria-label="Dismiss available draft" onClick={() => setDraft(null)}><X size={16} /></button></div>}
    <div className={`us-body ${panelOpen ? 'has-mobile-panel' : 'is-panel-collapsed'}`}>
      <nav className="us-tool-rail" aria-label="Design tools">{TOOLS.map(([id, Icon, label]) => <button type="button" key={id} className={tool === id && panelOpen ? 'is-active' : ''} aria-pressed={tool === id && panelOpen} aria-controls="studio-toolkit" aria-expanded={panelOpen && tool === id} onClick={() => selectTool(id)}>{createElement(Icon, { size: 21 })}<span>{label}</span></button>)}</nav>
      <aside className="us-tool-panel" id="studio-toolkit"><StudioTools tool={tool} productType={type} availableProductTypes={productOptions} color={color} onProductChange={value => { if (onProductTypeChange?.(value) !== false) switchProduct(value); }} onColorChange={value => engine()?.setColor(value)} onAddText={addText} onAddImage={addImage} onAddShape={(shape, ink) => { engine()?.addDefinedShape(shape, ink); if (phone) setPanelOpen(false); if (displayMode === '3d') setMode('2d'); }} layers={state.layers} selected={state.selected} onCommand={command} onClose={() => setPanelOpen(false)} busy={disabled} /></aside>
      <div className="us-workspace">
        <div className="us-workspace-bar"><button type="button" className="us-tool-toggle" aria-controls="studio-toolkit" aria-expanded={panelOpen} onClick={() => setPanelOpen((open) => !open)}>{panelOpen ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />}{panelOpen ? 'Hide tools' : 'Show tools'}</button><div className="us-surfaces" aria-label="Print location">{SURFACES[type].map(s => <button type="button" key={s.id} disabled={disabled} aria-pressed={view === s.id} className={view === s.id ? 'is-active' : ''} onClick={() => { setView(s.id); setAutoRotate(false); }}>{s.label}</button>)}</div><div className="us-view-modes" aria-label="Studio view">{[['2d', MousePointer2, 'Edit'], ['split', PanelLeftClose, 'Split'], ['3d', Box, '3D']].filter(([id]) => !phone || id !== 'split').map(([id, Icon, label]) => <button type="button" key={id} onClick={() => setMode(id)} aria-pressed={displayMode === id} className={displayMode === id ? 'is-active' : ''}>{createElement(Icon, { size: 15 })}<span>{label}</span></button>)}</div></div>
        <div className={`us-stages is-${displayMode}`}>
          <div className={`us-stage us-edit-stage ${displayMode === '3d' ? 'is-hidden' : ''}`} aria-hidden={displayMode === '3d'}><div className="us-stage-label"><span><MousePointer2 size={12} /> EDIT YOUR DESIGN</span><span>{type === 'tshirt' ? 'Classic tee' : productName(type)}</span></div><SelectionToolbar key={state.selected?.id || 'none'} selected={state.selected} disabled={disabled} onCommand={command} /><div className="us-canvas-wrap"><StudioCanvas ref={canvasRef} initialDocument={initialDocument} view={view} color={color} guides={guides} snap={snap} onChange={handleChange} onError={reportError} /></div><p className="us-stage-caption">Tap to select · drag to move · use handles to resize</p></div>
          {displayMode !== '2d' && <div className="us-stage us-3d-stage"><div className="us-stage-label"><span><Box size={12} /> LIVE PREVIEW</span><span className="us-live-dot">Synced</span></div><div className="us-viewer-wrap"><Suspense fallback={<div className="us-viewer-loading"><LoaderCircle size={22} className="us-spin" />Loading 3D preview…</div>}><ProductViewer ref={viewerRef} productType={type} color={color} prints={state.document.prints} view={view} autoRotate={autoRotate} /></Suspense></div><p className="us-stage-caption">Drag to rotate · pinch or scroll to zoom</p></div>}
          {(!!busy || state.loading) && <div className="us-busy" role="status"><LoaderCircle size={16} className="us-spin" />{busy || 'Preparing your design'}</div>}
        </div>
        {state.selected && <QuickPosition selected={state.selected} disabled={disabled} onCommand={command} />}
        <div className="us-workspace-footer"><div><label><input type="checkbox" checked={guides} onChange={e => setGuides(e.target.checked)} /> Print guide</label><button type="button" aria-label="Smart snap" aria-describedby={displayMode !== '3d' ? snapHelpId : undefined} aria-pressed={snap} className={snap ? 'is-active' : ''} onClick={() => setSnap(!snap)}><Magnet size={14} /> Smart snap {snap ? 'on' : 'off'}</button></div>{displayMode !== '2d' && <label><input type="checkbox" checked={autoRotate} onChange={e => setAutoRotate(e.target.checked)} /> Auto rotate</label>}</div>
        {displayMode !== '3d' && <p className="us-snap-help" id={snapHelpId}>{snap ? <><span className="us-snap-sample" aria-hidden="true" />Red guides hold centers, edges & equal spacing. Pull away to release.<span className="us-desktop-only"> Hold Alt to move freely.</span></> : 'Smart snap is off. Move and rotate artwork freely.'}</p>}
        {!state.layers.length && !state.loading && <div className="us-start-hint"><span>Good things start with a blank canvas.</span><button type="button" onClick={() => { setTool('text'); setPanelOpen(true); }}><Plus size={14} /> Add text</button><button type="button" onClick={() => { setTool('assets'); setPanelOpen(true); }}>Explore artwork →</button></div>}
      </div>
    </div>
    {state.selected && <div className="us-selection"><StudioInspector selected={state.selected} onUpdate={update} onCommand={command} /></div>}
    <footer className="us-bottom-bar"><span><span className="us-status-dot" />{phone ? status : 'ONE DESIGN. EVERY ANGLE.'}</span><span>Keep artwork inside the print guide<span className="us-desktop-only"> · Colors are a visual approximation</span></span></footer>
  </section>;
}
