import { Tensor } from 'onnxruntime-web/all';
import type { SAM2WorkerCommand } from './sam2-worker-messages';
import { createSAM2 } from './sam2';
import type { Point } from '@/types';

const SAM2 = createSAM2();

let previewBusy = false;
let previewPending = false;
let previewPendingPoints: Point[] = [];

const processPreview = async () => {
  if (previewPending && previewPendingPoints) {
    previewPending = false;
    previewBusy = true;

    try {
      const result = await SAM2.decode(previewPendingPoints);
      self.postMessage({ type: 'preview_complete', result });
    } catch (error) {
      self.postMessage({ type: 'error', error });
    } finally {
      previewBusy = false;
      return await processPreview();
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
  } else if (type === 'decode_preview') {
    console.log('dafasd', e.data);
    previewPendingPoints = [e.data.point];
    previewPending = true;

    if (!previewBusy) {
      processPreview();
    }
  } else if (type === 'decode') {
    const { input } = e.data;
    SAM2.decode(input.include.map(pt => ({...pt, label: 1 }))).then(result => {
      self.postMessage({ type: 'decoding_complete', result });
    });
  }
}

export {}; // Necessary for Vite to treat this as a module