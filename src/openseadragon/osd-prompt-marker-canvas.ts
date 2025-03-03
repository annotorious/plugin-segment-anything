import type { Bounds, Point, SAM2DecoderPrompt } from '@/types';
import { createOverlayCanvas } from './utils';

const MARKER_RADIUS = window.devicePixelRatio || 1;

export const createPromptMarkerCanvas = (viewer: OpenSeadragon.Viewer) => {
  const { canvas, ctx } = createOverlayCanvas(viewer);
  canvas.setAttribute('class', 'a9s-sam a9s-osd-prompt-markers');

  const drawPoint = (pt: Point, bounds: Bounds, scale: number, color: string) => {
    const x = (pt.x - bounds.x) * scale;
    const y = (pt.y - bounds.y) * scale;

    ctx.beginPath();
    ctx.arc(x, y, 5 * MARKER_RADIUS, 0, 2 * Math.PI, false);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#000';
    ctx.stroke();
  }

  const setPrompt = (prompt: SAM2DecoderPrompt, bounds: Bounds, scale: number) => {
    clear();
    prompt.include.forEach(pt => drawPoint(pt, bounds, scale, '#33ff33'));
    prompt.exclude.forEach(pt => drawPoint(pt, bounds, scale, '#ff3333'));
  }

  const clear = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  const destroy = () => {
    canvas.remove();
  }

  return {
    clear,
    destroy,
    setPrompt
  }

}