/**
 * Read a File object as a base64 data URL string.
 */
export function readFileAsDataURL(file) {
  return new Promise((resolve) => {
    const fileReader = new FileReader();
    fileReader.onload = () => resolve(fileReader.result);
    fileReader.readAsDataURL(file);
  });
}

/** Long edge, in pixels, that vector assets are rasterised to. */
const SVG_RASTER_LONG_EDGE = 1024;

/**
 * Rasterise an SVG to a canvas with exact, known pixel dimensions.
 *
 * Two problems this solves, both caused by our brand SVGs declaring a viewBox
 * but no width/height (so they have an aspect ratio but no intrinsic size):
 *
 *  1. Cropping. Fabric's Image._renderFill uses the 9-argument drawImage and
 *     takes a `width x height` *window* out of the bitmap — it does not scale
 *     the source to fit. Any drift between the element's pixel size and the
 *     Fabric object's width/height therefore slices the artwork instead of
 *     resizing it, which is why the Truekin logos landed as a black wedge.
 *  2. Resolution. Without an intrinsic size the browser falls back to the
 *     300x150 default replaced-element box, so a shield decoded at 150x150 —
 *     far too coarse for something destined for a printed tee.
 *
 * The viewBox is the authority on aspect ratio; the <img> fallback is rounded
 * (a 310x80 lockup decodes as 300x77) and would letterbox slightly.
 */
function rasterizeSvg(element, svgText) {
  let ratioW = element.naturalWidth || 300;
  let ratioH = element.naturalHeight || 150;

  const viewBox = /viewBox\s*=\s*["']\s*[-\d.]+[,\s]+[-\d.]+[,\s]+([\d.]+)[,\s]+([\d.]+)/i.exec(svgText || '');
  if (viewBox) {
    const w = parseFloat(viewBox[1]);
    const h = parseFloat(viewBox[2]);
    if (w > 0 && h > 0) { ratioW = w; ratioH = h; }
  }

  const scale = SVG_RASTER_LONG_EDGE / Math.max(ratioW, ratioH);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(ratioW * scale));
  canvas.height = Math.max(1, Math.round(ratioH * scale));
  canvas.getContext('2d').drawImage(element, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** Decode a data URL into a fully loaded <img> element. */
function decodeImageElement(dataURL, label) {
  return new Promise((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error(`Could not decode image: ${label}`));
    element.src = dataURL;
  });
}

/**
 * Build a Fabric image from a Blob/File, pinning vectors to a known pixel size.
 * Raster assets already carry exact intrinsic dimensions; only vectors need it.
 */
async function fabricImageFromBlob(fabric, blob, label) {
  const isSvg = (blob.type || '').includes('svg');
  const svgText = isSvg ? await blob.text() : null;
  const element = await decodeImageElement(await readFileAsDataURL(blob), label);
  return new fabric.Image(isSvg ? rasterizeSvg(element, svgText) : element);
}

/**
 * Load a bundled studio asset as an embedded Fabric image.
 * Embedding the data URL keeps saved designs portable across domains and
 * compatible with the existing Fabric JSON restore path.
 */
export async function loadFabricAssetImage(fabric, src) {
  const response = await fetch(src);
  if (!response.ok) throw new Error(`Could not load design asset: ${src}`);
  return fabricImageFromBlob(fabric, await response.blob(), src);
}

/**
 * Load a customer-supplied image file. The file pickers accept SVG, which hits
 * the same no-intrinsic-size crop as the bundled brand marks.
 */
export async function loadFabricImageFromFile(fabric, file) {
  return fabricImageFromBlob(fabric, file, file.name);
}

/**
 * Download the current 3D canvas as a PNG image.
 */
export function downloadCanvasAsPNG(canvasElement) {
  const canvas = canvasElement || document.querySelector('canvas');
  if (!canvas) return;
  const dataURL = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.href = dataURL;
  link.download = 'tshirt-design.png';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Convert a data URL string to a Blob (for server upload).
 */
export function dataURLToBlob(dataURL) {
  const [header, base64] = dataURL.split(',');
  const mime = header.match(/:(.*?);/)[1];
  const bytes = atob(base64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

/**
 * Capture the current 3D canvas as a Blob (for server upload).
 * Returns a Promise<Blob>.
 */
export function captureCanvasBlob(canvasElement) {
  const canvas = canvasElement || document.querySelector('canvas');
  if (!canvas) return Promise.reject(new Error('No canvas found'));
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to capture canvas'));
      },
      'image/png',
      1.0
    );
  });
}
