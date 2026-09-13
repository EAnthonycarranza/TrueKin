import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {
  brimPoint,
  createBrimEdgeGeometry,
  createBrimGeometry,
  createBrimStitchGeometry,
  createCrownGeometry,
  createCrownLiningGeometry,
  createCrownRimGeometry,
  createFabricTexture,
  createHatPrintGeometry,
  createSeamGeometry,
  createSweatbandGeometry,
  crownPoint,
} from './hatGeometry.js';

const EPSILON = 1e-6;
const factories = {
  crown: createCrownGeometry,
  lining: createCrownLiningGeometry,
  rim: createCrownRimGeometry,
  sweatband: createSweatbandGeometry,
  brim: createBrimGeometry,
  underside: () => createBrimGeometry(true),
  edge: createBrimEdgeGeometry,
  artwork: createHatPrintGeometry,
  seam: () => createSeamGeometry(Math.PI / 3),
  stitches: () => createBrimStitchGeometry(0.9),
};

function triangles(geometry) {
  const positions = geometry.getAttribute('position');
  const indices = geometry.getIndex();
  return Array.from({ length: indices.count / 3 }, (_, i) => (
    [0, 1, 2].map(offset => new THREE.Vector3().fromBufferAttribute(positions, indices.getX(i * 3 + offset)))
  ));
}

function signedNormal([a, b, c]) {
  return b.clone().sub(a).cross(c.clone().sub(a));
}

function assertClosedShell(geometries) {
  // Weld by position across the independent material meshes. Every nonzero
  // edge of a closed, consistently wound shell must have two opposite uses.
  const edges = new Map();
  const vertexKey = point => point.toArray().map(value => Math.round(value / EPSILON)).join(',');
  for (const geometry of geometries) {
    for (const triangle of triangles(geometry)) {
      if (signedNormal(triangle).lengthSq() < 1e-18) continue;
      const vertices = triangle.map(vertexKey);
      for (let i = 0; i < 3; i++) {
        const a = vertices[i];
        const b = vertices[(i + 1) % 3];
        if (a === b) continue;
        const key = a < b ? `${a}/${b}` : `${b}/${a}`;
        const edge = edges.get(key) ?? { count: 0, orientation: 0 };
        edge.count++;
        edge.orientation += a < b ? 1 : -1;
        edges.set(key, edge);
      }
    }
  }
  assert.ok(edges.size > 0);
  for (const [key, edge] of edges) {
    assert.equal(edge.count, 2, `Open or non-manifold shell edge ${key}`);
    assert.equal(edge.orientation, 0, `Inconsistent winding at shell edge ${key}`);
  }
}

for (const [name, create] of Object.entries(factories)) {
  test(`${name}: all attributes and indices are finite and triangles stay local`, () => {
    const geometry = create();
    try {
      const positions = geometry.getAttribute('position');
      assert.ok(positions.count > 0);
      for (const [attributeName, attribute] of Object.entries(geometry.attributes)) {
        assert.ok(Array.from(attribute.array).every(Number.isFinite), `${attributeName} contains a non-finite value`);
        assert.equal(attribute.count, positions.count, `${attributeName} vertex count differs`);
      }
      const indices = geometry.getIndex();
      assert.equal(indices.count % 3, 0);
      for (const index of indices.array) {
        assert.ok(Number.isInteger(index) && index >= 0 && index < positions.count, `Invalid vertex index ${index}`);
      }
      for (const [a, b, c] of triangles(geometry)) {
        const longest = Math.max(a.distanceTo(b), b.distanceTo(c), c.distanceTo(a));
        // A row-stride/index error produces triangles spanning a large part of
        // the cap. Allow the intentionally coarser tip of the curved brim.
        assert.ok(longest < 0.3, `Non-local triangle edge: ${longest}`);
      }
    } finally {
      geometry.dispose();
    }
  });
}

test('brim top and underside have consistent, outward-facing winding', () => {
  for (const underside of [false, true]) {
    const geometry = createBrimGeometry(underside);
    try {
      for (const triangle of triangles(geometry)) {
        const normal = signedNormal(triangle);
        assert.ok(normal.lengthSq() > 1e-14, 'Brim contains a collapsed triangle');
        assert.ok(underside ? normal.y < 0 : normal.y > 0, `${underside ? 'Under' : 'Top'}side triangle faces inward`);
      }
    } finally {
      geometry.dispose();
    }
  }
});

test('brim skins retain positive, thin separation without crossing', () => {
  const top = createBrimGeometry();
  const bottom = createBrimGeometry(true);
  try {
    const topPositions = top.getAttribute('position');
    const bottomPositions = bottom.getAttribute('position');
    assert.equal(topPositions.count, bottomPositions.count);
    for (let i = 0; i < topPositions.count; i++) {
      const upper = new THREE.Vector3().fromBufferAttribute(topPositions, i);
      const lower = new THREE.Vector3().fromBufferAttribute(bottomPositions, i);
      assert.ok(Math.abs(upper.x - lower.x) < EPSILON);
      assert.ok(Math.abs(upper.z - lower.z) < EPSILON);
      assert.ok(upper.y - lower.y > 0.005 && upper.y - lower.y < 0.04, 'Invalid visor shell thickness');
    }
  } finally {
    top.dispose();
    bottom.dispose();
  }
});

