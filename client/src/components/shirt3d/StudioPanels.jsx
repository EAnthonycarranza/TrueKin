/**
 * StudioPanels – the Position, Layers and Background-remover panels used by
 * Shirt3DStudio. Each takes a `getCanvas()` accessor for the active Fabric
 * canvas and an `onChanged()` callback to refresh the 3D print + layer list.
 */
import { useEffect, useRef, useState } from 'react';
import {
  AlignHorizontalJustifyStart, AlignHorizontalJustifyCenter, AlignHorizontalJustifyEnd,
  AlignVerticalJustifyStart, AlignVerticalJustifyCenter, AlignVerticalJustifyEnd,
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Eye, EyeOff, Lock, Unlock, ChevronUp, ChevronDown,
  Copy, Trash2, Type, ImageIcon, Shapes, Eraser, RotateCcw, Layers,
} from 'lucide-react';
import { placementsFor, SIZE_PRESETS, applyPlacement, sizeActive, fitActive, alignActive, nudgeActive, duplicateActive, isLocked, setLocked } from './placement';
import { removeBackground } from './backgroundRemoval';

/* ---------- Position ---------- */

export function PlacementPanel({ getCanvas, area, viewKind, viewId, dark = true }) {
  const presets = placementsFor(viewKind, viewId);
  const run = (fn) => {
    const canvas = getCanvas();
    if (canvas && area) fn(canvas);
  };
  const c = dark ? darkStyles : lightStyles;
  return (
    <div className="tk-placement-panel" style={c.wrap}>
      <div className="tk-placement-group tk-placement-presets" style={c.group}>
        <span style={c.label}>Place</span>
        {presets.map((p) => (
          <button key={p.id} type="button" title={p.hint || p.label} onClick={() => run((cv) => applyPlacement(cv, area, p))} style={c.chip}>{p.label}</button>
        ))}
      </div>
      <div className="tk-placement-group tk-placement-precision" style={c.group}>
        <span style={c.label}>Size</span>
        {SIZE_PRESETS.map((s) => (
          <button key={s.id} type="button" title={s.fit ? 'Fill the print zone' : `${Math.round(s.w * 100)}% of the zone width`} onClick={() => run((cv) => (s.fit ? fitActive(cv, area) : sizeActive(cv, area, s.w)))} style={c.chip}>{s.label}</button>
        ))}
        <span style={c.label}>Align</span>
        {[
          ['left', AlignHorizontalJustifyStart, 'Align left'], ['center', AlignHorizontalJustifyCenter, 'Centre horizontally'], ['right', AlignHorizontalJustifyEnd, 'Align right'],
          ['top', AlignVerticalJustifyStart, 'Align top'], ['middle', AlignVerticalJustifyCenter, 'Centre vertically'], ['bottom', AlignVerticalJustifyEnd, 'Align bottom'],
        ].map((row) => {
          const AlignIcon = row[1];
          return (
            <button key={row[0]} type="button" title={row[2]} onClick={() => run((cv) => alignActive(cv, area, row[0]))} style={c.icon}><AlignIcon size={14} /></button>
          );
        })}
        <span style={c.label}>Nudge</span>
        {[
          ['up', ArrowUp, 0, -1], ['down', ArrowDown, 0, 1], ['left', ArrowLeft, -1, 0], ['right', ArrowRight, 1, 0],
        ].map((row) => {
          const NudgeIcon = row[1];
          return (
            <button key={row[0]} type="button" title="Nudge 1px (Shift: 10px)" onClick={(e) => run((cv) => nudgeActive(cv, row[2] * (e.shiftKey ? 10 : 1), row[3] * (e.shiftKey ? 10 : 1)))} style={c.icon}><NudgeIcon size={14} /></button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Layers ---------- */

function objectLabel(obj) {
  if (obj.label) return obj.label;
  if (obj.type === 'textbox' || obj.type === 'text' || obj.type === 'i-text') return (obj.text || 'Text').replace(/\s+/g, ' ').slice(0, 24) || 'Text';
  if (obj.type === 'image') return 'Image';
  if (obj.type === 'group') return 'Group';
  return obj.type ? obj.type.charAt(0).toUpperCase() + obj.type.slice(1) : 'Element';
}

function ObjectIcon({ obj }) {
  if (obj.type === 'textbox' || obj.type === 'text' || obj.type === 'i-text') return <Type size={13} />;
  if (obj.type === 'image') return <ImageIcon size={13} />;
  return <Shapes size={13} />;
}

export function LayersPanel({ getCanvas, version, onChanged, onSelect }) {
  const canvas = getCanvas();
  const objects = canvas ? [...canvas.getObjects()].reverse() : [];
  const active = new Set(canvas ? canvas.getActiveObjects() : []);
  const act = (fn) => {
    const cv = getCanvas();
    if (!cv) return;
    fn(cv);
    cv.requestRenderAll();
    onChanged?.();
  };
  return (
    <div className="tk-layers-panel" style={layers.wrap} data-version={version}>
      <div className="tk-layers-head" style={layers.head}>
        <Layers size={12} /> Layers · {objects.length}
        <span style={{ marginLeft: 'auto', fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: '#888' }}>click to select · shift-click to add</span>
      </div>
      {objects.length === 0 && <div style={layers.empty}>No elements on this view yet.</div>}
      {objects.map((obj, i) => {
        const locked = isLocked(obj);
        const isActive = active.has(obj);
        const fill = typeof obj.fill === 'string' && obj.fill.startsWith('#') ? obj.fill : null;
        return (
          <div
            className="tk-layer-row"
            key={`${i}-${obj.type}`}
            role="button"
            tabIndex={0}
            onClick={(e) => onSelect?.(obj, e.shiftKey)}
            onKeyDown={(e) => { if (e.key === 'Enter') onSelect?.(obj, e.shiftKey); }}
            style={{ ...layers.row, ...(isActive ? layers.rowOn : {}), opacity: obj.visible === false ? 0.5 : 1 }}
          >
            <span style={layers.iconCell}><ObjectIcon obj={obj} /></span>
            {fill && <span style={{ ...layers.dot, background: fill }} />}
            <span style={layers.name}>{objectLabel(obj)}</span>
            <button type="button" title={obj.visible === false ? 'Show' : 'Hide'} onClick={(e) => { e.stopPropagation(); act(() => { obj.visible = obj.visible === false; }); }} style={layers.btn}>
              {obj.visible === false ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
            <button type="button" title={locked ? 'Unlock' : 'Lock in place (cannot be moved, rotated or resized)'} onClick={(e) => { e.stopPropagation(); act(() => setLocked(obj, !locked)); }} style={layers.btn}>
              {locked ? <Lock size={13} /> : <Unlock size={13} />}
            </button>
            <button type="button" title="Bring forward" onClick={(e) => { e.stopPropagation(); act((cv) => cv.bringObjectForward(obj)); }} style={layers.btn}><ChevronUp size={13} /></button>
            <button type="button" title="Send backward" onClick={(e) => { e.stopPropagation(); act((cv) => cv.sendObjectBackwards(obj)); }} style={layers.btn}><ChevronDown size={13} /></button>
            <button type="button" title="Duplicate" onClick={(e) => { e.stopPropagation(); act((cv) => { cv.setActiveObject(obj); duplicateActive(cv).then(() => onChanged?.()); }); }} style={layers.btn}><Copy size={13} /></button>
            <button type="button" title={locked ? 'Unlock first to delete' : 'Delete'} disabled={locked} onClick={(e) => { e.stopPropagation(); act((cv) => { cv.discardActiveObject(); cv.remove(obj); }); }} style={{ ...layers.btn, color: locked ? '#aaa' : '#dc2626' }}><Trash2 size={13} /></button>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Background remover ---------- */

export function BackgroundRemoverPanel({ getCanvas, onChanged, onClose }) {
  const [tolerance, setTolerance] = useState(30);
  const [enclosed, setEnclosed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const originalRef = useRef(null);
  const targetRef = useRef(null);
  const jobRef = useRef(0);

  // Remember the untouched source so every preview starts from the original.
  useEffect(() => {
    const canvas = getCanvas();
    const obj = canvas?.getActiveObject();
    if (!obj || obj.type !== 'image') return;
    targetRef.current = obj;
    if (!obj.__originalSrc) obj.__originalSrc = obj.getSrc?.() || obj._element?.src;
    originalRef.current = obj.__originalSrc;
  }, [getCanvas]);

  const swapSrc = async (src) => {
    const canvas = getCanvas();
    const obj = targetRef.current;
    if (!canvas || !obj) return;
    const before = obj.getScaledWidth();
    await obj.setSrc(src);
    const after = obj.getScaledWidth();
    if (before && after && Math.abs(after - before) > 0.5) obj.scale((obj.scaleX || 1) * (before / after));
    obj.setCoords();
    canvas.requestRenderAll();
    canvas.fire('object:modified', { target: obj });
    onChanged?.();
  };

  const preview = async (tol, enc) => {
    const src = originalRef.current;
    if (!src) return;
    const id = ++jobRef.current;
    setBusy(true);
    setError(null);
    try {
      const out = await removeBackground(src, { tolerance: tol, removeEnclosed: enc });
      if (id === jobRef.current) await swapSrc(out);
    } catch (e) {
      setError(e.message || 'Could not process this image');
    } finally {
      if (id === jobRef.current) setBusy(false);
    }
  };

  // Debounced live preview while the slider moves.
  const timer = useRef(null);
  const schedule = (tol, enc) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => preview(tol, enc), 180);
  };
  useEffect(() => () => clearTimeout(timer.current), []);

  const restore = async () => {
    jobRef.current++;
    if (originalRef.current) await swapSrc(originalRef.current);
  };

  return (
    <div style={bg.wrap}>
      <div style={bg.row}>
        <strong style={bg.title}><Eraser size={13} /> Remove background</strong>
        <span style={bg.hint}>Reads the backdrop colour from the corners and clears it. Runs on this device only.</span>
      </div>
      <div style={bg.row}>
        <label style={bg.hint}>
          Tolerance
          <input type="range" min={2} max={90} value={tolerance} onChange={(e) => { const v = Number(e.target.value); setTolerance(v); schedule(v, enclosed); }} style={{ width: 160 }} />
          <span style={{ width: 28, fontVariantNumeric: 'tabular-nums' }}>{tolerance}</span>
        </label>
        <label style={bg.hint}>
          <input type="checkbox" checked={enclosed} onChange={(e) => { setEnclosed(e.target.checked); schedule(tolerance, e.target.checked); }} />
          Also clear enclosed areas (holes in letters)
        </label>
        <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => preview(tolerance, enclosed)}>
          <Eraser size={13} /> {busy ? 'Working…' : 'Apply'}
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={restore}><RotateCcw size={13} /> Restore original</button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Done</button>
        {error && <span style={{ color: '#fca5a5', fontSize: 12 }}>{error}</span>}
      </div>
    </div>
  );
}

/* ---------- styles ---------- */

const darkStyles = {
  wrap: { display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 8, borderTop: '1px solid #2a2a2a', marginTop: 8 },
  group: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 5 },
  label: { fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9a9a9a', marginRight: 2, marginLeft: 6 },
  chip: { padding: '4px 9px', fontSize: 11, fontWeight: 600, borderRadius: 999, border: '1px solid #3a3a3a', background: '#1a1a1a', color: '#f4f1ea', cursor: 'pointer' },
  icon: { display: 'inline-flex', alignItems: 'center', padding: 5, borderRadius: 6, border: '1px solid #3a3a3a', background: '#1a1a1a', color: '#f4f1ea', cursor: 'pointer' },
};
const lightStyles = {
  ...darkStyles,
  wrap: { ...darkStyles.wrap, borderTop: '1px solid #eee' },
  label: { ...darkStyles.label, color: '#666' },
  chip: { ...darkStyles.chip, border: '1px solid #d4d4d4', background: '#fff', color: '#111' },
  icon: { ...darkStyles.icon, border: '1px solid #d4d4d4', background: '#fff', color: '#111' },
};
const layers = {
  wrap: { display: 'flex', flexDirection: 'column', gap: 2, padding: 8, background: '#fafafa', border: '1px solid #eee', borderRadius: 8, maxHeight: 220, overflowY: 'auto' },
  head: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#555', padding: '2px 2px 6px' },
  empty: { fontSize: 12, color: '#888', padding: '4px 2px' },
  row: { display: 'flex', alignItems: 'center', gap: 4, padding: '4px 6px', borderRadius: 6, cursor: 'pointer', border: '1px solid transparent', fontSize: 12 },
  rowOn: { background: '#0a0a0a', color: '#fff' },
  iconCell: { display: 'inline-flex', width: 18, justifyContent: 'center', opacity: 0.8 },
  dot: { width: 10, height: 10, borderRadius: 3, border: '1px solid rgba(0,0,0,0.2)', display: 'inline-block' },
  name: { flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  btn: { display: 'inline-flex', alignItems: 'center', padding: 3, borderRadius: 4, border: 'none', background: 'transparent', color: 'inherit', cursor: 'pointer', opacity: 0.85 },
};
const bg = {
  wrap: { display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 8, borderTop: '1px solid #2a2a2a', marginTop: 8 },
  row: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
  title: { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase' },
  hint: { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#cfcfcf' },
};
