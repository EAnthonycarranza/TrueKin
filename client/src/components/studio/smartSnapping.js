// Geometry-only smart guides. Thresholds are CSS pixels, not artboard pixels,
// so a phone and a desktop get the same useful magnetic capture distance.
const ATTACH_PX = 8;
const RELEASE_PX = 14;
const MAX_COORDINATE = 1_000_000;
const EPSILON = 1e-7;

export const createSnapSession = () => ({ x: null, y: null, angle: null });

export function resetSnapSession(session) {
  if (session && typeof session === 'object') {
    session.x = null;
    session.y = null;
    session.angle = null;
  }
  return session;
}

function validNumber(value) {
  return Number.isFinite(value) && Math.abs(value) <= MAX_COORDINATE;
}

function validBox(box) {
  return box && ['left', 'top', 'width', 'height'].every(key => validNumber(box[key]))
    && box.width > 0 && box.height > 0
    && validNumber(box.left + box.width) && validNumber(box.top + box.height);
}

function dimensions(box, axis) {
  const start = axis === 'x' ? box.left : box.top;
  const size = axis === 'x' ? box.width : box.height;
  return { start, center: start + size / 2, end: start + size, size };
}

const perpendicular = axis => axis === 'x' ? 'y' : 'x';
const translatedBox = (box, dx, dy) => ({ ...box, left: box.left + dx, top: box.top + dy });
const uniqueLabel = labels => [...new Set(labels)].join(' · ');

function peerLabel(value) {
  const label = typeof value === 'string' ? value.replace(/\s+/gu, ' ').trim() : '';
  const characters = Array.from(label || 'Artwork');
  return characters.length > 32 ? `${characters.slice(0, 31).join('')}…` : characters.join('');
}

function alignmentCandidates(box, axis, targets) {
  const own = dimensions(box, axis);
  const candidates = [];
  for (const target of targets) {
    const anchors = dimensions(target.box, axis);
    const pairs = [['center', 'center'], ['start', 'start'], ['end', 'end']];
    // Opposite edges are useful for adjacent artwork, but would attract artwork
    // outside the printable area, so print boundaries use matching edges only.
    if (!target.print) pairs.push(['start', 'end'], ['end', 'start']);
    for (const [ownAnchor, targetAnchor] of pairs) {
      const center = ownAnchor === 'center';
      const edgeName = targetAnchor === 'start'
        ? (axis === 'x' ? 'left' : 'top') : (axis === 'x' ? 'right' : 'bottom');
      candidates.push({
        key: JSON.stringify(['align', target.key, ownAnchor, targetAnchor]),
        axis, ownAnchor, target, at: anchors[targetAnchor],
        delta: anchors[targetAnchor] - own[ownAnchor],
        kind: center ? 'center' : 'edge',
        priority: (center ? 0 : 2) + (target.print ? 0 : 1),
        label: `${target.name} ${center ? 'center' : `${edgeName} edge`}`,
      });
    }
  }
  return candidates;
}

function spacingCandidates(box, axis, peers) {
  const own = dimensions(box, axis);
  const orthogonal = dimensions(box, perpendicular(axis));
  const candidates = [];
  const neighbors = peers.filter(peer => {
    const cross = dimensions(peer.box, perpendicular(axis));
    return Math.min(cross.end, orthogonal.end) - Math.max(cross.start, orthogonal.start) > EPSILON;
  });
  // Spacing is meaningful only across empty gaps. Never attract a shape to a
  // distant pair by skipping an intervening layer or an overlapping obstacle.
  if (neighbors.some(peer => {
    const along = dimensions(peer.box, axis);
    return along.start < own.end - EPSILON && along.end > own.start + EPSILON;
  })) return candidates;
  const before = neighbors.filter(peer => dimensions(peer.box, axis).end <= own.start + EPSILON);
  const after = neighbors.filter(peer => dimensions(peer.box, axis).start >= own.end - EPSILON);
  const nearestBefore = before.reduce((value, peer) => Math.max(value, dimensions(peer.box, axis).end), -Infinity);
  const nearestAfter = after.reduce((value, peer) => Math.min(value, dimensions(peer.box, axis).start), Infinity);
  for (const first of before.filter(peer => Math.abs(dimensions(peer.box, axis).end - nearestBefore) <= EPSILON)) {
    for (const second of after.filter(peer => Math.abs(dimensions(peer.box, axis).start - nearestAfter) <= EPSILON)) {
      const firstAxis = dimensions(first.box, axis);
      const secondAxis = dimensions(second.box, axis);
      const firstCross = dimensions(first.box, perpendicular(axis));
      const secondCross = dimensions(second.box, perpendicular(axis));
      // All three shapes must genuinely share a row/column. Objects in an
      // unrelated part of the canvas must not create surprising spacing snaps.
      const overlapStart = Math.max(orthogonal.start, firstCross.start, secondCross.start);
      const overlapEnd = Math.min(orthogonal.end, firstCross.end, secondCross.end);
      if (overlapEnd - overlapStart <= EPSILON) continue;
      const available = secondAxis.start - firstAxis.end;
      if (available < own.size) continue;
      const at = (firstAxis.end + secondAxis.start) / 2;
      candidates.push({
        key: JSON.stringify(['spacing', first.key, second.key]),
        axis, ownAnchor: 'center', first, second, at,
        delta: at - own.center,
        kind: 'spacing', priority: 4,
        label: `Equal ${axis === 'x' ? 'horizontal' : 'vertical'} spacing`,
      });
    }
  }
  return candidates;
}

