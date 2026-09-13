/** The shared document behind both the flat editor and the 3D preview. */
export const STUDIO_ID = 'truekin-unified';
export const STUDIO_VERSION = 1;
export const BOARD = { width: 900, height: 1000 };
export const COLORS = ['#FFFFFF', '#181818', '#6d706f', '#eee4ce', '#233c53', '#6f302b', '#245846', '#c28b32', '#d4a8ae', '#6c5683'];
export const COLOR_NAMES = ['White', 'Ink', 'Stone', 'Bone', 'Navy', 'Oxblood', 'Forest', 'Mustard', 'Rose', 'Violet'];
export const SURFACES = {
  tshirt: [
    { id: 'front', label: 'Front', area: { x: .27, y: .2, w: .46, h: .48 } },
    { id: 'back', label: 'Back', area: { x: .27, y: .2, w: .46, h: .48 } },
    // Original side photo, fitted at 92% to the 450×500 legacy artboard.
    { id: 'left', label: 'Left sleeve', area: { x: .45905659, y: .24203936, w: .12257126, h: .12889568 } },
    { id: 'right', label: 'Right sleeve', area: { x: .41837215, y: .24203936, w: .12257126, h: .12889568 } },
  ],
  hat: [{ id: 'front', label: 'Front panel', area: { x: .3267, y: .3567, w: .3467, h: .20802 } }],
};

export function surfaceInfo(productType, view = 'front') {
  const surfaces = SURFACES[productType] || SURFACES.tshirt;
  return surfaces.find(s => s.id === view) || surfaces[0];
}

export function printRect(productType, view = 'front') {
  const { area } = surfaceInfo(productType, view);
  return { left: area.x * BOARD.width, top: area.y * BOARD.height, width: area.w * BOARD.width, height: area.h * BOARD.height };
}

export function parseDesign(value) {
  if (!value) return null;
  try { return typeof value === 'string' ? JSON.parse(value) : value; }
  catch { throw new Error('This design file could not be read. Your current design has not been changed.'); }
}

export function emptyDocument(productType = 'tshirt') {
  return {
    studio: STUDIO_ID, version: STUDIO_VERSION,
    productType, garmentColor: '#FFFFFF', tshirtColor: '#FFFFFF',
    surfaces: Object.fromEntries(SURFACES[productType].map(s => [s.id, { objects: [] }])),
    prints: {},
  };
}

/** Legacy objects lived on a 450×500 canvas. Scale at the object root only;
 * a group's children stay relative to the group, preventing double scaling. */
function migrateObject(object, index) {
  return {
    ...structuredClone(object),
    studioId: object.studioId || `legacy-${index}`,
    studioName: object.studioName || object.text || 'Imported artwork',
    left: (object.left || 0) * 2,
    top: (object.top || 0) * 2,
    scaleX: (object.scaleX ?? 1) * 2,
    scaleY: (object.scaleY ?? 1) * 2,
  };
}

export function normalizeDocument(value, fallbackType = 'tshirt') {
  const data = parseDesign(value);
  if (!data) return emptyDocument(fallbackType);
  const type = data.productType === 'hat' ? 'hat' : 'tshirt';
  const next = emptyDocument(type);
  next.garmentColor = data.garmentColor || data.tshirtColor || '#FFFFFF';
  next.tshirtColor = next.garmentColor;
  if (data.studio === STUDIO_ID) {
    if (data.version > STUDIO_VERSION) throw new Error('This design was made in a newer studio version.');
    for (const s of SURFACES[type]) {
      const surface = data.surfaces?.[s.id];
      next.surfaces[s.id] = { objects: structuredClone(surface?.objects || []) };
      if (surface?.raster?.src) next.surfaces[s.id].raster = structuredClone(surface.raster);
    }
    next.prints = { ...data.prints };
    return next;
  }
  next.migrated = true;
  for (const s of SURFACES[type]) {
    const objects = data.objects?.[s.id] || data[`${s.id}Objects`] || [];
    next.surfaces[s.id].objects = objects.map(migrateObject);
    const print = data.prints?.[s.id] || data[`${s.id}Print`];
    if (print) next.prints[s.id] = print;
    // A legacy raster-only design can still be placed and preserved. Flattened
    // textures cannot recover individual text/shape layers that were not saved.
    if (!objects.length) {
      const src = print || data[`${s.id}Texture`];
      if (src && src.length > 100) next.surfaces[s.id].raster = { src, cropped: !!print };
    }
  }
  return next;
}

export function serializableDocument(document) {
  const next = structuredClone(document);
  delete next.migrated;
  next.tshirtColor = next.garmentColor;
  next.editorType = '3d';
  next.shirtStyle = 'unisex';
  return next;
}

export function makeHistory(initial, limit = 50) {
  let states = [initial];
  let index = 0;
  return {
    push(value) {
      if (states[index] === value) return;
      states = [...states.slice(0, index + 1), value].slice(-limit);
      index = states.length - 1;
    },
    undo() { if (index > 0) index--; return states[index]; },
    redo() { if (index < states.length - 1) index++; return states[index]; },
    get canUndo() { return index > 0; },
    get canRedo() { return index < states.length - 1; },
  };
}
