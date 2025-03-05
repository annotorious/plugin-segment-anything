import type { InferenceSession } from 'onnxruntime-web/all';
import { float32ArrayToCanvas } from './float32-to-canvas';
import { sliceTensor } from './slice-tensor';
import type { Bounds } from '@/types';

export const maskToCanvas = (
  result: InferenceSession.ReturnType, 
  bounds: Bounds,
  foreground: [number, number, number, number] = [255, 255, 255, 255], // White
  background: [number, number, number, number] = [0, 0, 0, 0] // black, transparent
) => {
  // SAM2 returns 3 masks along with scores – select best one
  // See https://github.com/geronimi73/next-sam/blob/main/app/page.jsx
  const maskTensors = result.masks;

  // Mask dimension will be 256x256 (by design of the SAM2 model)
  const [_, __, width, height] = maskTensors.dims;

  // @ts-expect-error
  const maskScores = result.iou_predictions.cpuData;
  const bestMaskIdx = maskScores.indexOf(Math.max(...maskScores));

  // HTML canvas, 256x256 px
  const { canvas: bestMask, ratio } = float32ArrayToCanvas(
    sliceTensor(maskTensors, bestMaskIdx), 
    width, 
    height,
    foreground,
    background
  );

  // Clip the original image size from the 1024 x 1024
  const resized = document.createElement('canvas');
  resized.setAttribute('class', 'a9s-sam-preview');

  resized.width = bounds.w;
  resized.height = bounds.h;

  const ctx = resized.getContext('2d')!;
  ctx.drawImage(
    bestMask,
    - bounds.x,
    - bounds.y,
    bounds.w + 2 * bounds.x,
    bounds.h + 2 * bounds.y
  );

  /*
  resized.style.position = 'absolute';
  resized.style.top = '0';
  resized.style.left = '0';
  resized.style.width = '100%';
  resized.style.height = '100%';
  resized.style.opacity = '0.5';
  resized.style.pointerEvents = 'none';
  document.body.appendChild(resized);
  */

  // The `ratio` returned by `float32ArrayToCanvas` represents
  // relative percentage of foreground pixels on the mask. However,
  // The mask is for the padded image. Therefore, for the true
  // ratio of VISIBLE foreground pixels, we also need to take the
  // image bounds into account.
  const boundsRatio = (bounds.w * bounds.h) / (1024 * 1024);

  return { canvas: resized, ratio: ratio / boundsRatio };
}