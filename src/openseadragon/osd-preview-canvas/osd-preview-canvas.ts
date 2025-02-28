import type OpenSeadragon from 'openseadragon';
import type { InferenceSession } from 'onnxruntime-web/all';
import type { Bounds } from '@/types';
import { maskToCanvas } from '@/utils';

import './osd-preview-canvas.css';

export const createPreviewCanvas = (viewer: OpenSeadragon.Viewer) => {
  const container = viewer.element.querySelector('.openseadragon-canvas');
  if (!container) throw '[a9s-sam] Error creating preview canvas';

  const osdCanvas = viewer.drawer.canvas as HTMLCanvasElement;

  const previewCanvas = document.createElement('canvas');
  previewCanvas.setAttribute('class', 'a9s-sam-preview a9s-osd-sam-preview');

  previewCanvas.width = osdCanvas.width;
  previewCanvas.height = osdCanvas.height;

  const ctx = previewCanvas.getContext('2d');
  if (!ctx) throw '[a9s-sam] Error creating preview drawing context';

  const observer = new ResizeObserver(entries => {
    try {
      previewCanvas.width = osdCanvas.width;
      previewCanvas.height = osdCanvas.height;
    } catch {
      console.warn('WebGL canvas already disposed');
    }
  });

  observer.observe(osdCanvas);

  const render = (result: InferenceSession.ReturnType, bounds: Bounds) => {
    ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);

    const canvas = maskToCanvas(
      result, 
      bounds,
      [0, 114, 189, 255],
      [0, 0, 0, 0]
    );
    
    ctx.drawImage(canvas, 0, 0, previewCanvas.width, previewCanvas.height);
  }

  const clear = () => {
    ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
  }

  const destroy = () => {
    previewCanvas.remove();
  }

  container.appendChild(previewCanvas);

  return {
    clear,
    destroy,
    render
  }

}