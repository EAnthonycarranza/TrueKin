/**
 * ColorWheel – an HSV colour wheel (hue around, saturation outward) with a
 * brightness slider, a hex field and the native picker as a fallback.
 * Emits normalised '#rrggbb' strings via onChange while dragging.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { hexToRgb, normalizeHex } from './shirtColor';
import { rgbToHsv, hsvToRgb, hsvToHex } from './colorMath';

function drawWheel(canvas, v) {
  const size = canvas.width;
  const R = size / 2;
  const ctx = canvas.getContext('2d');
  const im = ctx.createImageData(size, size);
  const d = im.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - R;
      const dy = y + 0.5 - R;
      const r = Math.hypot(dx, dy);
      const i = (y * size + x) * 4;
      if (r > R + 0.5) continue;
      let h = (Math.atan2(dy, dx) * 180) / Math.PI;
      if (h < 0) h += 360;
      const { r: cr, g: cg, b: cb } = hsvToRgb(h, Math.min(1, r / R), v);
      d[i] = cr;
      d[i + 1] = cg;
      d[i + 2] = cb;
      d[i + 3] = Math.round(255 * Math.max(0, Math.min(1, R + 0.5 - r)));
    }
  }
  ctx.putImageData(im, 0, 0);
}

export default function ColorWheel({ value, onChange, size = 168 }) {
  const canvasRef = useRef(null);
  const dragging = useRef(false);
  const hex = normalizeHex(value) || '#d1d3d3';
  const hsv = useMemo(() => rgbToHsv(hexToRgb(hex)), [hex]);

  // Hue/saturation are lost in the hex once brightness or saturation hit zero;
  // the wheel's own interactions remember the last meaningful pair so the
  // marker does not jump to the centre when the tee goes black.
  const [heldHS, setHeldHS] = useState({ h: hsv.h, s: hsv.s });
  const h = hsv.s > 0.02 && hsv.v > 0.02 ? hsv.h : heldHS.h;
  const s = hsv.v > 0.02 ? hsv.s : heldHS.s;
  const v = hsv.v;

  // The hex field keeps the user's partial input until the colour changes elsewhere.
  const [hexEdit, setHexEdit] = useState({ base: hex, text: hex });
  const hexText = hexEdit.base === hex ? hexEdit.text : hex;

  const dpr = Math.min(2, window.devicePixelRatio || 1);
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    c.width = Math.round(size * dpr);
    c.height = Math.round(size * dpr);
    drawWheel(c, Math.max(0.15, v));
  }, [size, dpr, v]);

  const pick = useCallback((e) => {
    const c = canvasRef.current;
    if (!c) return;
    const rect = c.getBoundingClientRect();
    const R = rect.width / 2;
    const dx = e.clientX - rect.left - R;
    const dy = e.clientY - rect.top - R;
    let hue = (Math.atan2(dy, dx) * 180) / Math.PI;
    if (hue < 0) hue += 360;
    const sat = Math.min(1, Math.hypot(dx, dy) / R);
    setHeldHS({ h: hue, s: sat });
    onChange?.(hsvToHex(hue, sat, Math.max(0.15, v)));
  }, [onChange, v]);

  const R = size / 2;
  const marker = {
    left: R + Math.cos((h * Math.PI) / 180) * s * R,
    top: R + Math.sin((h * Math.PI) / 180) * s * R,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: size }}>
      <div style={{ position: 'relative', width: size, height: size, touchAction: 'none' }}>
        <canvas
          ref={canvasRef}
          style={{ width: size, height: size, borderRadius: '50%', cursor: 'crosshair', boxShadow: '0 0 0 1px rgba(0,0,0,0.12)' }}
          onPointerDown={(e) => { dragging.current = true; e.currentTarget.setPointerCapture(e.pointerId); pick(e); }}
          onPointerMove={(e) => { if (dragging.current) pick(e); }}
          onPointerUp={(e) => { dragging.current = false; e.currentTarget.releasePointerCapture(e.pointerId); }}
          onPointerCancel={() => { dragging.current = false; }}
        />
        <div
          style={{
            position: 'absolute', left: marker.left, top: marker.top, width: 14, height: 14,
            marginLeft: -7, marginTop: -7, borderRadius: '50%', background: hex,
            border: '2px solid #fff', boxShadow: '0 0 0 1px rgba(0,0,0,0.5)', pointerEvents: 'none',
          }}
        />
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#555' }}>
        Bright
        <input
          type="range" min={0} max={100} value={Math.round(v * 100)}
          onChange={(e) => { setHeldHS({ h, s }); onChange?.(hsvToHex(h, s, Number(e.target.value) / 100)); }}
          style={{ flex: 1, accentColor: hex, background: `linear-gradient(to right, #000, ${hsvToHex(h, s, 1)})`, borderRadius: 4, height: 8, appearance: 'auto' }}
        />
      </label>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <input
          type="color"
          value={hex}
          onChange={(e) => onChange?.(e.target.value)}
          title="System colour picker"
          style={{ width: 34, height: 30, padding: 0, border: '1px solid #d4d4d4', borderRadius: 6, background: '#fff', cursor: 'pointer' }}
        />
        <input
          value={hexText}
          onChange={(e) => {
            const n = normalizeHex(e.target.value);
            setHexEdit({ base: n || hex, text: e.target.value });
            if (n) onChange?.(n);
          }}
          spellCheck={false}
          style={{ flex: 1, minWidth: 0, padding: '6px 8px', fontSize: 13, fontFamily: 'ui-monospace, monospace', border: '1px solid #d4d4d4', borderRadius: 6 }}
        />
      </div>
    </div>
  );
}
