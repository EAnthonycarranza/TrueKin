/**
 * ShirtViewer – a colour-exact R3F canvas around ShirtMesh.
 *
 * What makes it colour-exact:
 *   • NoToneMapping + sRGB output: material colour in → same pixel out.
 *   • A "headlight" key that follows the camera plus a flat fill. Their
 *     intensities sum to π, and three's Lambert BRDF divides by π, so any
 *     surface facing the camera renders at exactly its albedo.
 *   • No HDRI: environment lighting tints everything by the map's colour.
 *   • A rim parked behind the tee relative to the camera only touches
 *     silhouettes (N·L ≤ 0 on camera-facing faces).
 *
 * The imperative API lets the studio read the frame back (`readProbe`) to prove
 * the match, and grab snapshots for product images.
 */
import { Component, Suspense, forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import ShirtMesh from './ShirtMesh';
import { SHIRT_MESH_NAME } from './shirtLayout';
import { medianColor, rgbToHex } from './shirtColor';
import { viewInfo } from './printArea';

const CAMERA_DISTANCE = 1.85;
const CAMERA_FOV = 25;
const KEY = 0.8;
const FILL = 0.2; // KEY + FILL = 1.0 → exact albedo on camera-facing faces
const RIM = 0.35;
const RIM_TILT = new THREE.Euler(THREE.MathUtils.degToRad(-32), THREE.MathUtils.degToRad(28), 0);

class ViewerErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error('ShirtViewer error', error, info); }
  render() {
    if (this.state.error) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 240, gap: 8, padding: 20, textAlign: 'center' }}>
          <strong style={{ color: '#b91c1c' }}>3D preview failed</strong>
          <span style={{ fontSize: 13, color: '#666' }}>{this.state.error.message}</span>
          <button className="btn btn-secondary btn-sm" onClick={() => this.setState({ error: null })}>Retry</button>
        </div>
      );
    }
    return this.props.children;
  }
}

/** Place the key at the camera and the rim behind the tee, relative to a camera. */
function aimLights(key, rim, cameraPosition) {
  if (key) key.position.copy(cameraPosition);
  if (rim) rim.position.copy(cameraPosition).negate().applyEuler(RIM_TILT);
}

function CameraLights() {
  const keyRef = useRef();
  const rimRef = useRef();
  useFrame(({ camera }) => aimLights(keyRef.current, rimRef.current, camera.position));
  return (
    <>
      <directionalLight ref={keyRef} name="truking-key" intensity={KEY * Math.PI} />
      <directionalLight ref={rimRef} name="truking-rim" intensity={RIM * Math.PI} />
    </>
  );
}

function ColourExactRig() {
  return (
    <>
      <ambientLight intensity={FILL * Math.PI} />
      <CameraLights />
    </>
  );
}

/** Eases the camera around to the requested view without fighting OrbitControls. */
function ViewController({ theta, controlsRef }) {
  const goal = useRef(null);

  useEffect(() => {
    goal.current = theta;
  }, [theta]);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return undefined;
    const cancel = () => { goal.current = null; };
    controls.addEventListener('start', cancel);
    return () => controls.removeEventListener('start', cancel);
  }, [controlsRef]);

  useFrame(({ camera }, dt) => {
    const controls = controlsRef.current;
    if (!controls || goal.current == null) return;
    const target = controls.target;
    const sph = new THREE.Spherical().setFromVector3(camera.position.clone().sub(target));
    let diff = goal.current - sph.theta;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    if (Math.abs(diff) < 0.002) {
      sph.theta = goal.current;
      goal.current = null;
    } else {
      sph.theta += diff * Math.min(1, dt * 7);
    }
    camera.position.setFromSpherical(sph).add(target);
    camera.lookAt(target);
    controls.update();
  });
  return null;
}

