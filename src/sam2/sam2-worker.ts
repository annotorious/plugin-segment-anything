import { Tensor } from 'onnxruntime-web/all';
import type { SAM2WorkerCommand } from './sam2-worker-messages';
import { createSAM2 } from './sam2';
import type { Point } from '@/types';

const SAM2 = createSAM2();

let decodingBusy = false;
let decodingPending = false;
let pendingPoints: Point[] = [];

const processDecoding = async () => {
  if (decodingBusy) return; // Ensure only one decoding runs at a time

  if (decodingPending && pendingPoints) {
    decodingPending = false; // Reset flag before calling decode again
    decodingBusy = true;

    try {
      const result = await SAM2.decode(pendingPoints);
      self.postMessage({ type: 'decoding_complete', result });
    } catch (error) {
      self.postMessage({ type: 'error', error });
    } finally {
      decodingBusy = false;
      return await processDecoding(); // Check if another request came in while decoding
    }
  }
}

self.onmessage = (e: MessageEvent<SAM2WorkerCommand>) => {
  const { type } = e.data;

  if (type === 'init') {
    SAM2.init()
      .then(() => self.postMessage({ type: 'init_complete' }))
      .catch(error => self.postMessage({ type: 'error', error }))
  } else if (type === 'encode_image') {
    const { float32Array, shape } = e.data.data;
    const t = new Tensor('float32', float32Array, shape);
    SAM2.encodeImage(t).then(() => self.postMessage({ type: 'encoding_complete' }));
  } else if (type === 'decode_mask') {
    if (decodingBusy) {
      // Busy - defer
      decodingPending = true;
    } else {
      pendingPoints = e.data.points;
      decodingPending = true;

      if (!decodingBusy) {
        decodingPending = true;
        processDecoding();
      }
    }
  } 
}

export {}; // Necessary for Vite to treat this as a module