test('brim perimeter joins both skins into a closed, consistently wound shell', () => {
  const pieces = [createBrimGeometry(), createBrimGeometry(true), createBrimEdgeGeometry()];
  try {
    assertClosedShell(pieces);
  } finally {
    pieces.forEach(geometry => geometry.dispose());
  }
});

test('crown lining stays inside the outer crown and both apexes collapse to a pole', () => {
  const outer = createCrownGeometry();
  const inner = createCrownLiningGeometry();
  try {
    const outside = outer.getAttribute('position');
    const inside = inner.getAttribute('position');
    const uv = outer.getAttribute('uv');
    assert.equal(outside.count, inside.count);
    for (let i = 0; i < outside.count; i++) {
      const a = new THREE.Vector3().fromBufferAttribute(outside, i);
      const b = new THREE.Vector3().fromBufferAttribute(inside, i);
      const outerRadius = Math.hypot(a.x, a.z);
      const innerRadius = Math.hypot(b.x, b.z);
      assert.ok(innerRadius <= outerRadius + EPSILON, 'Lining protrudes through crown');
      assert.ok(b.y <= a.y + EPSILON, 'Lining protrudes above crown');
      assert.ok(a.x * b.x + a.z * b.z >= -EPSILON, 'Lining folds through the axis');
      assert.ok(a.distanceTo(b) < 0.03, 'Crown shell is unexpectedly thick');
      if (uv.getY(i) === 1) {
        assert.ok(outerRadius < EPSILON, 'Outer apex has an open ring');
        assert.ok(innerRadius < EPSILON, 'Lining apex has an open ring');
      }
    }
  } finally {
    outer.dispose();
    inner.dispose();
  }
});

test('crown rim joins the outer fabric and lining into a closed shell', () => {
  const pieces = [createCrownGeometry(), createCrownLiningGeometry(), createCrownRimGeometry()];
  try {
    assertClosedShell(pieces);
  } finally {
    pieces.forEach(geometry => geometry.dispose());
  }
});

test('sweatband forms a continuous inward-facing band inside the lower crown', () => {
  const band = createSweatbandGeometry();
  try {
    for (const triangle of triangles(band)) {
      const normal = signedNormal(triangle);
      const center = triangle.reduce((point, vertex) => point.add(vertex), new THREE.Vector3()).divideScalar(3);
      assert.ok(normal.x * center.x + normal.z * center.z < 0, 'Band faces away from the cap interior');
      assert.ok(center.y < -0.17 && center.y > -0.27, 'Band leaves the lower crown');
    }
    const positions = band.getAttribute('position');
    const uv = band.getAttribute('uv');
    const seam = new Map();
    for (let i = 0; i < positions.count; i++) {
      const u = uv.getX(i);
      if (u !== 0 && u !== 1) continue;
      const point = new THREE.Vector3().fromBufferAttribute(positions, i);
      const v = uv.getY(i);
      if (u === 0) seam.set(v, point);
      else assert.ok(point.distanceTo(seam.get(v)) < EPSILON, 'Sweatband seam is open');
    }
  } finally {
    band.dispose();
  }
});

test('brim attachment follows the crown base without a floating rear edge', () => {
  for (let i = 0; i <= 40; i++) {
    const u = i / 40;
    const point = brimPoint(u, 0);
    let closest = Infinity;
    for (let step = 0; step <= 2400; step++) {
      const crown = crownPoint(Math.PI / 2, -Math.PI / 2 + step / 2400 * Math.PI);
      closest = Math.min(closest, point.distanceTo(crown));
    }
    assert.ok(closest < 0.012, `Attachment is ${closest} from the crown`);
  }
});

test('artwork patch preserves the 2D crop aspect and faces outward', () => {
  const geometry = createHatPrintGeometry();
  try {
    geometry.computeBoundingBox();
    const dimensions = geometry.boundingBox.getSize(new THREE.Vector3());
    assert.ok(Math.abs(dimensions.x / dimensions.y - 1.5) < 1e-5);
    for (const triangle of triangles(geometry)) {
      assert.ok(signedNormal(triangle).z > 0, 'Front artwork faces into the crown');
    }
  } finally {
    geometry.dispose();
  }
});

test('fabric texture is deterministic and opaque', () => {
  const first = createFabricTexture();
  const second = createFabricTexture();
  try {
    assert.deepEqual(first.image.data, second.image.data);
    for (let i = 3; i < first.image.data.length; i += 4) assert.equal(first.image.data[i], 255);
  } finally {
    first.dispose();
    second.dispose();
  }
});
