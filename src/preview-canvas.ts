import type { InferenceSession } from 'onnxruntime-web/all';
import { float32ArrayToCanvas, resizeCanvas, sliceTensor } from './lib/image-utils';

export const createPreviewCanvas = (container: HTMLDivElement) => {
  const image = container.querySelector('img');
  if (!image) return;

  const renderMask = (result: InferenceSession.ReturnType) => {
    // SAM2 returns 3 mask along with scores -> select best one
    // See https://github.com/geronimi73/next-sam/blob/main/app/page.jsx
    const maskTensors = result.masks;

    const [_, __, width, height] = maskTensors.dims;

    // @ts-expect-error
    const maskScores = result.iou_predictions.cpuData;
    const bestMaskIdx = maskScores.indexOf(Math.max(...maskScores));

    const bestMaskArray = sliceTensor(maskTensors, bestMaskIdx)
    let bestMaskCanvas = float32ArrayToCanvas(bestMaskArray, width, height)
    bestMaskCanvas = resizeCanvas(bestMaskCanvas);

    bestMaskCanvas.setAttribute('class', 'sam2-preview');

    container.querySelector('.sam2-preview')?.remove();
    container.appendChild(bestMaskCanvas);
  }

  return {
    renderMask
  }
}