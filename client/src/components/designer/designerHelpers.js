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
