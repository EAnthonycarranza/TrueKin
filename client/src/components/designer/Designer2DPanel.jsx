/**
 * Designer2DPanel – All-2D admin T-shirt designer with full editing tools.
 *
 * Features:
 *   - Text style presets (one-click styled text like Canva)
 *   - 35+ Google Fonts organized by category
 *   - Text effects: bold, italic, underline, shadow, outline/stroke, letter spacing
 *   - Curved/arc text generator
 *   - Shape library (15+ shapes)
 *   - Clip art gallery (8 categories, 40+ items)
 *   - Layer controls (bring forward, send back, duplicate, flip, opacity)
 *   - Color picker for shapes and text
 *   - Front/back editing with live preview
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import * as fabric from 'fabric';
import {
  Camera, Save, ImagePlus, Type, Palette, Trash2, XCircle,
  Download, Eye, ChevronDown, ChevronUp,
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
  Layers, CopyPlus, FlipHorizontal2, FlipVertical2,
  ArrowUpToLine, ArrowDownToLine, Sparkles, CircleDot,
  Sticker,
} from 'lucide-react';
import FabricCanvas from './FabricCanvas';
import { dataURLToBlob, loadFabricAssetImage, loadFabricImageFromFile } from './designerHelpers';
import { getMockupUrl } from './designerMockups';
import {
  CANVAS_CONFIG, TSHIRT_FRONT_PATH, TSHIRT_BACK_PATH, TSHIRT_COLORS,
  DEFAULT_TEXT_CONFIG, FONT_OPTIONS, FONT_CATEGORIES,
  SHAPE_DEFS, CLIPART_CATEGORIES,
} from './designerConstants';

/* ═══════════════════════════════════════════════════════════════
   TEXT STYLE PRESETS — One-click styled text (like Canva)
   ═══════════════════════════════════════════════════════════════ */
const TEXT_STYLE_PRESETS = [
  {
    label: 'BOLD IMPACT',
    text: 'BOLD',
    font: 'Impact',
    size: 48,
    fill: '#FFFFFF',
    stroke: '#000000',
    strokeWidth: 3,
    shadow: null,
  },
  {
    label: 'Neon Glow',
    text: 'NEON',
    font: 'Bungee',
    size: 42,
    fill: '#00f5ff',
    stroke: '',
    strokeWidth: 0,
    shadow: '0 0 15px rgba(0,245,255,0.8)',
  },
  {
    label: 'Retro Vibes',
    text: 'RETRO',
    font: 'Lobster',
    size: 44,
    fill: '#f97316',
    stroke: '#7c2d12',
    strokeWidth: 2,
    shadow: '3px 3px 0px #7c2d12',
  },
  {
    label: 'Street Style',
    text: 'STREET',
    font: 'Anton',
    size: 46,
    fill: '#000000',
    stroke: '',
    strokeWidth: 0,
    shadow: null,
  },
  {
    label: 'Elegant Script',
    text: 'Elegant',
    font: 'Great Vibes',
    size: 44,
    fill: '#d4a574',
    stroke: '',
    strokeWidth: 0,
    shadow: '1px 1px 3px rgba(0,0,0,0.3)',
  },
  {
    label: 'Tattoo Shop',
    text: 'TATTOO',
    font: 'Black Ops One',
    size: 38,
    fill: '#1f2937',
    stroke: '',
    strokeWidth: 0,
    shadow: '2px 2px 0px #9ca3af',
  },
  {
    label: 'Groovy',
    text: 'GROOVY',
    font: 'Righteous',
    size: 42,
    fill: '#ec4899',
    stroke: '#9333ea',
    strokeWidth: 1.5,
    shadow: '2px 3px 0px #9333ea',
  },
  {
    label: 'Spring Mood',
    text: 'Spring',
    font: 'Pacifico',
    size: 44,
    fill: '#22c55e',
    stroke: '',
    strokeWidth: 0,
    shadow: '1px 2px 4px rgba(0,0,0,0.2)',
  },
  {
    label: 'Power',
    text: 'POWER',
    font: 'Bebas Neue',
    size: 52,
    fill: '#dc2626',
    stroke: '#000000',
    strokeWidth: 2,
    shadow: '3px 3px 0px #000000',
  },
  {
    label: 'Pixel Art',
    text: 'PIXEL',
    font: 'Press Start 2P',
    size: 22,
    fill: '#8b5cf6',
    stroke: '',
    strokeWidth: 0,
    shadow: '2px 2px 0px #4c1d95',
  },
  {
    label: 'Varsity',
    text: 'VARSITY',
    font: 'Oswald',
    size: 44,
    fill: '#1e3a8a',
    stroke: '#fbbf24',
    strokeWidth: 2,
    shadow: null,
  },
  {
    label: 'Magic ✨',
    text: 'Magic',
    font: 'Dancing Script',
    size: 46,
    fill: '#a855f7',
    stroke: '',
    strokeWidth: 0,
    shadow: '0 0 10px rgba(168,85,247,0.5)',
  },
  {
    label: 'Golden Hour',
    text: 'GOLDEN',
    font: 'Alfa Slab One',
    size: 40,
    fill: '#f59e0b',
    stroke: '#92400e',
    strokeWidth: 1.5,
    shadow: '2px 2px 0px #451a03',
  },
  {
    label: 'Creepy',
    text: 'CREEPY',
    font: 'Creepster',
    size: 44,
    fill: '#dc2626',
    stroke: '#000000',
    strokeWidth: 1,
    shadow: '3px 3px 6px rgba(0,0,0,0.6)',
  },
  {
    label: 'Marker',
    text: 'FRESH',
    font: 'Permanent Marker',
    size: 42,
    fill: '#000000',
    stroke: '',
    strokeWidth: 0,
    shadow: null,
  },
  {
    label: 'Feelin\' Cute',
    text: 'Cute',
    font: 'Satisfy',
    size: 48,
    fill: '#ec4899',
    stroke: '#fff',
    strokeWidth: 1,
    shadow: '1px 2px 4px rgba(236,72,153,0.4)',
  },
  {
    label: 'Outline',
    text: 'OUTLINE',
    font: 'Concert One',
    size: 44,
    fill: 'transparent',
    stroke: '#3b82f6',
    strokeWidth: 2.5,
    shadow: null,
  },
  {
    label: 'Lucky',
    text: 'LUCKY',
    font: 'Luckiest Guy',
    size: 42,
    fill: '#16a34a',
    stroke: '#fff',
    strokeWidth: 2,
    shadow: '2px 3px 0px #14532d',
  },
];

/* ═══════════════════════════════════════════════════════════════
   CURVED TEXT RENDERER
   ═══════════════════════════════════════════════════════════════ */
