import type { ImageAnnotation } from '@annotorious/annotorious';
import type { InferenceSession, Tensor } from 'onnxruntime-web/all';

export interface SAMPluginOpts {

  maxPreviewCoverage?: number;

}

export interface SAMPluginEvents  {

  animationFinished: () => void;

  animationStart: () => void;

  createAnnotation: (annotation: ImageAnnotation, prompt: SAM2DecoderPrompt) => void;

  deleteAnnotation: (annotation: ImageAnnotation) => void;

  encodingFinished: () => void;

  encodingStart: () => void;

  initialized: () => void;

  initError: (error: any) => void;

  updateAnnotation: (annotation: ImageAnnotation, previous: ImageAnnotation, prompt: SAM2DecoderPrompt) => void;

}

export interface Point {

  x: number;

  y: number;

}

export type Size = { w: number, h: number };

export type Bounds = Size & { x: number, y: number};

export interface SAM2 {

  init(): Promise<void>;

  encodeImage(input: Tensor, viewportVersion?: number): Promise<void>;

  decode(input: SAM2DecoderPrompt): Promise<{ result: InferenceSession.OnnxValueMapType, viewportVersion?: number }>;

}

export interface SAM2DecoderPrompt {

  include: Point[];

  exclude: Point[];

}

export interface EncodedImage {
  
  high_res_feats_0: Tensor;
  
  high_res_feats_1: Tensor;
  
  image_embed: Tensor;

}
