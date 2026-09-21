import { Component, Suspense, forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, OrbitControls, useGLTF } from '@react-three/drei';
import { Box, RotateCcw } from 'lucide-react';
import * as THREE from 'three';
import { MODEL_PATH, computeShirtLayout } from '../shirt3d/shirtLayout';
import { PRINT_DEPTH, SLEEVE_PRINT_DEPTH } from '../shirt3d/printArea';
import { createBrimEdgeGeometry, createBrimGeometry, createBrimStitchGeometry, createCrownGeometry, createCrownLiningGeometry, createCrownRimGeometry, createSweatbandGeometry, createFabricTexture, createHatPrintGeometry, createSeamGeometry, crownPoint } from './hatGeometry';
import { createShirtPrintGeometry } from './shirtPrintGeometry';

const ANGLES = { front: 0, back: Math.PI, left: Math.PI / 2, right: -Math.PI / 2 };
const overlayStyle = { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, padding: 24, textAlign: 'center', color: '#77756d', fontSize: 13 };

class PreviewBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error) { this.props.onFailure?.(); console.error('Product preview could not render:', error); }
  render() {
    if (this.state.failed) return (
      <div style={overlayStyle} role="alert">
        <Box size={28} aria-hidden="true" />
        <strong style={{ color: '#292922' }}>3D preview is unavailable</strong>
        <span>{this.props.customerView ? 'You can still browse the product photos.' : 'Your design is safe. You can keep editing in 2D.'}</span>
        <button type="button" className="btn btn-secondary btn-sm" onClick={this.props.onRetry}><RotateCcw size={16} /> Try again</button>
      </div>
    );
    return this.props.children;
  }
}

function useArtworkTexture(source) {
  const [loaded, setLoaded] = useState(null);
  const anisotropy = useThree(state => state.gl.capabilities.getMaxAnisotropy());
  useEffect(() => {
    if (!source) return undefined;
    let active = true;
    let texture = null;
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      if (!active) return;
      texture = new THREE.Texture(image);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(anisotropy, 8);
      texture.needsUpdate = true;
      setLoaded({ source, texture });
    };
    image.src = source;
    return () => {
      active = false;
      image.onload = null;
      texture?.dispose();
    };
  }, [source, anisotropy]);
  return source && loaded?.source === source ? loaded.texture : null;
}

