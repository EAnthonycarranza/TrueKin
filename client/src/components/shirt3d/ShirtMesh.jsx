/**
 * ShirtMesh – the 3D tee, built for colour fidelity rather than drama.
 *
 *  • Material is MeshLambertMaterial (pure diffuse). Under the ColourExactRig
 *    in ShirtViewer (key + fill summing to π) a camera-facing pixel renders at
 *    exactly the material colour. Physical/sheen/specular materials add
 *    view-dependent energy that would break that equality.
 *  • The material colour is the FABRIC colour sampled from the 2D mockup
 *    photo (see shirtColor.js), not the raw swatch hex.
 *  • Prints are decals whose centre and size come from printArea.js /
 *    shirtLayout.js: chest, back and the outer face of each sleeve.
 *  • The GLB's baked normal + occlusion maps are kept for cloth detail; AO only
 *    scales the (small) fill term, so the chest stays within a couple of 8-bit
 *    units of the sampled colour.
 */
import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { useGLTF, Decal } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { easing } from 'maath';
import { PRINT_DEPTH, SLEEVE_PRINT_DEPTH } from './printArea';
import { MODEL_PATH, SHIRT_MESH_NAME, computeShirtLayout } from './shirtLayout';

function usePrintTexture(src) {
  // Keyed by src so a stale texture is never shown for a new print.
  const [loaded, setLoaded] = useState({ src: null, tex: null });
  const maxAnisotropy = useThree((s) => s.gl.capabilities.getMaxAnisotropy());

  useEffect(() => {
    if (!src) return undefined;
    let alive = true;
    const img = new Image();
    img.onload = () => {
      if (!alive) return;
      const t = new THREE.Texture(img);
      // The print is authored in sRGB (a PNG); decoding it as sRGB and encoding
      // the frame back to sRGB is what keeps artwork pixels identical.
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = maxAnisotropy;
      t.minFilter = THREE.LinearMipmapLinearFilter;
      t.magFilter = THREE.LinearFilter;
      t.generateMipmaps = true;
      t.needsUpdate = true;
      setLoaded((prev) => {
        prev.tex?.dispose();
        return { src, tex: t };
      });
    };
    img.src = src;
    return () => { alive = false; };
  }, [src, maxAnisotropy]);

  useEffect(() => () => loaded.tex?.dispose(), [loaded]);
  return loaded.src === src ? loaded.tex : null;
}

function PrintDecal({ src, placement, depth }) {
  const tex = usePrintTexture(src);
  if (!tex) return null;
  return (
    <Decal
      position={placement.position}
      rotation={placement.rotation}
      scale={[placement.size[0], placement.size[1], depth]}
      depthTest
      polygonOffsetFactor={-4}
    >
      {/* Lambert, like the shirt: the print is lit by the same rig, so a
          camera-facing print pixel is exactly the PNG pixel. */}
      <meshLambertMaterial
        map={tex}
        transparent
        depthTest
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-4}
        toneMapped={false}
      />
    </Decal>
  );
}

function useShirtMaterial(baseMaterial, initialColor) {
  const maxAnisotropy = useThree((s) => s.gl.capabilities.getMaxAnisotropy());

  const material = useMemo(() => {
    const m = new THREE.MeshLambertMaterial({
      color: new THREE.Color(initialColor),
      side: THREE.DoubleSide,
    });
    if (baseMaterial?.normalMap) {
      // Reusing the loader's texture keeps the KHR_texture_transform tiling.
      m.normalMap = baseMaterial.normalMap;
      m.normalMap.anisotropy = maxAnisotropy;
      // Kept subtle: a strong weave tilts frontal normals away from the light
      // and would shade the chest below the sampled colour.
      m.normalScale = new THREE.Vector2(0.35, 0.35);
    }
    if (baseMaterial?.aoMap) {
      m.aoMap = baseMaterial.aoMap;
      m.aoMapIntensity = 1.0;
    }
    return m;
  }, [baseMaterial, maxAnisotropy]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => material.dispose(), [material]);
  return material;
}

export default function ShirtMesh({ fabricColor = '#d1d3d3', prints = {}, animateColor = true }) {
  const { nodes, materials } = useGLTF(MODEL_PATH);
  const geometry = nodes.T_Shirt_male.geometry;
  const layout = useMemo(() => computeShirtLayout(geometry), [geometry]);
  const material = useShirtMaterial(materials.lambert1, fabricColor);
  const target = useMemo(() => new THREE.Color(fabricColor), [fabricColor]);

  useEffect(() => {
    if (!animateColor) material.color.copy(target);
  }, [target, material, animateColor]);

  useFrame((_, dt) => {
    if (animateColor) easing.dampC(material.color, target, 0.12, dt);
  });

  const c = layout.center;
  return (
    <mesh
      name={SHIRT_MESH_NAME}
      geometry={geometry}
      material={material}
      position={[-c.x, -c.y, -c.z]}
      userData={{ layout }}
    >
      {prints.front && <PrintDecal src={prints.front} placement={layout.front} depth={PRINT_DEPTH} />}
      {prints.back && <PrintDecal src={prints.back} placement={layout.back} depth={PRINT_DEPTH} />}
      {prints.left && <PrintDecal src={prints.left} placement={layout.left} depth={SLEEVE_PRINT_DEPTH} />}
      {prints.right && <PrintDecal src={prints.right} placement={layout.right} depth={SLEEVE_PRINT_DEPTH} />}
    </mesh>
  );
}

useGLTF.preload(MODEL_PATH);
