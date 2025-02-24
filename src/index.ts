import pDebounce from 'p-debounce';
import type { ImageAnnotator } from '@annotorious/annotorious';
import SAM2Worker from './sam2/sam2-worker.ts?worker';
import { createPreviewCanvas } from './preview-canvas';
import type { SAM2WorkerResult } from './sam2/sam2-worker-messages';
import { resizeCanvas, canvasToFloat32Array } from './lib/image-utils-ts';
import type { Point } from './types';

import { getImageData } from './lib/get-image-data';

import './index.css';
import { Placement } from 'openseadragon';


export const mountPlugin = (anno: ImageAnnotator) => {
  const container = anno.element;

  const image = container?.querySelector('img') as HTMLImageElement;
  if (!image) return;

  const SAM2 = new SAM2Worker();

  const debouncedPreview = pDebounce((pt: Point) => {
    SAM2.postMessage({ type: 'decode_mask', points: [pt] });
  }, 200);

  // Off-screen copy, resized and padded to 1024x1024px.
  getImageData(image).then(({ canvas: bufferedImage, placement }) => {

    const onPointerMove = (evt: PointerEvent) => {
      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;
  
      const { offsetX, offsetY } = evt;
  
      const x = offsetX * scaleX + placement.x;
      const y = offsetY * scaleY + placement.y;
  
      debouncedPreview({ x, y, label: 1});
    }

    const previewCanvas = createPreviewCanvas(anno.element, placement);

    SAM2.onmessage = ((message: MessageEvent<SAM2WorkerResult>) => {
      const { type } = message.data;
  
      if (type === 'init_complete') {
        // Models loaded - encode the image
        console.log('[annotorious-sam] Encoding image...');
        const data = canvasToFloat32Array(bufferedImage);
        SAM2.postMessage({ type: 'encode_image', data })
      } else if (type === 'encoding_complete') {
        console.log('[annotorious-sam] Encoding complete');
        container.addEventListener('pointermove', onPointerMove);
      } else if (type === 'decoding_complete') {
        previewCanvas?.renderMask(message.data.result);
      }
    });
  
    SAM2.postMessage({ type: 'init' });
  });

}