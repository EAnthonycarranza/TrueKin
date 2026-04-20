/**
 * ImageCropModal – Crops an uploaded image to a fixed 9:10 aspect ratio
 * matching the 2D editor snapshot resolution (900x1000 at 2x).
 *
 * Drag the crop box to reposition. Drag corner handles to resize.
 * Click "Crop & Add" to output the cropped image as a Blob.
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Crop, Check } from 'lucide-react';

const OUTPUT_W = 900;
const OUTPUT_H = 1000;
const ASPECT = OUTPUT_W / OUTPUT_H; // 0.9
const CONTAINER_W = 560;
const CONTAINER_H = 500;

export default function ImageCropModal({ file, onConfirm, onCancel }) {
  const imgRef = useRef(null);
  const containerRef = useRef(null);

  // Track image loaded state so JSX re-renders when imgRef is set
  const [imageReady, setImageReady] = useState(false);
  // Display dimensions (image scaled to fit modal)
  const [imgDisplay, setImgDisplay] = useState({ w: 0, h: 0, ox: 0, oy: 0 });
  // Keep a ref copy so handleConfirm always gets the latest values
  const imgDisplayRef = useRef({ w: 0, h: 0, ox: 0, oy: 0 });
  // Crop box in display coordinates
  const [crop, setCrop] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const cropRef = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const [dragging, setDragging] = useState(null); // null | 'move' | 'nw' | 'ne' | 'sw' | 'se'
  const dragStart = useRef({ mx: 0, my: 0, cx: 0, cy: 0, cw: 0, ch: 0 });

  // Keep refs in sync with state
  useEffect(() => { cropRef.current = crop; }, [crop]);
  useEffect(() => { imgDisplayRef.current = imgDisplay; }, [imgDisplay]);

  // Load image
  useEffect(() => {
    if (!file) return;
    setImageReady(false);
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setImageReady(true);
      layoutImage(img);
    };
    img.src = URL.createObjectURL(file);
    return () => URL.revokeObjectURL(img.src);
  }, [file]); // eslint-disable-line react-hooks/exhaustive-deps

  const layoutImage = (img) => {
    const scale = Math.min(CONTAINER_W / img.naturalWidth, CONTAINER_H / img.naturalHeight, 1);
    const w = img.naturalWidth * scale;
    const h = img.naturalHeight * scale;
    const ox = (CONTAINER_W - w) / 2;
    const oy = (CONTAINER_H - h) / 2;
    const display = { w, h, ox, oy };
    setImgDisplay(display);
    imgDisplayRef.current = display;

    // Initial crop: largest 9:10 box that fits the image
    let cw, ch;
    if (w / h > ASPECT) {
      ch = h * 0.85;
      cw = ch * ASPECT;
    } else {
      cw = w * 0.85;
      ch = cw / ASPECT;
    }
    const initialCrop = {
      x: ox + (w - cw) / 2,
      y: oy + (h - ch) / 2,
      w: cw,
      h: ch,
    };
    setCrop(initialCrop);
    cropRef.current = initialCrop;
  };

  // Clamp crop within image bounds
  const clampCrop = useCallback((c) => {
    const { ox, oy, w: iw, h: ih } = imgDisplayRef.current;
    if (iw === 0 || ih === 0) return c;
    let { x, y, w, h } = c;
    w = Math.max(60, Math.min(w, iw));
    h = w / ASPECT;
    if (h > ih) { h = ih; w = h * ASPECT; }
    x = Math.max(ox, Math.min(x, ox + iw - w));
    y = Math.max(oy, Math.min(y, oy + ih - h));
    return { x, y, w, h };
  }, []);

  // Mouse handlers
  const handleMouseDown = (e, type) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(type);
    const c = cropRef.current;
    dragStart.current = {
      mx: e.clientX,
      my: e.clientY,
      cx: c.x,
      cy: c.y,
      cw: c.w,
      ch: c.h,
    };
  };

  useEffect(() => {
    if (!dragging) return;

    const handleMove = (e) => {
      const dx = e.clientX - dragStart.current.mx;
      const dy = e.clientY - dragStart.current.my;
      const { cx, cy, cw, ch } = dragStart.current;

      let newCrop;
      if (dragging === 'move') {
        newCrop = clampCrop({ x: cx + dx, y: cy + dy, w: cw, h: ch });
      } else {
        // Corner resize — maintain aspect ratio
        let newW = cw;
        let newX = cx;
        let newY = cy;

        if (dragging === 'se') {
          newW = Math.max(60, cw + dx);
        } else if (dragging === 'sw') {
          newW = Math.max(60, cw - dx);
          newX = cx + cw - newW;
        } else if (dragging === 'ne') {
          newW = Math.max(60, cw + dx);
          newY = cy + ch - (newW / ASPECT);
        } else if (dragging === 'nw') {
          newW = Math.max(60, cw - dx);
          newX = cx + cw - newW;
          newY = cy + ch - (newW / ASPECT);
        }

        newCrop = clampCrop({ x: newX, y: newY, w: newW, h: newW / ASPECT });
      }

      setCrop(newCrop);
      cropRef.current = newCrop;
    };

    const handleUp = () => setDragging(null);

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [dragging, clampCrop]);

  // Crop and output
  const handleConfirm = () => {
    const img = imgRef.current;
    if (!img) return;

    // Two-canvas approach at high resolution — guarantees output matches
    // the visual crop selection exactly, immune to any CSS layout quirks.

    // Compute the display layout (same math as layoutImage)
    const scale = Math.min(CONTAINER_W / img.naturalWidth, CONTAINER_H / img.naturalHeight, 1);
    const dispW = img.naturalWidth * scale;
    const dispH = img.naturalHeight * scale;
    const ox = (CONTAINER_W - dispW) / 2;
    const oy = (CONTAINER_H - dispH) / 2;

    // Use a high-res intermediate canvas (the larger of natural resolution
    // or 3× display) so the crop never loses quality
    const hiScale = Math.max(img.naturalWidth / CONTAINER_W, img.naturalHeight / CONTAINER_H, 3);
    const viewCanvas = document.createElement('canvas');
    viewCanvas.width = Math.round(CONTAINER_W * hiScale);
    viewCanvas.height = Math.round(CONTAINER_H * hiScale);
    const viewCtx = viewCanvas.getContext('2d');
    viewCtx.scale(hiScale, hiScale);
    // Draw image at the same display position/size as the modal shows it
    viewCtx.drawImage(img, ox, oy, dispW, dispH);

    // Extract exactly what's inside the crop box
    const c = cropRef.current;
    const outCanvas = document.createElement('canvas');
    outCanvas.width = OUTPUT_W;
    outCanvas.height = OUTPUT_H;
    const outCtx = outCanvas.getContext('2d');
    // Source coords scaled to hi-res canvas, destination is the full output
    outCtx.drawImage(
      viewCanvas,
      c.x * hiScale, c.y * hiScale, c.w * hiScale, c.h * hiScale,
      0, 0, OUTPUT_W, OUTPUT_H,
    );

    outCanvas.toBlob((blob) => {
      if (blob) onConfirm(blob);
    }, 'image/png', 1);
  };

  const handleSize = 10;
  const handles = [
    { key: 'nw', style: { left: -handleSize / 2, top: -handleSize / 2, cursor: 'nw-resize' } },
    { key: 'ne', style: { right: -handleSize / 2, top: -handleSize / 2, cursor: 'ne-resize' } },
    { key: 'sw', style: { left: -handleSize / 2, bottom: -handleSize / 2, cursor: 'sw-resize' } },
    { key: 'se', style: { right: -handleSize / 2, bottom: -handleSize / 2, cursor: 'se-resize' } },
  ];

  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        <div style={s.header}>
          <div style={s.headerTitle}>
            <Crop size={18} />
            <span>Crop Image</span>
          </div>
          <button type="button" onClick={onCancel} style={s.closeBtn}>
            <X size={18} />
          </button>
        </div>

        <p style={s.hint}>
          Drag to reposition. Drag corners to resize. Fixed 9:10 ratio to match product previews.
        </p>

        {/* Crop area */}
        <div
          ref={containerRef}
          style={{ ...s.cropContainer, width: CONTAINER_W, height: CONTAINER_H }}
        >
          {/* Image */}
          {imageReady && imgRef.current && (
            <img
              src={imgRef.current.src}
              alt=""
              style={{
                position: 'absolute',
                left: imgDisplay.ox,
                top: imgDisplay.oy,
                width: imgDisplay.w,
                height: imgDisplay.h,
                maxWidth: 'none',       // override global img { max-width: 100% }
                pointerEvents: 'none',
                userSelect: 'none',
              }}
              draggable={false}
            />
          )}

          {/* Dark overlay outside crop */}
          <svg
            width={CONTAINER_W}
            height={CONTAINER_H}
            style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
          >
            <defs>
              <mask id="cropMask">
                <rect width="100%" height="100%" fill="white" />
                <rect
                  x={crop.x}
                  y={crop.y}
                  width={crop.w}
                  height={crop.h}
                  fill="black"
                />
              </mask>
            </defs>
            <rect
              width="100%"
              height="100%"
              fill="rgba(0,0,0,0.5)"
              mask="url(#cropMask)"
            />
          </svg>

          {/* Crop box border + handles */}
          <div
            style={{
              position: 'absolute',
              left: crop.x,
              top: crop.y,
              width: crop.w,
              height: crop.h,
              border: '2px solid #fff',
              boxShadow: '0 0 0 1px rgba(0,0,0,0.3)',
              cursor: 'move',
            }}
            onMouseDown={(e) => handleMouseDown(e, 'move')}
          >
            {/* Grid lines */}
            <div style={{ ...s.gridLine, left: '33.33%', top: 0, bottom: 0, width: 1 }} />
            <div style={{ ...s.gridLine, left: '66.66%', top: 0, bottom: 0, width: 1 }} />
            <div style={{ ...s.gridLine, top: '33.33%', left: 0, right: 0, height: 1 }} />
            <div style={{ ...s.gridLine, top: '66.66%', left: 0, right: 0, height: 1 }} />

            {/* Corner handles */}
            {handles.map(({ key, style }) => (
              <div
                key={key}
                style={{
                  position: 'absolute',
                  width: handleSize,
                  height: handleSize,
                  background: '#fff',
                  border: '1px solid #333',
                  borderRadius: 2,
                  ...style,
                }}
                onMouseDown={(e) => handleMouseDown(e, key)}
              />
            ))}

            {/* Dimension label */}
            <div style={s.dimLabel}>
              {OUTPUT_W}&times;{OUTPUT_H}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={s.actions}>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={handleConfirm}>
            <Check size={16} />
            Crop &amp; Add
          </button>
        </div>
      </div>
    </div>
  );
}

const s = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  modal: {
    background: '#fff',
    borderRadius: 12,
    padding: 24,
    maxWidth: 620,
    width: '95vw',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 16,
    fontWeight: 600,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#666',
    padding: 4,
  },
  hint: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 12,
  },
  cropContainer: {
    position: 'relative',
    overflow: 'hidden',
    background: '#1a1a1a',
    borderRadius: 8,
    marginBottom: 16,
    userSelect: 'none',
  },
  gridLine: {
    position: 'absolute',
    background: 'rgba(255,255,255,0.25)',
    pointerEvents: 'none',
  },
  dimLabel: {
    position: 'absolute',
    bottom: 6,
    right: 8,
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    background: 'rgba(0,0,0,0.4)',
    padding: '1px 6px',
    borderRadius: 4,
    pointerEvents: 'none',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 8,
  },
};
