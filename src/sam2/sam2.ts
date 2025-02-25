import { InferenceSession, Tensor } from 'onnxruntime-web/all';
import type { EncodedImage } from './sam2-worker-messages';
import type { Point, SAM2 } from '@/types';

const getFilename = (url: string): string => {
  const cleanUrl = url.split(/[?#]/)[0];
  return cleanUrl.substring(cleanUrl.lastIndexOf('/') + 1);
}

// Ported to TS from geronimi73 – MIT license
// See https://github.com/geronimi73/next-sam/blob/main/app/SAM2.js
export const createSAM2 = (): SAM2 => {
  // ONNX models
  let encoder: ArrayBuffer;
  let decoder: ArrayBuffer;

  // Current encoded image
  let encodedImage: EncodedImage;

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
      throw `[annotorious-sam] Download failed: ${url}`;
    }
  }

  const init = () => Promise.all([
    loadModel('/sam2_hiera_tiny_encoder.with_runtime_opt.ort'),
    loadModel('/sam2_hiera_tiny_decoder_pr1.onnx')
  ]).then(([enc, dec]) => {
    console.log('[annotorious-sam] Models loaded')
    encoder = enc,
    decoder = dec;
  });

  const getORTSession = async (model: ArrayBuffer): Promise<InferenceSession> => {
    return InferenceSession.create(model, {
      executionProviders: ['webgpu', 'cpu'],
      logSeverityLevel: 3
    });
  }
  
  const encodeImage = async (input: Tensor): Promise<void> => {
    const session = await getORTSession(encoder);
    const results = await session.run({ image: input });
  
    encodedImage = {
      high_res_feats_0: results[session.outputNames[0]],
      high_res_feats_1: results[session.outputNames[1]],
      image_embed: results[session.outputNames[2]],
    }
  }
  
  const decode = async (points: Point[]) => {
    const session = await getORTSession(decoder);

    const flatPoints = points.map(point => ([point.x, point.y]));
    const flatLabels = points.map(point => point.label);
  
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
  
    return session.run(inputs);
  }

  return {
    init,
    encodeImage,
    decode
  }

}