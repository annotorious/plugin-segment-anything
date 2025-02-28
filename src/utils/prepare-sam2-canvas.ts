import type { Bounds } from '@/types';
import { getImageBounds } from './get-image-bounds';

// Ported to TS from geronimi73 (MIT license)
// https://github.com/geronimi73/next-sam/blob/main/lib/imageutils.js
export const prepareSAM2Canvas = (
  image: HTMLImageElement
): Promise<{ canvas: HTMLCanvasElement, bounds: Bounds, scale: number }> => new Promise((resolve, reject) => {
  const copy = new Image();
  copy.crossOrigin = 'anonymous';

  copy.onload = () => {
    const { bounds, scale } = getImageBounds(
      { h: copy.naturalHeight, w: copy.naturalWidth },
      { h: 1024, w: 1024 }
    );

    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;

    canvas
      .getContext('2d')!
      .drawImage(
        copy,
        0,
        0,
        copy.naturalWidth,
        copy.naturalHeight,
        bounds.x,
        bounds.y,
        bounds.w,
        bounds.h
      );
    
    resolve({ canvas, bounds, scale });
  }

  copy.onerror = error => {
    reject(error);
  }

  copy.src = image.src;
});