import type OpenSeadragon from 'openseadragon';
import type { InferenceSession } from 'onnxruntime-web/all';
import type { Bounds } from '@/types';
import { maskToCanvas } from '@/utils';
import { createOverlayCanvas } from './utils';

export const createPreviewCanvas = (viewer: OpenSeadragon.Viewer) => {
  const { canvas, ctx } = createOverlayCanvas(viewer);
  canvas.setAttribute('class', 'a9s-sam a9s-osd-sam-preview');

  const render = (result: InferenceSession.ReturnType, bounds: Bounds) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const mask = maskToCanvas(
      result, 
      bounds,
      [0, 114, 189, 255],
      [0, 0, 0, 0]
    );
    
    ctx.drawImage(mask, 0, 0, canvas.width, canvas.height);
  }

  const clear = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  const destroy = () => {
    canvas.remove();
  }

  return {
    clear,
    destroy,
    render
  }

}