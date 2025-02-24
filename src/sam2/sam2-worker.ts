import { Tensor } from 'onnxruntime-web/all';
import type { SAM2WorkerCommand } from './sam2-worker-messages';
import { createSAM2 } from './sam2';

const SAM2 = createSAM2();

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
    const { points } = e.data;
    SAM2.decode(points).then(result => self.postMessage({ type: 'decoding_complete', result }));
  } 
}

export {}; // Necessary for Vite to treat this as a module