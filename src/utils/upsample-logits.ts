import type { Bounds } from '@/types';

const SAM_SIZE = 1024;

/**
 * Bilinear resampling of an L x L logit map onto a w x h raster that
 * covers the `bounds` content box (in SAM 1024-space), i.e. the
 * letterbox padding is cropped off.
 *
 * Uses the half-pixel-centre convention of F.interpolate(align_corners=False),
 * which is how official SAM upsamples logits before thresholding.
 */
export const upsampleLogits = (
  logits: Float32Array,
  L: number,
  bounds: Bounds,
  w: number,
  h: number
): Float32Array => {
  const k = L / SAM_SIZE;

  // Raster px → SAM px → logit grid coordinate
  const gridX = (i: number) => (bounds.x + (i + 0.5) * bounds.w / w) * k - 0.5;
  const gridY = (j: number) => (bounds.y + (j + 0.5) * bounds.h / h) * k - 0.5;

  const clamp = (v: number) => Math.min(L - 1, Math.max(0, v));

  // Column indices and weights are the same for every row
  const x0 = new Int32Array(w);
  const x1 = new Int32Array(w);
  const fx = new Float32Array(w);

  for (let i = 0; i < w; i++) {
    const g = gridX(i);
    const f = Math.floor(g);
    fx[i] = g - f;
    x0[i] = clamp(f);
    x1[i] = clamp(f + 1);
  }

  const out = new Float32Array(w * h);

  for (let j = 0; j < h; j++) {
    const g = gridY(j);
    const f = Math.floor(g);
    const fy = g - f;
    const row0 = clamp(f) * L;
    const row1 = clamp(f + 1) * L;

    for (let i = 0; i < w; i++) {
      const a = logits[row0 + x0[i]], b = logits[row0 + x1[i]];
      const c = logits[row1 + x0[i]], d = logits[row1 + x1[i]];
      const top = a + (b - a) * fx[i];
      const bottom = c + (d - c) * fx[i];
      out[j * w + i] = top + (bottom - top) * fy;
    }
  }

  return out;
}
