import type { InferenceSession } from 'onnxruntime-web/webgpu';

/**
 * SAM2 returns 3 masks along with IoU scores – returns the logits
 * of the best-scoring one.
 *
 * Note: decode results arrive via postMessage from the worker. Structured
 * cloning drops the Tensor's `data` getter, so we read `cpuData` directly.
 */
export const bestMaskLogits = (result: InferenceSession.ReturnType) => {
  const masks = result.masks as any;
  const scores: Float32Array = (result.iou_predictions as any).cpuData;

  let bestIdx = 0;
  for (let i = 1; i < scores.length; i++) {
    if (scores[i] > scores[bestIdx]) bestIdx = i;
  }

  // Mask dimension will be 256x256 (by design of the SAM2 model)
  const size: number = masks.dims[2];
  const stride = size * size;

  const logits: Float32Array = masks.cpuData.slice(bestIdx * stride, (bestIdx + 1) * stride);

  return { logits, size };
}
