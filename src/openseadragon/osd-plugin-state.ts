import type { Bounds, Point, SAM2DecoderPrompt } from '@/types';

export interface OSDPluginState {

  isSAMReady: boolean;

  isOSDReady: boolean;

  isAnimationInProgress: boolean;

  viewportVersion: number;

  lastPointerPos?: Point;

  sam?: OSDSAMState

}

export interface OSDSAMState {

  currentCanvas: HTMLCanvasElement;

  currentScale: number;

  currentBounds: Bounds;

  currentAnnotationId: string;

  currentPrompt?: SAM2DecoderPrompt;

}

// Initial state
export const createPluginState = (): OSDPluginState =>({
  isSAMReady: false,
  isOSDReady: false,
  isAnimationInProgress: false,
  viewportVersion: 0
});