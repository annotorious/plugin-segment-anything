import { Tensor } from 'onnxruntime-web/all';
import { createSAM2 } from './sam2';
import type { SAM2WorkerCommand } from './sam2-worker-messages';
import type { Point } from '@/types';

const SAM2 = createSAM2();

let previewBusy = false;

let pendingPreview: Point | null = null;

const decodePreview = (point: Point): Promise<void> => {
  previewBusy = true;

  return SAM2.decode({ 
    include: [point], 
    exclude: [] 
  }).then(({ result, viewportVersion }) => {
    self.postMessage({ type: 'decode_preview_success', result, viewportVersion });
  }).catch(error => {
    self.postMessage({ type: 'decode_preview_error', error });
  }).finally(() => {
    if (pendingPreview) {
      const pt = pendingPreview;
      pendingPreview = null;

      return decodePreview(pt);
    } else {
      previewBusy = false;
    }
  });
}

self.onmessage = (e: MessageEvent<SAM2WorkerCommand>) => {
  const { type } = e.data;

  if (type === 'init') {
    SAM2.init()
      .then(() => self.postMessage({ type: 'init_success' }))
      .catch(error => self.postMessage({ type: 'init_error', error }));

  } else if (type === 'encode') {
    const { data: { float32Array, shape }, viewportVersion } = e.data;
    console.log(`[a9s-sam] Encoding${viewportVersion ? ` - ${viewportVersion}` : ''}`);

    SAM2.encodeImage(
      new Tensor('float32', float32Array, shape),
      viewportVersion
    ).then(() => {
      self.postMessage({ type: 'encode_success', viewportVersion })
    }).catch(error => {
      console.log(`[annotorious-sam] Encoding failed ${viewportVersion || ''}`);
      self.postMessage({ type: 'encode_error', error, viewportVersion });
    });

  } else if (type === 'decode_preview') {
    if (previewBusy) {
      // Keep last point to resolve later
      // console.log('rejecting and buffering');
      pendingPreview = e.data.point;
    } else {
      decodePreview(e.data.point);
    }

  } else if (type === 'decode') {
    SAM2.decode(e.data.prompt)
      .then(({ result, viewportVersion }) => self.postMessage({ type: 'decode_success', result, viewportVersion }))
      .catch(error => self.postMessage({ type: 'decode_error', error }));
  }
}

// Necessary for Vite to treat this as a module
export {}; 