function ShirtPrint({ source, placement, depth, shirtGeometry }) {
  const texture = useArtworkTexture(source);
  const geometry = useMemo(() => createShirtPrintGeometry(shirtGeometry, placement, depth), [shirtGeometry, placement, depth]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  if (!texture) return null;
  return (
    <mesh geometry={geometry} renderOrder={2}>
      <meshStandardMaterial map={texture} roughness={1} transparent depthWrite={false} polygonOffset polygonOffsetFactor={-6} polygonOffsetUnits={-4} side={THREE.FrontSide} />
    </mesh>
  );
}

function TShirt({ color, prints }) {
  const { nodes, materials } = useGLTF(MODEL_PATH);
  // Own the geometry instance so Canvas may dispose it without invalidating
  // the cached model used by another preview or a later studio session.
  const geometry = useMemo(() => nodes.T_Shirt_male.geometry.clone(), [nodes]);
  const layout = useMemo(() => computeShirtLayout(geometry), [geometry]);
  const sourceMaterial = materials.lambert1;
  return (
    <group scale={1.65 / layout.height}>
      <mesh geometry={geometry} position={layout.center.clone().negate().toArray()}>
        <meshStandardMaterial color={color} roughness={0.96} metalness={0} normalMap={sourceMaterial?.normalMap} normalScale={[0.25, 0.25]} aoMap={sourceMaterial?.aoMap} aoMapIntensity={0.45} side={THREE.DoubleSide} />
        {Object.entries(prints).filter(([side, source]) => source && layout[side]).map(([side, source]) => (
          <ShirtPrint key={side} source={source} placement={layout[side]} depth={side === 'left' || side === 'right' ? SLEEVE_PRINT_DEPTH : PRINT_DEPTH} shirtGeometry={geometry} />
        ))}
      </mesh>
    </group>
  );
}

function HatArtwork({ source }) {
  const texture = useArtworkTexture(source);
  const geometry = useMemo(() => createHatPrintGeometry(), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  if (!texture) return null;
  return <mesh geometry={geometry} renderOrder={2}><meshStandardMaterial map={texture} transparent roughness={1} depthWrite={false} polygonOffset polygonOffsetFactor={-4} side={THREE.DoubleSide} /></mesh>;
}

function BaseballHat({ color, prints }) {
  const pieces = useMemo(() => ({
    crown: createCrownGeometry(),
    lining: createCrownLiningGeometry(),
    rim: createCrownRimGeometry(),
    band: createSweatbandGeometry(),
    brim: createBrimGeometry(),
    underside: createBrimGeometry(true),
    edge: createBrimEdgeGeometry(),
    fabric: createFabricTexture(),
    seams: Array.from({ length: 6 }, (_, i) => [createSeamGeometry(i * Math.PI / 3, -0.008), createSeamGeometry(i * Math.PI / 3, 0.008)]).flat(),
    stitches: [0.70, 0.80, 0.90, 0.975].map(createBrimStitchGeometry),
  }), []);
  useEffect(() => () => {
    pieces.crown.dispose(); pieces.brim.dispose(); pieces.underside.dispose(); pieces.edge.dispose(); pieces.fabric.dispose();
    pieces.lining.dispose(); pieces.rim.dispose(); pieces.band.dispose();
    pieces.seams.forEach(geometry => geometry.dispose());
    pieces.stitches.forEach(geometry => geometry.dispose());
  }, [pieces]);
  const seamColor = useMemo(() => new THREE.Color(color).multiplyScalar(0.73), [color]);
  const undersideColor = useMemo(() => new THREE.Color(color).multiplyScalar(0.82), [color]);
  const liningColor = useMemo(() => new THREE.Color(color).multiplyScalar(0.48), [color]);
  const eyelets = useMemo(() => Array.from({ length: 6 }, (_, i) => {
    const point = crownPoint(0.80, Math.PI / 6 + i * Math.PI / 3, 0.007);
    const normal = new THREE.Vector3(point.x / 0.75, (point.y + 0.26) / 0.91, point.z / 0.70).normalize();
    return { point, rotation: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal) };
  }), []);
  return (
    <group position={[0, -0.01, -0.23]}>
      <mesh geometry={pieces.crown}><meshStandardMaterial color={color} roughness={0.96} bumpMap={pieces.fabric} bumpScale={0.008} /></mesh>
      <mesh geometry={pieces.lining}><meshStandardMaterial color={liningColor} roughness={1} bumpMap={pieces.fabric} bumpScale={0.005} /></mesh>
      <mesh geometry={pieces.rim}><meshStandardMaterial color={seamColor} roughness={1} /></mesh>
      <mesh geometry={pieces.band}><meshStandardMaterial color="#252722" roughness={1} /></mesh>
      <mesh geometry={pieces.brim}><meshStandardMaterial color={color} roughness={0.97} bumpMap={pieces.fabric} bumpScale={0.006} /></mesh>
      <mesh geometry={pieces.underside}><meshStandardMaterial color={undersideColor} roughness={1} /></mesh>
      <mesh geometry={pieces.edge}><meshStandardMaterial color={seamColor} roughness={1} /></mesh>
      {[...pieces.seams, ...pieces.stitches].map((geometry, i) => <mesh key={i} geometry={geometry}><meshStandardMaterial color={seamColor} roughness={1} /></mesh>)}
      <mesh position={[0, 0.66, 0]} scale={[1, 0.48, 1]}><sphereGeometry args={[0.061, 24, 16]} /><meshStandardMaterial color={color} roughness={1} /></mesh>
      {eyelets.map(({ point, rotation }, i) => (
        <group key={i} position={point} quaternion={rotation}>
          <mesh><circleGeometry args={[0.0105, 16]} /><meshStandardMaterial color={seamColor} roughness={1} /></mesh>
          <mesh position={[0, 0, 0.001]}><torusGeometry args={[0.013, 0.0037, 6, 20]} /><meshStandardMaterial color={color} roughness={1} /></mesh>
        </group>
      ))}
      <HatArtwork source={prints.front} />
    </group>
  );
}

function stickerShape() {
  const width = 1.64, height = 1.64, radius = 0.14;
  const x = -width / 2, y = -height / 2;
  const shape = new THREE.Shape();
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  return shape;
}

function stickerFaceGeometry(shape) {
  const geometry = new THREE.ShapeGeometry(shape, 16);
  const positions = geometry.getAttribute('position');
  const uvs = geometry.getAttribute('uv');
  for (let i = 0; i < positions.count; i += 1) {
    uvs.setXY(i, positions.getX(i) / 1.64 + 0.5, positions.getY(i) / 1.64 + 0.5);
  }
  uvs.needsUpdate = true;
  return geometry;
}

function StickerArtwork({ source, geometry }) {
  const texture = useArtworkTexture(source);
  if (!texture) return null;
  return (
    <mesh geometry={geometry} position={[0, 0, 0.083]} renderOrder={3}>
      <meshStandardMaterial map={texture} transparent roughness={0.72} metalness={0} depthWrite={false} polygonOffset polygonOffsetFactor={-5} />
    </mesh>
  );
}

function StickerModel({ color, prints }) {
  const shape = useMemo(() => stickerShape(), []);
  const faceGeometry = useMemo(() => stickerFaceGeometry(shape), [shape]);
  const edgeColor = useMemo(() => new THREE.Color(color).multiplyScalar(0.76), [color]);
  return (
    <group rotation={[-0.045, 0.08, -0.02]}>
      <mesh position={[0, 0, -0.05]}>
        <extrudeGeometry args={[shape, { depth: 0.1, bevelEnabled: true, bevelSegments: 4, steps: 1, bevelSize: 0.025, bevelThickness: 0.018 }]} />
        <meshStandardMaterial color={edgeColor} roughness={0.92} metalness={0} />
      </mesh>
      <mesh geometry={faceGeometry} position={[0, 0, -0.071]} renderOrder={1}>
        <meshStandardMaterial color="#e7e4dc" roughness={1} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={faceGeometry} position={[0, 0, 0.080]} renderOrder={2}>
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      <StickerArtwork source={prints.front} geometry={faceGeometry} />
      <mesh geometry={faceGeometry} position={[0, 0, 0.087]} renderOrder={4}>
        <meshPhysicalMaterial color="#ffffff" transparent opacity={0.08} roughness={0.3} clearcoat={0.5} clearcoatRoughness={0.35} depthWrite={false} />
      </mesh>
    </group>
  );
}

function CameraRig({ view, productType, controlsRef, resetToken }) {
  const goal = useRef(null);
  const size = useThree(state => state.size);
  useEffect(() => {
    goal.current = { theta: ANGLES[view] ?? 0, resetDistance: true };
  }, [view, productType, size.width, size.height, resetToken]);
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return undefined;
    const stopTransition = () => { goal.current = null; };
    controls.addEventListener('start', stopTransition);
    return () => controls.removeEventListener('start', stopTransition);
  }, [controlsRef]);
  useFrame(({ camera }, delta) => {
    const controls = controlsRef.current;
    const target = goal.current;
    if (!controls || !target) return;
    const spherical = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
    const aspect = Math.max(0.45, size.width / size.height);
    const desiredDistance = productType === 'hat'
      ? Math.max(3.8, 2.6 / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * aspect))
      : productType === 'sticker' ? Math.max(3.05, 2.1 / aspect) : Math.max(3.65, 2.3 / aspect);
    const diff = Math.atan2(Math.sin(target.theta - spherical.theta), Math.cos(target.theta - spherical.theta));
    spherical.theta += diff * Math.min(1, delta * 10);
    spherical.phi = THREE.MathUtils.lerp(spherical.phi, productType === 'hat' ? 1.31 : 1.52, Math.min(1, delta * 10));
    spherical.radius = THREE.MathUtils.lerp(spherical.radius, desiredDistance, Math.min(1, delta * 10));
    camera.position.setFromSpherical(spherical).add(controls.target);
    camera.lookAt(controls.target);
    controls.update();
    if (Math.abs(diff) < 0.002 && Math.abs(spherical.radius - desiredDistance) < 0.005) goal.current = null;
  });
  return null;
}

