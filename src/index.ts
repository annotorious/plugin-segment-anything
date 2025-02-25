import pDebounce from 'p-debounce';
import { v4 as uuidv4 } from 'uuid';
import type { ImageAnnotation, ImageAnnotator } from '@annotorious/annotorious';
import { canvasToFloat32Array, maskToPolygon, prepareSAM2Canvas } from './utils';
import SAM2Worker from './sam2/sam2-worker.ts?worker';
import type { SAM2WorkerResult } from './sam2';
import { createPreviewCanvas } from './preview-canvas';
import type { LabeledPoint } from './types';

import './index.css';

export const mountPlugin = (anno: ImageAnnotator) => {
  const container = anno.element;

  const image = container?.querySelector('img') as HTMLImageElement;
  if (!image) return;

  const SAM2 = new SAM2Worker();

  const debouncedPreview = pDebounce((pt: LabeledPoint) => {
    SAM2.postMessage({ type: 'decode_preview', points: [pt] });
  }, 50);

  // Off-screen copy, resized and padded to 1024x1024px.
  prepareSAM2Canvas(image).then(({ canvas: bufferedImage, bounds }) => {

    const viewportToSAM2Coordinates = (evt: PointerEvent) => {
      const scaleX = image.naturalWidth / image.offsetWidth;
      const scaleY = image.naturalHeight / image.offsetHeight;
  
      const { offsetX, offsetY } = evt;
  
      const x = (offsetX * scaleX) + bounds.x;
      const y = (offsetY * scaleY) + bounds.y;

      return { x, y };
    }

    const onPointerMove = (evt: PointerEvent) => {
      const { x, y } = viewportToSAM2Coordinates(evt);  
      debouncedPreview({ x, y, label: 1 });
    }

    const onPointerDown = (evt: PointerEvent) => {
      const { x, y } = viewportToSAM2Coordinates(evt);
      SAM2.postMessage({ type: 'decode', points: [{ x, y, label: 1 }] });
    }

    const previewCanvas = createPreviewCanvas(anno.element, bounds);

    SAM2.onmessage = ((message: MessageEvent<SAM2WorkerResult>) => {
      const { type } = message.data;
  
      if (type === 'init_complete') {
        // Models loaded - encode the image
        console.log('[annotorious-sam] Encoding image...');

        const data = canvasToFloat32Array(bufferedImage);
        SAM2.postMessage({ type: 'encode_image', data });
      } else if (type === 'encoding_complete') {
        console.log('[annotorious-sam] Encoding complete');

        // Image encoded – add pointer listeners
        container.addEventListener('pointermove', onPointerMove);
        container.addEventListener('pointerdown', onPointerDown);
      } else if (type === 'preview_complete') {
        // Render mask every time the worker has decoded one
        previewCanvas?.renderMask(message.data.result);
      } else if (type === 'decoding_complete') {
        // Render mask every time the worker has decoded one
        const polygon = maskToPolygon(message.data.result, bounds);

        const id = uuidv4();

        const annotation: ImageAnnotation = {
          id,
          bodies: [],
          target: {
            annotation: id,
            selector: polygon,
            creator: { id: 'rainer' },
            created: new Date()
          }
        };


        anno.state.store.addAnnotation(annotation);
      }
    });
  
    SAM2.postMessage({ type: 'init' });
  });

}