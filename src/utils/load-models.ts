import { InferenceSession, Tensor } from 'onnxruntime-web/all';
import type { Point } from '@/types';

let bufferEncoder: ArrayBuffer;
let bufferDecoder: ArrayBuffer;

const loadModel = async (url: string): Promise<ArrayBuffer> => {
  const root = await navigator.storage.getDirectory();

  const { pathname } = new URL(url, window.location.href);
  const filename = pathname.substring(pathname.lastIndexOf('/') + 1);

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

    console.log(`[annotorious-sam] Writing to cache.`);
    const writable = await fileHandle.createWritable();
    await writable.write(buffer);
    await writable.close();

    return buffer;
  } catch (error) {
    console.error(error);
    throw `[annotorious-sam] Download failed: ${url}`;
  }
}

export const init = () => Promise.all([
    loadModel('/sam2_hiera_tiny_encoder.with_runtime_opt.ort'),
    loadModel('/sam2_hiera_tiny_decoder_pr1.onnx')
  ]).then(([encoder, decoder]) => {
    console.log('[annotorious-sam] Models loaded.')
    bufferEncoder = encoder,
    bufferDecoder = decoder;
});

const getORTSession = async (model: ArrayBuffer): Promise<InferenceSession> => 
  InferenceSession.create(model, {
    executionProviders: ['webgpu', 'cpu'],
    logSeverityLevel: 3
  });

export const encodeImage = async (inputTensor: Tensor) => {
  const session = await getORTSession(bufferEncoder);

  const results = await session.run({ image: inputTensor });

  return {
    high_res_feats_0: results[session.outputNames[0]],
    high_res_feats_1: results[session.outputNames[1]],
    image_embed: results[session.outputNames[2]],
  }
}

export const decode = async (encoded: any, points: Point[]) => {
  const session = await getORTSession(bufferDecoder);

  const flatPoints = points.map(pt => ([pt.x, pt.y]));
  const flatLabels = points.map(pt => pt.label);

  const mask = new Tensor(
    'float32',
    new Float32Array(256 * 256),
    [1, 1, 256, 256]
  );

  const inputs = {
    ...encoded,
    point_coords: new Tensor("float32", flatPoints.flat(), [
      1,
      flatPoints.length,
      2,
    ]),
    point_labels: new Tensor("float32", flatLabels, [
      1,
      flatLabels.length,
    ]),
    mask_input: mask,
    has_mask_input: new Tensor("float32", [0], [1])
  };

  return await session.run(inputs);
}

