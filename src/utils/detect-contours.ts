import cv from '@techstark/opencv-js';
import { chaikinSmooth } from './chaikin-smooth';

export const detectContours = (mask: HTMLCanvasElement) => {
  const src = cv.imread(mask);

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

  let points: [number, number][] = [];

  if (contours.size() > 0) {
    // Keep only the largest contour, discard the rst
    let largestContourSize = 0;
    let largestContourIdx = 0;
    
    for (let i = 0; i < contours.size(); i++) {
      let contourSize = contours.get(i).rows;
      if (contourSize > largestContourSize) {
        largestContourSize = contourSize;
        largestContourIdx = i;
      }
    }
    
    const contour = contours.get(largestContourIdx);
    
    // Douglas-Peucker polygon simplification
    const simplifiedContour = new cv.Mat();
    const epsilon = 0.005 * cv.arcLength(contour, true);
    cv.approxPolyDP(contour, simplifiedContour, epsilon, true);
    
    for (let i = 0; i < simplifiedContour.rows; i++) {
      points.push([
        simplifiedContour.data32S[i * 2],
        simplifiedContour.data32S[i * 2 + 1]
      ]);
    }
    
    // Smooth corners using Chaikin's corner-cutting algorithm
    points = chaikinSmooth(points, 1);

    simplifiedContour.delete();
  }

  src.delete(); 
  dst.delete(); 
  contours.delete(); 
  hierarchy.delete();

  return points;

}