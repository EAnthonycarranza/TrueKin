/**
 * TshirtModel – Three.js 3D t-shirt using the high-detail shirt_baked_collapsed.glb
 * model (10,513 vertices, baked normal/occlusion maps).
 *
 * Truekin is unisex-only: one cut, one geometry. There is no men's/women's split.
 *
 * Realism notes — the GLB's `lambert1` material carries two baked maps that make
 * or break the look:
 *   • normalTexture  – a fabric weave, tiled 8×8 via KHR_texture_transform
 *   • occlusionTexture – baked AO in the seams, collar, sleeve creases and hem
 * Both are reused here on a MeshPhysicalMaterial with cloth `sheen`, which is what
 * separates "cotton jersey" from "shiny plastic". Building a bare material and
 * dropping these maps (as an earlier revision did) flattens the shirt completely.
 *
 * Uses direct THREE.Texture from an <img> element instead of useTexture/drei
 * so that data-URL changes are picked up immediately without caching issues.
 */
import { useEffect, useMemo, useState } from 'react';
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
  const maxAnisotropy = useThree((state) => state.gl.capabilities.getMaxAnisotropy());

  useEffect(() => {
    if (!src) { setTexture(null); return; }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const tex = new THREE.Texture(img);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.flipY = true;
      // Keeps the print crisp when the shirt is orbited to a glancing angle
      tex.anisotropy = maxAnisotropy;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.generateMipmaps = true;
      tex.needsUpdate = true;
      setTexture(tex);
    };
    img.onerror = () => setTexture(null);
    img.src = src;

    return () => {
      setTexture((prev) => { prev?.dispose(); return null; });
    };
  }, [src, maxAnisotropy]);

  return texture;
}

/**
 * Print artwork.
 *
 * Deliberately does NOT reuse the shirt's normal map: that texture is authored
 * against the shirt's UVs with a KHR_texture_transform of scale 8 / offset -7,
 * while a Decal carries its own projected UV set. Sharing it tiles the weave
 * eight times across the artwork and rings the print with a dark halo.
 *
 * Roughness is matched to the fabric so the print shades with the garment
 * rather than floating above it.
 */
function DesignDecal({ src, position, rotation, scale }) {
  const tex = useDataURLTexture(src);
  if (!tex) return null;
  return (
    <Decal position={position} rotation={rotation} scale={scale}>
      <meshStandardMaterial
        map={tex}
        roughness={0.9}
        metalness={0}
        transparent
        polygonOffset
        polygonOffsetFactor={-2}
      />
    </Decal>
  );
}

export default function TshirtModel({
  tshirtColor = '#FFFFFF',
  frontTexture,
  backTexture,
  isMobile = false,
}) {
  const { nodes, materials } = useGLTF(MODEL_PATH);
  const maxAnisotropy = useThree((state) => state.gl.capabilities.getMaxAnisotropy());

  const baseMaterial = materials.lambert1;

  /**
   * Cloth material. Built once, then the colour is eased per-frame.
   *
   * The maps are lifted off the GLTF material rather than re-created, which
   * preserves the KHR_texture_transform tiling (8×8) and the uv channel that
   * GLTFLoader resolved — re-loading them by hand would lose both.
   */
  const shirtMaterial = useMemo(() => {
    const mat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(tshirtColor),
      // Cotton jersey is rough but not perfectly matte — a touch under 1 keeps
      // a faint sense of curvature on the shoulders and sleeves.
      roughness: 0.82,
      metalness: 0,
      // Sheen is the cloth term: a soft retro-reflective rim along grazing
      // angles. Without it, fabric reads as painted rubber.
      //
      // sheenColor tracks the shirt colour (see useFrame). A white sheen over
      // a saturated dye lays a bright grey veil across the whole garment and
      // turns e.g. a #e02d27 red into salmon — dyed cotton scatters in its own
      // hue, not white.
      sheen: 0.35,
      sheenRoughness: 0.9,
      sheenColor: new THREE.Color(tshirtColor),
      side: THREE.DoubleSide,
      shadowSide: THREE.FrontSide,
      envMapIntensity: 0.7,
    });

    if (baseMaterial?.normalMap) {
      mat.normalMap = baseMaterial.normalMap;
      mat.normalMap.anisotropy = maxAnisotropy;
      // The GLB authors the weave at scale 2.81, which is punchy for a hero
      // render but noisy at editor size; dial it back for a knit, not burlap.
      mat.normalScale = new THREE.Vector2(0.85, 0.85);
    }

    if (baseMaterial?.aoMap) {
      mat.aoMap = baseMaterial.aoMap;
      // Never above 1: the map is already baked fairly dark, and pushing it
      // further crushes the hem and underarms into flat black.
      mat.aoMapIntensity = 0.9;
    }

    mat.needsUpdate = true;
    return mat;
  }, [baseMaterial, maxAnisotropy]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => shirtMaterial.dispose(), [shirtMaterial]);

  // Smoothly animate shirt colour using maath easing. Sheen is eased to the
  // same target so the cloth highlight stays in the garment's own hue.
  useFrame((state, delta) => {
    if (shirtMaterial) {
      easing.dampC(shirtMaterial.color, tshirtColor, 0.2, delta);
      easing.dampC(shirtMaterial.sheenColor, tshirtColor, 0.2, delta);
    }
  });

  const hasContent = (url) => url && url.length > 500;

  const geometry = nodes.T_Shirt_male.geometry;

  // Decal positions/scales — 1:1 match with 2D canvas design area.
  // The 2D canvas (450×500) design zone maps to the full printable chest area.
  const frontDecalPos = [0, 0.04, 0.15];
  const frontDecalScale = [0.36, 0.42, 0.36];
  const backDecalPos = [0, 0.04, -0.15];
  const backDecalScale = [0.36, 0.42, 0.36];

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
