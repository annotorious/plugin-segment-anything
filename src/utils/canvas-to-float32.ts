// Ported to TS from geronimi73 – MIT license
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

  const r: number[] = [];
  const g: number[] = [];
  const b: number[] = [];

  for (let i = 0; i < imageData.length; i += 4) {
    r.push(imageData[i]);
    g.push(imageData[i + 1]);
    b.push(imageData[i + 2]);
  }

  const transposedData = r.concat(g).concat(b);
  const float32Array = new Float32Array(shape[1] * shape[2] * shape[3]);
  const l = transposedData.length;

  for (let i = 0; i < l; i++) {
    float32Array[i] = transposedData[i] / 255.0; // convert to float
  }

  return { float32Array, shape };
}