const RenderBridge = forwardRef(function RenderBridge({ onReady, onContextLost }, ref) {
  const { gl, camera, scene } = useThree();
  useImperativeHandle(ref, () => ({
    snapshot: () => {
      if (gl.getContext().isContextLost()) return null;
      gl.render(scene, camera);
      try { return gl.domElement.toDataURL('image/png'); } catch { return null; }
    },
  }), [gl, camera, scene]);
  useEffect(() => {
    onReady();
    const canvas = gl.domElement;
    const handleLoss = event => { event.preventDefault(); onContextLost(); };
    canvas.addEventListener('webglcontextlost', handleLoss);
    return () => canvas.removeEventListener('webglcontextlost', handleLoss);
  }, [gl, onReady, onContextLost]);
  return null;
});

const ProductViewer = forwardRef(function ProductViewer({ productType = 'tshirt', color = '#f4f1ea', prints = {}, view = 'front', autoRotate = false, interactive = true, onReady, customerView = false, className = '', style }, ref) {
  const bridgeRef = useRef(null);
  const controlsRef = useRef(null);
  const readyCallback = useRef(onReady);
  const [generation, setGeneration] = useState(0);
  const [resetToken, setResetToken] = useState(0);
  const [readyScene, setReadyScene] = useState(null);
  const [lostScene, setLostScene] = useState(null);
  const sceneKey = `${productType}-${generation}`;
  useEffect(() => { readyCallback.current = onReady; }, [onReady]);
  const handleReady = useCallback(() => { setReadyScene(sceneKey); readyCallback.current?.(); }, [sceneKey]);
  const handleFailure = useCallback(() => setReadyScene(sceneKey), [sceneKey]);
  const handleLoss = useCallback(() => setLostScene(sceneKey), [sceneKey]);
  const retry = () => { useGLTF.clear(MODEL_PATH); setGeneration(value => value + 1); };
  useImperativeHandle(ref, () => ({ snapshot: () => bridgeRef.current?.snapshot() ?? null }), []);
  return (
    <div className={`tk-product-viewer ${className}`} style={{ position: 'relative', width: '100%', height: '100%', minHeight: 220, overflow: 'hidden', ...style }} aria-label={`Interactive 3D ${productType === 'hat' ? 'hat' : productType === 'sticker' ? 'sticker' : 'T-shirt'} preview`}>
      {readyScene !== sceneKey && <div style={{ ...overlayStyle, pointerEvents: 'none' }} role="status"><Box size={24} aria-hidden="true" /><span>Preparing your 3D preview…</span></div>}
      {lostScene === sceneKey ? (
        <div style={overlayStyle} role="alert"><strong>3D preview paused</strong><span>{customerView ? 'Reload the preview or return to the product photos.' : 'Your artwork is still saved in the editor.'}</span><button type="button" className="btn btn-secondary btn-sm" onClick={retry}><RotateCcw size={16} /> Reload preview</button></div>
      ) : (
        <PreviewBoundary key={sceneKey} onRetry={retry} onFailure={handleFailure} customerView={customerView}>
          <Canvas key={sceneKey} dpr={[1, 1.75]} camera={{ position: [0, 0.25, 3.65], fov: 32, near: 0.05, far: 30 }} gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' }} onCreated={({ gl }) => { gl.outputColorSpace = THREE.SRGBColorSpace; gl.toneMapping = THREE.NoToneMapping; gl.setClearColor(0, 0); }} style={{ width: '100%', height: '100%', touchAction: interactive ? 'none' : 'auto' }}>
            <Suspense fallback={null}>
              <ambientLight intensity={0.85} />
              <directionalLight position={[3, 4, 5]} intensity={1.6} color="#fffdf8" />
              <directionalLight position={[-4, 1, 2]} intensity={0.65} color="#f1f5ff" />
              <directionalLight position={[2, 3, -4]} intensity={1.0} />
              {productType === 'hat' ? <BaseballHat color={color} prints={prints} /> : productType === 'sticker' ? <StickerModel color={color} prints={prints} /> : <TShirt color={color} prints={prints} />}
              <ContactShadows position={[0, productType === 'hat' ? -0.56 : productType === 'sticker' ? -0.94 : -0.87, 0]} opacity={0.23} scale={4} blur={2.8} far={2} resolution={256} color="#403e36" frames={1} />
              <OrbitControls ref={controlsRef} enabled={interactive} enablePan={false} enableDamping dampingFactor={0.08} minDistance={1.75} maxDistance={10} minPolarAngle={0.5} maxPolarAngle={2.1} autoRotate={autoRotate} autoRotateSpeed={1.2} />
              <CameraRig view={view} productType={productType} controlsRef={controlsRef} resetToken={resetToken} />
              <RenderBridge ref={bridgeRef} onReady={handleReady} onContextLost={handleLoss} />
            </Suspense>
          </Canvas>
        </PreviewBoundary>
      )}
      {interactive && readyScene === sceneKey && <button type="button" aria-label="Reset 3D view" title="Return to the selected side" onClick={() => setResetToken(value => value + 1)} style={{ position: 'absolute', right: 10, bottom: 9, display: 'flex', alignItems: 'center', gap: 5, background: '#ffffffeb', border: '1px solid #dce1d5', color: '#5f6e54', borderRadius: 6, padding: '8px 10px', minHeight: 44, fontSize: 11, cursor: 'pointer' }}><RotateCcw size={13} /> Reset view</button>}
    </div>
  );
});

export default ProductViewer;
