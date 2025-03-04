import type { OpenSeadragonAnnotator } from '@annotorious/openseadragon';
import { v4 as uuidv4 } from 'uuid';
import { createNanoEvents } from 'nanoevents'
import type { SAM2WorkerResult } from '@/sam2';
import SAM2Worker from '@/sam2/sam2-worker.ts?worker';
import { canvasToFloat32Array } from '@/utils';
import { maskToAnnotation, onFullyLoaded, prepareOsdSamCanvas } from '@/openseadragon/utils';
import type { SAMPluginEvents, Point } from '@/types';
import { createPreviewCanvas } from './osd-preview-canvas';
import { createPromptMarkerCanvas } from './osd-prompt-marker-canvas';
import { createPluginState } from './osd-plugin-state';

import './index.css';

export const mountOpenSeadragonPlugin = (anno: OpenSeadragonAnnotator) => {
  
  const { viewer } = anno;

  // Plugin is disabled by default
  let _enabled = false;

  const emitter = createNanoEvents<SAMPluginEvents>();

  const state = createPluginState();

  const preview = createPreviewCanvas(anno.viewer);

  const markers = createPromptMarkerCanvas(anno.viewer);

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

    // No previews if there is already a prompt
    const hasPrompt = Boolean(state.sam?.currentPrompt)
    if (hasPrompt) return;

    const pt = { x: evt.offsetX, y: evt.offsetY };

    if (state.isAnimationInProgress) {
      state.lastPointerPos = pt;
    } else {
      decodePreview(pt);
    }
  }

  const onCanvasClick = (evt: OpenSeadragon.CanvasClickEvent) => {
    if (!state.sam || !state.isSAMReady || !state.isOSDReady) return;

    // 'quick' differentiates clicks from drag-and-release, see:
    // https://github.com/openseadragon/openseadragon/issues/198#issuecomment-25388782
    if (!evt.quick) return;

    if (state.isAnimationInProgress) return;

    const orig = evt.originalEvent as PointerEvent;
    const pt = { x: orig.offsetX, y: orig.offsetY };

    const translated = viewportToSAM2Coordinates(pt);
    if (!translated) return;

    if (orig.shiftKey) {
      state.sam.currentPrompt = {
        include: (state.sam.currentPrompt?.include || []),
        exclude: [...(state.sam.currentPrompt?.exclude || []), translated]
      }
    } else {
      state.sam.currentPrompt = {
        include: [...(state.sam.currentPrompt?.include || []), translated],
        exclude: (state.sam.currentPrompt?.exclude || []),
      }
    }

    const { currentPrompt, currentBounds, currentScale } = state.sam;
    markers.setPrompt(currentPrompt, currentBounds, currentScale);

    SAM2.postMessage({ type: 'decode', prompt: state.sam.currentPrompt });
  }

  const encodeCurrentViewport = () => {
    if (!state.sam) return;

    emitter.emit('startEncoding');

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

    state.sam = undefined;

    preview.clear();
    markers.clear();
  }

  const onAnimationFinish =  () => {
    state.isAnimationInProgress = false;

    if (!state.isOSDReady || !_enabled) return;

    // We'll prepare a new SAM working canvas every time the OSD animation finishes
    const { canvas, bounds, scale } = prepareOsdSamCanvas(viewer.drawer.canvas as HTMLCanvasElement);
    state.sam = {
      // The current 1024 x 1024 SAM working canvas
      currentCanvas: canvas,

      // The bbox of the resized & padded viewport on the working canvas
      currentBounds: bounds,

      // The current SAM scale (longer image dimension / 1024)
      currentScale: scale,

      // New annotation ID for the current shape
      currentAnnotationId: uuidv4()
    }

    if (state.isSAMReady) encodeCurrentViewport();
  }

  onFullyLoaded(viewer, () => {
    console.log('[a9s-sam] OSD canvas ready');
    state.isOSDReady = true;
    onAnimationFinish();
  });

  const addHandlers = () => {
    viewer.element.addEventListener('pointermove', onPointerMove);

    viewer.addHandler('animation-start', onAnimationStart);
    viewer.addHandler('animation-finish', onAnimationFinish);
    viewer.addHandler('canvas-click', onCanvasClick);
  }

  const removeHandlers = () => {
    viewer.element.removeEventListener('pointermove', onPointerMove);

    viewer.removeHandler('animation-start', onAnimationStart);
    viewer.removeHandler('animation-finish', onAnimationFinish);
    viewer.removeHandler('canvas-click', onCanvasClick);
  }

  const setEnabled = (enabled: boolean) => {
    _enabled = enabled;

    state.sam = undefined;

    if (enabled) {
      preview.show();
      markers.show();

      addHandlers();
      onAnimationFinish();
    } else {
      preview.hide();
      markers.hide();

      removeHandlers();
    }
  }

  const destroy = () => {
    preview.destroy();
    markers.destroy();
    removeHandlers();
  }

  const SAM2 = new SAM2Worker();

  SAM2.onmessage = ((message: MessageEvent<SAM2WorkerResult>) => {
    const { type } = message.data;

    if (type === 'init_success') {
      // SAM has loaded models and initialized encoder & decoder
      state.isSAMReady = true;
      emitter.emit('initialized');

      if (_enabled) encodeCurrentViewport();
    } else if (type === 'encode_success') {
      // New viewport encoding ready
      const { viewportVersion } = message.data;

      if (viewportVersion! < state.viewportVersion) {
        console.log('[a9s-sam] Stale encoding - discarding');
      } else {
        emitter.emit('encodingComplete');

        if (state.lastPointerPos) decodePreview(state.lastPointerPos);
      }
    } else if (type === 'decode_preview_success') {
      // Render mask every time the worker has decoded one
      if (state.sam && !state.isAnimationInProgress) {
        const { result, viewportVersion } = message.data;
        if (viewportVersion === state.viewportVersion)
          preview.render(result, state.sam.currentBounds);
        else 
          console.log('[a9s-sam] Stale preview - discarding');
      }
    } else if (type === 'decode_success') {
      preview.clear();

      if (state.sam) {
        const annotation = maskToAnnotation(message.data.result, state.sam, anno.getUser(), viewer);
        console.log(annotation);

        const { store } = anno.state;

        const exists = store.getAnnotation(state.sam.currentAnnotationId);
        if (exists) {
          console.log('updating annotation');
          store.updateAnnotation(state.sam.currentAnnotationId, annotation);
        } else {
          console.log('adding annotation');
          store.addAnnotation(annotation);
        }
      }
    } else if (type === 'encode_error') {
      const { viewportVersion } = message.data;
      if (viewportVersion === state.viewportVersion) {
        setTimeout(() => encodeCurrentViewport(), 100);
      }
    }
  });

  SAM2.postMessage({ type: 'init' });

  return {
    destroy,
    setEnabled,
    on: emitter.on.bind(emitter)
  }

}