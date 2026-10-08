import type { InferenceSession } from 'onnxruntime-web/webgpu';
import OpenSeadragon from 'openseadragon';
import { boundsFromPoints, ShapeType } from '@annotorious/annotorious';
import type { ImageAnnotation, Polygon, User } from '@annotorious/annotorious';
import { bestMaskLogits, tracePolygon, upsampleLogits } from '@/utils';
import type { OSDSAMState } from '../osd-plugin-state';

/**
 * Converts the SAM decoder result to a polygon annotation. Returns
 * undefined if the mask is empty.
 */
export const maskToAnnotation = (
  result: InferenceSession.OnnxValueMapType,
  state: OSDSAMState,
  user: User,
  viewer: OpenSeadragon.Viewer
): ImageAnnotation | undefined => {
  const { offsetWidth: w, offsetHeight: h } = viewer.element;

  // Upsample the logits (not the thresholded mask!) to viewport
  // resolution, cropping off the letterbox padding
  const { logits, size } = bestMaskLogits(result);
  const upsampled = upsampleLogits(logits, size, state.currentBounds, w, h);

  const binary = new Uint8Array(upsampled.length);
  for (let i = 0; i < upsampled.length; i++) {
    binary[i] = upsampled[i] > 0 ? 1 : 0;
  }

  const contour = tracePolygon(binary, w, h);
  if (contour.length < 3) return;

  // Polygon points mapped to OSD image coordinate space
  const points: [number, number][] = contour.map(pt => {
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
