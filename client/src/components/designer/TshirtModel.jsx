/**
 * TshirtModel – Three.js 3D t-shirt using the high-detail shirt_baked_collapsed.glb
 * model (10,513 vertices, baked normal/occlusion maps) from T-Shirt Configurator.
 *
 * Uses direct THREE.Texture from an <img> element instead of useTexture/drei
 * so that data-URL changes are picked up immediately without caching issues.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useGLTF, Decal, Center } from '@react-three/drei';
import { useThree, useFrame } from '@react-three/fiber';
import { easing } from 'maath';
import * as THREE from 'three';

const MODEL_PATH = '/models/shirt_baked_collapsed.glb';

/**
 * Hook: load a data-URL string into a THREE.Texture that updates reactively.
 * Returns null while loading; returns a new Texture every time `src` changes.
 */
function useDataURLTexture(src) {
  const [texture, setTexture] = useState(null);

  useEffect(() => {
    if (!src) { setTexture(null); return; }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const tex = new THREE.Texture(img);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.flipY = true;
      tex.needsUpdate = true;
      setTexture(tex);
    };
    img.onerror = () => setTexture(null);
    img.src = src;

    return () => {
      setTexture((prev) => { prev?.dispose(); return null; });
    };
  }, [src]);

  return texture;
}

/**
 * Transform men's t-shirt geometry into a women's fitted silhouette.
 * Uses Gaussian-weighted vertex displacement for waist cinch, bust curvature,
 * hip shaping, shoulder narrowing, and sleeve shortening.
 */
function createWomensGeometry(sourceGeometry) {
  const geo = sourceGeometry.clone();
  const pos = geo.attributes.position;

  // Compute bounding box to normalize coordinates
  geo.computeBoundingBox();
  const bb = geo.boundingBox;
  const minY = bb.min.y;
  const maxY = bb.max.y;
  const height = maxY - minY;

  // Estimate torso width from bounding box
  const maxAbsX = Math.max(Math.abs(bb.min.x), Math.abs(bb.max.x));
  const torsoXLimit = maxAbsX * 0.55;
  const sleeveXStart = maxAbsX * 0.50;

  const gauss = (val, center, sigma) => {
    const d = (val - center) / sigma;
    return Math.exp(-0.5 * d * d);
  };

  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    const y = pos.getY(i);
    let z = pos.getZ(i);

    const t = (y - minY) / height; // 0 = bottom hem, 1 = top collar
    const absX = Math.abs(x);
    const sign = x >= 0 ? 1 : -1;
    const isTorso = absX < torsoXLimit;
    const blend = isTorso ? 1.0 : Math.max(0, 1.0 - (absX - torsoXLimit) / (maxAbsX * 0.15));

    // --- Sleeve shortening: uniformly scale sleeve vertices toward the torso ---
    if (absX > sleeveXStart && t > 0.50 && t < 0.90) {
      const sleeveDepth = (absX - sleeveXStart) / (maxAbsX * 0.45);
      const sleeveT = Math.min(sleeveDepth, 1.0);
      const inwardScale = 1.0 - 0.40 * sleeveT;
      x = sign * (sleeveXStart + (absX - sleeveXStart) * inwardScale);
    }

    if (blend <= 0) {
      pos.setX(i, x);
      continue;
    }

    // Waist cinch
    const waistFactor = gauss(t, 0.38, 0.10);
    const waistScale = 1.0 - 0.08 * waistFactor;

    // Hip area
    const hipFactor = gauss(t, 0.12, 0.08);
    const hipScale = 1.0 + 0.06 * hipFactor;

    // Bust area
    const bustWidthFactor = gauss(t, 0.58, 0.10);
    const bustWidthScale = 1.0 + 0.04 * bustWidthFactor;

    let bustZPush = 0;
    if (z > 0) {
      const bustZFactor = gauss(t, 0.58, 0.08);
      bustZPush = 0.02 * (maxAbsX / 0.17) * bustZFactor; // scale proportionally
    }

    // Overall fit
    const fitScale = 0.92;

    // Shoulder narrowing
    const shoulderFactor = gauss(t, 0.82, 0.10);
    const shoulderScale = 1.0 - 0.14 * shoulderFactor;

    // Hem taper
    const hemFactor = t < 0.05 ? (0.05 - t) / 0.05 : 0;
    const hemScale = 1.0 + 0.02 * hemFactor;

    // Slightly shorter
    const yStretch = 1.01;

    const totalXScale = fitScale * waistScale * hipScale * bustWidthScale * shoulderScale * hemScale;
    const newX = x * (1.0 + (totalXScale - 1.0) * blend);

    let newZ = z;
    if (z > 0) {
      newZ = z * (1.0 - 0.20 * blend);
    }
    newZ = newZ + bustZPush * blend;

    const centerY = (minY + maxY) / 2;
    const newY = centerY + (y - centerY) * (1.0 + (yStretch - 1.0) * blend);

    pos.setXYZ(i, newX, newY, newZ);
  }

  geo.computeVertexNormals();
  return geo;
}

