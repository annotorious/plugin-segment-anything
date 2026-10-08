import cv from '@techstark/opencv-js';

/**
 * Traces the outline of the largest region in a binary w x h mask
 * (non-zero = foreground). The contour is simplified with Douglas-Peucker
 * at an absolute tolerance of `epsilon` raster px. Points are returned
 * at pixel centres. Returns [] if there is no usable polygon.
 */
export const tracePolygon = (
  binary: Uint8Array,
  w: number,
  h: number,
  epsilon = 1
): [number, number][] => {
  const src = cv.matFromArray(h, w, cv.CV_8UC1, binary);
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();

  cv.findContours(src, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_NONE);

  const points: [number, number][] = [];

  // Keep only the largest contour (by area), discard the rest
  let largestArea = -1;
  let largestIdx = -1;

  for (let i = 0; i < contours.size(); i++) {
    const contour = contours.get(i);
    const area = cv.contourArea(contour);
    if (area > largestArea) {
      largestArea = area;
      largestIdx = i;
    }
    contour.delete();
  }

  if (largestIdx > -1) {
    const contour = contours.get(largestIdx);

    // Douglas-Peucker polygon simplification
    const simplified = new cv.Mat();
    cv.approxPolyDP(contour, simplified, epsilon, true);

    for (let i = 0; i < simplified.rows; i++) {
      points.push([
        simplified.data32S[i * 2] + 0.5,
        simplified.data32S[i * 2 + 1] + 0.5
      ]);
    }

    simplified.delete();
    contour.delete();
  }

  src.delete();
  contours.delete();
  hierarchy.delete();

  return points.length < 3 ? [] : points;
}
