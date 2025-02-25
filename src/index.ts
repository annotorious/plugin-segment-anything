import pDebounce from 'p-debounce';
import type { ImageAnnotator } from '@annotorious/annotorious';
import { canvasToFloat32Array, prepareSAM2Canvas } from './utils';
import SAM2Worker from './sam2/sam2-worker.ts?worker';
import type { SAM2WorkerResult } from './sam2';
import { createPreviewCanvas } from './preview-canvas';
import type { Point } from './types';

import './index.css';

export const mountPlugin = (anno: ImageAnnotator) => {
  const container = anno.element;

  const image = container?.querySelector('img') as HTMLImageElement;
  if (!image) return;

  const SAM2 = new SAM2Worker();

  const debouncedPreview = pDebounce((pt: Point) => {
    SAM2.postMessage({ type: 'decode_mask', points: [pt] });
  }, 50);

  // Off-screen copy, resized and padded to 1024x1024px.
  prepareSAM2Canvas(image).then(({ canvas: bufferedImage, bounds }) => {
    const onPointerMove = (evt: PointerEvent) => {
      const scaleX = image.naturalWidth / image.offsetWidth;
      const scaleY = image.naturalHeight / image.offsetHeight;
  
      const { offsetX, offsetY } = evt;
  
      const x = (offsetX * scaleX) + bounds.x;
      const y = (offsetY * scaleY) + bounds.y;
  
      debouncedPreview({ x, y, label: 1});
    }

    const previewCanvas = createPreviewCanvas(anno.element, bounds);

    SAM2.onmessage = ((message: MessageEvent<SAM2WorkerResult>) => {
      const { type } = message.data;
  
      if (type === 'init_complete') {
        // Models loaded - encode the image
        console.log('[annotorious-sam] Encoding image...');
        const data = canvasToFloat32Array(bufferedImage);
        SAM2.postMessage({ type: 'encode_image', data })
      } else if (type === 'encoding_complete') {
        console.log('[annotorious-sam] Encoding complete');

        // Image encoded – add pointer listeners
        container.addEventListener('pointermove', onPointerMove);
      } else if (type === 'decoding_complete') {
        // Render mask every time the worker has decoded one
        previewCanvas?.renderMask(message.data.result);
      }
    });
  
    SAM2.postMessage({ type: 'init' });
  });

}