function DesignDecal({ src, position, rotation, scale }) {
  const tex = useDataURLTexture(src);
  if (!tex) return null;
  return (
    <Decal position={position} rotation={rotation} scale={scale}>
      <meshStandardMaterial
        map={tex}
        toneMapped={false}
        transparent
        polygonOffset
        polygonOffsetFactor={-1}
      />
    </Decal>
  );
}

export default function TshirtModel({
  tshirtColor = '#FFFFFF',
  frontTexture,
  backTexture,
  isMobile = false,
  shirtStyle = 'mens',
}) {
  const { nodes, materials } = useGLTF(MODEL_PATH);

  // Create women's geometry from the base model (memoized)
  const womensGeometry = useMemo(() => {
    if (shirtStyle !== 'womens' || !nodes.T_Shirt_male) return null;
    return createWomensGeometry(nodes.T_Shirt_male.geometry);
  }, [shirtStyle, nodes]);

  // Create a proper MeshStandardMaterial (the GLB may have MeshLambertMaterial
  // which doesn't support roughness/metalness and may have back-face issues)
  const shirtMaterial = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      roughness: 1,
      metalness: 0,
      side: THREE.DoubleSide,
      color: new THREE.Color(tshirtColor),
    });
    return mat;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Smoothly animate shirt color using maath easing
  useFrame((state, delta) => {
    if (shirtMaterial) {
      easing.dampC(shirtMaterial.color, tshirtColor, 0.2, delta);
    }
  });

  const hasContent = (url) => url && url.length > 500;

  const geometry = shirtStyle === 'womens' && womensGeometry
    ? womensGeometry
    : nodes.T_Shirt_male.geometry;

  // Decal positions/scales — 1:1 match with 2D canvas design area
  // The 2D canvas (450×500) design zone maps to the full printable chest area
  const frontDecalPos = shirtStyle === 'womens'
    ? [0, 0.04, 0.14]
    : [0, 0.04, 0.15];
  const frontDecalScale = shirtStyle === 'womens'
    ? [0.32, 0.38, 0.32]
    : [0.36, 0.42, 0.36];

  const backDecalPos = shirtStyle === 'womens'
    ? [0, 0.04, -0.14]
    : [0, 0.04, -0.15];
  const backDecalScale = shirtStyle === 'womens'
    ? [0.32, 0.38, 0.32]
    : [0.36, 0.42, 0.36];

  return (
    <Center>
      <mesh
        castShadow
        receiveShadow
        name="T_Shirt_male"
        geometry={geometry}
        material={shirtMaterial}
        dispose={null}
      >
        {hasContent(frontTexture) && (
          <DesignDecal
            src={frontTexture}
            position={frontDecalPos}
            rotation={[0, 0, 0]}
            scale={frontDecalScale}
          />
        )}
        {hasContent(backTexture) && (
          <DesignDecal
            src={backTexture}
            position={backDecalPos}
            rotation={[0, Math.PI, 0]}
            scale={backDecalScale}
          />
        )}
      </mesh>
    </Center>
  );
}

useGLTF.preload(MODEL_PATH);
