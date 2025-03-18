import type OpenSeadragon from 'openseadragon';

/**
 * Creates a new canvas that tracks the size of the OpenSeadragon image canvas.
 */
export const createOverlayCanvas = (viewer: OpenSeadragon.Viewer) => {
  const container = viewer.element?.querySelector('.openseadragon-canvas');
  if (!container) throw '[a9s-sam] Error creating overlay canvas';

  const osdCanvas = viewer.drawer.canvas as HTMLCanvasElement;

  const canvas = document.createElement('canvas');
  canvas.width = osdCanvas.width;
  canvas.height = osdCanvas.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw '[a9s-sam] Error creating preview drawing context';

  const observer = new ResizeObserver(entries => {
    try {
      canvas.width = osdCanvas.width;
      canvas.height = osdCanvas.height;
    } catch {
      console.warn('WebGL canvas already disposed');
    }
  });

  observer.observe(osdCanvas);

  container.appendChild(canvas);

  return { canvas, ctx };
}