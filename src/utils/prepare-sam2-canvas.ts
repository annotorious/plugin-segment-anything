import type { Bounds, Size } from '@/types';

// Ported to TS from geronimi73 – MIT license
// https://github.com/geronimi73/next-sam/blob/main/lib/imageutils.js
const getImageBounds = (
  sourceSize: Size, 
  targetSize: Size
): { bounds: Bounds, scale: number } => {
  if (sourceSize.h === sourceSize.w) {
    return {
      bounds: { x: 0, y: 0, w: targetSize.w, h: targetSize.h },
      scale: sourceSize.w / 1024
    };
  } else if (sourceSize.h > sourceSize.w) {
    // portrait => resize and pad horizontally
    const w = (sourceSize.w / sourceSize.h) * targetSize.w;
    const padding = Math.floor((targetSize.w - w) / 2);
    return { 
      bounds: { x: padding, y: 0, w, h: targetSize.h },
      scale: sourceSize.h / 1024
    };
  } else {
    // landscape => resize and pad vertically
    const h = (sourceSize.h / sourceSize.w) * targetSize.h;
    const padding = Math.floor((targetSize.h - h) / 2);
    return { 
      bounds: { x: 0, y: padding, w: targetSize.w, h },
      scale: sourceSize.w / 1024
    };
  }
}

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