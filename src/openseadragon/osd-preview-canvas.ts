import type OpenSeadragon from 'openseadragon';
import type { InferenceSession } from 'onnxruntime-web/all';
import type { Bounds, SAMPluginOpts } from '@/types';
import { bestMaskLogits, upsampleLogits } from '@/utils';
import { createOverlayCanvas } from './utils';

export const createPreviewCanvas = (viewer: OpenSeadragon.Viewer, opts: SAMPluginOpts) => {
  const { canvas, ctx } = createOverlayCanvas(viewer);
  canvas.setAttribute('class', 'a9s-sam a9s-osd-sam-preview');

  // Hidden by default
  canvas.style.display = 'none';

  // Viewport-sized mask buffer, scaled onto the overlay on draw
  const scratch = document.createElement('canvas');

  const render = (result: InferenceSession.ReturnType, bounds: Bounds) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const { offsetWidth: w, offsetHeight: h } = viewer.element;
    if (!w || !h) return;

    // Upsampled logits, letterbox padding cropped off
    const { logits, size } = bestMaskLogits(result);
    const upsampled = upsampleLogits(logits, size, bounds, w, h);

    // Transparent foreground, dimmed background
    const pixels = new Uint8ClampedArray(w * h * 4);

    let foregroundPixelCount = 0;

    for (let i = 0; i < upsampled.length; i++) {
      if (upsampled[i] > 0) {
        foregroundPixelCount++;
      } else {
        pixels[i * 4 + 3] = 100;
      }
    }

    // Ratio of visible foreground pixels
    const ratio = foregroundPixelCount / upsampled.length;

    const maxRatio = opts.maxPreviewCoverage || 1;

    if (ratio <= maxRatio) {
      if (scratch.width !== w || scratch.height !== h) {
        scratch.width = w;
        scratch.height = h;
      }

      scratch.getContext('2d')!.putImageData(new ImageData(pixels, w, h), 0, 0);
      ctx.drawImage(scratch, 0, 0, canvas.width, canvas.height);
    }
  }

  const show = () => {
    // Temporary
    canvas.style.display = null;
  }

  const hide = () => {
    clear();

    // Temporary
    canvas.style.display = 'none';
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
    hide,
    render,
    show
  }

}
