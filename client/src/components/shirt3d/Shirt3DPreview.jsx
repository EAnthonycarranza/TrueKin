/**
 * Shirt3DPreview – customer-facing, read-only view of a saved 3D design.
 *
 * Renders with the same colour-exact ShirtViewer the studio uses, so what the
 * customer sees is what the designer saw. Understands the studio's design data
 * (front/back/left/right prints) and legacy 3D designs (whole-canvas
 * frontTexture/backTexture), which it crops to the shared print zone.
 */
import { useEffect, useMemo, useState } from 'react';
import ShirtViewer from './ShirtViewer';
import { useFabricColor } from './shirtColor';
import { getPrintRectPx, VIEWS } from './printArea';

/** Crop a legacy whole-canvas texture down to the print zone. */
function cropLegacyTexture(dataURL) {
  return new Promise((resolve) => {
    if (!dataURL || dataURL.length < 500) { resolve(null); return; }
    const img = new Image();
    img.onload = () => {
      const rect = getPrintRectPx(img.naturalWidth, img.naturalHeight);
      const c = document.createElement('canvas');
      c.width = Math.round(rect.width);
      c.height = Math.round(rect.height);
      c.getContext('2d').drawImage(img, rect.left, rect.top, rect.width, rect.height, 0, 0, c.width, c.height);
      resolve(c.toDataURL('image/png'));
    };
    img.onerror = () => resolve(null);
    img.src = dataURL;
  });
}

export default function Shirt3DPreview({ designData, colorOverride, style = {}, height = 500 }) {
  const [view, setView] = useState('front');
  const [legacyPrints, setLegacyPrints] = useState({});

  const design = useMemo(() => {
    if (!designData) return null;
    try {
      return typeof designData === 'string' ? JSON.parse(designData) : designData;
    } catch {
      return null;
    }
  }, [designData]);

  const isStudio = !!design?.prints || !!design?.frontPrint || design?.studio === 'truking-3d';

  useEffect(() => {
    if (!design || isStudio) return undefined;
    let alive = true;
    Promise.all([cropLegacyTexture(design.frontTexture), cropLegacyTexture(design.backTexture)])
      .then(([front, back]) => { if (alive) setLegacyPrints({ front, back }); });
    return () => { alive = false; };
  }, [design, isStudio]);

  const nominal = colorOverride || design?.tshirtColor || '#FFFFFF';
  const fabricColor = useFabricColor(nominal, view === 'back' ? 'back' : 'front');

  const prints = useMemo(() => {
    if (!design) return {};
    if (!isStudio) return legacyPrints;
    return design.prints || { front: design.frontPrint || null, back: design.backPrint || null };
  }, [design, isStudio, legacyPrints]);

  if (!design) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400, background: '#f9fafb', borderRadius: 12, color: '#9ca3af', ...style }}>
        No design available
      </div>
    );
  }

  const hasSleevePrints = !!(prints.left || prints.right);
  const views = VIEWS.filter((v) => v.kind === 'body' || hasSleevePrints);

  return (
    <div style={{ borderRadius: 12, overflow: 'hidden', background: '#ffffff', border: '1px solid #eee', ...style }}>
      <div style={{ display: 'flex', gap: 8, padding: '10px 12px 6px', flexWrap: 'wrap' }}>
        {views.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setView(v.id)}
            className={`btn ${view === v.id ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            style={{ flex: 1 }}
          >
            {v.label}
          </button>
        ))}
      </div>
      <ShirtViewer
        fabricColor={fabricColor}
        prints={prints}
        view={view}
        height={height}
        background="#ffffff"
      />
    </div>
  );
}
