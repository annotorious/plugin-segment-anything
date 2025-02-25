import type { Tensor } from 'onnxruntime-web/all';

// Ported to TS from geronimi73 – MIT license
// https://github.com/geronimi73/next-sam/blob/main/lib/imageutils.js
export const sliceTensor = (tensor: Tensor, idx: number) => {
  const [_, __, width, height] = tensor.dims;
  const stride = width * height;
  const start = stride * idx;
  const end = start + stride;

  // @ts-expect-error
  return tensor.cpuData.slice(start, end);
}
