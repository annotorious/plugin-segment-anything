import { Tensor } from 'onnxruntime-web/all';
import { createSAM2 } from './sam2';
import type { SAM2WorkerCommand } from './sam2-worker-messages';
import type { Point } from '@/types';

const SAM2 = createSAM2();

let previewBusy = false;

let pendingPreview: Point | null = null;

const decodePreview = (point: Point) => {
  previewBusy = true;

  SAM2.decode({ 
    include: [point], 
    exclude: [] 
  }).then(result => {
    self.postMessage({ type: 'decode_preview_success', result });
  }).catch(error => {
    self.postMessage({ type: 'error', error });
  }).finally(() => {
    if (pendingPreview) {
      decodePreview(pendingPreview);
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
      .catch(error => self.postMessage({ type: 'error', error }))
  } else if (type === 'encode') {
    const { float32Array, shape } = e.data.data;
    
    SAM2.encodeImage(
      new Tensor('float32', float32Array, shape)
    ).then(() => {
      self.postMessage({ type: 'encode_success' })
    }).catch(error => {
      self.postMessage({ type: 'error', error });
    });
  } else if (type === 'decode_preview') {
    if (previewBusy) {
      // Keep last point to resolve later
      pendingPreview = e.data.point;
    } else {
      // Resolve now
      decodePreview(e.data.point);
    }
  } else if (type === 'decode') {
    SAM2.decode(e.data.input)
      .then(result => self.postMessage({ type: 'decode_success', result }))
      .catch(error => self.postMessage({ type: 'error', error }));
  }
}

// Necessary for Vite to treat this as a module
export {}; 