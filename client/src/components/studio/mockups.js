import front from '../../assets/images/font-white.png';
import back from '../../assets/images/back-white.png';
import side from '../../assets/images/side-white.png';
import { BOARD, printRect } from './studioDocument';

const images = new Map();
export function loadImage(src) {
  if (!images.has(src)) {
    const job = new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => { images.delete(src); reject(new Error('The product image could not be loaded.')); };
      img.src = src;
    });
    images.set(src, job);
    if (images.size > 24) images.delete(images.keys().next().value);
  }
  return images.get(src);
}

export function mockupSource(type, view) {
  if (type === 'hat') return '/studio/hat-front.png';
  return view === 'back' ? back : ['left', 'right'].includes(view) ? side : front;
}

// The reference-derived hat photograph arrives on white. Remove only the
// background connected to the image border; interior white fabric stays intact.
function clearConnectedWhite(pixels, width, height) {
  const data = pixels.data, seen = new Uint8Array(width * height), queue = new Int32Array(width * height);
  let head = 0, tail = 0;
  const add = index => {
    if (index < 0 || index >= seen.length || seen[index]) return;
    seen[index] = 1;
    const i = index * 4;
    if (data[i + 3] === 0 || (data[i] >= 250 && data[i + 1] >= 250 && data[i + 2] >= 250)) queue[tail++] = index;
  };
  for (let x = 0; x < width; x++) { add(x); add((height - 1) * width + x); }
  for (let y = 0; y < height; y++) { add(y * width); add(y * width + width - 1); }
  while (head < tail) {
    const index = queue[head++];
    data[index * 4 + 3] = 0;
    if (index % width) add(index - 1);
    if (index % width < width - 1) add(index + 1);
    add(index - width); add(index + width);
  }
}

/** Retain the source photograph's lighting and alpha while recoloring fabric. */
export async function renderMockup(type, view, color, background = null) {
  const img = await loadImage(mockupSource(type, view));
  const c = document.createElement('canvas');
  c.width = BOARD.width; c.height = BOARD.height;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  const scale = Math.min(c.width / img.naturalWidth, c.height / img.naturalHeight) * .92;
  const w = img.naturalWidth * scale, h = img.naturalHeight * scale;
  ctx.save();
  if (view === 'right' && type === 'tshirt') { ctx.translate(c.width, 0); ctx.scale(-1, 1); }
  ctx.drawImage(img, (c.width - w) / 2, (c.height - h) / 2, w, h);
  ctx.restore();
  if (type === 'hat') {
    const pixels = ctx.getImageData(0, 0, c.width, c.height);
    clearConnectedWhite(pixels, c.width, c.height);
    ctx.putImageData(pixels, 0, 0);
  }
  if (color.toUpperCase() !== '#FFFFFF') {
    const rgb = color.match(/[a-f\d]{2}/gi)?.map(v => parseInt(v, 16));
    if (rgb?.length === 3) {
      const pixels = ctx.getImageData(0, 0, c.width, c.height);
      for (let i = 0; i < pixels.data.length; i += 4) {
        if (!pixels.data[i + 3]) continue;
        const shade = (.2126 * pixels.data[i] + .7152 * pixels.data[i + 1] + .0722 * pixels.data[i + 2]) / 225;
        for (let k = 0; k < 3; k++) pixels.data[i + k] = Math.min(255, (rgb[k] + 8) * shade);
      }
      ctx.putImageData(pixels, 0, 0);
    }
  }
  if (background) {
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.globalCompositeOperation = 'source-over';
  }
  return c;
}

export async function productSnapshot(document, view = 'front', color = document.garmentColor) {
  const canvas = await renderMockup(document.productType, view, color, '#f6f4ee');
  const src = document.prints?.[view];
  if (src) {
    const rect = printRect(document.productType, view);
    canvas.getContext('2d').drawImage(await loadImage(src), rect.left, rect.top, rect.width, rect.height);
  }
  return canvas;
}

export function canvasBlob(canvas) {
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Could not export the image.')), 'image/png'));
}
