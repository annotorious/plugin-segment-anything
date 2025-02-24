import type { InferenceSession } from 'onnxruntime-web/all';
import { float32ArrayToCanvas, resizeCanvas, sliceTensor } from './lib/image-utils';
import type { Bounds } from './types';

export const createPreviewCanvas = (container: HTMLDivElement, placement: Bounds) => {
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

    /*
    const visiblePart = document.createElement('canvas');
    visiblePart.setAttribute('class', 'sam2-preview');

    visiblePart.width = placement.w;
    visiblePart.height = placement.h;

    const ctx = visiblePart.getContext('2d')!;

    ctx.drawImage(
      bestMaskCanvas,
      placement.x,
      placement.y,
      bestMaskCanvas.width,
      bestMaskCanvas.height,
      0,
      0,
      placement.w + placement.x,
      placement.h + placement.y
    );
    */

    container.querySelector('.sam2-preview')?.remove();
    container.appendChild(bestMaskCanvas);
  }

  return {
    renderMask
  }
}