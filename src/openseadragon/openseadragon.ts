import type { OpenSeadragonAnnotator } from '@annotorious/openseadragon';
import SAM2Worker from '@/sam2/sam2-worker.ts?worker';
import type { SAM2WorkerResult } from '@/sam2';
import { canvasToFloat32Array, getImageBounds } from '@/utils';
import { createPreviewCanvas } from '@/preview-canvas';
import { onImageLoaded } from './on-image-loaded';

import '../index.css';

const prepareSAM2Canvs = (source: HTMLCanvasElement) => {
  const { bounds, scale } = getImageBounds(
    { h: source.height, w: source.width },
    { h: 1024, w: 1024 }
  );

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;

  canvas
    .getContext('2d')!
    .drawImage(
      source,
      0,
      0,
      source.width,
      source.height,
      bounds.x,
      bounds.y,
      bounds.w,
      bounds.h
    );

  return { canvas, bounds, scale };

}

export const mountOpenSeadragonPlugin = (anno: OpenSeadragonAnnotator) => {
  
  const { viewer } = anno;

  const canvas = viewer.drawer.canvas as HTMLCanvasElement;

  let initialized = false;

  let fullyLoaded = false;

  let currentSAMCanvas: HTMLCanvasElement;

  let currentBounds = getImageBounds(
    { h: canvas.height, w: canvas.width },
    { h: 1024, w: 1024 }
  ).bounds;

  let currentScale: number; 

  const viewportToSAM2Coordinates = (evt: PointerEvent) => {
    if (!(initialized && currentSAMCanvas)) return;

    const canvas =  viewer.drawer.canvas as HTMLCanvasElement;
    const scaleX = canvas.width / (currentScale * canvas.offsetWidth);
    const scaleY = canvas.height / (currentScale * canvas.offsetHeight);

    const { offsetX, offsetY } = evt;

    const x = (offsetX * scaleX) + currentBounds.x;
    const y = (offsetY * scaleY) + currentBounds.y;

    return { x, y };
  }

  const onPointerMove = (evt: PointerEvent) => {
    const pt = viewportToSAM2Coordinates(evt);
    if (!pt) return;
    SAM2.postMessage({ type: 'decode_preview', point: pt });
  }

  viewer.element.addEventListener('pointermove', onPointerMove);

  let previewCanvas: ReturnType<typeof createPreviewCanvas>;
  
  const SAM2 = new SAM2Worker();
  SAM2.onmessage = ((message: MessageEvent<SAM2WorkerResult>) => {
    const { type } = message.data;

    if (type === 'init_success') {
      // Models loaded - encode the image
      console.log('[annotorious-sam] Init complete...');
      initialized = true;

      previewCanvas = createPreviewCanvas(viewer.element as HTMLDivElement, currentBounds);

      if (currentSAMCanvas) {
        const data = canvasToFloat32Array(currentSAMCanvas);
        SAM2.postMessage({ type: 'encode', data });
      }
    } else if (type === 'encode_success') {
      console.log('[annotorious-sam] Encoding complete');
    } else if (type === 'decode_preview_success') {
      console.log('preview complete!');
      // Render mask every time the worker has decoded one
      previewCanvas?.renderMask(message.data.result);
    } else if (type === 'decode_success') {
      // Render mask every time the worker has decoded one
      // const polygon = maskToPolygon(message.data.result, bounds, scale);

      // const annotation: ImageAnnotation = {
      //   id: currentAnnotationId,
      //   bodies: [],
      //   target: {
      //     annotation: currentAnnotationId,
      //     selector: polygon,
      //     creator: { id: 'rainer' },
      //     created: new Date()
      //   }
      // };

      // const { store, selection } = anno.state;

      // const exists = store.getAnnotation(currentAnnotationId);
      // if (exists) {
      //   store.updateAnnotation(currentAnnotationId, annotation);
      // } else {
      //   store.addAnnotation(annotation);
      // }

      // selection.setSelected(currentAnnotationId);
    }
  });

  SAM2.postMessage({ type: 'init' });

  const onStartAnimation = () => {
    previewCanvas?.setVisible(false);
  }

  const onFinishAnimation =  () => {
    if (!fullyLoaded) return;

    previewCanvas?.setVisible(true);

    const { canvas, bounds, scale } = prepareSAM2Canvs(viewer.drawer.canvas as HTMLCanvasElement);

    console.log('New SAM canvas');

    currentSAMCanvas = canvas;
    currentBounds = bounds;
    currentScale = scale;

    if (initialized) {
      const data = canvasToFloat32Array(canvas);
      console.log('Encoding image');
      SAM2.postMessage({ type: 'encode_image', data });
    }
  }

  onImageLoaded(viewer,  () => {
    fullyLoaded = true;
    console.log('Image fully loaded');
    onFinishAnimation();
  });

  viewer.addHandler('animation-start', onStartAnimation);
  viewer.addHandler('animation-finish', onFinishAnimation);

}