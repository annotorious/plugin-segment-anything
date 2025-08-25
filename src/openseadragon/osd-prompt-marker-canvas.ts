import type { Bounds, Point, SAM2DecoderPrompt } from '@/types';
import { createOverlayCanvas } from './utils';
import { isTouch } from '@annotorious/annotorious';

const RATIO = window.devicePixelRatio || 1;
const MARKER_RADIUS = isTouch ? 10 * RATIO : 5 * RATIO;

export const createPromptMarkerCanvas = (viewer: OpenSeadragon.Viewer) => {
  const { canvas, ctx } = createOverlayCanvas(viewer);
  canvas.setAttribute('class', 'a9s-sam a9s-osd-prompt-markers');

  // Hidden by default
  canvas.style.display = 'none';

  const drawPoint = (pt: Point, bounds: Bounds, scale: number, color: string) => {
    const x = (pt.x - bounds.x) * scale;
    const y = (pt.y - bounds.y) * scale;

    ctx.beginPath();
    ctx.arc(x, y, MARKER_RADIUS, 0, 2 * Math.PI, false);
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

  const show = () => {
    // Temporary
    canvas.style.display = null;
  }

  const hide = () => {
    clear();
    
    // Temporary
    canvas.style.display = 'none';
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
    hide,
    setPrompt,
    show
  }

}