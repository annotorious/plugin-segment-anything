import type { Bounds, Size } from '@/types';

const IMAGE_SIZE = 1024;

const getPlacement = (sourceSize: Size, targetSize: Size): Bounds | undefined => {
  if (sourceSize.h == sourceSize.w) {
    return { x: 0, y: 0, w: targetSize.w, h: targetSize.h };
  } else if (sourceSize.h > sourceSize.w) {
    // portrait => resize and pad horizontally
    const w = (sourceSize.w / sourceSize.h) * targetSize.w;
    const padding = Math.floor((targetSize.w - w) / 2);
    return { x: padding, y: 0, w, h: targetSize.h };
  } else if (sourceSize.h < sourceSize.w) {
    // landscape => resize and pad vertically
    const h = (sourceSize.h / sourceSize.w) * targetSize.h;
    const padding = Math.floor((targetSize.h - h) / 2);
    return { x: 0, y: padding, w: targetSize.w, h };
  }
}

export const resizeCanvas = (original: HTMLImageElement | HTMLCanvasElement) => {
  const canvas = document.createElement('canvas');

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.height = IMAGE_SIZE;
  canvas.width = IMAGE_SIZE;

  ctx.drawImage(
    original,
    0,
    0,
    'naturalWidth' in original ? original.naturalWidth : original.width,
    'naturalHeight' in original ? original.naturalHeight : original.height,
    0,
    0,
    IMAGE_SIZE,
    IMAGE_SIZE
  );

  return canvas;
}

export const getImageData = (
  image: HTMLImageElement
): Promise<{ canvas: HTMLCanvasElement, placement: Bounds }> => new Promise((resolve, reject) => {
  const copy = new Image();
  copy.crossOrigin = 'anonymous';

  copy.onload = () => {
    const placement = getPlacement(
      { h: copy.naturalHeight, w: copy.naturalWidth },
      { h: IMAGE_SIZE, w: IMAGE_SIZE }
    );

    if (!placement)
      throw '[annotorious-sam] Error processing image';

    const canvas = document.createElement('canvas');
    canvas.width = IMAGE_SIZE;
    canvas.height = IMAGE_SIZE;

    canvas
      .getContext('2d')!
      .drawImage(
        copy,
        0,
        0,
        copy.naturalWidth,
        copy.naturalHeight,
        placement.x,
        placement.y,
        placement.w,
        placement.h
      );
    
    resolve({ canvas, placement });
  }

  copy.onerror = error => {
    reject(error);
  }

  copy.src = image.src;
});