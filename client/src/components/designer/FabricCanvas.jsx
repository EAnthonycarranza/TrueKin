/**
 * FabricCanvas – 2D Fabric.js canvas for designing on a t-shirt mockup.
 *
 * Renders a mockup image behind a transparent Fabric.js canvas
 * where users can add images, text, and lines clipped to the t-shirt shape.
 *
 * Supports two modes:
 *   1. Tinted mode (preColored=false, default):
 *      Uses a white-base mockup with canvas multiply blend for color tinting.
 *   2. Pre-colored mode (preColored=true):
 *      Uses per-color photorealistic mockup images displayed as-is (no tinting).
 */
import { useEffect, useRef, useCallback, useImperativeHandle, forwardRef, useState } from 'react';
import * as fabric from 'fabric';
import { CANVAS_CONFIG } from './designerConstants';

/**
 * Tint a white mockup image with a color using canvas multiply blend mode.
 * Returns a tinted canvas element (not data URL — avoids extra encoding).
 *
 * @param {HTMLImageElement} mockupImg — loaded white mockup image (transparent bg)
 * @param {string} color — hex color to tint with
 * @param {number} w — target width
 * @param {number} h — target height
 * @returns {HTMLCanvasElement} — canvas with tinted mockup
 */
function createTintedMockup(mockupImg, color, w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  // Calculate scale to fit mockup while maintaining aspect ratio
  const imgW = mockupImg.naturalWidth || mockupImg.width;
  const imgH = mockupImg.naturalHeight || mockupImg.height;
  const scale = Math.min(w / imgW, h / imgH);
  const iw = imgW * scale;
  const ih = imgH * scale;
  const ix = (w - iw) / 2;
  const iy = (h - ih) / 2;

  // 1. Draw the white mockup image
  ctx.drawImage(mockupImg, ix, iy, iw, ih);

  // 2. Multiply blend with the selected color
  //    - White pixels → become the color
  //    - Gray pixels → become darker shade of color (preserving depth/shadows)
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, w, h);

  // 3. Restore original alpha channel from the mockup
  //    This masks the multiply result to only where the mockup had pixels,
  //    keeping transparent areas (background) truly transparent.
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(mockupImg, ix, iy, iw, ih);

  // Reset composite operation
  ctx.globalCompositeOperation = 'source-over';

  return canvas;
}

/**
 * Draw a mockup image scaled to fit the canvas, centered.
 * No tinting — just draws the image as-is.
 */
function drawMockupDirect(ctx, mockupImg, w, h) {
  const imgW = mockupImg.naturalWidth || mockupImg.width;
  const imgH = mockupImg.naturalHeight || mockupImg.height;
  // Scale down slightly (0.92) so the shirt has breathing room and
  // the collar/top isn't cropped at the canvas edge.
  const padding = 0.92;
  const scale = Math.min(w / imgW, h / imgH) * padding;
  const iw = imgW * scale;
  const ih = imgH * scale;
  const ix = (w - iw) / 2;
  const iy = (h - ih) / 2;
  ctx.drawImage(mockupImg, ix, iy, iw, ih);
}

