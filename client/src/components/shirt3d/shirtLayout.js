/**
 * shirtLayout – geometry-derived placement for the 3D tee.
 *
 * Turns the shared print zones (printArea.js) into decal transforms and
 * colour-probe points on the actual mesh, using its bounding box. Nothing here
 * is hand-tuned: change the zone constants and both editors move together.
 *
 * Sides: 'front' / 'back' print on the chest and back (projected along ±z);
 * 'left' / 'right' print on the outer face of each sleeve (projected along ±x,
 * left = the wearer's left = +x).
 */
import * as THREE from 'three';
import { PRINT_RECT_ON_SHIRT, MATCH_PROBE_CENTER, SLEEVE_PRINT, sleeveZoneAspect } from './printArea';

export const MODEL_PATH = '/models/shirt_baked_collapsed.glb';
export const SHIRT_MESH_NAME = 'truking-shirt';

/** Nearest surface point to (x, y) on the front (largest z) or back (smallest z). */
export function surfacePoint(geometry, x, y, side) {
  const pos = geometry.attributes.position;
  let bestZ = side === 'front' ? -Infinity : Infinity;
  let found = false;
  for (let r = 0.015; r <= 0.12 && !found; r *= 2) {
    for (let i = 0; i < pos.count; i++) {
      if (Math.abs(pos.getX(i) - x) > r || Math.abs(pos.getY(i) - y) > r) continue;
      const z = pos.getZ(i);
      if (side === 'front' ? z > bestZ : z < bestZ) {
        bestZ = z;
        found = true;
      }
    }
  }
  return new THREE.Vector3(x, y, found ? bestZ : 0);
}

/** Outermost surface point near (y, z) on the +x (sign 1) or −x (sign −1) sleeve. */
function sleeveSurfacePoint(geometry, y, z, sign) {
  const pos = geometry.attributes.position;
  let best = -Infinity;
  let found = false;
  for (let r = 0.015; r <= 0.12 && !found; r *= 2) {
    for (let i = 0; i < pos.count; i++) {
      if (Math.abs(pos.getY(i) - y) > r || Math.abs(pos.getZ(i) - z) > r) continue;
      const v = sign * pos.getX(i);
      if (v > best) {
        best = v;
        found = true;
      }
    }
  }
  return new THREE.Vector3(found ? sign * best : 0, y, z);
}

function bodySide(geometry, bb, width, height, name) {
  const rel = PRINT_RECT_ON_SHIRT;
  const cx = bb.min.x + (rel.x + rel.w / 2) * width;
  const cy = bb.max.y - (rel.y + rel.h / 2) * height;
  const pcx = bb.min.x + MATCH_PROBE_CENTER.x * width;
  const pcy = bb.max.y - MATCH_PROBE_CENTER.y * height;
  const sign = name === 'front' ? 1 : -1;
  return {
    side: name,
    position: surfacePoint(geometry, cx, cy, name).toArray(),
    rotation: [0, name === 'front' ? 0 : Math.PI, 0],
    size: [rel.w * width, rel.h * height],
    normal: [0, 0, sign],
    // Decal-local x / y axes in mesh space (for projecting the zone into 2D).
    axes: { u: [sign, 0, 0], v: [0, 1, 0] },
    probes: { center: surfacePoint(geometry, pcx, pcy, name) },
  };
}

function sleeveSide(geometry, bb, height, name) {
  const sign = name === 'left' ? 1 : -1;
  const yTop = bb.max.y - SLEEVE_PRINT.y * height;
  const yBot = yTop - SLEEVE_PRINT.h * height;
  const yC = (yTop + yBot) / 2;

  // Front-to-back extent of this sleeve across the print band.
  const pos = geometry.attributes.position;
  const xLimit = (sign > 0 ? bb.max.x : -bb.min.x) * 0.62;
  let zMin = Infinity;
  let zMax = -Infinity;
  for (let i = 0; i < pos.count; i++) {
    if (sign * pos.getX(i) < xLimit) continue;
    const y = pos.getY(i);
    if (y < yBot || y > yTop) continue;
    const z = pos.getZ(i);
    if (z < zMin) zMin = z;
    if (z > zMax) zMax = z;
  }
  if (!Number.isFinite(zMin)) { zMin = bb.min.z * 0.5; zMax = bb.max.z * 0.5; }
  const zC = (zMin + zMax) / 2;
  const point = sleeveSurfacePoint(geometry, yC, zC, sign);
  const h = yTop - yBot;
  return {
    side: name,
    position: point.toArray(),
    rotation: [0, sign * (Math.PI / 2), 0],
    // Width follows the 2D zone's pixel aspect so the print is not stretched.
    size: [h * sleeveZoneAspect(), h],
    normal: [sign, 0, 0],
    axes: { u: [0, 0, -sign], v: [0, 1, 0] },
    probes: { center: point.clone() },
  };
}

/**
 * Derive the print placement + colour probes for every side from the
 * geometry and the shared print zones. Runs once per geometry.
 */
export function computeShirtLayout(geometry) {
  geometry.computeBoundingBox();
  const bb = geometry.boundingBox;
  const width = bb.max.x - bb.min.x;
  const height = bb.max.y - bb.min.y;
  const center = bb.getCenter(new THREE.Vector3());

  return {
    bbox: bb,
    width,
    height,
    center,
    front: bodySide(geometry, bb, width, height, 'front'),
    back: bodySide(geometry, bb, width, height, 'back'),
    left: sleeveSide(geometry, bb, height, 'left'),
    right: sleeveSide(geometry, bb, height, 'right'),
  };
}
