// Ported to TS from geronimi73 – MIT license
// https://github.com/geronimi73/next-sam/blob/main/lib/imageutils.js
export const float32ArrayToCanvas = (
  array: Float32Array<ArrayBuffer>, 
  width: number, 
  height: number,
  foreground: [number, number, number, number] = [255, 255, 255, 255], // White
  background: [number, number, number, number] = [0, 0, 0, 0] // black, transparent
) => {
  const C = 4; // 4 output channels, RGBA
  const imageData = new Uint8ClampedArray(array.length * C);

  for (let srcIdx = 0; srcIdx < array.length; srcIdx++) {
    const trgIdx = srcIdx * C;
    const maskedPx = array[srcIdx] > 0;

    const color = maskedPx ? foreground : background;

    imageData[trgIdx] = color[0];
    imageData[trgIdx + 1] = color[1];
    imageData[trgIdx + 2] = color[2];
    imageData[trgIdx + 3] = color[3]
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) throw 'Error initializing canvas';

  canvas.height = height;
  canvas.width = width;
  ctx.imageSmoothingEnabled = false;
  ctx.putImageData(new ImageData(imageData, width, height), 0, 0);

  return canvas;
}