import * as THREE from 'three';

const BASE = -0.26;
const HEIGHT = 0.91;
const RX = 0.75;
const RZ = 0.70;

// A slightly full crown with a rounded top, matching a structured baseball cap.
export function crownPoint(latitude, longitude, offset = 0) {
  const ring = Math.pow(Math.sin(latitude), 0.86);
  const seam = 1 - 0.0025 * Math.pow(Math.cos(longitude * 3), 18);
  const radialOffset = offset * Math.sin(latitude);
  return new THREE.Vector3(
    (RX * ring * seam + radialOffset) * Math.sin(longitude),
    BASE + HEIGHT * Math.cos(latitude) + offset * Math.cos(latitude),
    (RZ * ring * seam + radialOffset) * Math.cos(longitude),
  );
}

function makeSurface(columns, rows, pointAt, reverse = false) {
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let row = 0; row <= rows; row++) {
    for (let col = 0; col <= columns; col++) {
      const u = col / columns;
      const v = row / rows;
      positions.push(...pointAt(u, v).toArray());
      uvs.push(u, v);
      if (row < rows && col < columns) {
        const a = row * (columns + 1) + col;
        const b = a + columns + 1;
        if (reverse) indices.push(a, b, a + 1, a + 1, b, b + 1);
        else indices.push(a, a + 1, b, a + 1, b + 1, b);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function createCrownGeometry() {
  return makeSurface(120, 52, (u, v) => crownPoint((1 - v) * Math.PI / 2, u * Math.PI * 2));
}

export function createCrownLiningGeometry() {
  return makeSurface(120, 52, (u, v) => crownPoint((1 - v) * Math.PI / 2, u * Math.PI * 2, -0.016), true);
}

export function createCrownRimGeometry() {
  return makeSurface(120, 1, (u, v) => crownPoint(Math.PI / 2, u * Math.PI * 2, -0.016 * v), true);
}

export function createSweatbandGeometry() {
  return makeSurface(120, 6, (u, v) => {
    const latitude = Math.acos(v * 0.085 / HEIGHT);
    return crownPoint(latitude, u * Math.PI * 2, -0.025);
  }, true);
}

export function brimPoint(u, v, underside = false) {
  const across = u * 2 - 1;
  const curve = Math.sqrt(Math.max(0, 1 - across * across));
  const depthProfile = 0.015 + 0.985 * curve;
  // Both tips end at the crown. The old profile extended those tips forward
  // and down into disconnected triangular tabs when viewed from the side.
  const attachment = crownPoint(Math.PI / 2, Math.asin(across * 0.94));
  return new THREE.Vector3(
    attachment.x + 0.045 * across * curve * v,
    BASE + 0.002 - (0.055 + 0.12 * across * across) * v * depthProfile - (underside ? 0.022 : 0),
    attachment.z + 0.64 * depthProfile * v,
  );
}

export function createBrimGeometry(underside = false) {
  return makeSurface(80, 20, (u, v) => brimPoint(u, v, underside), !underside);
}

export function createBrimEdgeGeometry() {
  // Seal the entire perimeter, not just its front edge. Sampling matches the
  // top and bottom grids, so no cracks or crossing faces appear on rotation.
  const boundary = [];
  for (let i = 0; i < 80; i++) boundary.push([i / 80, 1]);
  for (let i = 0; i < 20; i++) boundary.push([1, 1 - i / 20]);
  for (let i = 0; i < 80; i++) boundary.push([1 - i / 80, 0]);
  for (let i = 0; i < 20; i++) boundary.push([0, i / 20]);
  boundary.push(boundary[0]);
  return makeSurface(200, 1, (u, v) => {
    const [x, depth] = boundary[Math.round(u * 200)];
    return brimPoint(x, depth).add(new THREE.Vector3(0, -v * 0.022, 0));
  }, true);
}

export function createHatPrintGeometry() {
  // The 2D print crop is 3:2. Orthographic x/y mapping keeps its proportions
  // intact while the z coordinate follows the front of the actual crown.
  return makeSurface(48, 32, (u, v) => {
    const x = (u - 0.5) * 0.64;
    const y = -0.025 + v * (0.64 / 1.5);
    const latitude = Math.acos((y - BASE) / HEIGHT);
    const ring = Math.pow(Math.sin(latitude), 0.86);
    const longitude = Math.asin(x / (RX * ring));
    const p = crownPoint(latitude, longitude, 0.0035);
    return new THREE.Vector3(x, y, p.z);
  });
}

export function createSeamGeometry(longitude, offset = 0) {
  const points = Array.from({ length: 65 }, (_, i) => crownPoint(0.07 + i / 64 * (Math.PI / 2 - 0.07), longitude + offset, 0.002));
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 64, 0.0017, 4, false);
}

export function createBrimStitchGeometry(depth) {
  const points = Array.from({ length: 81 }, (_, i) => brimPoint(0.025 + i / 80 * 0.95, depth).add(new THREE.Vector3(0, 0.0025, 0)));
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 80, 0.0016, 4, false);
}

export function createFabricTexture() {
  const size = 128;
  const pixels = new Uint8Array(size * size * 4);
  let seed = 1937;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      seed = (seed * 16807) % 2147483647;
      const value = 125 + (seed % 22) + ((x + y) % 4 === 0 ? 12 : 0);
      const index = (y * size + x) * 4;
      pixels[index] = pixels[index + 1] = pixels[index + 2] = value;
      pixels[index + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(7, 4);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}
