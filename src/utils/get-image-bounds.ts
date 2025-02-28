import type { Bounds, Size } from '@/types';

// Ported to TS from geronimi73 – MIT license
// https://github.com/geronimi73/next-sam/blob/main/lib/imageutils.js
export const getImageBounds = (
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
    const w = Math.round((sourceSize.w / sourceSize.h) * targetSize.w);
    const padding = Math.round((targetSize.w - w) / 2);
    return { 
      bounds: { x: padding, y: 0, w, h: targetSize.h },
      scale: sourceSize.h / 1024
    };
  } else {
    // landscape => resize and pad vertically
    const h = Math.round((sourceSize.h / sourceSize.w) * targetSize.h);
    const padding = Math.round((targetSize.h - h) / 2);
    return { 
      bounds: { x: 0, y: padding, w: targetSize.w, h },
      scale: sourceSize.w / 1024
    };
  }
}