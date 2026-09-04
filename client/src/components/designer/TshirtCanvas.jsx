/**
 * TshirtCanvas – Wraps TshirtModel in an R3F Canvas with a photographic
 * lighting rig for the shirt_baked_collapsed.glb model.
 *
 * Truekin is unisex-only — one cut, no style prop.
 *
 * The rig is a standard apparel-studio three-point setup rather than a single
 * ambient wash: a soft key at 3/4 front-left, a dim fill opposite it to keep the
 * shadow side from going dead, and a rim behind to peel the shoulders off the
 * background. An HDRI supplies the diffuse environment that the cloth `sheen`
 * in TshirtModel needs in order to register at all.
 */
import { Component, Suspense, useRef, useImperativeHandle, forwardRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import TshirtModel from './TshirtModel';

class CanvasErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('3D Canvas Error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          minHeight: 300,
          background: '#fef2f2',
          borderRadius: 12,
          padding: 24,
          gap: 12,
        }}>
          <p style={{ fontWeight: 600, color: '#dc2626' }}>3D Preview failed to load</p>
          <p style={{ fontSize: 13, color: '#666', textAlign: 'center' }}>
            {this.state.error?.message || 'An error occurred.'}
          </p>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const TshirtCanvas = forwardRef(function TshirtCanvas(
  {
    tshirtColor = '#FFFFFF',
    frontTexture,
    backTexture,
    isMobile = false,
    style = {},
    height = 500,
  },
  ref
) {
  const canvasContainerRef = useRef(null);

  useImperativeHandle(ref, () => ({
    getCanvas: () => {
      if (!canvasContainerRef.current) return null;
      return canvasContainerRef.current.querySelector('canvas');
    },
  }));

  return (
    <CanvasErrorBoundary>
      <div ref={canvasContainerRef} style={{ width: '100%', height, ...style }}>
        <Canvas
          shadows
          dpr={[1, 2]}
          gl={{
            preserveDrawingBuffer: true,
            antialias: true,
            // Filmic response curve — keeps highlights on white shirts from
            // clipping to a flat blown-out patch the way linear output does.
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.0,
            outputColorSpace: THREE.SRGBColorSpace,
          }}
          camera={{ position: [0, 0, 2.5], fov: 25 }}
          style={{ width: '100%', height: '100%' }}
        >
          <Suspense fallback={null}>
            {/* NB: drei's <SoftShadows> (PCSS) cannot be used here — it injects
                a shader chunk calling unpackRGBAToDepth(), which three r0.183
                removed, so the fragment shader fails to compile and the canvas
                renders blank. Softness comes from <ContactShadows> below. */}

            {/* Total light is kept modest on purpose. A white shirt is the
                brightest thing most customers will render; overdriving the rig
                clips it to a flat sheet, the baked AO stops reading, and
                saturated colours (a #e02d27 red) desaturate toward pastel. */}
            <ambientLight intensity={0.3} />

            {/* Key light: 3/4 front-left, the standard apparel position. */}
            <directionalLight
              castShadow
              position={[2.4, 3.2, 2.8]}
              intensity={0.9}
              shadow-mapSize={[2048, 2048]}
              shadow-bias={-0.0004}
              shadow-normalBias={0.02}
            >
              <orthographicCamera attach="shadow-camera" args={[-2, 2, 2, -2, 0.1, 12]} />
            </directionalLight>

            {/* Fill: opposite the key, roughly a third of its strength, so the
                shadow side keeps detail without flattening the form. */}
            <directionalLight position={[-3, 1.6, 2]} intensity={0.3} />

            {/* Rim / kicker: behind and above, separates shoulders and sleeves
                from the backdrop and catches the fabric sheen. */}
            <directionalLight position={[-1.2, 2.4, -3.2]} intensity={0.45} />

            {/* HDRI environment — neutral softboxes suit apparel better than
                the previous "city" preset, which cast coloured reflections. */}
            <Environment preset="studio" environmentIntensity={0.6} />

            {/* TshirtModel supplies its own <Center> around the mesh. */}
            <TshirtModel
              tshirtColor={tshirtColor}
              frontTexture={frontTexture}
              backTexture={backTexture}
              isMobile={isMobile}
            />

            {/* Grounding shadow. Must sit clear of the hem: the centred model
                reaches roughly y = -0.6, so a catcher at -0.62 intersected the
                shirt and smeared a dark band across the bottom. */}
            <ContactShadows
              position={[0, -0.95, 0]}
              opacity={0.3}
              scale={3.2}
              blur={3}
              far={0.9}
              resolution={512}
              color="#1a1a1a"
            />

            <OrbitControls
              target={[0, 0, 0]}
              maxDistance={5}
              minDistance={1.5}
              maxPolarAngle={Math.PI / 1.8}
              minPolarAngle={Math.PI / 4}
              enablePan={false}
              enableDamping
              dampingFactor={0.08}
            />
          </Suspense>
        </Canvas>
      </div>
    </CanvasErrorBoundary>
  );
});

export default TshirtCanvas;
