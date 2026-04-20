/**
 * Tshirt2DPreview – Customer-facing read-only 2D t-shirt preview.
 *
 * Displays a composited 2D view of the design using per-color photorealistic
 * mockup images + design textures overlaid on top.
 * Includes front/back toggle. No Three.js dependencies.
 *
 * Designed for products created with the 2D editor.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { CANVAS_CONFIG } from './designerConstants';
import { getMockupUrl } from './designerMockups';

export default function Tshirt2DPreview({ designData, colorOverride, style = {} }) {
  const [design, setDesign] = useState(null);
  const [activeView, setActiveView] = useState('front');
  const canvasRef = useRef(null);
  const mockupCacheRef = useRef({}); // Cache loaded mockup images
  const [renderKey, setRenderKey] = useState(0); // Force re-render trigger

  // Parse design data
  useEffect(() => {
    if (!designData) return;
    try {
      const data = typeof designData === 'string' ? JSON.parse(designData) : designData;
      setDesign(data);
    } catch {
      setDesign(null);
    }
  }, [designData]);

  // Load the mockup image for the current view + color
  const loadMockup = useCallback((color, side) => {
    const url = getMockupUrl(color, side);
    if (!url) return null;

    // Return cached if already loaded
    if (mockupCacheRef.current[url]) return mockupCacheRef.current[url];

    // Start loading
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      mockupCacheRef.current[url] = img;
      setRenderKey((k) => k + 1); // Trigger re-render
    };
    img.src = url;
    return null; // Not ready yet
  }, []);

  // Render the composite (mockup + design texture)
  const renderComposite = useCallback(() => {
    if (!design || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    // Clear and fill background
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#f9fafb';
    ctx.fillRect(0, 0, w, h);

    // Load and draw the per-color mockup image (no tinting needed)
    // colorOverride lets customers preview different shirt colors
    const color = colorOverride || design.tshirtColor || '#FFFFFF';
    const mockupImg = loadMockup(color, activeView);

    if (mockupImg) {
      const imgW = mockupImg.naturalWidth || mockupImg.width;
      const imgH = mockupImg.naturalHeight || mockupImg.height;
      const scale = Math.min(w / imgW, h / imgH);
      const iw = imgW * scale;
      const ih = imgH * scale;
      const ix = (w - iw) / 2;
      const iy = (h - ih) / 2;
      ctx.drawImage(mockupImg, ix, iy, iw, ih);
    }

    // Overlay the design texture (Fabric.js canvas export)
    const textureURL = activeView === 'front' ? design.frontTexture : design.backTexture;
    if (textureURL) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, w, h);
      };
      img.src = textureURL;
    }
  }, [design, activeView, loadMockup, renderKey, colorOverride]);

  useEffect(() => {
    renderComposite();
  }, [renderComposite]);

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

  return (
    <div style={{ borderRadius: 12, overflow: 'hidden', background: '#f9fafb', ...style }}>
      {/* Front/Back toggle */}
      <div style={{ display: 'flex', gap: 8, padding: '10px 12px 6px' }}>
        <button
          onClick={() => setActiveView('front')}
          className={`btn ${activeView === 'front' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          style={{ flex: 1 }}
        >
          Front
        </button>
        <button
          onClick={() => setActiveView('back')}
          className={`btn ${activeView === 'back' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          style={{ flex: 1 }}
        >
          Back
        </button>
      </div>

      {/* Composite canvas */}
      <canvas
        ref={canvasRef}
        width={CANVAS_CONFIG.width}
        height={CANVAS_CONFIG.height}
        style={{ width: '100%', height: 'auto', display: 'block', padding: '0 8px 8px' }}
      />
    </div>
  );
}
