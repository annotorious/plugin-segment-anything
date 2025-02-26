import cv from '@techstark/opencv-js';
import type { InferenceSession } from 'onnxruntime-web/all';
import type { Bounds } from '@/types';
import { maskToCanvas } from './mask-to-canvas';
import { boundsFromPoints, ShapeType, type Polygon } from '@annotorious/annotorious';

export const maskToPolygon = (
  result: InferenceSession.ReturnType, 
  bounds: Bounds,
  scale: number
) => {
  const canvas = maskToCanvas(
    result, 
    bounds,
    [255, 255, 255, 255],
    [0, 0, 0, 255]
  );

  const src = cv.imread(canvas);

  const dst = new cv.Mat();
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();

  // To grayscale
  cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY);

  // Smoothing
  const size = new cv.Size(9, 9);
  cv.GaussianBlur(dst, dst, size, 0);
  cv.threshold(dst, dst, 80, 255, cv.THRESH_BINARY);

  // Fill small gaps
  const kernel = cv.Mat.ones(3, 3, cv.CV_8U);
  cv.morphologyEx(dst, dst, cv.MORPH_CLOSE, kernel);

  // Find countours
  cv.findContours(dst, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

  // Collect polygons
  const polygons: Polygon[] = [];

  if (contours.size() > 0) {
    let largestContourIdx = 0;
    let largestContourSize = 0;
    
    for (let i = 0; i < contours.size(); i++) {
      let contourSize = contours.get(i).rows;
      if (contourSize > largestContourSize) {
        largestContourSize = contourSize;
        largestContourIdx = i;
      }
    }
    
    let contour = contours.get(largestContourIdx);
    
    let epsilon = 0.005 * cv.arcLength(contour, true);
    let simplifiedContour = new cv.Mat();

    cv.approxPolyDP(contour, simplifiedContour, epsilon, true);
    
    let points: [number, number][] = [];

    for (let i = 0; i < simplifiedContour.rows; i++) {
      points.push([
        simplifiedContour.data32S[i * 2] * scale,
        simplifiedContour.data32S[i * 2 + 1] * scale
      ]);
    }
    
    const polygon: Polygon = {
      type: ShapeType.POLYGON,
      geometry: {
        bounds: boundsFromPoints(points),
        points
      }
    }
    polygons.push(polygon);

    simplifiedContour.delete();
  }

  src.delete(); 
  dst.delete(); 
  contours.delete(); 
  hierarchy.delete();

  return polygons[0];

}