/** Exposes renderer internals to the imperative handle. Mounted inside Suspense so it exists once the model is in. */
const Bridge = forwardRef(function Bridge({ onReady }, ref) {
  const { gl, scene, camera } = useThree();

  useEffect(() => { onReady?.(); }, [onReady]);

  useImperativeHandle(ref, () => {
    const shirt = () => scene.getObjectByName(SHIRT_MESH_NAME);

    return {
      gl,
      scene,
      camera,
      render: () => gl.render(scene, camera),

      /**
       * Read the rendered colour of the shirt at the print-zone centre of a
       * side. Returns null if that point is not facing the camera.
       */
      readProbe: (side = 'front', kind = 'center', radius = 3) => {
        const mesh = shirt();
        const layout = mesh?.userData?.layout;
        const placement = layout?.[side];
        const local = placement?.probes?.[kind];
        if (!local) return null;
        const world = mesh.localToWorld(local.clone());
        const normal = new THREE.Vector3().fromArray(placement.normal);
        const toCamera = camera.position.clone().sub(world).normalize();
        if (toCamera.dot(normal) < 0.35) return null;

        gl.render(scene, camera);
        const ndc = world.clone().project(camera);
        const W = gl.domElement.width;
        const H = gl.domElement.height;
        const x = Math.round(((ndc.x + 1) / 2) * W);
        const y = Math.round(((ndc.y + 1) / 2) * H);
        const size = radius * 2 + 1;
        const buf = new Uint8Array(size * size * 4);
        const ctx = gl.getContext();
        ctx.readPixels(x - radius, y - radius, size, size, ctx.RGBA, ctx.UNSIGNED_BYTE, buf);
        const rgb = medianColor(buf, 250);
        if (!rgb) return null;
        return { hex: rgbToHex(rgb), rgb, kind, side };
      },

    };
  }, [gl, scene, camera]);

  return null;
});

const ShirtViewer = forwardRef(function ShirtViewer(
  {
    fabricColor = '#d1d3d3',
    prints = {},
    view = 'front',
    autoRotate = false,
    interactive = true,
    height = 500,
    background = '#ffffff',
    style = {},
    onReady,
  },
  ref
) {
  const bridgeRef = useRef(null);
  const controlsRef = useRef(null);

  useImperativeHandle(ref, () => ({
    isReady: () => !!bridgeRef.current,
    getCanvas: () => bridgeRef.current?.gl.domElement || null,
    readProbe: (side, kind) => bridgeRef.current?.readProbe(side, kind) || null,
    /** PNG data URL of the current frame, composited on `background`. */
    snapshot: (bg = background) => {
      const b = bridgeRef.current;
      if (!b) return null;
      b.render();
      const src = b.gl.domElement;
      const out = document.createElement('canvas');
      out.width = src.width;
      out.height = src.height;
      const ctx = out.getContext('2d');
      if (bg) {
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, out.width, out.height);
      }
      ctx.drawImage(src, 0, 0);
      return out.toDataURL('image/png');
    },
  }), [background]);

  return (
    <ViewerErrorBoundary>
      <div className="tk-shirt-viewer" style={{ width: '100%', height, background, position: 'relative', ...style }}>
        <Canvas
          flat
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' }}
          onCreated={({ gl }) => {
            gl.toneMapping = THREE.NoToneMapping;
            gl.outputColorSpace = THREE.SRGBColorSpace;
            gl.setClearColor(0x000000, 0);
          }}
          camera={{ position: [0, 0, CAMERA_DISTANCE], fov: CAMERA_FOV, near: 0.05, far: 20 }}
          style={{ width: '100%', height: '100%' }}
        >
          <Suspense fallback={null}>
            <ColourExactRig />
            <ShirtMesh fabricColor={fabricColor} prints={prints} />
            <ContactShadows position={[0, -0.34, 0]} opacity={0.32} scale={1.6} blur={2.4} far={0.5} resolution={512} color="#000000" />
            <OrbitControls
              ref={controlsRef}
              enabled={interactive}
              target={[0, 0, 0]}
              minDistance={1.1}
              maxDistance={3.4}
              minPolarAngle={Math.PI / 3.2}
              maxPolarAngle={Math.PI / 1.7}
              enablePan={false}
              enableDamping
              dampingFactor={0.08}
              autoRotate={autoRotate}
              autoRotateSpeed={1.4}
            />
            <ViewController theta={viewInfo(view).theta} controlsRef={controlsRef} />
            <Bridge ref={bridgeRef} onReady={onReady} />
          </Suspense>
        </Canvas>
      </div>
    </ViewerErrorBoundary>
  );
});

export default ShirtViewer;