const FabricCanvas = forwardRef(function FabricCanvas(
  { svgPath, tshirtColor, view, mockupUrl, preColored = false, shirtStyle = 'mens', onCanvasReady, onObjectSelect, onDesignChange },
  ref
) {
  const canvasElRef = useRef(null);
  const fabricRef = useRef(null);
  const bgCanvasRef = useRef(null);
  const mockupImgRef = useRef(null);
  const [mockupLoaded, setMockupLoaded] = useState(false);

  // --- Load mockup image ---
  // Track mockup URL to detect changes even when mockupLoaded stays true
  const [mockupKey, setMockupKey] = useState(0);

  useEffect(() => {
    if (!mockupUrl) {
      mockupImgRef.current = null;
      setMockupLoaded(false);
      return;
    }
    // Reset loaded state so renderBackground re-triggers after load
    setMockupLoaded(false);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      mockupImgRef.current = img;
      setMockupLoaded(true);
      setMockupKey((k) => k + 1); // Force re-render even if mockupLoaded was already true
    };
    img.onerror = () => {
      console.warn(`Failed to load mockup image: ${mockupUrl}`);
      mockupImgRef.current = null;
      setMockupLoaded(false);
    };
    img.src = mockupUrl;
  }, [mockupUrl]);

  // --- Render background (tinted mockup or SVG fallback) ---
  const renderBackground = useCallback(() => {
    const bgCanvas = bgCanvasRef.current;
    if (!bgCanvas) return;
    const ctx = bgCanvas.getContext('2d');
    const w = CANVAS_CONFIG.width;
    const h = CANVAS_CONFIG.height;

    // Clear
    ctx.clearRect(0, 0, w, h);

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    if (mockupImgRef.current) {
      if (preColored) {
        // Pre-colored mockup: draw directly without tinting
        drawMockupDirect(ctx, mockupImgRef.current, w, h);

        // Draw subtle print area guide (smaller for women's fitted shirt)
        const isWomens = shirtStyle === 'womens';
        const px = w * (isWomens ? 0.30 : 0.27);
        const py = h * (isWomens ? 0.22 : 0.2);
        const pw = w * (isWomens ? 0.40 : 0.46);
        const ph = h * (isWomens ? 0.42 : 0.48);
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 1;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(px, py, pw, ph);
        ctx.restore();
      } else {
        // White-base mockup: tint with selected color
        const tinted = createTintedMockup(mockupImgRef.current, tshirtColor || '#FFFFFF', w, h);
        ctx.drawImage(tinted, 0, 0);
      }
    } else {
      // Fallback: draw SVG path with solid color fill
      const path = new Path2D(svgPath);
      const scale = h / 810;
      ctx.save();
      ctx.scale(scale, scale);
      ctx.fillStyle = tshirtColor || '#FFFFFF';
      ctx.fill(path);
      ctx.strokeStyle = '#ccc';
      ctx.lineWidth = 1;
      ctx.stroke(path);
      ctx.restore();
    }
  }, [tshirtColor, svgPath, preColored, shirtStyle]); // mockupImgRef is a ref, doesn't need to be in deps

  // Re-render background when color, style, or mockup changes
  useEffect(() => {
    renderBackground();
  }, [renderBackground, mockupLoaded, mockupKey, tshirtColor, shirtStyle]);

  // Expose canvas to parent
  useImperativeHandle(ref, () => ({
    getCanvas: () => fabricRef.current,
    getTextureDataURL: () => {
      if (!fabricRef.current) return null;
      fabricRef.current.renderAll();
      return fabricRef.current.toDataURL({ format: 'png', quality: 1, multiplier: 1 });
    },
    /**
     * Composites the mockup background + Fabric canvas into one image.
     * Used for 2D snapshot captures so the t-shirt shape/color is visible.
     *
     * Fixes:
     *  - Deselects active object before capture to remove blue selection handles
     *  - Renders at 2x resolution for higher quality previews
     */
    getSnapshotDataURL: () => {
      if (!fabricRef.current) return null;

      // Deselect any active object to remove selection handles/borders
      const activeObj = fabricRef.current.getActiveObject();
      if (activeObj) {
        fabricRef.current.discardActiveObject();
      }
      fabricRef.current.renderAll();

      const w = CANVAS_CONFIG.width;
      const h = CANVAS_CONFIG.height;
      const scale2x = 2; // Render at 2x for sharper previews
      const offscreen = document.createElement('canvas');
      offscreen.width = w * scale2x;
      offscreen.height = h * scale2x;
      const ctx = offscreen.getContext('2d');
      ctx.scale(scale2x, scale2x);

      // Transparent background — no fill so the PNG has alpha transparency

      if (mockupImgRef.current) {
        if (preColored) {
          // Pre-colored mockup: draw directly
          drawMockupDirect(ctx, mockupImgRef.current, w, h);
        } else {
          // White-base mockup: tint with selected color
          const tinted = createTintedMockup(mockupImgRef.current, tshirtColor || '#FFFFFF', w, h);
          ctx.drawImage(tinted, 0, 0);
        }
      } else {
        // Fallback: Draw the SVG t-shirt path with color
        const path = new Path2D(svgPath);
        const pathScale = h / 810;
        ctx.save();
        ctx.scale(pathScale, pathScale);
        ctx.fillStyle = tshirtColor || '#FFFFFF';
        ctx.fill(path);
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 1;
        ctx.stroke(path);
        ctx.restore();
      }

      // Draw the Fabric canvas (design elements) on top — use lowerCanvasEl for clean render
      const fabricCanvasEl = fabricRef.current.lowerCanvasEl || fabricRef.current.getElement();
      if (fabricCanvasEl) {
        ctx.drawImage(fabricCanvasEl, 0, 0, w, h);
      }

      const dataURL = offscreen.toDataURL('image/png', 1);

      // Restore active object selection so user can continue editing
      if (activeObj) {
        fabricRef.current.setActiveObject(activeObj);
        fabricRef.current.renderAll();
      }

      return dataURL;
    },
    getObjects: () => fabricRef.current?.getObjects().map((obj) => obj.toJSON()) || [],
    loadObjects: (objects) => {
      if (!fabricRef.current || !objects) return;
      objects.forEach((obj) => addFabricObject(fabricRef.current, obj));
      fabricRef.current.renderAll();
    },
    clearCanvas: () => {
      if (!fabricRef.current) return;
      fabricRef.current.clear();
      fabricRef.current.renderAll();
    },
  }));

  // Use a ref for the callback so the canvas event listeners always call the latest version
  const onDesignChangeRef = useRef(onDesignChange);
  const onObjectSelectRef = useRef(onObjectSelect);
  useEffect(() => { onDesignChangeRef.current = onDesignChange; }, [onDesignChange]);
  useEffect(() => { onObjectSelectRef.current = onObjectSelect; }, [onObjectSelect]);

  // Debounced notify — gives Fabric.js time to finish rendering (important for images)
  const debounceTimer = useRef(null);
  const notifyChange = useCallback(() => {
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      if (onDesignChangeRef.current && fabricRef.current) {
        fabricRef.current.renderAll();
        onDesignChangeRef.current(view);
      }
    }, 100);
  }, [view]);

  // Initialize Fabric canvas
  useEffect(() => {
    if (!canvasElRef.current) return;

    const canvas = new fabric.Canvas(canvasElRef.current, {
      ...CANVAS_CONFIG,
      preserveObjectStacking: true,
    });

    fabricRef.current = canvas;

    // Set up clip path to constrain design elements
    if (preColored) {
      // Pre-colored mockups: use a rectangular "print area" clip
      // This avoids SVG path / mockup shape misalignment and matches
      // how professional mockup tools define the printable zone.
      const w = CANVAS_CONFIG.width;
      const h = CANVAS_CONFIG.height;
      const isW = shirtStyle === 'womens';
      const printArea = new fabric.Rect({
        width:  w * (isW ? 0.40 : 0.46),
        height: h * (isW ? 0.42 : 0.48),
        left:   w * (isW ? 0.30 : 0.27),
        top:    h * (isW ? 0.22 : 0.2),
        originX: 'left',
        originY: 'top',
        absolutePositioned: true,
      });
      canvas.clipPath = printArea;
    } else if (svgPath) {
      // Tinted SVG mockups: use SVG shirt silhouette clip
      const clipPath = new fabric.Path(svgPath);
      const scale = CANVAS_CONFIG.height / 810;
      clipPath.set({
        scaleX: scale * 0.9,
        scaleY: scale * 0.9,
        left: 5,
        top: 64,
        originX: 'left',
        originY: 'top',
        absolutePositioned: true,
      });
      canvas.clipPath = clipPath;
    }

    // Object selection events — use refs so listeners stay current
    // For multi-select (drag selection), pass first object but also pass count
    canvas.on('selection:created', (e) => {
      const sel = e.selected || [];
      const obj = sel.length === 1 ? sel[0] : (canvas.getActiveObject() || sel[0] || null);
      if (obj) obj._selectionCount = sel.length;
      onObjectSelectRef.current?.(obj);
    });
    canvas.on('selection:updated', (e) => {
      const sel = e.selected || [];
      const obj = sel.length === 1 ? sel[0] : (canvas.getActiveObject() || sel[0] || null);
      if (obj) obj._selectionCount = sel.length;
      onObjectSelectRef.current?.(obj);
    });
    canvas.on('selection:cleared', () => {
      onObjectSelectRef.current?.(null);
    });

    // Design change events
    canvas.on('object:modified', notifyChange);
    canvas.on('object:added', notifyChange);
    canvas.on('object:removed', notifyChange);

    onCanvasReady?.(canvas, view);

    return () => {
      clearTimeout(debounceTimer.current);
      canvas.off('object:modified', notifyChange);
      canvas.off('object:added', notifyChange);
      canvas.off('object:removed', notifyChange);
      canvas.dispose();
      fabricRef.current = null;
    };
  }, [svgPath, view]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update clip path when shirtStyle changes (for preColored mockups)
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas || !preColored) return;
    const w = CANVAS_CONFIG.width;
    const h = CANVAS_CONFIG.height;
    const isW = shirtStyle === 'womens';
    const printArea = new fabric.Rect({
      width:  w * (isW ? 0.40 : 0.46),
      height: h * (isW ? 0.42 : 0.48),
      left:   w * (isW ? 0.30 : 0.27),
      top:    h * (isW ? 0.22 : 0.2),
      originX: 'left',
      originY: 'top',
      absolutePositioned: true,
    });
    canvas.clipPath = printArea;
    canvas.requestRenderAll();
  }, [shirtStyle, preColored]);

  return (
    <div style={{ position: 'relative', width: CANVAS_CONFIG.width, height: CANVAS_CONFIG.height }}>
      {/* Background: tinted mockup image (rendered via <canvas>) */}
      <canvas
        ref={bgCanvasRef}
        width={CANVAS_CONFIG.width}
        height={CANVAS_CONFIG.height}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}
      />
      {/* Fabric.js canvas (design elements layer) */}
      <canvas
        ref={canvasElRef}
        style={{ position: 'absolute', inset: 0, zIndex: 1 }}
        width={CANVAS_CONFIG.width}
        height={CANVAS_CONFIG.height}
      />
    </div>
  );
});

