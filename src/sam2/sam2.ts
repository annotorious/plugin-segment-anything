import { InferenceSession, Tensor } from 'onnxruntime-web/all';
import type { SAM2, SAM2DecoderPrompt, EncodedImage, DownloadProgress } from '@/types';
import { loadModel as _loadModel, isModelCached as _isModelCached, deleteModel } from './utils';
import type { Progress } from './utils/fetch-with-progress';

const BASE_PATH = 'https://huggingface.co/g-ronimo/sam2-tiny/resolve/main';

const MODELS = [
  'sam2_hiera_tiny_encoder.with_runtime_opt.ort',
  'sam2_hiera_tiny_decoder_pr1.onnx'
];

// Ported to TS from geronimi73 – MIT license
// See https://github.com/geronimi73/next-sam/blob/main/app/SAM2.js
export const createSAM2 = (basePath = BASE_PATH): SAM2 => {
  let encoder: InferenceSession | null = null;
  let decoder: InferenceSession | null = null;

  let encodingBusy = false;
  let decodingBusy = false;

  let currentViewportVersion: number | undefined = null;

  let encodedImage: EncodedImage | null = null;

  const loadModels = (onProgress?: (status: DownloadProgress) => void) => {
    const progress: DownloadProgress[] = MODELS.map(() => ({ loaded: 0, total: Infinity }));

    let totalPercent = 0;

    const onModelProgress = (idx: number) => (next: Progress) => {
      progress[idx] = next;

      const total = progress.reduce<DownloadProgress>((total, p) => ({
        loaded: total.loaded + p.loaded,
        total: total.total + p.total
      }), { loaded: 0, total: 0});

      const p = Math.round(100 * total.loaded / total.total);
      
      if (p !== totalPercent) {
        totalPercent = p;
        onProgress && onProgress({
          loaded: total.loaded,
          total: total.total,
          complete: totalPercent === 100
        });
      }
    }

    return Promise.all(MODELS.map((m, idx) => _loadModel(`${basePath}/${m}`, onModelProgress(idx))));
  }

  const isModelCached = () =>
    Promise.all(
      MODELS.map(m => _isModelCached(`${basePath}/${m}`))
    ).then(cached => cached.every(Boolean));

  const purgeModel = (): Promise<void> =>
    Promise.all(
      MODELS.map(m => deleteModel(`${basePath}/${m}`))
    ).then(() => {})

  const init = (onProgress?: (status: DownloadProgress) => void): Promise<void> =>
    loadModels(onProgress).then(models => 
      Promise.all(models.map(m => getORTSession(m)))
    ).then(([enc, dec]) => {
      encoder = enc;
      decoder = dec;
    }).catch((error) => {
      console.error('[a9s-sam] Initialization failed:', error);
      throw error;
    });

  const getORTSession = (model: ArrayBuffer): Promise<InferenceSession> =>
    InferenceSession.create(model, {
      // In theory CPU fallback is possible, but really doesn't make sense in practice
      executionProviders: ['webgpu' /*, 'cpu' */],
      logSeverityLevel: 3
    });
  
  const encodeImage = (input: Tensor, viewportVersion?: number): Promise<void> => {
    encodedImage = undefined;
    
    if (!encoder) return Promise.reject('[a9s-sam] Encoder not initialized');

    if (encodingBusy) return Promise.reject('[a9s-sam] Encoder busy');
    encodingBusy = true;

    const started = performance.now();

    // Note that the encoder might get erased while we encode!
    const outputNames = [...encoder.outputNames];

    return encoder.run({ 
      image: input
    }).then(result => {
      console.log(`[a9s-sam] Encoding took ${Math.round(performance.now() - started)}ms`);

      encodedImage = {
        high_res_feats_0: result[outputNames[0]],
        high_res_feats_1: result[outputNames[1]],
        image_embed: result[outputNames[2]],
      };

      currentViewportVersion = viewportVersion;

      encodingBusy = false;
    }).catch(() => {
      // Usually happens if the session has already started
      encodingBusy = false;
      throw 'Encoding failed'; 
    });
  }
  
  const decode = (
    prompt: SAM2DecoderPrompt
  ): Promise<{ result: InferenceSession.OnnxValueMapType, viewportVersion?: number }> => {
    // System ready - encoder and decoder initialized, image encoded
    const ready = decoder && encoder && encodedImage;
    if (!ready) return Promise.reject('SAM2 not ready');

    // Encoding or decoding in progress?
    const busy = encodingBusy || decodingBusy;
    if (busy || !encodedImage) return Promise.reject('SAM2 busy');

    decodingBusy = true;

    const points = [
      ...prompt.include, 
      ...prompt.exclude
    ].map(point => ([point.x, point.y]));

    const labels = [
      ...prompt.include.map(() => 1),
      ...prompt.exclude.map(() => 0)
    ];

    const mask = new Tensor(
      'float32',
      new Float32Array(256 * 256),
      [1, 1, 256, 256]
    );

    const inputs = {
      ...encodedImage,
      point_coords: new Tensor('float32', points.flat(), [
        1,
        points.length,
        2,
      ]),
      point_labels: new Tensor('float32', labels, [
        1,
        labels.length,
      ]),
      mask_input: mask,
      has_mask_input: new Tensor('float32', [0], [1])
    };

    return decoder!.run(inputs).then(result => {
      decodingBusy = false;
      return { result, viewportVersion: currentViewportVersion };
    }).catch(error => {
      console.error(error);
      decodingBusy = false;
      throw error;
    });    
  }

  return {
    init,
    isModelCached,
    encodeImage,
    decode,
    purgeModel
  }

}