const VIEWS = [
  { id: 'front', label: 'Front' }, { id: 'back', label: 'Back' },
  { id: 'left', label: 'Left sleeve' }, { id: 'right', label: 'Right sleeve' },
];
const isRecord = value => value && typeof value === 'object' && !Array.isArray(value);
const source = value => typeof value === 'string' && value.trim() && !/^javascript:/i.test(value.trim()) ? value : null;
const hex = value => typeof value === 'string' && /^#[\da-f]{6}$/i.test(value) ? value.toUpperCase() : null;

export function readProductDesign(value, fallbackType = 'tshirt') {
  let data;
  try { data = typeof value === 'string' ? JSON.parse(value) : value; } catch { return null; }
  if (!isRecord(data)) return null;
  if (data.studio === 'truekin-unified' && Number(data.version || 1) > 1) return null;
  const productType = (data.productType || fallbackType) === 'hat' ? 'hat' : 'tshirt';
  const views = productType === 'hat' ? VIEWS.slice(0, 1) : VIEWS;
  const prints = {}, legacyTextures = {};
  for (const { id } of views) {
    const raster = data.surfaces?.[id]?.raster;
    const print = source(data.prints?.[id]) || source(data[`${id}Print`]) || (raster?.cropped && source(raster.src));
    const texture = source(data[`${id}Texture`]) || (!raster?.cropped && source(raster?.src));
    if (print) prints[id] = print;
    else if (texture) legacyTextures[id] = texture;
    const objects = data.surfaces?.[id]?.objects || data.objects?.[id] || data[`${id}Objects`];
    // Never display a blank garment as if it contained unexported artwork.
    if (Array.isArray(objects) && objects.length && !print && !texture) return null;
  }
  if (!['truekin-unified', 'truking-3d'].includes(data.studio) && !Object.keys(prints).length && !Object.keys(legacyTextures).length) return null;
  return { productType, garmentColor: hex(data.garmentColor) || hex(data.tshirtColor) || '#FFFFFF', prints, legacyTextures };
}

export function buildProductMedia(product, selectedColor, design = readProductDesign(product.designData, product.productType)) {
  const productType = design?.productType || (product.productType === 'hat' ? 'hat' : 'tshirt');
  const color = hex(selectedColor) || design?.garmentColor || hex(product.availableColors?.[0]) || '#FFFFFF';
  const colorEntry = Object.entries(isRecord(product.colorImages) ? product.colorImages : {}).find(([key]) => hex(key) === color)?.[1];
  const items = [], seen = new Set();
  const addPhoto = (url, id, label, view) => {
    if (!source(url) || seen.has(url)) return;
    seen.add(url); items.push({ id, kind: 'photo', url, label, view });
  };
  if (isRecord(colorEntry)) {
    addPhoto(colorEntry.front, 'photo-front', 'Front', 'front');
    if (productType !== 'hat') addPhoto(colorEntry.back, 'photo-back', 'Back', 'back');
  }
  const hasColorPhotos = items.length > 0;
  if (design) {
    for (const view of productType === 'hat' ? VIEWS.slice(0, 1) : VIEWS) {
      if (items.some(item => item.view === view.id)) continue;
      if (['left', 'right'].includes(view.id) && !design.prints[view.id] && !design.legacyTextures[view.id]) continue;
      items.push({ id: `render-${view.id}`, kind: 'render', view: view.id, label: view.label });
    }
  }
  // Unlabelled gallery shots may be in the original garment color. Do not mix
  // them into a different swatch's live gallery and misrepresent that variant.
  if (!hasColorPhotos && (!design || color === design.garmentColor)) {
    (Array.isArray(product.imageUrls) ? product.imageUrls : []).forEach((url, index) => addPhoto(url, `photo-${index}`, `Photo ${index + 1}`));
  }
  return { design, productType, color, items, canExplore3D: !!design };
}
