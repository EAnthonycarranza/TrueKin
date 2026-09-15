import { loadImage, renderMockup } from '../studio/mockups';
import { BOARD, printRect } from '../studio/studioDocument';

const printsCache = new WeakMap();
const photosCache = new WeakMap();

export function prepareProductPrints(design) {
  if (!printsCache.has(design)) {
    const job = Promise.all(Object.entries(design.legacyTextures || {}).map(async ([view, src]) => {
      const image = await loadImage(src);
      const rect = printRect(design.productType, view);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(rect.width * 2); canvas.height = Math.round(rect.height * 2);
      const sx = image.naturalWidth / BOARD.width, sy = image.naturalHeight / BOARD.height;
      canvas.getContext('2d').drawImage(image, rect.left * sx, rect.top * sy, rect.width * sx, rect.height * sy, 0, 0, canvas.width, canvas.height);
      return [view, canvas.toDataURL('image/png')];
    })).then(entries => ({ ...Object.fromEntries(entries), ...design.prints })).catch(error => { printsCache.delete(design); throw error; });
    printsCache.set(design, job);
  }
  return printsCache.get(design);
}

export function renderProductPhoto(design, view, color) {
  if (!photosCache.has(design)) photosCache.set(design, new Map());
  const cache = photosCache.get(design), key = `${view}|${color}`;
  if (!cache.has(key)) {
    const job = Promise.all([renderMockup(design.productType, view, color, '#f6f4ee'), prepareProductPrints(design)]).then(async ([canvas, prints]) => {
      if (prints[view]) {
        const rect = printRect(design.productType, view);
        canvas.getContext('2d').drawImage(await loadImage(prints[view]), rect.left, rect.top, rect.width, rect.height);
      }
      return canvas.toDataURL('image/png');
    }).catch(error => { cache.delete(key); throw error; });
    cache.set(key, job);
    if (cache.size > 16) cache.delete(cache.keys().next().value);
  }
  return cache.get(key);
}
