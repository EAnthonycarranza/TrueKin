import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { LoaderCircle, LockKeyhole, RefreshCw } from 'lucide-react';
import CanvasEngine from './canvasEngine';
import { BOARD, surfaceInfo } from './studioDocument';
import { renderMockup } from './mockups';

const StudioCanvas = forwardRef(function StudioCanvas({ initialDocument, view, color, guides, snap, onChange, onError }, ref) {
  const element = useRef(null), host = useRef(null), mockup = useRef(null), engine = useRef(null);
  const callbacks = useRef({ onChange, onError });
  const [photoState, setPhotoState] = useState({ loading: true, error: false });
  const [retry, setRetry] = useState(0);
  const [alignment, setAlignment] = useState(null);
  useEffect(() => { callbacks.current = { onChange, onError }; }, [onChange, onError]);
  useImperativeHandle(ref, () => ({ getEngine: () => engine.current }), []);

  useEffect(() => {
    // Own the native canvas element per mount; Fabric's async disposal cannot
    // race the next StrictMode mount on the same DOM node.
    const node = document.createElement('canvas');
    element.current.appendChild(node);
    let mounted = true;
    const e = new CanvasEngine(node, initialDocument, value => callbacks.current.onChange(value), error => callbacks.current.onError(error), value => { if (mounted) setAlignment(value); });
    engine.current = e;
    const resize = () => { if (host.current) e.resize(host.current.clientWidth); };
    const observer = new ResizeObserver(resize);
    observer.observe(host.current); resize();
    return () => {
      mounted = false;
      observer.disconnect();
      e.dispose();
      engine.current = null;
      // Fabric unwraps this canvas synchronously on dispose. Its new parent is
      // our React-owned host, which must survive StrictMode's second mount.
      node.remove();
    };
  }, [initialDocument]);

  useEffect(() => {
    const e = engine.current;
    if (!e) return;
    e.ready.then(() => { if (!e.disposed && e.view !== view) e.loadView(view); });
  }, [view, initialDocument]);

  useEffect(() => { engine.current?.setSnap(snap); }, [snap, initialDocument]);
  useEffect(() => { const e = engine.current; if (e && e.document.garmentColor !== color) e.setColor(color); }, [color, initialDocument]);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => { if (!cancelled) setPhotoState({ loading: true, error: false }); });
    renderMockup(initialDocument.productType, view, color).then(canvas => {
      if (cancelled || !mockup.current) return;
      const ctx = mockup.current.getContext('2d');
      ctx.clearRect(0, 0, BOARD.width, BOARD.height);
      ctx.drawImage(canvas, 0, 0);
      setPhotoState({ loading: false, error: false });
    }).catch(() => { if (!cancelled) setPhotoState({ loading: false, error: true }); });
    return () => { cancelled = true; };
  }, [initialDocument.productType, view, color, retry]);

  const { area } = surfaceInfo(initialDocument.productType, view);
  return <div className="us-artboard" ref={host}>
    <canvas className="us-product-photo" ref={mockup} width={BOARD.width} height={BOARD.height} aria-hidden="true" />
    <div className="us-fabric-host" ref={element} />
    {guides && <div className="us-print-guide" style={{ left: `${area.x * 100}%`, top: `${area.y * 100}%`, width: `${area.w * 100}%`, height: `${area.h * 100}%` }}><span>PRINT AREA</span></div>}
    {snap && alignment && <div className={`us-snap-overlay is-${alignment.phase}`}>
      <svg className="us-snap-lines" viewBox={`0 0 ${BOARD.width} ${BOARD.height}`} aria-hidden="true">
        {alignment.guides.map((guide, index) => {
          const coordinates = guide.axis === 'x'
            ? { x1: guide.at, x2: guide.at, y1: Math.max(0, guide.from - 16), y2: Math.min(BOARD.height, guide.to + 16) }
            : { y1: guide.at, y2: guide.at, x1: Math.max(0, guide.from - 16), x2: Math.min(BOARD.width, guide.to + 16) };
          return <g key={`${guide.axis}-${index}`}>
            <line {...coordinates} className="us-snap-line-halo" vectorEffect="non-scaling-stroke" />
            <line {...coordinates} className="us-snap-line" vectorEffect="non-scaling-stroke" />
          </g>;
        })}
      </svg>
      <div className="us-snap-status" role="status" aria-live="polite" aria-atomic="true">
        <LockKeyhole size={13} aria-hidden="true" />
        <span>{alignment.label}<small>{alignment.phase === 'settled' ? 'Aligned — use Lock layer to keep it here' : 'Snap held · pull away to release'}</small></span>
      </div>
    </div>}
    {photoState.loading && <div className="us-stage-progress" role="status"><LoaderCircle size={15} className="us-spin" /> Preparing product</div>}
    {photoState.error && <div className="us-photo-error" role="alert"><span>Product photo could not load.</span><button type="button" onClick={() => setRetry(r => r + 1)}><RefreshCw size={14} /> Retry</button></div>}
  </div>;
});
export default StudioCanvas;
