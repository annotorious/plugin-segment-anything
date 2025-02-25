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
  const bestMask = float32ArrayToCanvas(
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

  return resized;
}