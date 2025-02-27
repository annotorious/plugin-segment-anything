import { InferenceSession, Tensor } from 'onnxruntime-web/all';
import type { EncodedImage } from './sam2-worker-messages';
import type { SAM2, SAM2DecoderInput } from '@/types';
import { encode } from 'punycode';

const getFilename = (url: string): string => {
  const cleanUrl = url.split(/[?#]/)[0];
  return cleanUrl.substring(cleanUrl.lastIndexOf('/') + 1);
}

// Ported to TS from geronimi73 – MIT license
// See https://github.com/geronimi73/next-sam/blob/main/app/SAM2.js
export const createSAM2 = (): SAM2 => {
  let encoder: InferenceSession | null = null;
  let decoder: InferenceSession | null = null;

  // Current encoded image
  let encodedImage: EncodedImage | null = null;

  let encodingBusy = true;
  let decodingBusy = false;

  // Loads a model file from cache or URL
  const loadModel = async (url: string): Promise<ArrayBuffer> => {
    const root = await navigator.storage.getDirectory();
  
    const filename = getFilename(url);
  
    const handle = await root
      .getFileHandle(filename)
      .catch(() => { /* Do nothing */ });
  
    if (handle) {
      console.log(`[annotorious-sam] Loading cached model: ${filename}`);
      const file = await handle.getFile();
      if (file.size > 0) return await file.arrayBuffer();
    }
  
    try {
      console.log(`[annotorious-sam] Downloading: ${filename}`);
      const buffer = await fetch(url).then(res => res.arrayBuffer());
  
      const fileHandle = await root.getFileHandle(filename, { create: true });
  
      console.log(`[annotorious-sam] Writing to cache`);
      const writable = await fileHandle.createWritable();
      await writable.write(buffer);
      await writable.close();
  
      return buffer;
    } catch (error) {
      console.error(error);
      throw new Error(`[annotorious-sam] Download failed: ${url}`);
    }
  }

  const init = () =>
    Promise.all([
      loadModel('/sam2_hiera_tiny_encoder.with_runtime_opt.ort'),
      loadModel('/sam2_hiera_tiny_decoder_pr1.onnx')
    ]).then(async ([enc, dec]) => {
      console.log('[annotorious-sam] Models loaded')
      encoder = await getORTSession(enc);
      decoder = await getORTSession(dec);
    }).catch((error) => {
      console.error('[annotorious-sam] Initialization failed:', error);
      throw error;
    });

  const getORTSession = async (model: ArrayBuffer): Promise<InferenceSession> => {
    return InferenceSession.create(model, {
      executionProviders: ['webgpu', 'cpu'],
      logSeverityLevel: 3
    });
  }
  
  const encodeImage = async (input: Tensor): Promise<void> => {
    if (!encoder)
      throw new Error('[annotorious-sam] Encoder not initialized');

    try {
      encodingBusy = true;

      const results = await encoder.run({ image: input });
      console.log('[annotorious-sam] Encoded image');

      encodedImage = {
        high_res_feats_0: results[encoder.outputNames[0]],
        high_res_feats_1: results[encoder.outputNames[1]],
        image_embed: results[encoder.outputNames[2]],
      };

      encodingBusy = false;
    } catch (error) {
      console.error('[annotorious-sam] Encoding failed:', error);
      throw error;
    }
  }
  
  const decode = async (input: SAM2DecoderInput): Promise<InferenceSession.OnnxValueMapType | void> => {
    if (!decoder || !encode || !encodedImage || decodingBusy || encodingBusy) return Promise.resolve();
    
    try {
      decodingBusy = true;

      const flatPoints = [...input.include, ...input.exclude].map(point => ([point.x, point.y]));
      const flatLabels = [
        ...input.include.map(() => 1),
        ...input.exclude.map(() => 0)
      ];
    
      const mask = new Tensor(
        'float32',
        new Float32Array(256 * 256),
        [1, 1, 256, 256]
      );
    
      const inputs = {
        ...encodedImage,
        point_coords: new Tensor('float32', flatPoints.flat(), [
          1,
          flatPoints.length,
          2,
        ]),
        point_labels: new Tensor('float32', flatLabels, [
          1,
          flatLabels.length,
        ]),
        mask_input: mask,
        has_mask_input: new Tensor('float32', [0], [1])
      };
  
      const result = await decoder.run(inputs);

      decodingBusy = false;

      return result;
    } catch (error) {
      console.error('[annotorious-sam] Decoding failed:', error);
      decodingBusy = false;
      throw error;
    }
  }

  return {
    init,
    encodeImage,
    decode
  }
}