function renderCurvedText({ text, font, fontSize, fill, curve, strokeColor, strokeWidth: sw }) {
  if (!text || curve === 0) return null;

  // Negate so positive slider = rainbow/smile arch (text bows upward),
  // negative slider = frown/bowl arch (text bows downward).
  const adjustedCurve = -curve;

  // --- Step 1: Measure text on a temporary canvas to get totalWidth ---
  const measureCanvas = document.createElement('canvas');
  measureCanvas.width = 1;
  measureCanvas.height = 1;
  const measureCtx = measureCanvas.getContext('2d');
  measureCtx.font = `${fontSize}px "${font}"`;
  const totalWidth = measureCtx.measureText(text).width;

  const curveRad = (adjustedCurve * Math.PI) / 180;
  const radius = Math.abs(totalWidth / curveRad);

  // --- Step 2: Calculate canvas size based on arc geometry ---
  // The arc spans: center ± radius horizontally, center ± radius vertically
  // Plus font size padding for character height. Use generous sizing.
  const arcSpan = 2 * radius + fontSize * 2;
  const size = Math.max(Math.ceil(arcSpan), Math.ceil(totalWidth + fontSize * 2), 200);
  // Cap at a reasonable max to avoid huge canvases
  const cappedSize = Math.min(size, 2000);

  const c = document.createElement('canvas');
  c.width = cappedSize;
  c.height = cappedSize;
  const ctx = c.getContext('2d');

  ctx.font = `${fontSize}px "${font}"`;
  ctx.textBaseline = 'middle';

  const centerX = cappedSize / 2;

  // Arc placement — characters must always read left-to-right:
  // Smile (adjustedCurve > 0): center BELOW text, chars along TOP arc at -π/2
  //   → left side starts at larger negative angle, advance clockwise (+)
  // Frown (adjustedCurve < 0): center ABOVE text, chars along BOTTOM arc at π/2
  //   → left side starts at larger positive angle, advance counter-clockwise (-)
  const isSmile = adjustedCurve > 0;
  const centerY = isSmile
    ? cappedSize / 2 + radius * 0.3
    : cappedSize / 2 - radius * 0.3;

  const absCurveRad = Math.abs(curveRad);
  const centerAngle = isSmile ? -Math.PI / 2 : Math.PI / 2;

  let startAngle, angleDir;
  if (isSmile) {
    // Top arc: left = centerAngle - half, advance positive (clockwise)
    startAngle = centerAngle - absCurveRad / 2;
    angleDir = 1;
  } else {
    // Bottom arc: left = centerAngle + half, advance negative (counter-clockwise)
    startAngle = centerAngle + absCurveRad / 2;
    angleDir = -1;
  }

  // Measure each character width
  const chars = text.split('');
  const charWidths = chars.map((ch) => ctx.measureText(ch).width);
  const totalCharWidth = charWidths.reduce((a, b) => a + b, 0);

  let currentAngle = startAngle;

  for (let i = 0; i < chars.length; i++) {
    // Each character subtends an arc proportional to its width
    const charAngle = (charWidths[i] / totalCharWidth) * absCurveRad;
    const midAngle = currentAngle + (angleDir * charAngle) / 2;

    const x = centerX + radius * Math.cos(midAngle);
    const y = centerY + radius * Math.sin(midAngle);

    ctx.save();
    ctx.translate(x, y);
    // Rotate so characters face outward from arc center
    ctx.rotate(midAngle + (isSmile ? Math.PI / 2 : -Math.PI / 2));

    if (sw && strokeColor) {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = sw;
      ctx.lineJoin = 'round';
      ctx.strokeText(chars[i], 0, 0);
    }
    ctx.fillStyle = fill || '#000';
    ctx.fillText(chars[i], 0, 0);
    ctx.restore();

    currentAngle += angleDir * charAngle;
  }

  // Trim canvas to content
  const imageData = ctx.getImageData(0, 0, c.width, c.height);
  let top = c.height, bottom = 0, left = c.width, right = 0;
  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++) {
      if (imageData.data[(y * c.width + x) * 4 + 3] > 0) {
        if (y < top) top = y;
        if (y > bottom) bottom = y;
        if (x < left) left = x;
        if (x > right) right = x;
      }
    }
  }

  // If nothing was drawn, return null
  if (bottom <= top || right <= left) return null;

  const pad = 8;
  top = Math.max(0, top - pad);
  left = Math.max(0, left - pad);
  bottom = Math.min(c.height, bottom + pad);
  right = Math.min(c.width, right + pad);

  const trimmed = document.createElement('canvas');
  trimmed.width = right - left;
  trimmed.height = bottom - top;
  trimmed.getContext('2d').drawImage(c, left, top, trimmed.width, trimmed.height, 0, 0, trimmed.width, trimmed.height);

  return trimmed.toDataURL('image/png');
}

/* ═══════════════════════════════════════════════════════════════
   TOOL TABS
   ═══════════════════════════════════════════════════════════════ */
