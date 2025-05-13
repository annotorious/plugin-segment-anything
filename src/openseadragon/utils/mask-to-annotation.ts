import type { InferenceSession } from 'onnxruntime-web/all';
import OpenSeadragon from 'openseadragon';
import { boundsFromPoints, ShapeType } from '@annotorious/annotorious';
import type { ImageAnnotation, Polygon, User } from '@annotorious/annotorious';
import { detectContours, float32ArrayToCanvas, sliceTensor } from '@/utils';
import type { OSDSAMState } from '../osd-plugin-state';

/**
 * Converts the mask to a 
 */
const maskToCanvas = (
  result: InferenceSession.ReturnType, 
  foreground: [number, number, number, number] = [255, 255, 255, 255], // white
  background: [number, number, number, number] = [0, 0, 0, 255] // black
) => {
  // SAM2 returns 3 masks along with scores – select best one
  // See https://github.com/geronimi73/next-sam/blob/main/app/page.jsx
  const maskTensors = result.masks;

  // Mask dimension will be 256x256 (by design of the SAM2 model)
  const [_, __, width, height] = maskTensors.dims;

  // @ts-ignore
  const maskScores = result.iou_predictions.cpuData;
  const bestMaskIdx = maskScores.indexOf(Math.max(...maskScores));

  // HTML canvas, 256x256 px
  const bestMask = float32ArrayToCanvas(
    sliceTensor(maskTensors, bestMaskIdx), 
    width, 
    height,
    foreground,
    background
  );

  return bestMask;
}

export const maskToAnnotation = (
  result: InferenceSession.OnnxValueMapType, 
  state: OSDSAMState,
  user: User,
  viewer: OpenSeadragon.Viewer
) => {
  // SAM mask as B/W canvas, 256 x 256 px
  const { canvas: mask } = maskToCanvas(result);

  const { offsetWidth: w, offsetHeight: h } = viewer.element;

  // Resize & crop to current viewport dimensions
  const resized = document.createElement('canvas');
  resized.width = w;
  resized.height = h;

  const scale = Math.max(w, h) / 1024;
  const padX = state.currentBounds.x * scale;
  const padY = state.currentBounds.y * scale;

  const ctx = resized.getContext('2d');
  ctx.drawImage(
    mask,
    - padX,
    - padY,
    scale * state.currentBounds.w + 2 * padX,
    scale * state.currentBounds.h + 2 * padY
  );

  // Polygon points mapped to OSD image coordinate space
  const points: [number, number][] = detectContours(resized).map(pt => {
    // Note that–for unknown reasons–will return [0, 0] when used in a consuming application
    // that provides its own OpenSeadragon import
    // viewer.viewport.viewerElementToImageCoordinates(pt[0], pt[1]);
    const viewportPt = viewer.viewport.pointFromPixel(new OpenSeadragon.Point(pt[0], pt[1]));
    const {x, y} = viewer.viewport.viewportToImageCoordinates(viewportPt.x, viewportPt.y);
    return [x, y]
  });

  const selector: Polygon = {
    type: ShapeType.POLYGON,
    geometry: {
      bounds: boundsFromPoints(points),
      points
    }
  }

  return {
    id: state.currentAnnotationId,
    bodies: [],
    target: {
      annotation: state.currentAnnotationId,
      selector,
      creator: user,
      created: new Date()
    }
  } as ImageAnnotation;
}