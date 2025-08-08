import pDebounce from 'p-debounce';
import { v4 as uuidv4 } from 'uuid';
import type { ImageAnnotation, ImageAnnotator } from '@annotorious/annotorious';
import SAM2Worker from './sam2/sam2-worker.ts?worker';
import type { SAM2WorkerResult } from './sam2';
import { canvasToFloat32Array, maskToPolygon, prepareSAM2Canvas } from './utils';
import { createPromptMarkerCanvas } from './prompt-marker-canvas';
import { createPreviewCanvas } from './preview-canvas';
import type { Point, SAM2DecoderPrompt, SAMPluginOpts } from './types';

import './index.css';

export const mountPlugin = (anno: ImageAnnotator, opts: SAMPluginOpts = {}) => {
  let _enabled = false;

  let currentAnnotationId: string;

  const container = anno.element;

  let input: SAM2DecoderPrompt = {

    include: [],
    
    exclude: []
  
  }; 

  const image = container?.querySelector('img') as HTMLImageElement;
  if (!image) return;

  const SAM2 = new SAM2Worker();

  let onPointerMove: ((evt: PointerEvent) => void) | null = null;
  let onPointerDown: ((evt: PointerEvent) => void) | null = null;

  let promptMarkerCanvas: ReturnType<typeof createPromptMarkerCanvas>;

  let previewCanvas: ReturnType<typeof createPreviewCanvas>;

  const updateEventListeners = () => {
    if (!onPointerMove || !onPointerDown) return;
    
    if (_enabled) {
      container.addEventListener('pointermove', onPointerMove);
      container.addEventListener('pointerdown', onPointerDown);
    } else {
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerdown', onPointerDown);
    }
  }

  const debouncedPreview = pDebounce((pt: Point) => {
    SAM2.postMessage({ type: 'decode_preview', point: pt });
  }, 1);

  // Off-screen copy, resized and padded to 1024x1024px.
  prepareSAM2Canvas(image).then(({ canvas: bufferedImage, bounds, scale }) => {
    const viewportToSAM2Coordinates = (evt: PointerEvent) => {
      const scaleX = image.naturalWidth / (scale * image.offsetWidth);
      const scaleY = image.naturalHeight / (scale * image.offsetHeight);
  
      const { offsetX, offsetY } = evt;
  
      const x = (offsetX * scaleX) + bounds.x;
      const y = (offsetY * scaleY) + bounds.y;

      return { x, y };
    }

    onPointerMove = (evt: PointerEvent) => {
      if (input.include.length + input.exclude.length > 0) return;
      
      const { x, y } = viewportToSAM2Coordinates(evt);  
      debouncedPreview({ x, y });
    }

    onPointerDown = (evt: PointerEvent) => {
      const { x, y } = viewportToSAM2Coordinates(evt);

      if (evt.shiftKey) {
        input.exclude.push({ x, y });
      } else {
        input.include.push({ x, y });
      }

      previewCanvas?.setVisible(false);

      promptMarkerCanvas?.setInput(input);

      SAM2.postMessage({ type: 'decode', input });
    }

    previewCanvas = createPreviewCanvas(anno.element, bounds);

    promptMarkerCanvas = createPromptMarkerCanvas(anno.element, bounds, scale);

    SAM2.onmessage = ((message: MessageEvent<SAM2WorkerResult>) => {
      const { type } = message.data;
  
      if (type === 'init_success') {
        // Models loaded - encode the image
        console.log('[annotorious-sam] Encoding image...');

        const data = canvasToFloat32Array(bufferedImage);
        SAM2.postMessage({ type: 'encode', data });
      } else if (type === 'encode_success') {
        console.log('[annotorious-sam] Encoding complete');

        // Image encoded – add pointer listeners
        updateEventListeners();
      } else if (type === 'decode_preview_success') {
        // Render mask every time the worker has decoded one
        previewCanvas?.renderMask(message.data.result);
      } else if (type === 'decode_success') {
        // Render mask every time the worker has decoded one
        const polygon = maskToPolygon(message.data.result, bounds, scale);

        const annotation: ImageAnnotation = {
          id: currentAnnotationId,
          bodies: [],
          target: {
            annotation: currentAnnotationId,
            selector: polygon,
            creator: { id: 'rainer' },
            created: new Date()
          }
        };

        const { store } = anno.state;

        const exists = store.getAnnotation(currentAnnotationId);
        if (exists) {
          store.updateAnnotation(currentAnnotationId, annotation);
        } else {
          store.addAnnotation(annotation);
        }
      }
    });
  
    SAM2.postMessage({ type: 'init' });
  });

  const setEnabled = (enabled: boolean) => {
    _enabled = enabled;

    currentAnnotationId = uuidv4();

    updateEventListeners();

    previewCanvas?.setVisible(enabled);
  }

  const setShowPreview = (showPreview: boolean) => {
    previewCanvas?.setVisible(showPreview);
  }

  return {
    setEnabled,
    setShowPreview
  }

}

export * from './types';