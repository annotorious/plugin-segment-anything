// SAM2 expects ImageNet-normalized input
const MEAN = [0.485, 0.456, 0.406];
const STD = [0.229, 0.224, 0.225];

// Ported to TS from geronimi73 – MIT license
// https://github.com/geronimi73/next-sam/blob/main/lib/imageutils.js
export const canvasToFloat32Array = (canvas: HTMLCanvasElement) => {
  const imageData = canvas.getContext('2d')?.getImageData(0, 0, canvas.width, canvas.height).data;
  if (!imageData) return;

  const shape = [
    1,
    3,
    canvas.width,
    canvas.height
  ];

  // RGBA (HWC) to normalized RGB planes (CHW)
  const n = canvas.width * canvas.height;
  const float32Array = new Float32Array(3 * n);

  for (let i = 0; i < n; i++) {
    for (let c = 0; c < 3; c++) {
      float32Array[c * n + i] = (imageData[i * 4 + c] / 255 - MEAN[c]) / STD[c];
    }
  }

  return { float32Array, shape };
}
