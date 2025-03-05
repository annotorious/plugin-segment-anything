import type { InferenceSession, Tensor } from 'onnxruntime-web/all';

export interface SAMPluginOpts {

  maxPreviewCoverage?: number;

}

export interface SAMPluginEvents  {

  initialized: () => void;

  startEncoding: () => void;

  encodingComplete: () => void;

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
