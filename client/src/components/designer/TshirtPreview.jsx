/**
 * TshirtPreview – Customer-facing read-only 3D t-shirt preview.
 * Parses the stored designData and renders an interactive
 * 3D view that can be orbited/zoomed but not edited.
 *
 * Now supports the new Fabric.js-based design data format:
 *   { tshirtColor, frontTexture, backTexture, frontObjects, backObjects }
 *
 * Also backwards-compatible with the old format:
 *   { color: {r,g,b}, logo, full, isLogo, isFull, ... }
 *
 * Truekin is unisex-only, so any legacy `shirtStyle` on a saved design is
 * ignored — every product renders on the one unisex cut.
 */
import { useState, useEffect } from 'react';
import TshirtCanvas from './TshirtCanvas';

export default function TshirtPreview({ designData, colorOverride, style = {} }) {
  const [design, setDesign] = useState(null);

  useEffect(() => {
    if (designData) {
      try {
        const data = typeof designData === 'string' ? JSON.parse(designData) : designData;
        setDesign(data);
      } catch {
        setDesign(null);
      }
    }
  }, [designData]);

  if (!design) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 400,
          background: '#f9fafb',
          borderRadius: 12,
          color: '#9ca3af',
          ...style,
        }}
      >
        No design available
      </div>
    );
  }

  // New format (Fabric.js based)
  if (design.tshirtColor !== undefined) {
    return (
      <div style={{ borderRadius: 12, overflow: 'hidden', background: '#f0f0f0', ...style }}>
        <TshirtCanvas
          tshirtColor={colorOverride || design.tshirtColor}
          frontTexture={design.frontTexture || null}
          backTexture={design.backTexture || null}
          height={500}
        />
      </div>
    );
  }

  // Legacy format (old TDesigner: color as {r,g,b}, logo/full as data URLs)
  const c = design.color || { r: 255, g: 255, b: 255 };
  const hexColor = `#${((1 << 24) | (c.r << 16) | (c.g << 8) | c.b).toString(16).slice(1)}`;

  return (
    <div style={{ borderRadius: 12, overflow: 'hidden', background: '#f0f0f0', ...style }}>
      <TshirtCanvas
        tshirtColor={colorOverride || hexColor}
        frontTexture={design.isLogo ? design.logo : design.isFull ? design.full : null}
        height={500}
      />
    </div>
  );
}