function chooseCandidate(candidates, held, attach, release) {
  if (held) {
    const refreshed = candidates.find(candidate => candidate.key === held.key);
    if (refreshed && Math.abs(refreshed.delta) <= release + EPSILON) return refreshed;
  }
  return candidates
    .filter(candidate => Math.abs(candidate.delta) <= attach + EPSILON)
    .sort((a, b) => {
      const distance = Math.abs(a.delta) - Math.abs(b.delta);
      return Math.abs(distance) > EPSILON ? distance : a.priority - b.priority;
    })[0] || null;
}

function guidesFor(candidate, box, scale) {
  const { axis, label, kind } = candidate;
  const crossAxis = perpendicular(axis);
  const cross = dimensions(box, crossAxis);
  if (kind === 'spacing') {
    const first = dimensions(candidate.first.box, axis);
    const second = dimensions(candidate.second.box, axis);
    const firstCross = dimensions(candidate.first.box, crossAxis);
    const secondCross = dimensions(candidate.second.box, crossAxis);
    const overlapStart = Math.max(cross.start, firstCross.start, secondCross.start);
    const overlapEnd = Math.min(cross.end, firstCross.end, secondCross.end);
    const at = overlapEnd >= overlapStart ? (overlapStart + overlapEnd) / 2 : cross.center;
    const own = dimensions(box, axis);
    return [
      { axis: crossAxis, at, from: first.end, to: own.start, label, kind },
      { axis: crossAxis, at, from: own.end, to: second.start, label, kind },
    ];
  }
  const targetCross = dimensions(candidate.target.box, crossAxis);
  const padding = 8 / scale;
  return [{
    axis, at: candidate.at,
    from: Math.min(cross.start, targetCross.start) - padding,
    to: Math.max(cross.end, targetCross.end) + padding,
    label, kind,
  }];
}

/**
 * Return the translation required to align a proposed bounding box. Pass the
 * unsnapped pointer position each time; retain one session for an entire drag.
 * Guides use x for vertical lines and y for horizontal lines. Spacing guides
 * run along the equal gaps, perpendicular to the axis they lock.
 */
export function solveMoveSnap({ box, area, peers = [], session = createSnapSession(), scale = 1, bypass = false } = {}) {
  const state = session && typeof session === 'object' ? session : createSnapSession();
  const empty = { dx: 0, dy: 0, guides: [], lockedAxes: [], label: '' };
  if (bypass || !validBox(box)) {
    resetSnapSession(state);
    return empty;
  }
  const displayScale = Number.isFinite(scale) && scale > 0 ? Math.max(0.1, Math.min(4, scale)) : 1;
  const validPeers = (Array.isArray(peers) ? peers : [])
    .map((peer, index) => ({
      box: peer?.box,
      key: `peer:${peer?.id == null ? `index-${index}` : String(peer.id)}`,
      name: peerLabel(peer?.name),
    }))
    .filter(peer => validBox(peer.box));
  const targets = validBox(area)
    ? [{ key: 'print', box: area, name: 'Print area', print: true }, ...validPeers]
    : validPeers;
  const chosen = {};
  for (const axis of ['x', 'y']) {
    chosen[axis] = chooseCandidate(
      [...alignmentCandidates(box, axis, targets), ...spacingCandidates(box, axis, validPeers)],
      state[axis], ATTACH_PX / displayScale, RELEASE_PX / displayScale,
    );
    state[axis] = chosen[axis] ? { key: chosen[axis].key, ownAnchor: chosen[axis].ownAnchor } : null;
  }
  const dx = chosen.x?.delta || 0;
  const dy = chosen.y?.delta || 0;
  const finalBox = translatedBox(box, dx, dy);
  const active = [chosen.x, chosen.y].filter(Boolean);
  const printCentered = active.length === 2 && active.every(candidate => candidate.kind === 'center' && candidate.target?.print);
  return {
    dx, dy,
    guides: active.flatMap(candidate => guidesFor(candidate, finalBox, displayScale)),
    lockedAxes: ['x', 'y'].filter(axis => chosen[axis]),
    label: printCentered ? 'Centered in print area' : uniqueLabel(active.map(candidate => candidate.label)),
  };
}

function wrappedDifference(target, angle) {
  return ((target - angle + 180) % 360 + 360) % 360 - 180;
}

const normalizedAngle = angle => ((angle % 360) + 360) % 360;

/** Keep equivalent turns (359 -> 360, not 0) so rotation remains continuous. */
export function solveAngleSnap({ angle, session = createSnapSession(), bypass = false } = {}) {
  const state = session && typeof session === 'object' ? session : createSnapSession();
  if (bypass || !validNumber(angle)) {
    resetSnapSession(state);
    return { angle: validNumber(angle) ? angle : 0, snapped: false, label: '' };
  }
  let target = null;
  let kind = null;
  if (state.angle && Number.isFinite(state.angle.target)) {
    const difference = wrappedDifference(state.angle.target, angle);
    const threshold = state.angle.kind === 'primary' ? 8 : 4;
    if (Math.abs(difference) <= threshold + EPSILON) {
      target = angle + difference;
      kind = state.angle.kind;
    }
  }
  if (target === null) {
    const primary = Math.round(angle / 45) * 45;
    const secondary = Math.round(angle / 15) * 15;
    if (Math.abs(primary - angle) <= 5 + EPSILON) {
      target = primary;
      kind = 'primary';
    } else if (Math.abs(secondary - angle) <= 2 + EPSILON) {
      target = secondary;
      kind = 'secondary';
    }
  }
  if (target === null) {
    state.angle = null;
    return { angle, snapped: false, label: '' };
  }
  state.angle = { target: normalizedAngle(target), kind };
  return { angle: target || 0, snapped: true, label: `${normalizedAngle(target)}°` };
}
