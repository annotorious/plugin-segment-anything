import pDebounce from 'p-debounce';
import type { Point, SAM2 } from './types';

export const createPreviewCanvas = (container: HTMLDivElement) => {
  const image = container.querySelector('img');
  if (!image) return;

  const debouncedPreview = pDebounce((pt: Point) => {
    // sam.preview(pt);
  }, 200);

  const onPointerMove = (evt: PointerEvent) => {
    const { offsetX, offsetY } = evt;
    debouncedPreview({ x: offsetX, y: offsetY, label: 1 });
  }

  image.addEventListener('pointermove', onPointerMove);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  container
}