import type { InferenceSession, Tensor } from 'onnxruntime-web/all';

export interface SAMPluginOpts {

  enabled?: boolean;

  showPreview?: boolean;

}

export interface Point {

  x: number;

  y: number;

}

export type Size = { w: number, h: number };

export type Bounds = Size & { x: number, y: number};

export interface SAM2 {

  init(): Promise<void>;

  encodeImage(input: Tensor): Promise<void>;

  decode(input: SAM2DecoderPrompt): Promise<InferenceSession.OnnxValueMapType>;

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
