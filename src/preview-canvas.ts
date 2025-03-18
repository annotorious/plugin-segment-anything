import type { InferenceSession } from 'onnxruntime-web/all';
import { maskToCanvas } from './utils';
import type { Bounds } from './types';

export const createPreviewCanvas = (container: HTMLDivElement, bounds: Bounds) => {
  const image = container?.querySelector('img');
  if (!image) return;

  let _visible = true;

  const renderMask = (result: InferenceSession.ReturnType) => {
    if (!_visible) return;

    const { canvas } = maskToCanvas(
      result, 
      bounds,
      [0, 114, 189, 255],
      [0, 0, 0, 0]
    );

    container.querySelector('.a9s-sam-preview')?.remove();
    container.appendChild(canvas);
  }

  const setVisible = (visible: boolean) => {
    _visible = visible;

    if (!visible)
      container.querySelector('.a9s-sam-preview')?.remove();
  }

  return {
    renderMask,
    setVisible
  }
}