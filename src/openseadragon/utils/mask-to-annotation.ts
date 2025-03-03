import type { InferenceSession } from 'onnxruntime-web/all';
import type { ImageAnnotation, User } from '@annotorious/annotorious';
import { maskToPolygon } from '@/utils';
import type { OSDSAMState } from '../osd-plugin-state';
import type OpenSeadragon from 'openseadragon';

export const maskToAnnotation = (
  result: InferenceSession.OnnxValueMapType, 
  state: OSDSAMState,
  user: User,
  viewer: OpenSeadragon.Viewer
) => {
  const viewportPolygon = maskToPolygon(result, state.currentBounds, state.currentScale);

  const imagePolygon = undefined; /* TODO */

  const annotation: ImageAnnotation = {
    id: state.currentAnnotationId,
    bodies: [],
    target: {
      annotation: state.currentAnnotationId,
      selector: viewportPolygon,
      creator: user,
      created: new Date()
    }
  };

  return annotation;
}