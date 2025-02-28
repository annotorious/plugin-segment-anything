import type { Bounds, Point, SAM2DecoderPrompt } from '@/types';

interface OSDPluginState {

  isSAMReady: boolean;

  isOSDReady: boolean;

  isAnimationInProgress: boolean;

  viewportVersion: number;

  lastPointerPos?: Point;

  sam?: {

    currentCanvas: HTMLCanvasElement;

    currentScale: number;

    currentBounds: Bounds;

    currentPrompt?: SAM2DecoderPrompt;

  }

}

// Initial state
export const createPluginState = (): OSDPluginState =>({
  isSAMReady: false,
  isOSDReady: false,
  isAnimationInProgress: false,
  viewportVersion: 0
});