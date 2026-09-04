/**
 * Shirt3DStudio – the 3D t-shirt creation tool.
 *
 * Left: the 2D design surface (a Fabric.js canvas over a mockup).
 * Right: the colour-exact 3D tee, updated live from the same canvases.
 *
 * Four printable views: front, back, left sleeve, right sleeve.
 *   • Front/back mockups are the studio photos (or the white tee re-shaded to
 *     an exact hex for custom colours — mockupTint.js).
 *   • Sleeve mockups are a side-view photo of the white tee re-shaded to the
 *     current fabric colour (mirrored for the right sleeve). Their print zone
 *     is fixed on the photo, and the 3D sleeve decal is sized to the same
 *     aspect, so an element placed on the 2D sleeve lands on the 3D sleeve.
 *
 * Why 2D and 3D agree here, where the legacy pair did not:
 *   1. One print rectangle per view drives the 2D clip, the crop that becomes
 *      the print texture, AND the decal placement on the mesh.
 *   2. The 3D tee is painted with the fabric colour sampled from the very
 *      mockup photo shown on the left (shirtColor.js), or the exact custom hex.
 *   3. The renderer has no tone mapping and a key+fill rig summing to 1, so a
 *      camera-facing pixel is the material colour — fabric and artwork alike.
 *
 * The "Colour match" readout under the 3D view is a real readback of the
 * rendered frame compared against a real sample of the 2D mockup.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as fabric from 'fabric';
import {
  Type, ImagePlus, Sticker, Trash2, XCircle, Camera, Save, Download,
  RotateCw, Palette, Check, AlertTriangle, Box, Layers, Pipette, Pencil, X, RotateCcw, Plus,
  BoxSelect, Eraser, Magnet, Copy, Lock, Unlock, ChevronUp, ChevronDown, RotateCw as RotateIcon,
} from 'lucide-react';
import FabricCanvas from '../designer/FabricCanvas';
import ShirtViewer from './ShirtViewer';
import ColorWheel from './ColorWheel';
import { PlacementPanel, LayersPanel, BackgroundRemoverPanel } from './StudioPanels';
import { installSelectionStyle, selectAll, duplicateActive, nudgeActive, isLocked, setLocked, rotateActive } from './placement';
import { attachSnapping } from './snapping';
import { getMockupUrl } from '../designer/designerMockups';
import { buildMockupUrl, buildSleeveMockupUrl } from './mockupTint';
import {
  TSHIRT_COLORS, TSHIRT_FRONT_PATH, TSHIRT_BACK_PATH, CANVAS_CONFIG,
  FONT_OPTIONS, SHAPE_DEFS, CLIPART_CATEGORIES, DEFAULT_TEXT_CONFIG,
} from '../designer/designerConstants';
import { dataURLToBlob, loadFabricAssetImage, loadFabricImageFromFile } from '../designer/designerHelpers';
import { getPrintRectPx, PRINT_AREA, VIEWS, VIEW_IDS, SLEEVE_VIEW_IDS, viewInfo, sleeveZoneCanvas, sleeveProbeImage } from './printArea';
import { STUDIO_ID, STUDIO_VERSION, renderPrintTexture } from './designState';
import {
  useFabricColor, sampleMockupAt, colorDelta, rgbToHex, hexToRgb, PROBES,
  SHIRT_COLOR_NAMES, FABRIC_COLOR_FALLBACK, normalizeHex, presetKeyFor,
} from './shirtColor';
import './Shirt3DStudio.css';

/* ---------- editable shirt palette ----------
 * Entries are { hex, preset }. `preset` remembers which studio photo the
 * swatch started from so an edited swatch can be restored. A swatch whose hex
 * still equals a preset shows that photo; any other hex is tinted.
 */
const PALETTE_KEY = 'truking.shirtPalette.v1';

function canonicalColor(hex) {
  return presetKeyFor(hex) || normalizeHex(hex);
}

function defaultPalette() {
  return TSHIRT_COLORS.map((c) => ({ hex: c, preset: c }));
}

function normalizePalette(list) {
  if (!Array.isArray(list)) return null;
  const out = list
    .map((e) => {
      const hex = canonicalColor(typeof e === 'string' ? e : e?.hex);
      if (!hex) return null;
      const preset = e && typeof e === 'object' && e.preset ? presetKeyFor(e.preset) : presetKeyFor(hex);
      return { hex, preset };
    })
    .filter(Boolean);
  return out.length ? out : null;
}

function loadStoredPalette() {
  try {
    return normalizePalette(JSON.parse(window.localStorage.getItem(PALETTE_KEY)));
  } catch {
    return null;
  }
}

/** What a swatch looks like on screen: the photo's fabric for presets, the hex otherwise. */
function swatchDisplayColor(entry) {
  return entry.hex === entry.preset ? FABRIC_COLOR_FALLBACK[entry.preset] || entry.hex : entry.hex;
}

function isLight(hex) {
  const c = hexToRgb(hex);
  return c ? (0.299 * c.r + 0.587 * c.g + 0.114 * c.b) / 255 > 0.6 : true;
}

// Bigger, clearer handles on every element (applies before any object is created).
installSelectionStyle();

const TOOLS = [
  { id: 'text', label: 'Text', Icon: Type },
  { id: 'image', label: 'Image', Icon: ImagePlus },
  { id: 'clipart', label: 'Assets', Icon: Sticker },
];

/** Median RGBA of the design layer at the print-zone centre (retina-aware). */
function sampleDesignCanvas(canvas, area, radius = 3) {
  const el = canvas.lowerCanvasEl;
  if (!el) return null;
  const rect = getPrintRectPx(canvas.width, canvas.height, area);
  const sx = el.width / canvas.width;
  const sy = el.height / canvas.height;
  const cx = Math.round((rect.left + rect.width / 2) * sx);
  const cy = Math.round((rect.top + rect.height / 2) * sy);
  const size = radius * 2 + 1;
  const d = el.getContext('2d').getImageData(cx - radius, cy - radius, size, size).data;
  // Only count the patch as artwork when it is mostly opaque, and take the
  // median over the opaque pixels — a patch straddling an element's edge
  // would otherwise mix transparent and painted pixels into a bogus colour.
  const ch = [[], [], []];
  let opaque = 0;
  const total = d.length / 4;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 128) continue;
    opaque++;
    ch[0].push(d[i]);
    ch[1].push(d[i + 1]);
    ch[2].push(d[i + 2]);
  }
  if (opaque / total < 0.6) return null;
  const med = (arr) => { arr.sort((x, y) => x - y); return arr[arr.length >> 1]; };
  return { r: med(ch[0]), g: med(ch[1]), b: med(ch[2]), a: 255 };
}

/** Fixed sleeve print zones (canvas fractions) + colour probes (photo fractions). */
const SLEEVE_AREAS = Object.fromEntries(
  SLEEVE_VIEW_IDS.map((id) => [id, { area: sleeveZoneCanvas(id), probe: sleeveProbeImage(id) }])
);

