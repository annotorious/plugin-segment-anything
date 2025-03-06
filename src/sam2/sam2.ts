import { InferenceSession, Tensor } from 'onnxruntime-web/all';
import type { SAM2, SAM2DecoderPrompt, EncodedImage } from '@/types';
import { loadModel } from './utils';

const BASE_PATH = 'https://github.com/annotorious/plugin-segment-anything/raw/refs/heads/main/models/';

// Ported to TS from geronimi73 – MIT license
// See https://github.com/geronimi73/next-sam/blob/main/app/SAM2.js
export const createSAM2 = (basePath = BASE_PATH): SAM2 => {
  let encoder: InferenceSession | null = null;
  let decoder: InferenceSession | null = null;

  let encodingBusy = false;
  let decodingBusy = false;

  let currentViewportVersion: number | undefined = null;

  let encodedImage: EncodedImage | null = null;

  const init = (): Promise<void> =>
    Promise.all([
      loadModel(`${basePath}/sam2_hiera_tiny_encoder.with_runtime_opt.ort`),
      loadModel(`${basePath}/sam2_hiera_tiny_decoder_pr1.onnx`)
    ]).then(models => 
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
      executionProviders: ['webgpu', 'cpu'],
      logSeverityLevel: 3
    });
  
  const encodeImage = (input: Tensor, viewportVersion?: number): Promise<void> => {
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
    }).catch(error => {
      console.error(error);
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
    if (busy) return Promise.reject('SAM2 busy');

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
    encodeImage,
    decode
  }

}