import * as THREE from 'three';
import { DecalGeometry } from 'three/addons/geometries/DecalGeometry.js';

// A decal generated from the shirt mesh is otherwise exactly coplanar with it.
// At some chest folds the depth buffer can hide pieces of thin curved letters.
export const SHIRT_PRINT_LIFT = 0.0015;

export function createShirtPrintGeometry(shirtGeometry, placement, depth) {
  const projector = new THREE.Mesh(shirtGeometry);
  const geometry = new DecalGeometry(
    projector,
    new THREE.Vector3(...placement.position),
    new THREE.Euler(...placement.rotation),
    new THREE.Vector3(...placement.size, depth),
  );
  const [x, y, z] = placement.normal;
  geometry.translate(x * SHIRT_PRINT_LIFT, y * SHIRT_PRINT_LIFT, z * SHIRT_PRINT_LIFT);
  return geometry;
}
