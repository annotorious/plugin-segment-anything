// Ported to TS from geronimi73 – MIT license
// https://github.com/geronimi73/next-sam/blob/main/lib/imageutils.js
export const float32ArrayToCanvas = (array: Float32Array<ArrayBuffer>, width: number, height: number) => {
  const C = 4; // 4 output channels, RGBA
  const imageData = new Uint8ClampedArray(array.length * C);

  for (let srcIdx = 0; srcIdx < array.length; srcIdx++) {
    const trgIdx = srcIdx * C;
    const maskedPx = array[srcIdx] > 0;

    const pixelValue = maskedPx ? 255 : 0; // black/white

    imageData[trgIdx] = pixelValue;
    imageData[trgIdx + 1] = pixelValue;
    imageData[trgIdx + 2] = pixelValue;
    imageData[trgIdx + 3] = 255; // alpha
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.height = height;
  canvas.width = width;
  ctx!.putImageData(new ImageData(imageData, width, height), 0, 0);

  return canvas;
}
