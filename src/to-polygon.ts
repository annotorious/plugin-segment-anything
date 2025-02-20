import type { Point } from '@/types';
import cv from '@techstark/opencv-js';

const THRESHOLD = 1;

export const toPolygon = (canvas: HTMLCanvasElement, point: Point) => {
  console.log('Vectorizing polygon', canvas.width, canvas.height, point);

  const src = cv.imread(canvas);

  const dst = new cv.Mat();
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();

  if (src.channels() > 1) {
    cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY);
  } else {
    src.copyTo(dst);
  }

  // Use larger kernel for more smoothing
  const ksize = new cv.Size(9, 9);
  cv.GaussianBlur(dst, dst, ksize, 0);

  cv.threshold(dst, dst, 80, 255, cv.THRESH_BINARY);

  const kernel = cv.Mat.ones(3, 3, cv.CV_8U);
  // Close operation fills small gaps
  cv.morphologyEx(dst, dst, cv.MORPH_CLOSE, kernel);
  
  // cv.morphologyEx(dst, dst, cv.MORPH_DILATE, kernel);
  // const blurred = new cv.Mat();
  // const ksize = new cv.Size(5, 5);  // Adjust kernel size as needed (odd numbers)
  // cv.GaussianBlur(dst, blurred, ksize, 0);

  // 

  // const kernel = cv.Mat.ones(3, 3, cv.CV_8U);
  // cv.morphologyEx(dst, dst, cv.MORPH_CLOSE, kernel);

  cv.findContours(dst, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

  const polygons = [];

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
    
    let points = [];

    for (let i = 0; i < simplifiedContour.rows; i++) {
      points.push({
        x: simplifiedContour.data32S[i * 2],
        y: simplifiedContour.data32S[i * 2 + 1]
      });
    }
    
    // Now convert to SVG
    polygons.push(points);
    
    simplifiedContour.delete();
  }

  src.delete(); 
  dst.delete(); 
  contours.delete(); 
  hierarchy.delete();

  return polygons[0];
}