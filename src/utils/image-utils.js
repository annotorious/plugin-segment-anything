// By geronimi73 – MIT License
// https://github.com/geronimi73/next-sam/blob/main/lib/imageutils.js

// input: 2x Canvas, output: One new Canvas, resize source
export function mergeMasks(sourceMask, targetMask) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.height = targetMask.height;
  canvas.width = targetMask.width;

  ctx.drawImage(targetMask, 0, 0);
  ctx.drawImage(
    sourceMask,
    0,
    0,
    sourceMask.width,
    sourceMask.height,
    0,
    0,
    targetMask.width,
    targetMask.height
  );

  return canvas;
}

/** 
 * input: HTMLCanvasElement (RGB)
 * output: Float32Array for later conversion to ORT.Tensor of shape [1, 3, canvas.width, canvas.height]
 *  
 * inspired by: https://onnxruntime.ai/docs/tutorials/web/classify-images-nextjs-github-template.html
 **/ 
export function maskCanvasToFloat32Array(canvas) {
  const imageData = canvas
    .getContext("2d")
    .getImageData(0, 0, canvas.width, canvas.height).data;

  const shape = [1, 1, canvas.width, canvas.height];
  const float32Array = new Float32Array(shape[1] * shape[2] * shape[3]);

  for (let i = 0; i < float32Array.length; i++) {
    float32Array[i] = (imageData[i] + imageData[i + 1] + imageData[i + 2]) / (3 * 255.0); // convert avg to float
  }

  return float32Array;
}