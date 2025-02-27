import type { Bounds, Point, SAM2DecoderInput } from './types';

const R = window.devicePixelRatio || 1;

export const createInputMarkerCanvas = (container: HTMLDivElement, bounds: Bounds, scale: number) => {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('class', 'a9s-sam-input-markers');
  canvas.width = R * container.offsetWidth;
  canvas.height = R * container.offsetHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw 'Error initializing canvas'; // Should never happen

  container.appendChild(canvas);

  const clear = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  const drawPoint = (pt: Point, color: string) => {
    const x = R * (pt.x - bounds.x) * scale;
    const y = R * (pt.y - bounds.y) * scale;

    ctx.beginPath();
    ctx.arc(x, y, 5 * R, 0, 2 * Math.PI, false);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 1 * R;
    ctx.strokeStyle = '#000';
    ctx.stroke();
  }

  const setInput = (input: SAM2DecoderInput) => {
    clear();
    input.include.forEach(pt => drawPoint(pt, '#33ff33'));
    input.exclude.forEach(pt => drawPoint(pt, '#ff3333'));
  }

  return {
    clear,
    setInput
  }
}