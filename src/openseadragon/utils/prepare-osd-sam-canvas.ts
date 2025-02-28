import { getImageBounds } from '@/utils';

/**
 * Pads and resizes the current OpenSeadragion viewport to a 
 * 1024x1024 pixel canvas, as input to SAM2.
 */
export const prepareOsdSamCanvas = (source: HTMLCanvasElement) => {
  const { bounds, scale } = getImageBounds(
    { h: source.height, w: source.width },
    { h: 1024, w: 1024 }
  );

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;

  canvas
    .getContext('2d')!
    .drawImage(
      source,
      0,
      0,
      source.width,
      source.height,
      bounds.x,
      bounds.y,
      bounds.w,
      bounds.h
    );

  return { canvas, bounds, scale };

}