export default function Shirt3DStudio({ designData, onSave, onSnapshot, saving = false }) {
  const [tshirtColor, setTshirtColorRaw] = useState('#FFFFFF');
  const [palette, setPalette] = useState(() => loadStoredPalette() || defaultPalette());
  const [picker, setPicker] = useState(null); // null | { mode: 'new' | 'edit', index }
  const [bodyMockups, setBodyMockups] = useState(() => ({
    front: getMockupUrl('#FFFFFF', 'front'),
    back: getMockupUrl('#FFFFFF', 'back'),
  }));
  const [sleeveMockups, setSleeveMockups] = useState({ left: null, right: null });
  const sleeveAreas = SLEEVE_AREAS;
  const [tinting, setTinting] = useState(false);
  const [view, setView] = useState('front');
  const [activeTool, setActiveTool] = useState(null);
  const [selected, setSelected] = useState(null);
  const [selectionCount, setSelectionCount] = useState(0);
  const [prints, setPrints] = useState({});
  const [autoRotate, setAutoRotate] = useState(false);
  const [viewerReady, setViewerReady] = useState(false);
  const [match, setMatch] = useState(null);
  const [busy, setBusy] = useState(false);
  const [layersVersion, setLayersVersion] = useState(0);
  const [hoverRect, setHoverRect] = useState(null);
  const [showBgRemover, setShowBgRemover] = useState(false);
  const [snapOn, setSnapOn] = useState(() => {
    try { return window.localStorage.getItem('truking.snap') !== 'off'; } catch { return true; }
  });
  const [editAngle, setEditAngle] = useState(0);
  const [angleSnapped, setAngleSnapped] = useState(false);
  const [editLocked, setEditLocked] = useState(false);
  const snapRef = useRef(true);
  const areaForRef = useRef(() => PRINT_AREA);
  const guidesRef = useRef({}); // view id → { x: HTMLElement, y: HTMLElement }

  // Tool inputs
  const [textValue, setTextValue] = useState('YOUR TEXT');
  const [textFont, setTextFont] = useState('Bebas Neue');
  const [textSize, setTextSize] = useState(36);
  const [textFill, setTextFill] = useState('#111111');
  const [shapeFill, setShapeFill] = useState('#0a0a0a');
  const [clipCategory, setClipCategory] = useState(CLIPART_CATEGORIES[0]?.name || 'Popular');

  // Selected-object editor mirrors
  const [editText, setEditText] = useState('');
  const [editFont, setEditFont] = useState('Arial');
  const [editSize, setEditSize] = useState(24);
  const [editFill, setEditFill] = useState('#000000');
  const [editOpacity, setEditOpacity] = useState(100);

  const frontRef = useRef(null);
  const backRef = useRef(null);
  const leftRef = useRef(null);
  const rightRef = useRef(null);
  const refs = useMemo(() => ({ front: frontRef, back: backRef, left: leftRef, right: rightRef }), []);
  const viewerRef = useRef(null);
  const fileInputRef = useRef(null);
  const pendingObjectsRef = useRef({}); // objects for canvases that have not mounted yet
  const activeRef = refs[view];

  const info = viewInfo(view);
  const isSleeveView = info.kind === 'sleeve';

  const setTshirtColor = useCallback((hex) => {
    const c = canonicalColor(hex);
    if (c) setTshirtColorRaw(c);
  }, []);

  const fabricColor = useFabricColor(tshirtColor, view === 'back' ? 'back' : 'front');
  const isCustomColor = !presetKeyFor(tshirtColor);

  useEffect(() => {
    snapRef.current = snapOn;
    try { window.localStorage.setItem('truking.snap', snapOn ? 'on' : 'off'); } catch { /* ignore */ }
  }, [snapOn]);

  /** The print zone (canvas fractions) for a view. Sleeves come from the 3D projection. */
  const areaFor = useCallback((id) => (
    viewInfo(id).kind === 'sleeve' ? sleeveAreas?.[id]?.area || null : PRINT_AREA
  ), [sleeveAreas]);
  useEffect(() => { areaForRef.current = areaFor; }, [areaFor]);

  const mockupUrl = isSleeveView ? sleeveMockups[view] : bodyMockups[view];

  /* ---------- palette persistence ---------- */
  useEffect(() => {
    try {
      window.localStorage.setItem(PALETTE_KEY, JSON.stringify(palette));
    } catch { /* storage unavailable */ }
  }, [palette]);

  /* ---------- body mockups (photo or tinted) ----------
   * Debounced so dragging the wheel recolours the 3D tee instantly while the
   * 2D photo re-tints once the pointer settles.
   */
  useEffect(() => {
    let alive = true;
    const custom = !presetKeyFor(tshirtColor);
    const timer = setTimeout(() => {
      if (custom) setTinting(true);
      Promise.all([buildMockupUrl(tshirtColor, 'front'), buildMockupUrl(tshirtColor, 'back')])
        .then(([front, back]) => { if (alive) setBodyMockups({ front, back }); })
        .catch(() => {})
        .finally(() => { if (alive) setTinting(false); });
    }, custom ? 120 : 0);
    return () => { alive = false; clearTimeout(timer); };
  }, [tshirtColor]);

  /* ---------- sleeve mockups: the side photo re-shaded to the fabric colour ---------- */
  useEffect(() => {
    let alive = true;
    const timer = setTimeout(() => {
      setTinting(true);
      Promise.all([buildSleeveMockupUrl(fabricColor, 'left'), buildSleeveMockupUrl(fabricColor, 'right')])
        .then(([left, right]) => { if (alive) setSleeveMockups({ left, right }); })
        .catch(() => {})
        .finally(() => { if (alive) setTinting(false); });
    }, 120);
    return () => { alive = false; clearTimeout(timer); };
  }, [fabricColor]);

  /* ---------- palette editing ---------- */
  const openPicker = (mode, index = -1) => {
    if (mode === 'edit' && palette[index]) setTshirtColor(palette[index].hex);
    setPicker({ mode, index });
  };
  const addSwatch = () => {
    setPalette((p) => (p.some((e) => e.hex === tshirtColor) ? p : [...p, { hex: tshirtColor, preset: null }]));
    setPicker(null);
  };
  const updateSwatch = () => {
    setPalette((p) => p.map((e, i) => (i === picker?.index ? { ...e, hex: tshirtColor } : e)));
    setPicker(null);
  };
  const restoreSwatch = () => {
    const entry = palette[picker?.index];
    if (!entry?.preset) return;
    setPalette((p) => p.map((e, i) => (i === picker.index ? { ...e, hex: e.preset } : e)));
    setTshirtColor(entry.preset);
    setPicker(null);
  };
  const removeSwatch = () => {
    setPalette((p) => (p.length > 1 ? p.filter((_, i) => i !== picker?.index) : p));
    setPicker(null);
  };
  const resetPalette = () => {
    setPalette(defaultPalette());
    setPicker(null);
  };
  const selectedIndex = palette.findIndex((e) => e.hex === tshirtColor);

  /* ---------- load a saved design ---------- */
  useEffect(() => {
    if (!designData) return undefined;
    let data;
    try {
      data = typeof designData === 'string' ? JSON.parse(designData) : designData;
    } catch {
      return undefined;
    }
    const t = setTimeout(() => {
      const savedPalette = normalizePalette(data?.palette);
      if (savedPalette) setPalette(savedPalette);
      if (data?.tshirtColor) setTshirtColor(data.tshirtColor);
      for (const id of VIEW_IDS) {
        const objects = data?.objects?.[id] || data?.[`${id}Objects`];
        if (!objects?.length) continue;
        if (refs[id].current) refs[id].current.loadObjects(objects);
        else pendingObjectsRef.current[id] = objects; // sleeve canvases mount later
      }
    }, 300);
    return () => clearTimeout(t);
  }, [designData, setTshirtColor, refs]);

  const handleCanvasReady = useCallback((canvas, id) => {
    // Hover outline so it is obvious what a click will grab.
    canvas.hoverCursor = 'move';
    canvas.on('mouse:over', (e) => {
      const t = e.target;
      if (!t || t === canvas.getActiveObject() || t.selectable === false) { setHoverRect(null); return; }
      const r = t.getBoundingRect();
      setHoverRect({ view: id, left: r.left, top: r.top, width: r.width, height: r.height });
    });
    canvas.on('mouse:out', () => setHoverRect(null));
    canvas.on('mouse:down', () => setHoverRect(null));
    // Magnetic guides: the zone's edges/centre lines and other elements;
    // rotation locks to the 45° family and 15° steps.
    attachSnapping(canvas, {
      getArea: () => areaForRef.current(id),
      isEnabled: () => snapRef.current,
      onAngle: (r) => {
        if (r) setEditAngle(Math.round(r.angle));
        setAngleSnapped(!!r?.snapped);
      },
      onGuides: (g) => {
        const el = guidesRef.current[id];
        if (!el) return;
        if (el.x) { el.x.style.display = g?.x != null ? 'block' : 'none'; if (g?.x != null) el.x.style.left = `${g.x}px`; }
        if (el.y) { el.y.style.display = g?.y != null ? 'block' : 'none'; if (g?.y != null) el.y.style.top = `${g.y}px`; }
      },
    });

    const pending = pendingObjectsRef.current[id];
    if (!pending) return;
    delete pendingObjectsRef.current[id];
    setTimeout(() => refs[id].current?.loadObjects(pending), 0);
  }, [refs]);

  const bumpLayers = useCallback(() => setLayersVersion((v) => v + 1), []);

  /* ---------- 2D → 3D print sync ---------- */
  const syncPrint = useCallback((id) => {
    const canvas = refs[id]?.current?.getCanvas();
    const area = areaFor(id);
    if (!canvas || !area) return;
    const url = renderPrintTexture(canvas, area);
    setPrints((p) => (p[id] === url ? p : { ...p, [id]: url }));
  }, [refs, areaFor]);

  const handleDesignChange = useCallback((id) => {
    // FabricCanvas already debounces; a short extra delay lets images decode.
    setTimeout(() => syncPrint(id), 60);
    bumpLayers();
  }, [syncPrint, bumpLayers]);

  const pokeModified = useCallback((canvas, obj) => {
    canvas.renderAll();
    canvas.fire('object:modified', { target: obj });
  }, []);

  /* ---------- selection ---------- */
  const handleObjectSelect = useCallback((obj) => {
    setSelected(obj);
    setSelectionCount(obj?._selectionCount || (obj ? 1 : 0));
    setHoverRect(null);
    setShowBgRemover(false);
    setLayersVersion((v) => v + 1);
    setEditAngle(Math.round(obj?.angle || 0));
    setEditLocked(isLocked(obj));
    if (obj) {
      const isText = obj.type === 'textbox' || obj.type === 'text';
      if (isText) {
        setEditText(obj.text || '');
        setEditFont(obj.fontFamily || 'Arial');
        setEditSize(obj.fontSize || 24);
      }
      if (typeof obj.fill === 'string' && obj.fill.startsWith('#')) setEditFill(obj.fill);
      setEditOpacity(Math.round((obj.opacity ?? 1) * 100));
    }
  }, []);

  const isTextSelected = !!selected && (selected.type === 'textbox' || selected.type === 'text');
  const isImageSelected = !!selected && selected.type === 'image';

  /* ---------- add objects ---------- */
  const addToCanvas = useCallback((obj) => {
    const canvas = activeRef.current?.getCanvas();
    const area = areaFor(view);
    if (!canvas || !area) return;
    const rect = getPrintRectPx(canvas.width, canvas.height, area);
    // Fit new objects inside the zone (sleeve zones are small).
    const maxW = rect.width * 0.9;
    const maxH = rect.height * 0.9;
    const w = obj.getScaledWidth?.() || obj.width || 0;
    const h = obj.getScaledHeight?.() || obj.height || 0;
    if (w > maxW || h > maxH) {
      const k = Math.min(maxW / (w || 1), maxH / (h || 1));
      obj.scale((obj.scaleX || 1) * k);
    }
    obj.set({
      originX: 'center',
      originY: 'center',
      left: rect.left + rect.width / 2,
      top: rect.top + rect.height / 2,
    });
    canvas.add(obj);
    canvas.setActiveObject(obj);
    canvas.renderAll();
  }, [activeRef, areaFor, view]);

  const handleAddText = () => {
    const area = areaFor(view) || PRINT_AREA;
    const text = new fabric.Textbox(textValue || 'YOUR TEXT', {
      ...DEFAULT_TEXT_CONFIG,
      fontFamily: textFont,
      fontSize: Number(textSize) || 36,
      fill: textFill,
      width: Math.round(CANVAS_CONFIG.width * area.w * 0.9),
      textAlign: 'center',
      editable: false,
    });
    addToCanvas(text);
  };

  const handleAddImage = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      addToCanvas(await loadFabricImageFromFile(fabric, file));
    } catch (error) {
      console.warn(error);
    }
  };

  const handleAddShape = (def) => {
    const obj = def.create(fabric);
    obj.set({ fill: shapeFill, label: def.label });
    addToCanvas(obj);
  };

  const handleAddClipart = async (item) => {
    if (item.shapeId) {
      const shape = SHAPE_DEFS.find((definition) => definition.id === item.shapeId);
      if (shape) handleAddShape(shape);
      return;
    }

    if (item.src) {
      try {
        addToCanvas(await loadFabricAssetImage(fabric, item.src));
      } catch (error) {
        console.warn(error);
      }
      return;
    }

    const path = new fabric.Path(item.path, {
      fill: item.fill || '#000',
      stroke: item.stroke || '',
      strokeWidth: item.strokeWidth || 0,
      scaleX: 1.2,
      scaleY: 1.2,
      strokeLineJoin: 'round',
      strokeLineCap: 'round',
      label: item.label,
    });
    addToCanvas(path);
  };

  /* ---------- edit / delete ---------- */
  const applyToSelected = (props) => {
    const canvas = activeRef.current?.getCanvas();
    const obj = canvas?.getActiveObject();
    if (!canvas || !obj) return;
    if (obj.type === 'activeselection' || obj.type === 'activeSelection') {
      obj.getObjects().forEach((o) => o.set(props));
    } else {
      obj.set(props);
      if (props.text !== undefined && obj.initDimensions) obj.initDimensions();
    }
    pokeModified(canvas, obj);
  };

  const handleDelete = () => {
    const canvas = activeRef.current?.getCanvas();
    if (!canvas) return;
    const objs = canvas.getActiveObjects().filter((o) => !isLocked(o));
    if (!objs.length) return;
    canvas.discardActiveObject();
    canvas.remove(...objs);
    canvas.renderAll();
    setSelected(null);
    setSelectionCount(0);
  };

  const handleClear = () => {
    const canvas = activeRef.current?.getCanvas();
    if (!canvas) return;
    if (canvas.getObjects().length && !window.confirm(`Clear everything on the ${info.label.toLowerCase()}?`)) return;
    activeRef.current.clearCanvas();
    setSelected(null);
    setSelectionCount(0);
    syncPrint(view);
  };

  const handleViewChange = (next) => {
    if (next === view) return;
    const canvas = activeRef.current?.getCanvas();
    if (canvas) { canvas.discardActiveObject(); canvas.renderAll(); }
    setSelected(null);
    setSelectionCount(0);
    setAutoRotate(false);
    setView(next);
  };

  /* ---------- selection helpers ---------- */
  const getActiveCanvas = useCallback(() => activeRef.current?.getCanvas() || null, [activeRef]);

  const selectFromLayers = useCallback((obj, additive) => {
    const canvas = getActiveCanvas();
    if (!canvas || obj.selectable === false) return;
    const current = canvas.getActiveObjects();
    if (additive && current.length) {
      const set = new Set(current);
      if (set.has(obj)) set.delete(obj); else set.add(obj);
      const list = [...set];
      canvas.discardActiveObject();
      if (list.length === 1) canvas.setActiveObject(list[0]);
      else if (list.length > 1) canvas.setActiveObject(new fabric.ActiveSelection(list, { canvas }));
    } else {
      canvas.setActiveObject(obj);
    }
    canvas.requestRenderAll();
  }, [getActiveCanvas]);

  const handleSelectAll = useCallback(() => {
    const canvas = getActiveCanvas();
    if (canvas) selectAll(canvas);
  }, [getActiveCanvas]);

  // Keyboard: Delete/Backspace, arrows (Shift = 10px), ⌘/Ctrl+D duplicate,
  // ⌘/Ctrl+A select all, ⌘/Ctrl+]/[ reorder, Esc deselect.
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target?.isContentEditable) return;
      const canvas = getActiveCanvas();
      if (!canvas) return;
      const meta = e.metaKey || e.ctrlKey;
      const active = canvas.getActiveObject();
      if ((e.key === 'Delete' || e.key === 'Backspace') && active) {
        e.preventDefault();
        const objs = canvas.getActiveObjects().filter((o) => !isLocked(o));
        if (!objs.length) return;
        canvas.discardActiveObject();
        canvas.remove(...objs);
        canvas.requestRenderAll();
        setSelected(null);
        setSelectionCount(0);
        return;
      }
      if (e.key === 'Escape' && active) { canvas.discardActiveObject(); canvas.requestRenderAll(); return; }
      if (meta && e.key.toLowerCase() === 'a') { e.preventDefault(); selectAll(canvas); return; }
      if (meta && e.key.toLowerCase() === 'd' && active) { e.preventDefault(); duplicateActive(canvas).then(bumpLayers); return; }
      if (meta && e.key.toLowerCase() === 'l' && active) { e.preventDefault(); const next = !isLocked(active); setLocked(active, next); setEditLocked(next); canvas.requestRenderAll(); bumpLayers(); return; }
      if (meta && e.key === ']' && active) { e.preventDefault(); canvas.bringObjectForward(active); canvas.requestRenderAll(); bumpLayers(); return; }
      if (meta && e.key === '[' && active) { e.preventDefault(); canvas.sendObjectBackwards(active); canvas.requestRenderAll(); bumpLayers(); return; }
      const step = e.shiftKey ? 10 : 1;
      if (active && e.key === 'ArrowUp') { e.preventDefault(); nudgeActive(canvas, 0, -step); }
      if (active && e.key === 'ArrowDown') { e.preventDefault(); nudgeActive(canvas, 0, step); }
      if (active && e.key === 'ArrowLeft') { e.preventDefault(); nudgeActive(canvas, -step, 0); }
      if (active && e.key === 'ArrowRight') { e.preventDefault(); nudgeActive(canvas, step, 0); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [getActiveCanvas, bumpLayers]);

  /* ---------- colour-match readout ----------
   * Compares the centre of the print zone in both views:
   *   • fabric  – nothing drawn there: mockup sample vs rendered tee
   *   • artwork – something drawn there: the 2D design pixel (composited
   *               over the mockup fabric) vs the rendered print
   */
  const runMatchCheck = useCallback(async () => {
    const viewer = viewerRef.current;
    const canvas = activeRef.current?.getCanvas();
    const area = areaFor(view);
    if (!viewer?.isReady() || !mockupUrl || !canvas || !area) return;

    const probe2d = isSleeveView ? sleeveAreas?.[view]?.probe : PROBES.center;
    let fabric2d = null;
    try {
      fabric2d = probe2d ? await sampleMockupAt(mockupUrl, probe2d, 0.012) : null;
    } catch { /* keep null */ }
    if (!fabric2d) return;

    const art = sampleDesignCanvas(canvas, area);
    const kind = art && art.a > 4 ? 'artwork' : 'fabric';
    const a = kind === 'artwork' ? art.a / 255 : 0;
    const hex2d = rgbToHex({
      r: art ? art.r * a + fabric2d.r * (1 - a) : fabric2d.r,
      g: art ? art.g * a + fabric2d.g * (1 - a) : fabric2d.g,
      b: art ? art.b * a + fabric2d.b * (1 - a) : fabric2d.b,
    });
    const probe3d = viewer.readProbe(view, 'center');
    const delta = probe3d?.hex ? colorDelta(hex2d, probe3d.hex) : null;
    setMatch({ kind, twoD: hex2d, threeD: probe3d?.hex || null, delta });
  }, [mockupUrl, view, activeRef, areaFor, isSleeveView, sleeveAreas]);

  useEffect(() => {
    if (!viewerReady) return undefined;
    const t = setTimeout(runMatchCheck, 900);
    return () => clearTimeout(t);
  }, [runMatchCheck, viewerReady, fabricColor, prints]);

  // Dev-only handle so the match can be verified from the browser console.
  useEffect(() => {
    if (!import.meta.env.DEV) return undefined;
    window.__shirtStudio = { viewer: viewerRef, refs, getPrints: () => prints, getSleeveAreas: () => sleeveAreas };
    return () => { delete window.__shirtStudio; };
  }, [prints, refs, sleeveAreas]);

  /* ---------- save / export ---------- */
  const getDesignState = useCallback(() => {
    const objects = {};
    for (const id of VIEW_IDS) objects[id] = refs[id].current?.getObjects() || [];
    return {
      editorType: '3d',
      studio: STUDIO_ID,
      version: STUDIO_VERSION,
      shirtStyle: 'unisex',
      tshirtColor,
      fabricColor,
      customColor: !presetKeyFor(tshirtColor),
      palette,
      printArea: PRINT_AREA,
      sleeveAreas,
      objects,
      prints,
      // Legacy keys so older previews can still open this design.
      frontObjects: objects.front,
      backObjects: objects.back,
      frontPrint: prints.front || null,
      backPrint: prints.back || null,
      frontTexture: frontRef.current?.getTextureDataURL() || null,
      backTexture: backRef.current?.getTextureDataURL() || null,
    };
  }, [tshirtColor, fabricColor, prints, palette, sleeveAreas, refs]);

  const handleSave = () => {
    const dataURL = frontRef.current?.getSnapshotDataURL();
    if (!dataURL || !onSave) return;
    onSave(dataURLToBlob(dataURL), getDesignState());
  };

  const handleSnapshot2D = () => {
    setBusy(true);
    try {
      const dataURL = activeRef.current?.getSnapshotDataURL();
      if (dataURL && onSnapshot) onSnapshot(dataURLToBlob(dataURL), getDesignState());
    } finally {
      setBusy(false);
    }
  };

  const handleSnapshot3D = () => {
    setBusy(true);
    try {
      const dataURL = viewerRef.current?.snapshot('#ffffff');
      if (dataURL && onSnapshot) onSnapshot(dataURLToBlob(dataURL), getDesignState());
    } finally {
      setBusy(false);
    }
  };

  const handleDownload = () => {
    const dataURL = viewerRef.current?.snapshot('#ffffff');
    if (!dataURL) return;
    const a = document.createElement('a');
    a.href = dataURL;
    a.download = `truking-3d-${view}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const clipItems = useMemo(
    () => CLIPART_CATEGORIES.find((c) => c.name === clipCategory)?.items || [],
    [clipCategory]
  );

  /* ---------- editor actions: duplicate / lock / layer order / rotate ---------- */
  const withActive = (fn) => {
    const canvas = getActiveCanvas();
    const obj = canvas?.getActiveObject();
    if (!canvas || !obj) return;
    fn(canvas, obj);
    canvas.requestRenderAll();
    bumpLayers();
  };
  const handleDuplicate = () => { const c = getActiveCanvas(); if (c) duplicateActive(c).then(bumpLayers); };
  const handleToggleLock = () => withActive((_, obj) => { const next = !isLocked(obj); setLocked(obj, next); setEditLocked(next); });
  const handleForward = () => withActive((c, obj) => c.bringObjectForward(obj));
  const handleBackward = () => withActive((c, obj) => c.sendObjectBackwards(obj));
  const handleRotate = (angle) => { const c = getActiveCanvas(); if (c) { rotateActive(c, angle); setEditAngle(Math.round(((angle % 360) + 360) % 360)); } };

  /* ---------- render ---------- */
  const matchOk = match?.delta && match.delta.max <= 6;
  const toolsDisabled = isSleeveView && !sleeveMockups[view];
  const currentColorName = SHIRT_COLOR_NAMES[presetKeyFor(tshirtColor)] || 'Custom';

  const renderCanvas = (id) => {
    const v = viewInfo(id);
    const isSleeve = v.kind === 'sleeve';
    const area = areaFor(id);
    if (isSleeve && (!area || !sleeveMockups[id])) {
      return (
        <div className="tk-studio-fabric-slot" key={id} style={{ display: view === id ? 'flex' : 'none', width: CANVAS_CONFIG.width, height: CANVAS_CONFIG.height, alignItems: 'center', justifyContent: 'center', color: '#888', fontSize: 13 }}>
          Preparing the {v.label.toLowerCase()} mockup…
        </div>
      );
    }
    return (
      <div className="tk-studio-fabric-slot" key={id} style={{ display: view === id ? 'block' : 'none' }}>
        <FabricCanvas
          ref={refs[id]}
          svgPath={id === 'back' ? TSHIRT_BACK_PATH : TSHIRT_FRONT_PATH}
          tshirtColor={tshirtColor}
          view={id}
          mockupUrl={isSleeve ? sleeveMockups[id] : bodyMockups[id]}
          printArea={area}
          preColored
          onCanvasReady={handleCanvasReady}
          onObjectSelect={view === id ? handleObjectSelect : undefined}
          onDesignChange={handleDesignChange}
        />
      </div>
    );
  };

  return (
    <div className="tk-studio" style={s.root}>
      {/* Command bar */}
      <div className="tk-studio-command-bar">
        <div className="tk-studio-command-row tk-studio-command-row-primary">
          <section className="tk-studio-control-group" aria-label="Design area">
            <div className="tk-studio-control-heading">
              <span className="tk-studio-control-kicker">Design area</span>
              <span className="tk-studio-control-value">{info.label}</span>
            </div>
            <div className="tk-studio-view-tabs">
              {VIEWS.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => handleViewChange(v.id)}
                  className={`tk-studio-view-tab${view === v.id ? ' is-active' : ''}`}
                  aria-pressed={view === v.id}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </section>

          <section className="tk-studio-control-group tk-studio-colour-group" aria-label="Shirt color">
            <div className="tk-studio-control-heading">
              <span className="tk-studio-control-kicker">Shirt color</span>
              <span className="tk-studio-control-value">{currentColorName}</span>
            </div>
            <div className="tk-studio-swatches">
              <Palette size={16} aria-hidden="true" />
              {palette.map((entry, i) => {
                const display = swatchDisplayColor(entry);
                const on = entry.hex === tshirtColor;
                const label = entry.hex === entry.preset
                  ? `${SHIRT_COLOR_NAMES[entry.preset] || entry.preset} · studio photo (${display})`
                  : `${entry.hex} · custom (tinted)${entry.preset ? `, was ${SHIRT_COLOR_NAMES[entry.preset] || entry.preset}` : ''}`;
                return (
                  <button
                    key={`${i}-${entry.hex}`}
                    type="button"
                    onClick={() => setTshirtColor(entry.hex)}
                    onDoubleClick={() => openPicker('edit', i)}
                    title={`${label} — double-click to edit`}
                    aria-label={label}
                    aria-pressed={on}
                    className={`tk-studio-swatch${on ? ' is-active' : ''}`}
                    style={{ backgroundColor: display }}
                  >
                    {on && <Check size={13} strokeWidth={3} color={isLight(display) ? '#111' : '#fff'} />}
                  </button>
                );
              })}
              {selectedIndex >= 0 && (
                <button type="button" onClick={() => openPicker('edit', selectedIndex)} title="Edit selected color" aria-label="Edit selected color" className="tk-studio-icon-action">
                  <Pencil size={15} />
                </button>
              )}
              <button
                type="button"
                onClick={() => (picker?.mode === 'new' ? setPicker(null) : openPicker('new'))}
                title="Create a custom shirt color"
                className={`tk-studio-compact-action${picker?.mode === 'new' || (isCustomColor && selectedIndex < 0) ? ' is-active' : ''}`}
                aria-pressed={picker?.mode === 'new' || (isCustomColor && selectedIndex < 0)}
              >
                <Pipette size={15} /> <span>Custom</span>
              </button>
            </div>
          </section>
        </div>

        <div className="tk-studio-command-row tk-studio-command-row-tools">
          <div className="tk-studio-add-tools" aria-label="Add to design">
            <span className="tk-studio-control-kicker">Add to design</span>
            {TOOLS.map((tool) => {
              const ToolIcon = tool.Icon;
              return (
                <button
                  key={tool.id}
                  type="button"
                  disabled={toolsDisabled}
                  onClick={() => setActiveTool(activeTool === tool.id ? null : tool.id)}
                  className={`tk-studio-tool-action${activeTool === tool.id ? ' is-active' : ''}`}
                  aria-pressed={activeTool === tool.id}
                >
                  <ToolIcon size={16} /> <span>{tool.label}</span>
                </button>
              );
            })}
          </div>
          <div className="tk-studio-utility-tools" aria-label="Canvas tools">
            <button type="button" onClick={() => setSnapOn((v) => !v)} title={snapOn ? 'Snapping on: elements lock to guides and rotation to 15° steps' : 'Snapping off'} className={`tk-studio-utility-action${snapOn ? ' is-active' : ''}`} aria-pressed={snapOn}>
              <Magnet size={15} /> <span>Snap</span><span className="tk-studio-on-dot" aria-hidden="true" />
            </button>
            <button type="button" onClick={handleSelectAll} title="Select all on this view (⌘A)" className="tk-studio-utility-action">
              <BoxSelect size={15} /> <span>Select all</span>
            </button>
            <button type="button" onClick={handleDelete} disabled={!selected} title="Delete selected (⌫)" className="tk-studio-utility-action tk-studio-danger-action">
              <Trash2 size={15} /> <span>Delete</span>
            </button>
            <button type="button" onClick={handleClear} title="Clear this view" className="tk-studio-utility-action">
              <XCircle size={15} /> <span>Clear view</span>
            </button>
          </div>
        </div>
      </div>

      {/* Colour picker popover */}
      {picker && (
        <div className="tk-studio-colour-popover" style={s.popover}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <strong style={{ fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {picker.mode === 'edit' ? 'Edit swatch' : 'Custom colour'}
            </strong>
            <span style={{ ...s.matchDot, background: tshirtColor, width: 16, height: 16 }} />
            <code style={{ fontSize: 12 }}>{tshirtColor}</code>
            <button type="button" onClick={() => setPicker(null)} style={{ ...s.iconBtn, marginLeft: 'auto' }} title="Close"><X size={14} /></button>
          </div>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <ColorWheel value={tshirtColor} onChange={setTshirtColor} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 180, flex: 1 }}>
              <p style={{ ...s.hint, margin: 0, display: 'block' }}>
                {isCustomColor
                  ? 'Custom colour: the white tee photo is re-shaded so the chest is exactly this hex, and the 3D tee is painted with it.'
                  : 'This hex has a studio photo, so both views use the photo.'}
              </p>
              {picker.mode === 'new' ? (
                <button type="button" className="btn btn-primary btn-sm" onClick={addSwatch}><Plus size={14} /> Add to palette</button>
              ) : (
                <>
                  <button type="button" className="btn btn-primary btn-sm" onClick={updateSwatch}><Check size={14} /> Update swatch</button>
                  {palette[picker.index]?.preset && palette[picker.index].hex !== palette[picker.index].preset && (
                    <button type="button" className="btn btn-secondary btn-sm" onClick={restoreSwatch}><RotateCcw size={14} /> Restore photo colour</button>
                  )}
                  <button type="button" className="btn btn-secondary btn-sm" onClick={removeSwatch} disabled={palette.length <= 1} style={{ color: '#b91c1c' }}><Trash2 size={14} /> Remove swatch</button>
                </>
              )}
              <button type="button" onClick={resetPalette} style={{ ...s.chip, alignSelf: 'flex-start' }}>Reset palette to studio photos</button>
            </div>
          </div>
        </div>
      )}

      {/* Tool drawer */}
      {activeTool && !toolsDisabled && (
        <div style={s.drawer} className={`tk-studio-tool-drawer${activeTool === 'clipart' ? ' tk-studio-assets-panel' : ''}`}>
          {activeTool === 'text' && (
            <div className="tk-studio-tool-form" style={s.row}>
              <input value={textValue} onChange={(e) => setTextValue(e.target.value)} placeholder="Text" style={{ ...s.input, flex: 2, minWidth: 160 }} />
              <select value={textFont} onChange={(e) => setTextFont(e.target.value)} style={{ ...s.input, fontFamily: textFont, minWidth: 150 }}>
                {FONT_OPTIONS.map((f) => <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>{f.label}</option>)}
              </select>
              <input type="number" min={8} max={160} value={textSize} onChange={(e) => setTextSize(e.target.value)} style={{ ...s.input, width: 70 }} />
              <input type="color" value={textFill} onChange={(e) => setTextFill(e.target.value)} style={s.color} title="Text colour" />
              <button type="button" className="btn btn-primary btn-sm" onClick={handleAddText}><Type size={14} /> Add Text</button>
            </div>
          )}
          {activeTool === 'image' && (
            <div className="tk-studio-tool-form tk-studio-upload-form" style={s.row}>
              <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={handleAddImage} style={{ display: 'none' }} />
              <button type="button" className="btn btn-primary btn-sm" onClick={() => fileInputRef.current?.click()}><ImagePlus size={14} /> Upload Image</button>
              <span style={s.hint}>PNG with transparency prints cleanest. The image keeps its exact pixels on the 3D tee.</span>
            </div>
          )}
          {activeTool === 'clipart' && (
            <div className="tk-studio-assets-shell">
              <header className="tk-studio-assets-header">
                <div className="tk-studio-assets-title-wrap">
                  <span className="tk-studio-assets-icon"><Sticker size={17} /></span>
                  <div>
                    <strong className="tk-studio-assets-title">Asset library</strong>
                    <span className="tk-studio-assets-subtitle">Choose a design to add to the {info.label.toLowerCase()}</span>
                  </div>
                </div>
                <span className="tk-studio-assets-count">{clipItems.length} in {clipCategory}</span>
              </header>
              <div className="tk-studio-category-tabs" role="tablist" aria-label="Asset categories">
                {CLIPART_CATEGORIES.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    role="tab"
                    aria-selected={clipCategory === c.name}
                    onClick={() => setClipCategory(c.name)}
                    className={`tk-studio-category-tab${clipCategory === c.name ? ' is-active' : ''}`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
              {clipCategory === 'Shapes' && (
                <div className="tk-studio-shape-options">
                  <label className="tk-studio-shape-color-label">
                    <span>Shape color</span>
                    <input type="color" value={shapeFill} onChange={(event) => setShapeFill(event.target.value)} style={s.color} />
                  </label>
                  <span>Shapes remain editable after adding.</span>
                </div>
              )}
              <div className="tk-studio-asset-grid">
                {clipItems.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    title={`Add ${item.label}`}
                    aria-label={`Add ${item.label} to ${info.label}`}
                    onClick={() => handleAddClipart(item)}
                    className="tk-studio-asset-card"
                    style={{ backgroundColor: item.previewBackground || '#fbfaf7' }}
                  >
                    <span className="tk-studio-asset-add-icon" aria-hidden="true"><Plus size={13} /></span>
                    {item.shapeId ? (
                      <>
                        <span className="tk-studio-shape-preview" style={{ color: shapeFill }}>{item.icon}</span>
                        <span className="tk-studio-asset-label" style={{ color: '#555' }}>{item.label}</span>
                      </>
                    ) : item.src ? (
                      <>
                        <span className="tk-studio-asset-image-wrap">
                          <img src={item.thumbnail || item.src} alt="" className="tk-studio-asset-thumb" />
                        </span>
                        <span className="tk-studio-asset-label" style={{ color: item.previewBackground ? '#f4f1ea' : '#3f3c35' }}>
                          {item.label}
                        </span>
                      </>
                    ) : (
                      <svg viewBox={item.viewBox} width="28" height="28">
                        <path d={item.path} fill={item.fill || '#000'} stroke={item.stroke || 'none'} strokeWidth={item.strokeWidth || 0} strokeLinejoin="round" strokeLinecap="round" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Selected object editor */}
      {selected && (
        <div className="tk-studio-selection-panel">
          <header className="tk-studio-selection-header">
            <div className="tk-studio-selection-identity">
              <span className="tk-studio-selection-icon">
                {selectionCount > 1 ? <BoxSelect size={17} /> : isTextSelected ? <Type size={17} /> : isImageSelected ? <ImagePlus size={17} /> : <Sticker size={17} />}
              </span>
              <span>
                <strong>{selectionCount > 1 ? `${selectionCount} objects selected` : `${isTextSelected ? 'Text' : isImageSelected ? 'Image' : 'Shape'} selected`}</strong>
                <small>Drag on the shirt or use the precise controls below</small>
              </span>
            </div>
            <div className="tk-studio-selection-actions">
              <button type="button" onClick={handleDuplicate} title="Duplicate (⌘D)" className="tk-studio-inspector-button"><Copy size={14} /> Duplicate</button>
              <button type="button" onClick={handleToggleLock} title={editLocked ? 'Unlock (⌘L)' : 'Lock in place (⌘L)'} className={`tk-studio-inspector-button${editLocked ? ' is-active' : ''}`} aria-pressed={editLocked}>
                {editLocked ? <Lock size={14} /> : <Unlock size={14} />} {editLocked ? 'Locked' : 'Lock'}
              </button>
              <span className="tk-studio-layer-actions" aria-label="Layer order">
                <button type="button" onClick={handleForward} title="Bring forward (⌘])" className="tk-studio-inspector-button"><ChevronUp size={14} /> Forward</button>
                <button type="button" onClick={handleBackward} title="Send backward (⌘[)" className="tk-studio-inspector-button"><ChevronDown size={14} /> Backward</button>
              </span>
              <button type="button" onClick={handleDelete} className="tk-studio-inspector-button tk-studio-inspector-delete" title="Delete selected"><Trash2 size={15} /> Delete</button>
            </div>
          </header>

          {isTextSelected && selectionCount === 1 && (
            <section className="tk-studio-inspector-section tk-studio-text-controls" aria-label="Text settings">
              <span className="tk-studio-inspector-label">Text</span>
              <input aria-label="Text content" value={editText} onChange={(e) => { setEditText(e.target.value); applyToSelected({ text: e.target.value }); }} style={{ ...s.input, flex: 2, minWidth: 140 }} />
              <select aria-label="Font" value={editFont} onChange={(e) => { setEditFont(e.target.value); applyToSelected({ fontFamily: e.target.value }); }} style={{ ...s.input, fontFamily: editFont, minWidth: 140 }}>
                {FONT_OPTIONS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
              <label className="tk-studio-number-field"><span>Size</span><input type="number" min={8} max={160} value={editSize} onChange={(e) => { setEditSize(e.target.value); applyToSelected({ fontSize: Number(e.target.value) || 24 }); }} /></label>
            </section>
          )}

          <div className="tk-studio-inspector-grid">
            <section className="tk-studio-inspector-section">
              <span className="tk-studio-inspector-label">Appearance</span>
              {!isImageSelected && (
                <label className="tk-studio-color-field">
                  <span>Fill</span>
                  <input type="color" value={editFill} onChange={(e) => { setEditFill(e.target.value); applyToSelected({ fill: e.target.value }); }} />
                </label>
              )}
              <label className="tk-studio-range-field">
                <span>Opacity</span>
                <input type="range" min={5} max={100} value={editOpacity} onChange={(e) => { setEditOpacity(e.target.value); applyToSelected({ opacity: Number(e.target.value) / 100 }); }} />
                <output>{editOpacity}%</output>
              </label>
            </section>

            <section className="tk-studio-inspector-section">
              <span className="tk-studio-inspector-label"><RotateIcon size={13} /> Rotation</span>
              <label className={`tk-studio-number-field${angleSnapped ? ' is-snapped' : ''}`}>
                <input type="number" min={-360} max={360} step={1} value={editAngle} disabled={editLocked} onChange={(e) => { const v = Number(e.target.value) || 0; setEditAngle(v); handleRotate(v); }} title={angleSnapped ? 'Locked to a snap angle' : 'Rotation in degrees'} />
                <span>°</span>
              </label>
              <button type="button" onClick={() => handleRotate(0)} disabled={editLocked} title="Straighten (0°)" className="tk-studio-inspector-button">Reset</button>
              <button type="button" onClick={() => handleRotate(editAngle - 90)} disabled={editLocked} title="Rotate −90°" className="tk-studio-inspector-button">−90°</button>
              <button type="button" onClick={() => handleRotate(editAngle + 90)} disabled={editLocked} title="Rotate +90°" className="tk-studio-inspector-button">+90°</button>
            </section>

            {isImageSelected && selectionCount === 1 && (
              <section className="tk-studio-inspector-section tk-studio-background-section">
                <span className="tk-studio-inspector-label">Image cleanup</span>
                <button type="button" onClick={() => setShowBgRemover((v) => !v)} className={`tk-studio-inspector-button${showBgRemover ? ' is-active' : ''}`} title="Clear a flat backdrop around the photo" aria-pressed={showBgRemover}>
                  <Eraser size={14} /> Remove background
                </button>
              </section>
            )}
          </div>
          {isImageSelected && selectionCount === 1 && showBgRemover && (
            <BackgroundRemoverPanel getCanvas={getActiveCanvas} onChanged={() => { syncPrint(view); bumpLayers(); }} onClose={() => setShowBgRemover(false)} />
          )}
          <PlacementPanel getCanvas={getActiveCanvas} area={areaFor(view)} viewKind={info.kind} viewId={view} dark={false} />
        </div>
      )}

      {/* Canvases */}
      <div className="tk-studio-stage" style={s.stage}>
        <div className="tk-studio-pane" style={s.pane}>
          <div className="tk-studio-pane-head" style={s.paneHead}>
            <Layers size={13} /> 2D · {info.label}{' '}
            {isSleeveView ? '· rendered from the 3D tee' : isCustomColor ? '· tinted mockup' : '· studio photo'}
            {tinting && <span style={{ marginLeft: 'auto', fontWeight: 500, textTransform: 'none', letterSpacing: 0, color: '#888' }}>tinting…</span>}
          </div>
          <div className="tk-studio-canvas-wrap tk-studio-canvas-wrap-2d" style={s.canvasWrap}>
            {VIEW_IDS.map(renderCanvas)}
            <div ref={(el) => { guidesRef.current[view] = { ...(guidesRef.current[view] || {}), x: el }; }} style={s.guideX} />
            <div ref={(el) => { guidesRef.current[view] = { ...(guidesRef.current[view] || {}), y: el }; }} style={s.guideY} />
            {hoverRect && hoverRect.view === view && (
              <div style={{ position: 'absolute', left: hoverRect.left - 3, top: hoverRect.top - 3, width: hoverRect.width + 6, height: hoverRect.height + 6, border: '1.5px dashed rgba(10,10,10,0.65)', borderRadius: 4, pointerEvents: 'none', zIndex: 3 }} />
            )}
          </div>
          <LayersPanel getCanvas={getActiveCanvas} version={layersVersion} onChanged={() => { syncPrint(view); bumpLayers(); }} onSelect={selectFromLayers} />
        </div>

        <div className="tk-studio-pane" style={s.pane}>
          <div className="tk-studio-pane-head" style={s.paneHead}>
            <Box size={13} /> 3D · live
            <button type="button" onClick={() => setAutoRotate((v) => !v)} style={{ ...s.chip, marginLeft: 'auto', ...(autoRotate ? s.chipOn : {}) }}>
              <RotateCw size={12} /> {autoRotate ? 'Rotating' : 'Rotate'}
            </button>
          </div>
          <div className="tk-studio-canvas-wrap tk-studio-canvas-wrap-3d" style={{ ...s.canvasWrap, width: CANVAS_CONFIG.width, height: CANVAS_CONFIG.height }}>
            <ShirtViewer
              ref={viewerRef}
              fabricColor={fabricColor}
              prints={prints}
              view={view}
              autoRotate={autoRotate}
              height={CANVAS_CONFIG.height}
              background="#ffffff"
              style={{ height: '100%' }}
              onReady={() => setViewerReady(true)}
            />
            {!viewerReady && <div style={s.loading}><div className="spinner" /></div>}
          </div>
          <div className="tk-studio-match-bar" style={s.matchBar} data-testid="match-bar">
            {match?.twoD && match?.threeD ? (
              <>
                <span style={{ ...s.matchDot, background: match.twoD }} />
                <span>2D {match.twoD}</span>
                <span style={{ ...s.matchDot, background: match.threeD }} />
                <span>3D {match.threeD}</span>
                <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4, color: matchOk ? '#15803d' : '#b45309' }}>
                  {matchOk ? <Check size={12} /> : <AlertTriangle size={12} />}
                  Δ {match.delta.max}/255 · {match.kind}
                </span>
              </>
            ) : (
              <span style={{ color: '#888' }}>Colour match: {viewerReady ? 'measuring…' : 'loading 3D…'}</span>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="tk-studio-export-actions" style={s.actions}>
        <button type="button" className="btn btn-primary btn-sm tk-studio-save-action" onClick={handleSave} disabled={saving || !onSave}>
          <Save size={14} /> {saving ? 'Saving…' : 'Save Design'}
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={handleSnapshot2D} disabled={busy || !onSnapshot}>
          <Camera size={14} /> Capture 2D
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={handleSnapshot3D} disabled={busy || !onSnapshot || !viewerReady}>
          <Camera size={14} /> Capture 3D
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={handleDownload} disabled={!viewerReady}>
          <Download size={14} /> Download 3D PNG
        </button>
      </div>
    </div>
  );
}

const s = {
  root: { display: 'flex', flexDirection: 'column', gap: 10, fontFamily: 'inherit' },
  toolbar: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, padding: '8px 10px', background: '#f4f1ea', border: '1px solid #e2ddd1', borderRadius: 8 },
  segment: { display: 'inline-flex', border: '1px solid #0a0a0a', borderRadius: 6, overflow: 'hidden' },
  segBtn: { padding: '5px 12px', fontSize: 12, fontWeight: 600, background: '#fff', color: '#0a0a0a', border: 'none', cursor: 'pointer', letterSpacing: '0.04em', whiteSpace: 'nowrap' },
  segBtnOn: { background: '#0a0a0a', color: '#fff' },
  swatches: { display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' },
  swatch: { width: 20, height: 20, borderRadius: '50%', border: 'none', cursor: 'pointer', outlineOffset: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0 },
  tools: { display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto', flexWrap: 'wrap' },
  toolBtn: { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 9px', fontSize: 12, borderRadius: 6, border: '1px solid transparent', background: 'transparent', color: '#444', cursor: 'pointer' },
  toolBtnOn: { background: '#0a0a0a', color: '#fff' },
  iconBtn: { display: 'inline-flex', alignItems: 'center', padding: 6, borderRadius: 6, border: '1px solid transparent', background: 'transparent', cursor: 'pointer', color: '#444' },
  drawer: { padding: 10, background: '#fff', border: '1px solid #e5e5e5', borderRadius: 8 },
  row: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  input: { padding: '6px 8px', fontSize: 13, border: '1px solid #d4d4d4', borderRadius: 6, background: '#fff', color: '#111' },
  color: { width: 32, height: 28, padding: 0, border: '1px solid #d4d4d4', borderRadius: 6, background: '#fff', cursor: 'pointer' },
  hint: { fontSize: 12, color: '#666', display: 'inline-flex', alignItems: 'center', gap: 6 },
  grid: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  gridBtn: { width: 44, height: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e5e5e5', borderRadius: 8, background: '#fafafa', cursor: 'pointer' },
  assetGridBtn: { width: 88, height: 84, flexDirection: 'column', gap: 3, padding: '5px 4px' },
  assetThumb: { width: 56, height: 56, objectFit: 'contain', display: 'block' },
  shapeAssetIcon: { height: 56, display: 'flex', alignItems: 'center', fontSize: 34, lineHeight: 1 },
  assetLabel: { maxWidth: 78, fontSize: 9, lineHeight: 1.05, textAlign: 'center' },
  chip: { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', fontSize: 11, fontWeight: 600, borderRadius: 999, border: '1px solid #d4d4d4', background: '#fff', color: '#333', cursor: 'pointer' },
  chipOn: { background: '#0a0a0a', color: '#fff', border: '1px solid #0a0a0a' },
  stage: { display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' },
  pane: { display: 'flex', flexDirection: 'column', gap: 6 },
  paneHead: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#555', width: CANVAS_CONFIG.width },
  canvasWrap: { position: 'relative', border: '1px solid #e5e5e5', borderRadius: 10, overflow: 'hidden', background: '#fff' },
  loading: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.7)' },
  matchBar: { display: 'flex', alignItems: 'center', gap: 6, width: CANVAS_CONFIG.width, padding: '6px 10px', fontSize: 12, fontVariantNumeric: 'tabular-nums', background: '#fafafa', border: '1px solid #eee', borderRadius: 8, color: '#333' },
  matchDot: { width: 14, height: 14, borderRadius: 4, border: '1px solid rgba(0,0,0,0.15)', display: 'inline-block' },
  actions: { display: 'flex', flexWrap: 'wrap', gap: 8, paddingTop: 4 },
  editGroup: { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 6px', borderRadius: 8, background: '#1a1a1a', border: '1px solid #2e2e2e' },
  editBtn: { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px', fontSize: 11, fontWeight: 600, borderRadius: 6, border: '1px solid transparent', background: 'transparent', color: '#f4f1ea', cursor: 'pointer' },
  editBtnOn: { background: '#f4f1ea', color: '#0a0a0a' },
  guideX: { display: 'none', position: 'absolute', top: 0, bottom: 0, width: 0, borderLeft: '1px dashed #ff2d8a', pointerEvents: 'none', zIndex: 4 },
  guideY: { display: 'none', position: 'absolute', left: 0, right: 0, height: 0, borderTop: '1px dashed #ff2d8a', pointerEvents: 'none', zIndex: 4 },
  popover: { padding: 12, background: '#fff', border: '1px solid #e2ddd1', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' },
};
