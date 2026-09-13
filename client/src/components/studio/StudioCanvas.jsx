import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { LoaderCircle, RefreshCw } from 'lucide-react';
import CanvasEngine from './canvasEngine';
import { BOARD, surfaceInfo } from './studioDocument';
import { renderMockup } from './mockups';

const StudioCanvas = forwardRef(function StudioCanvas({ initialDocument, view, color, guides, snap, onChange, onError }, ref) {
  const element = useRef(null), host = useRef(null), mockup = useRef(null), engine = useRef(null);
  const callbacks = useRef({ onChange, onError });
  const [photoState, setPhotoState] = useState({ loading: true, error: false });
  const [retry, setRetry] = useState(0);
  useEffect(() => { callbacks.current = { onChange, onError }; }, [onChange, onError]);
  useImperativeHandle(ref, () => ({ getEngine: () => engine.current }), []);

  useEffect(() => {
    // Own the native canvas element per mount; Fabric's async disposal cannot
    // race the next StrictMode mount on the same DOM node.
    const node = document.createElement('canvas');
    element.current.appendChild(node);
    const e = new CanvasEngine(node, initialDocument, value => callbacks.current.onChange(value), error => callbacks.current.onError(error));
    engine.current = e;
    const resize = () => { if (host.current) e.resize(host.current.clientWidth); };
    const observer = new ResizeObserver(resize);
    observer.observe(host.current); resize();
    return () => {
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

  useEffect(() => { if (engine.current) engine.current.snap = snap; }, [snap, initialDocument]);
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
    {photoState.loading && <div className="us-stage-progress" role="status"><LoaderCircle size={15} className="us-spin" /> Preparing product</div>}
    {photoState.error && <div className="us-photo-error" role="alert"><span>Product photo could not load.</span><button type="button" onClick={() => setRetry(r => r + 1)}><RefreshCw size={14} /> Retry</button></div>}
  </div>;
});
export default StudioCanvas;