const TOOL_TABS = [
  { id: 'text', label: 'Text', Icon: Type },
  { id: 'clipart', label: 'Assets', Icon: Sticker },
  { id: 'image', label: 'Image', Icon: ImagePlus },
  { id: 'effects', label: 'Effects', Icon: Sparkles },
];

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function Designer2DPanel({ designData, onSave, onSnapshot, saving = false }) {
  // --- Core state ---
  const [tshirtColor, setTshirtColor] = useState('#FFFFFF');
  const [selectedView, setSelectedView] = useState('front');
  const [selectedObject, setSelectedObject] = useState(null);
  const [capturing2D, setCapturing2D] = useState(false);
  const [activeToolTab, setActiveToolTab] = useState(null);

  // --- Text editing ---
  const [editText, setEditText] = useState('');
  const [editFont, setEditFont] = useState('Arial');
  const [editFontSize, setEditFontSize] = useState(24);
  const [editColor, setEditColor] = useState('#000000');
  const [editBold, setEditBold] = useState(false);
  const [editItalic, setEditItalic] = useState(false);
  const [editUnderline, setEditUnderline] = useState(false);
  const [editAlign, setEditAlign] = useState('center');
  const [editCharSpacing, setEditCharSpacing] = useState(0);
  const [editStroke, setEditStroke] = useState('');
  const [editStrokeWidth, setEditStrokeWidth] = useState(0);
  const [editShadowEnabled, setEditShadowEnabled] = useState(false);
  const [editShadowColor, setEditShadowColor] = useState('#000000');
  const [editShadowBlur, setEditShadowBlur] = useState(4);
  const [editShadowOffsetX, setEditShadowOffsetX] = useState(2);
  const [editShadowOffsetY, setEditShadowOffsetY] = useState(2);

  // --- Shape editing ---
  const [shapeFill, setShapeFill] = useState('#0a0a0a');
  const [shapeStroke, setShapeStroke] = useState('');
  const [shapeStrokeWidth, setShapeStrokeWidth] = useState(0);
  const [objectOpacity, setObjectOpacity] = useState(100);

  // --- Curved text ---
  const [curveText, setCurveText] = useState('CURVED TEXT');
  const [curveFont, setCurveFont] = useState('Bebas Neue');
  const [curveFontSize, setCurveFontSize] = useState(32);
  const [curveColor, setCurveColor] = useState('#000000');
  const [curveAmount, setCurveAmount] = useState(120);
  const [curveStroke, setCurveStroke] = useState('');
  const [curveStrokeWidth, setCurveStrokeWidth] = useState(0);

  // --- Clip art filter ---
  const [clipCategory, setClipCategory] = useState(CLIPART_CATEGORIES[0]?.name || 'Studio Picks');
  const [fontFilter, setFontFilter] = useState('all');

  // --- 2D preview thumbnails ---
  const [frontPreviewURL, setFrontPreviewURL] = useState(null);
  const [backPreviewURL, setBackPreviewURL] = useState(null);

  // --- Refs ---
  const frontCanvasRef = useRef(null);
  const backCanvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // --- Load saved design ---
  useEffect(() => {
    if (!designData) return;
    try {
      const data = typeof designData === 'string' ? JSON.parse(designData) : designData;
      if (data.tshirtColor) setTshirtColor(data.tshirtColor);
      // Ignore legacy data.shirtStyle — Truekin is unisex-only.
      setTimeout(() => {
        if (data.frontObjects && frontCanvasRef.current) frontCanvasRef.current.loadObjects(data.frontObjects);
        if (data.backObjects && backCanvasRef.current) backCanvasRef.current.loadObjects(data.backObjects);
      }, 300);
    } catch { /* invalid data */ }
  }, [designData]);

  // --- Preview updates ---
  const updatePreview = useCallback((view) => {
    const ref = view === 'front' ? frontCanvasRef : backCanvasRef;
    const setter = view === 'front' ? setFrontPreviewURL : setBackPreviewURL;
    if (ref.current) {
      const dataURL = ref.current.getSnapshotDataURL();
      if (dataURL) setter(dataURL);
    }
  }, []);

  const handleDesignChange = useCallback((view) => {
    setTimeout(() => updatePreview(view), 150);
  }, [updatePreview]);

  useEffect(() => {
    // Delay enough for the mockup image to decode before we snapshot it
    const timer = setTimeout(() => { updatePreview('front'); updatePreview('back'); }, 600);
    return () => clearTimeout(timer);
  }, [tshirtColor, updatePreview]);

  // --- Track selection count for group selections ---
  const [selectionCount, setSelectionCount] = useState(0);

  // --- Curve editing for existing text ---
  const [editCurveAmount, setEditCurveAmount] = useState(0);

  // --- Object selection ---
  const handleObjectSelect = useCallback((obj) => {
    setSelectedObject(obj);
    // Track how many objects are in the selection (for group/multi-select)
    const count = obj?._selectionCount || (obj ? 1 : 0);
    setSelectionCount(count);
    if (obj && (obj.type === 'textbox' || obj.type === 'text')) {
      setEditText(obj.text || '');
      setEditFont(obj.fontFamily || 'Arial');
      setEditFontSize(obj.fontSize || 24);
      setEditColor(obj.fill || '#000000');
      setEditBold(obj.fontWeight === 'bold');
      setEditItalic(obj.fontStyle === 'italic');
      setEditUnderline(!!obj.underline);
      setEditAlign(obj.textAlign || 'center');
      setEditCharSpacing(obj.charSpacing || 0);
      setEditStroke(obj.stroke || '');
      setEditStrokeWidth(obj.strokeWidth || 0);
      setObjectOpacity(Math.round((obj.opacity || 1) * 100));
      setEditCurveAmount(0); // Reset curve for flat text objects
      if (obj.shadow) {
        setEditShadowEnabled(true);
        setEditShadowColor(obj.shadow.color || '#000000');
        setEditShadowBlur(obj.shadow.blur || 4);
        setEditShadowOffsetX(obj.shadow.offsetX || 2);
        setEditShadowOffsetY(obj.shadow.offsetY || 2);
      } else {
        setEditShadowEnabled(false);
      }
    } else if (obj && obj._curveData) {
      // Curved text image — load its stored text properties for editing
      const cd = obj._curveData;
      setEditText(cd.text || '');
      setEditFont(cd.font || 'Arial');
      setEditFontSize(cd.fontSize || 32);
      setEditColor(cd.fill || '#000000');
      setEditCurveAmount(cd.curve || 0);
      setEditStroke(cd.strokeColor || '');
      setEditStrokeWidth(cd.strokeWidth || 0);
      setEditBold(false);
      setEditItalic(false);
      setEditUnderline(false);
      setEditAlign('center');
      setEditCharSpacing(0);
      setObjectOpacity(Math.round((obj.opacity || 1) * 100));
      setEditShadowEnabled(false);
    } else if (obj) {
      setShapeFill(obj.fill || '#3b82f6');
      setShapeStroke(obj.stroke || '');
      setShapeStrokeWidth(obj.strokeWidth || 0);
      setObjectOpacity(Math.round((obj.opacity || 1) * 100));
    }
  }, []);

  const activeCanvasRef = selectedView === 'front' ? frontCanvasRef : backCanvasRef;

  // ─── ACTIONS ───────────────────────────────────────────────

  const addToCanvas = (obj) => {
    const canvas = activeCanvasRef.current?.getCanvas();
    if (!canvas) return;
    canvas.add(obj);
    canvas.setActiveObject(obj);
    canvas.renderAll();
    setTimeout(() => handleDesignChange(selectedView), 200);
  };

  const handleAddImage = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const img = await loadFabricImageFromFile(fabric, file);
      const maxW = CANVAS_CONFIG.width * 0.5;
      const maxH = CANVAS_CONFIG.height * 0.5;
      if (img.width > maxW || img.height > maxH) {
        img.scale(Math.min(maxW / img.width, maxH / img.height));
      }
      const canvas = activeCanvasRef.current?.getCanvas();
      if (!canvas) return;
      img.set({
        left: (canvas.width - img.getScaledWidth()) / 2,
        top: (canvas.height - img.getScaledHeight()) / 2,
      });
      addToCanvas(img);
    } catch (error) {
      console.warn(error);
    }
  };

  const handleAddText = (preset) => {
    const canvas = activeCanvasRef.current?.getCanvas();
    if (!canvas) return;
    const config = preset
      ? {
          text: preset.text,
          fontFamily: preset.font,
          fontSize: preset.size,
          fill: preset.fill || '#000',
          stroke: preset.stroke || '',
          strokeWidth: preset.strokeWidth || 0,
          shadow: preset.shadow || null,
          fontWeight: 'normal',
          fontStyle: 'normal',
        }
      : {
          text: 'Your Text',
          fontFamily: 'Arial',
          fontSize: 28,
          fill: '#000000',
          stroke: '',
          strokeWidth: 0,
          fontWeight: 'normal',
          fontStyle: 'normal',
        };

    const text = new fabric.Textbox(config.text, {
      ...DEFAULT_TEXT_CONFIG,
      ...config,
      left: canvas.width / 2,
      top: canvas.height / 2,
      width: 200,
      editable: false,
    });
    addToCanvas(text);
  };

  const handleAddShape = (shapeDef) => {
    const canvas = activeCanvasRef.current?.getCanvas();
    if (!canvas) return;
    const obj = shapeDef.create(fabric);
    obj.set({
      fill: shapeFill,
      originX: 'center',
      originY: 'center',
      left: canvas.width / 2,
      top: canvas.height / 2,
    });
    addToCanvas(obj);
  };

  const handleAddClipart = async (item) => {
    const canvas = activeCanvasRef.current?.getCanvas();
    if (!canvas) return;

    if (item.shapeId) {
      const shape = SHAPE_DEFS.find((definition) => definition.id === item.shapeId);
      if (shape) handleAddShape(shape);
      return;
    }

    if (item.src) {
      try {
        const image = await loadFabricAssetImage(fabric, item.src);
        const maxW = CANVAS_CONFIG.width * 0.58;
        const maxH = CANVAS_CONFIG.height * 0.58;
        if (image.width > maxW || image.height > maxH) {
          image.scale(Math.min(maxW / image.width, maxH / image.height));
        }
        image.set({
          left: (canvas.width - image.getScaledWidth()) / 2,
          top: (canvas.height - image.getScaledHeight()) / 2,
        });
        addToCanvas(image);
      } catch (error) {
        console.warn(error);
      }
      return;
    }

    const path = new fabric.Path(item.path, {
      fill: item.fill || '#000',
      stroke: item.stroke || '',
      strokeWidth: item.strokeWidth || 0,
      left: 170,
      top: 190,
      scaleX: 1.2,
      scaleY: 1.2,
      strokeLineJoin: 'round',
      strokeLineCap: 'round',
    });
    addToCanvas(path);
  };

  const handleAddCurvedText = () => {
    if (!curveText.trim()) return;
    const curveData = {
      text: curveText, font: curveFont, fontSize: curveFontSize,
      fill: curveColor, curve: curveAmount,
      strokeColor: curveStroke, strokeWidth: curveStrokeWidth,
    };
    const dataURL = renderCurvedText(curveData);
    if (!dataURL) return;
    const imgEl = new Image();
    imgEl.src = dataURL;
    imgEl.onload = () => {
      const canvas = activeCanvasRef.current?.getCanvas();
      if (!canvas) return;
      const img = new fabric.Image(imgEl);
      const maxW = CANVAS_CONFIG.width * 0.6;
      if (img.width > maxW) img.scale(maxW / img.width);
      img.set({
        left: (canvas.width - img.getScaledWidth()) / 2,
        top: (canvas.height - img.getScaledHeight()) / 2,
      });
      // Store curve data so we can re-edit this curved text later
      img._curveData = curveData;
      addToCanvas(img);
    };
  };

  /**
   * Apply curve to an existing text object (converts Textbox → curved image),
   * or re-render an existing curved text image with updated properties.
   */
  const handleApplyCurveToSelected = (newCurve) => {
    const canvas = activeCanvasRef.current?.getCanvas();
    if (!canvas || !selectedObject) return;

    let curveData;
    if (selectedObject._curveData) {
      // Re-render existing curved text with new curve value
      curveData = { ...selectedObject._curveData, curve: newCurve };
    } else if (selectedObject.type === 'textbox' || selectedObject.type === 'text') {
      // Convert flat text to curved image
      curveData = {
        text: selectedObject.text || editText,
        font: selectedObject.fontFamily || editFont,
        fontSize: selectedObject.fontSize || editFontSize,
        fill: selectedObject.fill || editColor,
        curve: newCurve,
        strokeColor: selectedObject.stroke || '',
        strokeWidth: selectedObject.strokeWidth || 0,
      };
    } else {
      return;
    }

    if (newCurve === 0) return; // No curve to apply

    const dataURL = renderCurvedText(curveData);
    if (!dataURL) return;

    const oldObj = selectedObject;
    const oldLeft = oldObj.left;
    const oldTop = oldObj.top;

    const imgEl = new Image();
    imgEl.src = dataURL;
    imgEl.onload = () => {
      const img = new fabric.Image(imgEl);
      const maxW = CANVAS_CONFIG.width * 0.6;
      if (img.width > maxW) img.scale(maxW / img.width);
      img.set({ left: oldLeft, top: oldTop, opacity: oldObj.opacity });
      img._curveData = curveData;

      canvas.remove(oldObj);
      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.renderAll();
      setSelectedObject(img);
      setEditCurveAmount(newCurve);
      handleDesignChange(selectedView);
    };
  };

  /**
   * Update a property on a curved text image and re-render it.
   */
  const handleCurvedTextPropUpdate = (prop, value) => {
    const canvas = activeCanvasRef.current?.getCanvas();
    if (!canvas || !selectedObject || !selectedObject._curveData) return;

    const updatedData = { ...selectedObject._curveData, [prop]: value };
    const dataURL = renderCurvedText(updatedData);
    if (!dataURL) return;

    const oldObj = selectedObject;
    const oldLeft = oldObj.left;
    const oldTop = oldObj.top;

    const imgEl = new Image();
    imgEl.src = dataURL;
    imgEl.onload = () => {
      const img = new fabric.Image(imgEl);
      const maxW = CANVAS_CONFIG.width * 0.6;
      if (img.width > maxW) img.scale(maxW / img.width);
      img.set({ left: oldLeft, top: oldTop, opacity: oldObj.opacity });
      img._curveData = updatedData;

      canvas.remove(oldObj);
      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.renderAll();
      setSelectedObject(img);
      handleDesignChange(selectedView);
    };
  };

  // --- Text property updates ---
  const handleTextUpdate = (prop, value) => {
    const canvas = activeCanvasRef.current?.getCanvas();
    if (!canvas || !selectedObject) return;
    if (prop === 'shadow') {
      selectedObject.set('shadow', value ? new fabric.Shadow(value) : null);
    } else {
      selectedObject.set(prop, value);
    }
    canvas.renderAll();
    handleDesignChange(selectedView);
  };

  const handleShapeUpdate = (prop, value) => {
    const canvas = activeCanvasRef.current?.getCanvas();
    if (!canvas || !selectedObject) return;
    selectedObject.set(prop, value);
    canvas.renderAll();
    handleDesignChange(selectedView);
  };

  // --- Layer controls ---
  const handleBringForward = () => {
    const canvas = activeCanvasRef.current?.getCanvas();
    if (!canvas || !selectedObject) return;
    canvas.bringObjectForward(selectedObject);
    canvas.renderAll();
    handleDesignChange(selectedView);
  };

  const handleSendBackward = () => {
    const canvas = activeCanvasRef.current?.getCanvas();
    if (!canvas || !selectedObject) return;
    canvas.sendObjectBackwards(selectedObject);
    canvas.renderAll();
    handleDesignChange(selectedView);
  };

  const handleDuplicate = () => {
    const canvas = activeCanvasRef.current?.getCanvas();
    if (!canvas || !selectedObject) return;
    selectedObject.clone().then((cloned) => {
      cloned.set({ left: (selectedObject.left || 0) + 15, top: (selectedObject.top || 0) + 15 });
      canvas.add(cloned);
      canvas.setActiveObject(cloned);
      canvas.renderAll();
      handleDesignChange(selectedView);
    });
  };

  const handleFlipH = () => {
    if (!selectedObject) return;
    selectedObject.set('flipX', !selectedObject.flipX);
    activeCanvasRef.current?.getCanvas()?.renderAll();
    handleDesignChange(selectedView);
  };

  const handleFlipV = () => {
    if (!selectedObject) return;
    selectedObject.set('flipY', !selectedObject.flipY);
    activeCanvasRef.current?.getCanvas()?.renderAll();
    handleDesignChange(selectedView);
  };

  const handleDeleteSelected = () => {
    const canvas = activeCanvasRef.current?.getCanvas();
    if (!canvas) return;
    // Handle multi-select (ActiveSelection) — remove all objects in group
    const activeObjs = canvas.getActiveObjects();
    if (activeObjs && activeObjs.length > 0) {
      activeObjs.forEach((obj) => canvas.remove(obj));
      canvas.discardActiveObject();
      canvas.renderAll();
      setSelectedObject(null);
      setSelectionCount(0);
      handleDesignChange(selectedView);
    } else if (selectedObject) {
      canvas.remove(selectedObject);
      canvas.discardActiveObject();
      canvas.renderAll();
      setSelectedObject(null);
      setSelectionCount(0);
      handleDesignChange(selectedView);
    }
  };

  // --- Keyboard shortcut: Delete/Backspace to delete selected objects ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't delete if user is typing in an input/textarea/select
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleDeleteSelected();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }); // Intentionally no deps — always uses latest handleDeleteSelected

  const handleClearAll = () => {
    const canvas = activeCanvasRef.current?.getCanvas();
    if (!canvas) return;
    canvas.clear();
    canvas.renderAll();
    handleDesignChange(selectedView);
  };

  // --- View toggle ---
  const handleViewChange = (view) => {
    if (view !== selectedView) {
      const canvas = activeCanvasRef.current?.getCanvas();
      if (canvas) { canvas.discardActiveObject(); canvas.renderAll(); }
      setSelectedObject(null);
      setSelectedView(view);
    }
  };

  // --- Save/Export ---
  const getDesignState = useCallback(() => ({
    tshirtColor, editorType: '2d', shirtStyle: 'unisex',
    frontObjects: frontCanvasRef.current?.getObjects() || [],
    backObjects: backCanvasRef.current?.getObjects() || [],
    frontTexture: frontCanvasRef.current?.getTextureDataURL() || null,
    backTexture: backCanvasRef.current?.getTextureDataURL() || null,
  }), [tshirtColor]);

  const handleCapture2D = () => {
    setCapturing2D(true);
    try {
      const dataURL = activeCanvasRef.current?.getSnapshotDataURL();
      if (!dataURL) throw new Error('No content');
      if (onSnapshot) onSnapshot(dataURLToBlob(dataURL), getDesignState());
    } catch { /* */ } finally { setCapturing2D(false); }
  };

  const handleCaptureBoth = () => {
    setCapturing2D(true);
    try {
      const f = frontCanvasRef.current?.getSnapshotDataURL();
      if (f && onSnapshot) onSnapshot(dataURLToBlob(f), getDesignState());
      const b = backCanvasRef.current?.getSnapshotDataURL();
      if (b && onSnapshot) onSnapshot(dataURLToBlob(b), getDesignState());
    } catch { /* */ } finally { setCapturing2D(false); }
  };

  const handleDownload = () => {
    const dataURL = activeCanvasRef.current?.getSnapshotDataURL();
    if (!dataURL) return;
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = `tshirt-2d-${selectedView}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSave = () => {
    try {
      const dataURL = frontCanvasRef.current?.getSnapshotDataURL();
      if (!dataURL) throw new Error('No content');
      if (onSave) onSave(dataURLToBlob(dataURL), getDesignState());
    } catch { /* */ }
  };

  const isTextSelected = selectedObject && (selectedObject.type === 'textbox' || selectedObject.type === 'text');
  const isCurvedTextSelected = selectedObject && !!selectedObject._curveData;
  const isShapeSelected = selectedObject && !isTextSelected && !isCurvedTextSelected && selectedObject.type !== 'line';
  const isLineSelected = selectedObject?.type === 'line';

  // ─── TOOL PANEL RENDERERS ─────────────────────────────────

  const renderTextPanel = () => (
    <div style={s.toolContent}>
      {/* Quick add plain text */}
      <button type="button" className="btn btn-primary btn-sm" onClick={() => handleAddText()} style={{ marginBottom: 10, width: '100%' }}>
        <Type size={14} /> Add Plain Text
      </button>

      {/* Text Style Presets */}
      <p style={s.toolSubhead}>Text Styles — click to add</p>
      <div style={s.presetGrid}>
        {TEXT_STYLE_PRESETS.map((p, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleAddText(p)}
            style={s.presetCard}
            title={p.label}
          >
            <span style={{
              fontFamily: `"${p.font}", sans-serif`,
              fontSize: Math.min(p.size * 0.45, 22),
              color: p.fill === 'transparent' ? '#000' : p.fill,
              WebkitTextStroke: p.fill === 'transparent' ? `1.5px ${p.stroke}` : undefined,
              textShadow: p.shadow || 'none',
              fontWeight: 'normal',
              lineHeight: 1.1,
              maxWidth: '100%',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
            }}>
              {p.text}
            </span>
            <span style={s.presetLabel}>{p.label}</span>
          </button>
        ))}
      </div>

      {/* Curved Text Generator */}
      <p style={{ ...s.toolSubhead, marginTop: 14 }}>Curved Text</p>
      <div style={s.curvedBox}>
        <input
          className="input"
          value={curveText}
          onChange={(e) => setCurveText(e.target.value)}
          placeholder="Your curved text..."
          style={{ fontSize: 13 }}
        />
        <div style={s.editRow}>
          <select className="input" value={curveFont} onChange={(e) => setCurveFont(e.target.value)} style={{ flex: 1, fontSize: 12 }}>
            {FONT_OPTIONS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
          <input className="input" type="number" min="14" max="80" value={curveFontSize} onChange={(e) => setCurveFontSize(+e.target.value || 32)} style={{ width: 55, fontSize: 12 }} />
          <input type="color" value={curveColor} onChange={(e) => setCurveColor(e.target.value)} style={s.colorInput} />
        </div>
        <div style={s.editRow}>
          <label style={{ fontSize: 11, color: '#666', minWidth: 40 }}>Curve</label>
          <input type="range" min="-180" max="180" value={curveAmount} onChange={(e) => setCurveAmount(+e.target.value)} style={{ flex: 1 }} />
          <span style={{ fontSize: 11, minWidth: 32, textAlign: 'right' }}>{curveAmount}°</span>
        </div>
        <div style={s.editRow}>
          <label style={{ fontSize: 11, color: '#666' }}>Outline</label>
          <input type="color" value={curveStroke || '#000000'} onChange={(e) => setCurveStroke(e.target.value)} style={s.colorInput} />
          <input className="input" type="number" min="0" max="8" value={curveStrokeWidth} onChange={(e) => setCurveStrokeWidth(+e.target.value)} style={{ width: 45, fontSize: 12 }} />
        </div>
        <button type="button" className="btn btn-primary btn-sm" onClick={handleAddCurvedText} style={{ width: '100%' }}>
          Add Curved Text
        </button>
      </div>
    </div>
  );

  const renderClipartPanel = () => {
    const activeCat = CLIPART_CATEGORIES.find((c) => c.name === clipCategory) || CLIPART_CATEGORIES[0];
    return (
      <div style={s.toolContent}>
        <div style={s.catTabs}>
          {CLIPART_CATEGORIES.map((cat) => (
            <button
              key={cat.name}
              type="button"
              onClick={() => setClipCategory(cat.name)}
              style={{
                ...s.catTab,
                background: clipCategory === cat.name ? 'var(--accent)' : '#f3f4f6',
                color: clipCategory === cat.name ? '#fff' : '#374151',
              }}
            >
              {cat.name}
            </button>
          ))}
        </div>
        {activeCat.name === 'Shapes' && (
          <div style={s.assetOptions}>
            <label style={s.assetOptionLabel}>
              Shape color
              <input type="color" value={shapeFill} onChange={(event) => setShapeFill(event.target.value)} style={s.colorInput} />
            </label>
            <span style={s.assetOptionHint}>Shapes stay editable after you add them.</span>
          </div>
        )}
        <div style={s.clipGrid}>
          {activeCat.items.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => handleAddClipart(item)}
              style={{ ...s.clipBtn, background: item.previewBackground || '#fff' }}
              title={`Add ${item.label}`}
            >
              {item.shapeId ? (
                <span style={{ fontSize: 30, lineHeight: 1, color: shapeFill }}>{item.icon}</span>
              ) : item.src ? (
                <img src={item.thumbnail || item.src} alt="" style={s.assetThumb} />
              ) : (
                <svg viewBox={item.viewBox} style={{ width: 40, height: 40 }}>
                  <path
                    d={item.path}
                    fill={item.fill || 'none'}
                    stroke={item.stroke || 'none'}
                    strokeWidth={item.strokeWidth || 0}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
              <span style={{ fontSize: 9, color: item.previewBackground ? '#f4f1ea' : '#666' }}>{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderImagePanel = () => (
    <div style={s.toolContent}>
      <input type="file" accept="image/*" ref={fileInputRef} onChange={handleAddImage} style={{ display: 'none' }} />
      <div style={s.uploadArea} onClick={() => fileInputRef.current?.click()}>
        <ImagePlus size={32} color="#9ca3af" />
        <p style={{ fontSize: 14, fontWeight: 500, color: '#374151' }}>Upload Image</p>
        <p style={{ fontSize: 12, color: '#9ca3af' }}>Click to browse or drag & drop</p>
        <p style={{ fontSize: 11, color: '#9ca3af' }}>JPG, PNG, SVG, WebP</p>
      </div>
    </div>
  );

  const renderEffectsPanel = () => {
    if (!selectedObject) {
      return (
        <div style={s.toolContent}>
          <p style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', padding: 20 }}>
            Select an object on the canvas to edit its effects.
          </p>
        </div>
      );
    }

    return (
      <div style={s.toolContent}>
        {/* Opacity */}
        <div style={s.effectRow}>
          <label style={s.effectLabel}>Opacity</label>
          <input type="range" min="0" max="100" value={objectOpacity} onChange={(e) => {
            const v = +e.target.value;
            setObjectOpacity(v);
            handleShapeUpdate('opacity', v / 100);
          }} style={{ flex: 1 }} />
          <span style={s.effectValue}>{objectOpacity}%</span>
        </div>

        {/* Layer order */}
        <div style={{ ...s.editRow, gap: 4, marginBottom: 8 }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleBringForward} title="Bring Forward" style={s.miniBtn}>
            <ArrowUpToLine size={14} /> Forward
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleSendBackward} title="Send Backward" style={s.miniBtn}>
            <ArrowDownToLine size={14} /> Back
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleDuplicate} title="Duplicate" style={s.miniBtn}>
            <CopyPlus size={14} /> Copy
          </button>
        </div>
        <div style={{ ...s.editRow, gap: 4, marginBottom: 8 }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleFlipH} title="Flip Horizontal" style={s.miniBtn}>
            <FlipHorizontal2 size={14} /> Flip H
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleFlipV} title="Flip Vertical" style={s.miniBtn}>
            <FlipVertical2 size={14} /> Flip V
          </button>
        </div>

        {/* Fill & stroke for shapes */}
        {(isShapeSelected || isLineSelected) && (
          <>
            <div style={s.effectRow}>
              <label style={s.effectLabel}>Fill</label>
              <input type="color" value={shapeFill || '#000000'} onChange={(e) => { setShapeFill(e.target.value); handleShapeUpdate('fill', e.target.value); }} style={s.colorInput} />
            </div>
            <div style={s.effectRow}>
              <label style={s.effectLabel}>Stroke</label>
              <input type="color" value={shapeStroke || '#000000'} onChange={(e) => { setShapeStroke(e.target.value); handleShapeUpdate('stroke', e.target.value); }} style={s.colorInput} />
              <input className="input" type="number" min="0" max="20" value={shapeStrokeWidth} onChange={(e) => { const v = +e.target.value; setShapeStrokeWidth(v); handleShapeUpdate('strokeWidth', v); }} style={{ width: 50, fontSize: 12 }} />
            </div>
          </>
        )}
      </div>
    );
  };

  // ─── TEXT PROPERTIES PANEL ──────────────────────────────────

  const renderTextProps = () => {
    if (!isTextSelected) return null;

    const filteredFonts = fontFilter === 'all'
      ? FONT_OPTIONS
      : FONT_OPTIONS.filter((f) => f.category === fontFilter);

    return (
      <div style={s.propsPanel}>
        <div style={s.propsHeader}>
          <Type size={14} />
          <span style={{ fontWeight: 600, fontSize: 13 }}>Text Properties</span>
        </div>

        {/* Text content */}
        <input
          className="input"
          value={editText}
          onChange={(e) => { setEditText(e.target.value); handleTextUpdate('text', e.target.value); }}
          style={{ fontSize: 13, marginBottom: 6 }}
          placeholder="Enter text..."
        />

        {/* Font selection with category filter */}
        <div style={s.editRow}>
          <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', marginBottom: 4 }}>
            {FONT_CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                type="button"
                onClick={() => setFontFilter(cat.key)}
                style={{
                  fontSize: 10, padding: '2px 6px', borderRadius: 4, border: 'none', cursor: 'pointer',
                  background: fontFilter === cat.key ? 'var(--accent)' : '#e5e7eb',
                  color: fontFilter === cat.key ? '#fff' : '#666',
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div style={s.editRow}>
          <select
            className="input"
            value={editFont}
            onChange={(e) => { setEditFont(e.target.value); handleTextUpdate('fontFamily', e.target.value); }}
            style={{ flex: 1, fontSize: 12, fontFamily: `"${editFont}", sans-serif` }}
          >
            {filteredFonts.map((f) => (
              <option key={f.value} value={f.value} style={{ fontFamily: `"${f.value}", sans-serif` }}>{f.label}</option>
            ))}
          </select>
          <input
            className="input" type="number" min="8" max="120" value={editFontSize}
            onChange={(e) => { const v = +e.target.value || 12; setEditFontSize(v); handleTextUpdate('fontSize', v); }}
            style={{ width: 55, fontSize: 12 }}
          />
          <input type="color" value={editColor} onChange={(e) => { setEditColor(e.target.value); handleTextUpdate('fill', e.target.value); }} style={s.colorInput} />
        </div>

        {/* Formatting buttons */}
        <div style={{ ...s.editRow, gap: 3 }}>
          <button type="button" onClick={() => { const v = !editBold; setEditBold(v); handleTextUpdate('fontWeight', v ? 'bold' : 'normal'); }}
            style={{ ...s.fmtBtn, background: editBold ? '#dbeafe' : '#f3f4f6' }}>
            <Bold size={14} />
          </button>
          <button type="button" onClick={() => { const v = !editItalic; setEditItalic(v); handleTextUpdate('fontStyle', v ? 'italic' : 'normal'); }}
            style={{ ...s.fmtBtn, background: editItalic ? '#dbeafe' : '#f3f4f6' }}>
            <Italic size={14} />
          </button>
          <button type="button" onClick={() => { const v = !editUnderline; setEditUnderline(v); handleTextUpdate('underline', v); }}
            style={{ ...s.fmtBtn, background: editUnderline ? '#dbeafe' : '#f3f4f6' }}>
            <Underline size={14} />
          </button>
          <div style={{ width: 1, height: 20, background: '#e5e7eb' }} />
          <button type="button" onClick={() => { setEditAlign('left'); handleTextUpdate('textAlign', 'left'); }}
            style={{ ...s.fmtBtn, background: editAlign === 'left' ? '#dbeafe' : '#f3f4f6' }}>
            <AlignLeft size={14} />
          </button>
          <button type="button" onClick={() => { setEditAlign('center'); handleTextUpdate('textAlign', 'center'); }}
            style={{ ...s.fmtBtn, background: editAlign === 'center' ? '#dbeafe' : '#f3f4f6' }}>
            <AlignCenter size={14} />
          </button>
          <button type="button" onClick={() => { setEditAlign('right'); handleTextUpdate('textAlign', 'right'); }}
            style={{ ...s.fmtBtn, background: editAlign === 'right' ? '#dbeafe' : '#f3f4f6' }}>
            <AlignRight size={14} />
          </button>
          <div style={{ flex: 1 }} />
          <label style={{ fontSize: 10, color: '#666' }}>Spacing</label>
          <input className="input" type="number" min="-200" max="800" step="20" value={editCharSpacing}
            onChange={(e) => { const v = +e.target.value; setEditCharSpacing(v); handleTextUpdate('charSpacing', v); }}
            style={{ width: 55, fontSize: 11 }}
          />
        </div>

        {/* Outline */}
        <div style={s.effectRow}>
          <label style={s.effectLabel}>Outline</label>
          <input type="color" value={editStroke || '#000000'} onChange={(e) => { setEditStroke(e.target.value); handleTextUpdate('stroke', e.target.value); }} style={s.colorInput} />
          <input className="input" type="number" min="0" max="10" step="0.5" value={editStrokeWidth}
            onChange={(e) => { const v = +e.target.value; setEditStrokeWidth(v); handleTextUpdate('strokeWidth', v); }}
            style={{ width: 50, fontSize: 12 }}
          />
          {editStrokeWidth > 0 && (
            <button type="button" onClick={() => { setEditStroke(''); setEditStrokeWidth(0); handleTextUpdate('stroke', ''); handleTextUpdate('strokeWidth', 0); }}
              style={{ fontSize: 10, background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>Clear</button>
          )}
        </div>

        {/* Shadow */}
        <div style={s.effectRow}>
          <label style={{ ...s.effectLabel, display: 'flex', alignItems: 'center', gap: 4 }}>
            <input type="checkbox" checked={editShadowEnabled} onChange={(e) => {
              setEditShadowEnabled(e.target.checked);
              if (e.target.checked) {
                handleTextUpdate('shadow', { color: editShadowColor, blur: editShadowBlur, offsetX: editShadowOffsetX, offsetY: editShadowOffsetY });
              } else {
                handleTextUpdate('shadow', null);
              }
            }} />
            Shadow
          </label>
          {editShadowEnabled && (
            <>
              <input type="color" value={editShadowColor} onChange={(e) => {
                setEditShadowColor(e.target.value);
                handleTextUpdate('shadow', { color: e.target.value, blur: editShadowBlur, offsetX: editShadowOffsetX, offsetY: editShadowOffsetY });
              }} style={s.colorInput} />
              <input className="input" type="number" min="0" max="30" value={editShadowBlur} title="Blur"
                onChange={(e) => { const v = +e.target.value; setEditShadowBlur(v); handleTextUpdate('shadow', { color: editShadowColor, blur: v, offsetX: editShadowOffsetX, offsetY: editShadowOffsetY }); }}
                style={{ width: 42, fontSize: 11 }}
              />
              <input className="input" type="number" min="-20" max="20" value={editShadowOffsetX} title="X offset"
                onChange={(e) => { const v = +e.target.value; setEditShadowOffsetX(v); handleTextUpdate('shadow', { color: editShadowColor, blur: editShadowBlur, offsetX: v, offsetY: editShadowOffsetY }); }}
                style={{ width: 42, fontSize: 11 }}
              />
              <input className="input" type="number" min="-20" max="20" value={editShadowOffsetY} title="Y offset"
                onChange={(e) => { const v = +e.target.value; setEditShadowOffsetY(v); handleTextUpdate('shadow', { color: editShadowColor, blur: editShadowBlur, offsetX: editShadowOffsetX, offsetY: v }); }}
                style={{ width: 42, fontSize: 11 }}
              />
            </>
          )}
        </div>

        {/* Curve text — converts flat text to curved image */}
        <div style={s.effectRow}>
          <label style={s.effectLabel}>Curve</label>
          <input type="range" min="-180" max="180" value={editCurveAmount}
            onChange={(e) => {
              const v = +e.target.value;
              setEditCurveAmount(v);
            }}
            onMouseUp={() => {
              if (editCurveAmount !== 0) handleApplyCurveToSelected(editCurveAmount);
            }}
            onTouchEnd={() => {
              if (editCurveAmount !== 0) handleApplyCurveToSelected(editCurveAmount);
            }}
            style={{ flex: 1 }}
          />
          <span style={s.effectValue}>{editCurveAmount}°</span>
        </div>
      </div>
    );
  };

  // ─── CURVED TEXT PROPERTIES PANEL (for re-editing curved images) ───
  const renderCurvedTextProps = () => {
    if (!isCurvedTextSelected) return null;
    const cd = selectedObject._curveData;

    const filteredFonts = fontFilter === 'all'
      ? FONT_OPTIONS
      : FONT_OPTIONS.filter((f) => f.category === fontFilter);

    return (
      <div style={s.propsPanel}>
        <div style={s.propsHeader}>
          <Type size={14} />
          <span style={{ fontWeight: 600, fontSize: 13 }}>Curved Text Properties</span>
        </div>

        {/* Text content */}
        <input
          className="input"
          value={editText}
          onChange={(e) => { setEditText(e.target.value); }}
          onBlur={() => handleCurvedTextPropUpdate('text', editText)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleCurvedTextPropUpdate('text', editText); }}
          style={{ fontSize: 13, marginBottom: 6 }}
          placeholder="Enter text..."
        />

        {/* Font filter */}
        <div style={s.editRow}>
          <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', marginBottom: 4 }}>
            {FONT_CATEGORIES.map((cat) => (
              <button key={cat.key} type="button" onClick={() => setFontFilter(cat.key)}
                style={{
                  fontSize: 10, padding: '2px 6px', borderRadius: 4, border: 'none', cursor: 'pointer',
                  background: fontFilter === cat.key ? 'var(--accent)' : '#e5e7eb',
                  color: fontFilter === cat.key ? '#fff' : '#666',
                }}>
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Font, size, color */}
        <div style={s.editRow}>
          <select className="input" value={editFont}
            onChange={(e) => { setEditFont(e.target.value); handleCurvedTextPropUpdate('font', e.target.value); }}
            style={{ flex: 1, fontSize: 12, fontFamily: `"${editFont}", sans-serif` }}>
            {filteredFonts.map((f) => (
              <option key={f.value} value={f.value} style={{ fontFamily: `"${f.value}", sans-serif` }}>{f.label}</option>
            ))}
          </select>
          <input className="input" type="number" min="8" max="120" value={editFontSize}
            onChange={(e) => { const v = +e.target.value || 12; setEditFontSize(v); handleCurvedTextPropUpdate('fontSize', v); }}
            style={{ width: 55, fontSize: 12 }} />
          <input type="color" value={editColor}
            onChange={(e) => { setEditColor(e.target.value); handleCurvedTextPropUpdate('fill', e.target.value); }}
            style={s.colorInput} />
        </div>

        {/* Curve slider */}
        <div style={s.effectRow}>
          <label style={s.effectLabel}>Curve</label>
          <input type="range" min="-180" max="180" value={editCurveAmount}
            onChange={(e) => setEditCurveAmount(+e.target.value)}
            onMouseUp={() => handleCurvedTextPropUpdate('curve', editCurveAmount)}
            onTouchEnd={() => handleCurvedTextPropUpdate('curve', editCurveAmount)}
            style={{ flex: 1 }} />
          <span style={s.effectValue}>{editCurveAmount}°</span>
        </div>

        {/* Outline */}
        <div style={s.effectRow}>
          <label style={s.effectLabel}>Outline</label>
          <input type="color" value={editStroke || '#000000'}
            onChange={(e) => { setEditStroke(e.target.value); handleCurvedTextPropUpdate('strokeColor', e.target.value); }}
            style={s.colorInput} />
          <input className="input" type="number" min="0" max="10" step="0.5" value={editStrokeWidth}
            onChange={(e) => { const v = +e.target.value; setEditStrokeWidth(v); handleCurvedTextPropUpdate('strokeWidth', v); }}
            style={{ width: 50, fontSize: 12 }} />
        </div>

        {/* Opacity */}
        <div style={s.effectRow}>
          <label style={s.effectLabel}>Opacity</label>
          <input type="range" min="0" max="100" value={objectOpacity} onChange={(e) => {
            const v = +e.target.value; setObjectOpacity(v);
            if (selectedObject) { selectedObject.set('opacity', v / 100); activeCanvasRef.current?.getCanvas()?.renderAll(); }
          }} style={{ flex: 1 }} />
          <span style={s.effectValue}>{objectOpacity}%</span>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════
  //   RENDER
  // ═══════════════════════════════════════════════════════════════

  return (
    <div style={s.wrapper}>
      {/* ─── LEFT: Preview Column ─── */}
      <div style={s.leftColumn}>
        <div style={s.previewHeader}>
          <Eye size={14} style={{ color: '#666' }} />
          <span style={{ fontWeight: 600, fontSize: 13 }}>Preview</span>
        </div>

        {[['front', frontPreviewURL], ['back', backPreviewURL]].map(([view, url]) => (
          <div
            key={view}
            style={{
              ...s.previewThumb,
              outline: selectedView === view ? '2px solid var(--accent)' : '1px solid #e5e7eb',
            }}
            onClick={() => handleViewChange(view)}
          >
            {url ? <img src={url} alt={`${view} preview`} style={s.previewImg} /> : <span style={s.previewPlaceholder}>{view}</span>}
            <span style={s.previewLabel}>{view.charAt(0).toUpperCase() + view.slice(1)}</span>
          </div>
        ))}

        <div style={s.actions}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleDownload} style={s.actionBtnSmall} title="Download PNG">
            <Download size={14} /> Download
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleCapture2D} disabled={capturing2D} style={s.actionBtnSmall}>
            <Camera size={14} /> Snapshot
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleCaptureBoth} disabled={capturing2D} style={s.actionBtnSmall}>
            <Camera size={14} /> Both Sides
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving} style={s.actionBtnSmall}>
            <Save size={14} /> {saving ? 'Saving...' : 'Save Design'}
          </button>
        </div>
      </div>

      {/* ─── RIGHT: Canvas + Tools ─── */}
      <div style={s.rightColumn}>
        {/* View toggle */}
        <div style={s.viewToggle}>
          {['front', 'back'].map((v) => (
            <button key={v} type="button" onClick={() => handleViewChange(v)}
              className={`btn ${selectedView === v ? 'btn-primary' : 'btn-secondary'} btn-sm`}
              style={{ flex: 1 }}>
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>

        {/* Tool Tabs */}
        <div style={s.toolTabBar}>
          {TOOL_TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveToolTab(activeToolTab === id ? null : id)}
              style={{
                ...s.toolTab,
                background: activeToolTab === id ? 'var(--accent)' : 'transparent',
                color: activeToolTab === id ? '#fff' : '#555',
              }}
            >
              <Icon size={14} />
              <span style={{ fontSize: 11 }}>{label}</span>
            </button>
          ))}

          <div style={{ flex: 1 }} />

          {/* T-shirt color */}
          <div style={s.colorPickerGroup}>
            <Palette size={13} style={{ color: '#666' }} />
            <div style={s.colorSwatches}>
              {TSHIRT_COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setTshirtColor(c)} style={{
                  ...s.colorSwatch,
                  background: c,
                  outline: tshirtColor === c ? '2px solid var(--accent)' : '1px solid #ddd',
                  outlineOffset: 1,
                }} />
              ))}
            </div>
          </div>

          {/* Unisex fit seal — Truekin is unisex-only (no men's/women's split) */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              background: 'var(--ink, #0a0a0a)',
              color: '#f4f1ea',
              fontFamily: 'var(--font-secondary, "Oswald", sans-serif)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              borderRadius: 3,
              border: '1px solid #1f1f1f',
            }}
            title="Unisex fit only — Truekin tees are cut on one unisex last"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            Unisex Fit
          </div>

          {/* Delete & Clear */}
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleDeleteSelected} disabled={!selectedObject} title="Delete"
            style={{ color: selectedObject ? '#dc2626' : undefined, padding: '4px 6px' }}>
            <Trash2 size={14} />
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleClearAll} title="Clear All" style={{ padding: '4px 6px' }}>
            <XCircle size={14} />
          </button>
        </div>

        {/* Tool Panel (collapsible) */}
        {activeToolTab && (
          <div style={s.toolPanel}>
            {activeToolTab === 'text' && renderTextPanel()}
            {activeToolTab === 'clipart' && renderClipartPanel()}
            {activeToolTab === 'image' && renderImagePanel()}
            {activeToolTab === 'effects' && renderEffectsPanel()}
          </div>
        )}

        {/* Canvas with floating delete bar */}
        <div style={{ position: 'relative' }}>
          <div style={s.fabricContainer}>
            <div style={{ display: selectedView === 'front' ? 'block' : 'none' }}>
              <FabricCanvas ref={frontCanvasRef} svgPath={TSHIRT_FRONT_PATH} tshirtColor={tshirtColor} view="front"
                mockupUrl={getMockupUrl(tshirtColor, 'front')} preColored={true}
                onObjectSelect={selectedView === 'front' ? handleObjectSelect : undefined}
                onDesignChange={handleDesignChange} />
            </div>
            <div style={{ display: selectedView === 'back' ? 'block' : 'none' }}>
              <FabricCanvas ref={backCanvasRef} svgPath={TSHIRT_BACK_PATH} tshirtColor={tshirtColor} view="back"
                mockupUrl={getMockupUrl(tshirtColor, 'back')} preColored={true}
                onObjectSelect={selectedView === 'back' ? handleObjectSelect : undefined}
                onDesignChange={handleDesignChange} />
            </div>
          </div>

          {/* Floating delete bar — appears above the canvas when objects are selected */}
          {selectedObject && (
            <div style={s.floatingDeleteBar}>
              <span style={{ fontSize: 12, color: '#fff', fontWeight: 500 }}>
                {selectionCount > 1 ? `${selectionCount} objects selected` : '1 object selected'}
              </span>
              <button type="button" onClick={handleDeleteSelected} style={s.floatingDeleteBtn}>
                <Trash2 size={15} />
                Delete{selectionCount > 1 ? ` (${selectionCount})` : ''}
              </button>
            </div>
          )}
        </div>

        {/* Properties Panel (contextual) */}
        {isTextSelected && renderTextProps()}

        {/* Curved text properties when a curved text image is selected */}
        {isCurvedTextSelected && renderCurvedTextProps()}

        {/* Shape/Line/Image properties when selected (but no text) */}
        {selectedObject && !isTextSelected && !isCurvedTextSelected && (
          <div style={s.propsPanel}>
            <div style={s.propsHeader}>
              <Layers size={14} />
              <span style={{ fontWeight: 600, fontSize: 13 }}>Properties</span>
            </div>

            <div style={s.effectRow}>
              <label style={s.effectLabel}>Opacity</label>
              <input type="range" min="0" max="100" value={objectOpacity} onChange={(e) => {
                const v = +e.target.value; setObjectOpacity(v); handleShapeUpdate('opacity', v / 100);
              }} style={{ flex: 1 }} />
              <span style={s.effectValue}>{objectOpacity}%</span>
            </div>

            {(isShapeSelected || isLineSelected) && (
              <>
                <div style={s.effectRow}>
                  <label style={s.effectLabel}>Fill</label>
                  <input type="color" value={shapeFill || '#000000'} onChange={(e) => { setShapeFill(e.target.value); handleShapeUpdate('fill', e.target.value); }} style={s.colorInput} />
                </div>
                <div style={s.effectRow}>
                  <label style={s.effectLabel}>Stroke</label>
                  <input type="color" value={shapeStroke || '#000000'} onChange={(e) => { setShapeStroke(e.target.value); handleShapeUpdate('stroke', e.target.value); }} style={s.colorInput} />
                  <input className="input" type="number" min="0" max="20" value={shapeStrokeWidth}
                    onChange={(e) => { const v = +e.target.value; setShapeStrokeWidth(v); handleShapeUpdate('strokeWidth', v); }}
                    style={{ width: 50, fontSize: 12 }}
                  />
                </div>
              </>
            )}

            {/* Layer controls */}
            <div style={{ ...s.editRow, gap: 4, flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleBringForward} style={s.miniBtn}><ArrowUpToLine size={13} /> Forward</button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleSendBackward} style={s.miniBtn}><ArrowDownToLine size={13} /> Back</button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleDuplicate} style={s.miniBtn}><CopyPlus size={13} /> Duplicate</button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleFlipH} style={s.miniBtn}><FlipHorizontal2 size={13} /> Flip H</button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleFlipV} style={s.miniBtn}><FlipVertical2 size={13} /> Flip V</button>
            </div>
          </div>
        )}

        <p style={s.hint}>Click tool tabs above to add text, shapes, clip art, and images. Select objects to edit properties.</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════════════════════════ */
const s = {
  wrapper: { display: 'grid', gridTemplateColumns: '180px 1fr', gap: 16, minHeight: 500 },

  // Left column
  leftColumn: { display: 'flex', flexDirection: 'column', gap: 8 },
  previewHeader: { display: 'flex', alignItems: 'center', gap: 6, padding: '0 2px' },
  previewThumb: {
    position: 'relative', borderRadius: 10, overflow: 'hidden', cursor: 'pointer',
    background: '#f9fafb', aspectRatio: '0.9', transition: 'outline-color 0.15s',
  },
  previewImg: { width: '100%', height: '100%', objectFit: 'contain' },
  previewPlaceholder: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: '100%', height: '100%', color: '#9ca3af', fontSize: 14, textTransform: 'capitalize',
  },
  previewLabel: {
    position: 'absolute', bottom: 0, left: 0, right: 0, textAlign: 'center',
    fontSize: 11, fontWeight: 600, color: '#555', background: 'rgba(255,255,255,0.85)', padding: '3px 0',
  },
  actions: { display: 'flex', flexDirection: 'column', gap: 5, marginTop: 4 },
  actionBtnSmall: {
    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontSize: 11,
  },

  // Right column
  rightColumn: { display: 'flex', flexDirection: 'column', gap: 8 },
  viewToggle: { display: 'flex', gap: 6 },
  fabricContainer: {
    border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', background: '#fff',
    display: 'flex', justifyContent: 'center', padding: 4,
  },

  // Tool tab bar
  toolTabBar: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 4, padding: '4px 0' },
  toolTab: {
    display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 8,
    border: 'none', cursor: 'pointer', fontWeight: 500, transition: 'all 0.15s',
  },

  // Tool panel
  toolPanel: {
    border: '1px solid #e5e7eb', borderRadius: 10, background: '#fafafa',
    maxHeight: 340, overflowY: 'auto', padding: 12,
  },
  toolContent: {},
  toolSubhead: { fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Text presets
  presetGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 6, marginBottom: 8,
  },
  presetCard: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    padding: '12px 6px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff',
    cursor: 'pointer', transition: 'all 0.15s', minHeight: 64, gap: 4,
  },
  presetLabel: { fontSize: 9, color: '#9ca3af', textAlign: 'center' },

  // Curved text
  curvedBox: {
    display: 'flex', flexDirection: 'column', gap: 6, padding: 10, background: '#fff',
    border: '1px solid #e5e7eb', borderRadius: 8,
  },

  // Shapes
  shapeGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))', gap: 6,
  },
  shapeBtn: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    padding: '10px 4px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff',
    cursor: 'pointer', gap: 2, transition: 'all 0.15s',
  },

  // Clip art
  catTabs: { display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 },
  catTab: {
    padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
    fontSize: 11, fontWeight: 500, transition: 'all 0.15s',
  },
  clipGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))', gap: 6,
  },
  clipBtn: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    padding: '8px 4px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff',
    cursor: 'pointer', gap: 2, transition: 'all 0.15s',
  },
  assetThumb: { width: 48, height: 48, objectFit: 'contain', display: 'block' },
  assetOptions: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
    padding: '8px 10px', marginBottom: 10, borderRadius: 8, background: '#f3f4f6',
  },
  assetOptionLabel: { display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 600, color: '#374151' },
  assetOptionHint: { fontSize: 10, color: '#6b7280' },

  // Image upload
  uploadArea: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    padding: 30, border: '2px dashed #d1d5db', borderRadius: 12, background: '#fff',
    cursor: 'pointer', gap: 6, transition: 'border-color 0.15s',
  },

  // Properties panel
  propsPanel: {
    display: 'flex', flexDirection: 'column', gap: 6, padding: 10,
    background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb',
  },
  propsHeader: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 },

  // Shared
  editRow: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  effectRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 },
  effectLabel: { fontSize: 12, color: '#555', minWidth: 50 },
  effectValue: { fontSize: 11, minWidth: 30, textAlign: 'right', color: '#666' },
  colorInput: { width: 30, height: 26, border: '1px solid #ddd', borderRadius: 4, cursor: 'pointer', padding: 1 },
  fmtBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 28,
    borderRadius: 4, border: '1px solid #e5e7eb', cursor: 'pointer', transition: 'background 0.15s',
  },
  miniBtn: { fontSize: 11, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 3 },

  // Color picker
  colorPickerGroup: { display: 'flex', alignItems: 'center', gap: 4, padding: '3px 6px', border: '1px solid #e5e7eb', borderRadius: 6 },
  colorSwatches: { display: 'flex', flexWrap: 'wrap', gap: 2 },
  colorSwatch: { width: 16, height: 16, borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0 },

  hint: { fontSize: 11, color: '#9ca3af', textAlign: 'center', padding: '2px 0' },

  // Floating delete bar
  floatingDeleteBar: {
    position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
    display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px',
    background: 'rgba(30, 30, 30, 0.92)', borderRadius: 10, zIndex: 20,
    boxShadow: '0 4px 16px rgba(0,0,0,0.25)', backdropFilter: 'blur(8px)',
    animation: 'fadeIn 0.15s ease-out',
  },
  floatingDeleteBtn: {
    display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px',
    background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6,
    fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'background 0.15s',
  },
};
