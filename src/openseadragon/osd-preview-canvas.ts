import type OpenSeadragon from 'openseadragon';
import type { InferenceSession } from 'onnxruntime-web/all';
import type { Bounds, SAMPluginOpts } from '@/types';
import { bestMaskLogits, upsampleLogits } from '@/utils';
import { createOverlayCanvas } from './utils';

// Preview mask resolution relative to the viewport (CSS px)
const PREVIEW_SCALE = 0.5;

export const createPreviewCanvas = (viewer: OpenSeadragon.Viewer, opts: SAMPluginOpts) => {
  const { canvas, ctx } = createOverlayCanvas(viewer);
  canvas.setAttribute('class', 'a9s-sam a9s-osd-sam-preview');

  // Hidden by default
  canvas.style.display = 'none';

  // Mask buffer, scaled onto the overlay on draw
  const scratch = document.createElement('canvas');

  let imageData: ImageData | undefined;

  const render = (result: InferenceSession.ReturnType, bounds: Bounds) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Previews run on every pointer move – render at half the viewport
    // resolution to keep the main thread responsive on large viewers
    const w = Math.round(viewer.element.offsetWidth * PREVIEW_SCALE);
    const h = Math.round(viewer.element.offsetHeight * PREVIEW_SCALE);
    if (!w || !h) return;

    // Upsampled logits, letterbox padding cropped off
    const { logits, size } = bestMaskLogits(result);
    const upsampled = upsampleLogits(logits, size, bounds, w, h);

    if (!imageData || imageData.width !== w || imageData.height !== h) {
      imageData = new ImageData(w, h);
      scratch.width = w;
      scratch.height = h;
    }

    // Transparent foreground, dimmed background (RGB stays black)
    const pixels = imageData.data;

    let foregroundPixelCount = 0;

    for (let i = 0; i < upsampled.length; i++) {
      if (upsampled[i] > 0) {
        foregroundPixelCount++;
        pixels[i * 4 + 3] = 0;
      } else {
        pixels[i * 4 + 3] = 100;
      }
    }

    // Ratio of visible foreground pixels
    const ratio = foregroundPixelCount / upsampled.length;

    const maxRatio = opts.maxPreviewCoverage || 1;

    if (ratio <= maxRatio) {
      scratch.getContext('2d')!.putImageData(imageData, 0, 0);
      ctx.drawImage(scratch, 0, 0, canvas.width, canvas.height);
    }
  }

  const show = () => {
    // Temporary
    canvas.style.display = 'block';
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
