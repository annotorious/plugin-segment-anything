import type { OpenSeadragonAnnotator } from '@annotorious/openseadragon';
import type { SAM2WorkerResult } from '@/sam2';
import SAM2Worker from '@/sam2/sam2-worker.ts?worker';
import { canvasToFloat32Array } from '@/utils';
import { onFullyLoaded, prepareOsdSamCanvas } from '@/openseadragon/utils';
import type { Point } from '@/types';
import { createPreviewCanvas } from './osd-preview-canvas';
import { createPluginState } from './osd-plugin-state';

import '../index.css';

export const mountOpenSeadragonPlugin = (anno: OpenSeadragonAnnotator) => {
  
  const { viewer } = anno;

  const state = createPluginState();

  const preview = createPreviewCanvas(anno.viewer );

  const viewportToSAM2Coordinates = (pt: Point) => {
    const { isSAMReady, sam } = state;

    if (!sam || !isSAMReady) return;

    const canvas =  viewer.drawer.canvas as HTMLCanvasElement;
    const scaleX = canvas.width / (sam.currentScale * canvas.offsetWidth);
    const scaleY = canvas.height / (sam.currentScale * canvas.offsetHeight);

    const x = (pt.x * scaleX) + sam.currentBounds.x;
    const y = (pt.y * scaleY) + sam.currentBounds.y;

    return { x, y };
  }

  const onPointerMove = (evt: PointerEvent) => {
    if (!state.isSAMReady || !state.isOSDReady) return;

    const pt = { x: evt.offsetX, y: evt.offsetY };

    if (state.isAnimationInProgress) {
      state.lastPointerPos = pt;
    } else {
      decodePreview(pt);
    }
  }

  const encodeCurrentViewport = () => {
    if (!state.sam) return;

    // Increment viewport version
    state.viewportVersion += 1;

    // Post data to worker
    const data = canvasToFloat32Array(state.sam.currentCanvas);
    SAM2.postMessage({ type: 'encode', data, viewportVersion: state.viewportVersion });
  }

  const decodePreview = (pt: Point) => {
    const translated = viewportToSAM2Coordinates(pt);
    if (translated)
      SAM2.postMessage({ type: 'decode_preview', point: translated });
  }

  const onAnimationStart = () => {
    state.isAnimationInProgress = true;
    preview.clear();
  }

  const onAnimationFinish =  () => {
    state.isAnimationInProgress = false;

    if (!state.isOSDReady) return;

    // We'll prepare a new SAM working canvas every time the OSD animation finishes
    const { canvas, bounds, scale } = prepareOsdSamCanvas(viewer.drawer.canvas as HTMLCanvasElement);
    state.sam = {
      currentCanvas: canvas,
      currentBounds: bounds,
      currentScale: scale
    }

    if (state.isSAMReady) encodeCurrentViewport();
  }

  onFullyLoaded(viewer, () => {
    console.log('[a9s-sam] OSD canvas ready');
    state.isOSDReady = true;
    onAnimationFinish();
  });

  viewer.element.addEventListener('pointermove', onPointerMove);

  viewer.addHandler('animation-start', onAnimationStart);
  viewer.addHandler('animation-finish', onAnimationFinish);

  const destroy = () => {
    viewer.element.removeEventListener('pointermove', onPointerMove);

    viewer.removeHandler('animation-start', onAnimationStart);
    viewer.removeHandler('animation-finish', onAnimationFinish);
  }

  const SAM2 = new SAM2Worker();

  SAM2.onmessage = ((message: MessageEvent<SAM2WorkerResult>) => {
    const { type } = message.data;

    if (type === 'init_success') {
      // SAM has loaded models and initialized encoder & decoder
      state.isSAMReady = true;
      encodeCurrentViewport();
    } else if (type === 'encode_success') {
      // New viewport encoding ready
      const { viewportVersion } = message.data;

      if (viewportVersion! < state.viewportVersion) {
        console.log('[a9s-sam] Stale encoding - discarding');
      } else if (state.lastPointerPos) {
        decodePreview(state.lastPointerPos);
      }
    } else if (type === 'decode_preview_success') {
      // Render mask every time the worker has decoded one
      if (state.sam && !state.isAnimationInProgress)
        preview.render(message.data.result, state.sam.currentBounds);
    } else if (type === 'decode_success') {
      // TODO
    } else if (type === 'encode_error') {
      const { viewportVersion } = message.data;
      if (viewportVersion === state.viewportVersion) {
        setTimeout(() => encodeCurrentViewport(), 100);
      }
    }
  });

  SAM2.postMessage({ type: 'init' });

  return {
    destroy
  }

}