import type { InferenceSession } from 'onnxruntime-web/all';
import { maskToCanvas } from './utils';
import type { Bounds } from './types';

export const createPreviewCanvas = (container: HTMLDivElement, bounds: Bounds) => {
  const image = container.querySelector('img');
  if (!image) return;

  const renderMask = (result: InferenceSession.ReturnType) => {
    const canvas = maskToCanvas(
      result, 
      bounds,
      [255, 255, 255, 85],
      [0, 0, 0, 0]
    );

    container.querySelector('.a9s-sam-preview')?.remove();
    container.appendChild(canvas);
  }

  return {
    renderMask
  }
}