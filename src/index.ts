import pDebounce from 'p-debounce';
import type { ImageAnnotator } from '@annotorious/annotorious';
import SAM2Worker from './sam2/sam2-worker.ts?worker';
import { createPreviewCanvas } from './preview-canvas';
import type { SAM2WorkerResult } from './sam2/sam2-worker-messages';
import { canvasToFloat32Array, resizeCanvas } from './lib/image-utils';
import type { Point } from './types';

export const mountPlugin = (anno: ImageAnnotator) => {
  const container = anno.element;

  const image = container?.querySelector('img') as HTMLImageElement;
  if (!image) return;

  const SAM2 = new SAM2Worker();

  const previewCanvas = createPreviewCanvas(anno.element);

  const debouncedPreview = pDebounce((pt: Point) => {
    SAM2.postMessage({ type: 'decode', points: [pt] });
  }, 200);

  const onPointerMove = (evt: PointerEvent) => {
    const { offsetX: x, offsetY: y } = evt;
    debouncedPreview({ x, y, label: 1});
  }

  SAM2.onmessage = ((message: MessageEvent<SAM2WorkerResult>) => {
    const { type } = message.data;

    if (type === 'init_complete') {
      // Models loaded - encode the image
      console.log('[annotorious-sam] Encoding image...');
      const data = canvasToFloat32Array(resizeCanvas(image, { w: 1024, h: 1024 }));
      SAM2.postMessage({ type: 'encode_image', data })
    } else if (type === 'encoding_complete') {
      console.log('[annotorious-sam] Encoding complete');
      container.addEventListener('pointermove', onPointerMove);
    } else if (type === 'decoding_complete') {
      console.log('decoded');
    }
  });

  SAM2.postMessage({ type: 'init' });
}