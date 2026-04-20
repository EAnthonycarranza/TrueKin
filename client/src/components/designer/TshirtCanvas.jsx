/**
 * TshirtCanvas – Wraps TshirtModel in an R3F Canvas with proper lighting
 * for the shirt_baked_collapsed.glb model. Uses HDRI environment for
 * photorealistic reflections and ambient occlusion from the baked maps.
 */
import { Component, Suspense, useRef, useImperativeHandle, forwardRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
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
    shirtStyle = 'mens',
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
          gl={{
            preserveDrawingBuffer: true,
            antialias: true,
          }}
          camera={{ position: [0, 0, 2.5], fov: 25 }}
          style={{ width: '100%', height: '100%' }}
        >
          <Suspense fallback={null}>
            {/* Ambient light matching the configurator */}
            <ambientLight intensity={0.5 * Math.PI} />
            {/* HDRI environment for realistic reflections */}
            <Environment preset="city" />
            <TshirtModel
              tshirtColor={tshirtColor}
              frontTexture={frontTexture}
              backTexture={backTexture}
              isMobile={isMobile}
              shirtStyle={shirtStyle}
            />
            <OrbitControls
              target={[0, 0, 0]}
              maxDistance={5}
              minDistance={1.5}
              maxPolarAngle={Math.PI / 1.8}
              minPolarAngle={Math.PI / 4}
              enablePan={false}
            />
          </Suspense>
        </Canvas>
      </div>
    </CanvasErrorBoundary>
  );
});

export default TshirtCanvas;
