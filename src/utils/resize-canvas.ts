import type { Size } from '@/types';

// Ported to TS from geronimi73 – MIT license
// https://github.com/geronimi73/next-sam/blob/main/lib/imageutils.js
export const resizeCanvas = (original: HTMLImageElement | HTMLCanvasElement, targetSize: Size) => {
  const canvas = document.createElement('canvas');

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.height = targetSize.h;
  canvas.width = targetSize.w;

  ctx.drawImage(
    original,
    0,
    0,
    'naturalWidth' in original ? original.naturalWidth : original.width,
    'naturalHeight' in original ? original.naturalHeight : original.height,
    0,
    0,
    targetSize.w,
    targetSize.h
  );

  return canvas;
}