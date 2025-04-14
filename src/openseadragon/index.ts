import type { OpenSeadragonAnnotator } from '@annotorious/openseadragon';
import { v4 as uuidv4 } from 'uuid';
import { createNanoEvents } from 'nanoevents'
import type { SAM2WorkerResult } from '@/sam2';
import SAM2Worker from '@/sam2/sam2-worker.ts?worker';
import { canvasToFloat32Array } from '@/utils';
import { maskToAnnotation, onFullyLoaded, prepareOsdSamCanvas } from '@/openseadragon/utils';
import type { SAMPluginEvents, Point, SAMPluginOpts } from '@/types';
import { createPreviewCanvas } from './osd-preview-canvas';
import { createPromptMarkerCanvas } from './osd-prompt-marker-canvas';
import { createPluginState } from './osd-plugin-state';

import './index.css';

export const mountOpenSeadragonPlugin = (anno: OpenSeadragonAnnotator, opts: SAMPluginOpts = {}) => {

  const { viewer } = anno;

  let _initialized = false;

  // Plugin is disabled by default
  let _enabled = false;

  // Add or remove points
  let _queryMode: 'add' | 'remove' = 'add';

  const emitter = createNanoEvents<SAMPluginEvents>();

  const state = createPluginState();

  let preview: ReturnType<typeof createPreviewCanvas>;

  let markers: ReturnType<typeof createPromptMarkerCanvas>;

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

    state.lastPointerPos = pt;

    if (!state.isAnimationInProgress) {
      decodePreview(pt);
    }
  }

  // Common code for onCanvasClick and onPointerDown
  const handlePointerDown = (evt: PointerEvent) => {
    const pt = { x: evt.offsetX, y: evt.offsetY };

    const translated = viewportToSAM2Coordinates(pt);
    if (!translated) return;

    if (evt.shiftKey || _queryMode === 'remove') {
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

  const onCanvasClick = (evt: OpenSeadragon.CanvasClickEvent) => {
    // Ignore drag
    if (!evt.quick) return;

    // Ignore if SAM or OSD are not ready
    if (!state.sam || !state.isSAMReady || !state.isOSDReady) return;

    // Ignore if animation is in progress
    if (state.isAnimationInProgress) return;

    // Stop mouse nav as soon as the users sets the first query point
    viewer.setMouseNavEnabled(false);

    handlePointerDown(evt.originalEvent as PointerEvent);
  }

  const onPointerDown = (evt: PointerEvent) => {
    if (viewer.isMouseNavEnabled()) return;

    // Note: we rely on `onCanvasClick` since it already provides
    // the logic to differentiate between click and drag. But once
    // `setMouseNavEnabled` is set to `false`, `onCanvasClick` is no
    // longer triggered, and we use onPointerDown instead.
    handlePointerDown(evt);
  }

  const encodeCurrentViewport = () => {
    if (!state.sam) return;

    // Increment viewport version
    state.viewportVersion += 1;

    emitter.emit('encodingStart');

    // Post data to worker
    const data = canvasToFloat32Array(state.sam.currentCanvas);
    SAM2.postMessage({ type: 'encode', data, viewportVersion: state.viewportVersion });
  }

  const decodePreview = (pt: Point) => {
    if (state.lastEncodingVersion !== state.viewportVersion) return;
    
    const translated = viewportToSAM2Coordinates(pt);
    if (translated)
      SAM2.postMessage({ type: 'decode_preview', point: translated });
  }

  const prepareState = () => {
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
  }

  const onAnimationStart = () => {
    state.isAnimationInProgress = true;
    state.sam = undefined;

    // Technically, not quite true... but in terms of UX,
    // user interfaces will want to start signalling activity
    // as soon as the viewport changes.
    emitter.emit('animationStart');

    preview?.clear();
    markers?.clear();
  }

  const onAnimationFinish =  () => {
    state.isAnimationInProgress = false;

    emitter.emit('animationStart');

    if (!state.isOSDReady || !_enabled) return;

    if (_enabled) prepareState();

    if (state.isSAMReady) encodeCurrentViewport();
  }

  const start = () => {
    if (!_initialized) init();

    console.log('[a9s-sam] Starting plugin');

    _enabled = true;
    
    preview.show();
    markers.show();

    addPointerHandlers();
    
    if (state.sam) {
      // User didn't change the viewport–just reset prompt 
      // and annotation ID, but no need to recompute the encoding
      state.sam.currentPrompt = undefined;
      state.sam.currentAnnotationId = uuidv4();
    } else {
      prepareState();
      if (state.isSAMReady) encodeCurrentViewport();
    }
  }

  onFullyLoaded(viewer, () => {
    state.isOSDReady = true;
    onAnimationFinish();
  });

  const addPointerHandlers = () => {
    viewer.element.addEventListener('pointermove', onPointerMove);
    viewer.element.addEventListener('pointerdown', onPointerDown);

    viewer.addHandler('canvas-click', onCanvasClick);
  }

  const removePointerHandlers = () => {
    viewer.element?.removeEventListener('pointermove', onPointerMove);
    viewer.element?.removeEventListener('pointerdown', onPointerDown);

    viewer?.removeHandler('canvas-click', onCanvasClick);
  }

  const setQueryMode = (mode: 'add' | 'remove') => _queryMode = mode;

  const stop = () => {
    console.log('[a9s-sam] Stopping plugin');

    _enabled = false;

    // Re-enable mouse nav
    viewer?.setMouseNavEnabled(true);

    preview?.hide();
    markers?.hide();

    removePointerHandlers();
  }

  const restart = () => {
    stop();
    start();
  }

  // Reset is just a restart, but also removes the current annotation
  const reset = () => {
    if (state.sam) {
      const existing = anno.state.store.getAnnotation(state.sam.currentAnnotationId);
      if (existing) {
        anno.removeAnnotation(state.sam.currentAnnotationId);
        emitter.emit('deleteAnnotation', existing);
      }
    }
    
    restart();
  }

  viewer.addHandler('animation-start', onAnimationStart);
  viewer.addHandler('animation-finish', onAnimationFinish);

  const destroy = () => {
    _initialized = false;
    _enabled = false;

    preview?.destroy();
    markers?.destroy();

    removePointerHandlers();

    viewer?.removeHandler('animation-start', onAnimationStart);
    viewer?.removeHandler('animation-finish', onAnimationFinish);
  }

  const SAM2 = new SAM2Worker();

  SAM2.onmessage = ((message: MessageEvent<SAM2WorkerResult>) => {
    const { type } = message.data;

    if (type === 'starting_download') {
      emitter.emit('downloadStart');
    } else if (type === 'download_progress') {
      const { progress } = message.data;
      emitter.emit('downloadProgress', progress);
    } else if (type === 'init_success') {
      // SAM has loaded models and initialized encoder & decoder
      state.isSAMReady = true;
      emitter.emit('initialized');

      if (_enabled) encodeCurrentViewport();
    } else if (type === 'encode_success') {
      // New viewport encoding ready
      const { viewportVersion } = message.data;

      state.lastEncodingVersion = viewportVersion;

      if (viewportVersion! < state.viewportVersion) {
        console.log('[a9s-sam] Stale encoding - discarding');
      } else {
        emitter.emit('encodingFinished');

        if (state.lastPointerPos) decodePreview(state.lastPointerPos);
      }
    } else if (type === 'decode_preview_success') {
      // Render mask every time the worker has decoded one
      if (state.sam && !state.isAnimationInProgress) {
        const { result, viewportVersion } = message.data;

        if (viewportVersion === state.viewportVersion) {
          preview.render(result, state.sam.currentBounds);
        } else {
          console.log('[a9s-sam] Stale preview - discarding');
        }
      }
    } else if (type === 'decode_success') {
      preview.clear();

      if (state.sam) {
        const annotation = maskToAnnotation(message.data.result, state.sam, anno.getUser(), viewer);

        const { store } = anno.state;
        const previous = store.getAnnotation(state.sam.currentAnnotationId);

        if (previous) {
          store.updateAnnotation(state.sam.currentAnnotationId, annotation);
          emitter.emit('updateAnnotation', annotation, previous, state.sam.currentPrompt);
        } else {
          store.addAnnotation(annotation);
          emitter.emit('createAnnotation', annotation, state.sam.currentPrompt);          
        }
      }
    } else if (type === 'init_error') {
      const { error } = message.data;
      emitter.emit('initError', error);

    } else if (type === 'encode_error') {
      const { viewportVersion } = message.data;

      if (viewportVersion === state.viewportVersion)
        setTimeout(() => encodeCurrentViewport(), 100);
    } else if (type === 'decode_preview_error') {
      // Do nothing...
    } else if (type === 'decode_error') {
      // Do nothing...
    }
  });

  const init = () => {
    if (_initialized) return;

    console.log('[a9s-sam] Initializing');

    preview = createPreviewCanvas(viewer, opts);
    markers = createPromptMarkerCanvas(viewer);

    _initialized = true;

    SAM2.postMessage({ type: 'init' });
  }

  return {
    destroy,
    init,
    reset,
    restart,
    setQueryMode,
    start,
    stop,
    on: (event: keyof SAMPluginEvents, cb: SAMPluginEvents[keyof SAMPluginEvents]) => emitter.on(event, cb)
  }

}

export * from '../types';