export default FabricCanvas;

/**
 * Helper: Recreate a Fabric.js object from serialized JSON data.
 * Supports: Line, Textbox, Image, Path, Rect, Circle, Triangle, Polygon, Ellipse
 */
function addFabricObject(canvas, objectData) {
  // Common props shared by most objects
  const commonProps = {
    left: objectData.left || 0,
    top: objectData.top || 0,
    scaleX: objectData.scaleX || 1,
    scaleY: objectData.scaleY || 1,
    angle: objectData.angle || 0,
    opacity: objectData.opacity ?? 1,
    fill: objectData.fill,
    stroke: objectData.stroke || '',
    strokeWidth: objectData.strokeWidth || 0,
    flipX: objectData.flipX || false,
    flipY: objectData.flipY || false,
  };

  // Apply shadow if present
  if (objectData.shadow) {
    commonProps.shadow = new fabric.Shadow(objectData.shadow);
  }

  switch (objectData.type) {
    case 'Line':
      canvas.add(
        new fabric.Line(
          [objectData.x1 || 0, objectData.y1 || 0, objectData.x2 || 100, objectData.y2 || 100],
          {
            ...commonProps,
            strokeLineCap: objectData.strokeLineCap || 'round',
          }
        )
      );
      break;

    case 'Textbox': {
      const textbox = new fabric.Textbox(objectData.text || '', {
        ...commonProps,
        width: objectData.width,
        fontSize: objectData.fontSize,
        fontFamily: objectData.fontFamily,
        textAlign: objectData.textAlign,
        fontWeight: objectData.fontWeight || 'normal',
        fontStyle: objectData.fontStyle || 'normal',
        underline: objectData.underline || false,
        charSpacing: objectData.charSpacing || 0,
        lineHeight: objectData.lineHeight,
      });
      textbox.initDimensions();
      canvas.add(textbox);
      break;
    }

    case 'Image':
      if (!objectData.src || !objectData.src.startsWith('data:image')) return;
      {
        const imgEl = new Image();
        imgEl.src = objectData.src;
        imgEl.onload = () => {
          const fabricImg = new fabric.Image(imgEl, commonProps);
          canvas.add(fabricImg);
          canvas.renderAll();
        };
      }
      break;

    case 'Path':
      if (objectData.path) {
        // path can be array of path commands or string
        const pathStr = Array.isArray(objectData.path)
          ? objectData.path.map((cmd) => cmd.join(' ')).join(' ')
          : objectData.path;
        try {
          const path = new fabric.Path(pathStr, {
            ...commonProps,
            strokeLineJoin: objectData.strokeLineJoin || 'round',
            strokeLineCap: objectData.strokeLineCap || 'round',
          });
          canvas.add(path);
        } catch { /* invalid path */ }
      }
      break;

    case 'Rect':
      canvas.add(new fabric.Rect({
        ...commonProps,
        width: objectData.width || 80,
        height: objectData.height || 60,
        rx: objectData.rx || 0,
        ry: objectData.ry || 0,
      }));
      break;

    case 'Circle':
      canvas.add(new fabric.Circle({
        ...commonProps,
        radius: objectData.radius || 40,
      }));
      break;

    case 'Triangle':
      canvas.add(new fabric.Triangle({
        ...commonProps,
        width: objectData.width || 80,
        height: objectData.height || 80,
      }));
      break;

    case 'Ellipse':
      canvas.add(new fabric.Ellipse({
        ...commonProps,
        rx: objectData.rx || 50,
        ry: objectData.ry || 30,
      }));
      break;

    case 'Polygon':
      if (objectData.points) {
        canvas.add(new fabric.Polygon(objectData.points, commonProps));
      }
      break;

    default:
      // Fallback: try to use fabric.util.enlivenObjects for unknown types
      break;
  }
}
