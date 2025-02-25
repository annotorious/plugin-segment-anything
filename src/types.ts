import type { InferenceSession, Tensor } from 'onnxruntime-web/all';

export interface SAMPluginOpts {

  enabled?: boolean;

  showPreview?: boolean;

}

export interface SAM2 {

  init(): Promise<void>;

  encodeImage(input: Tensor): Promise<void>;

  decode(points: Point[]): Promise<InferenceSession.OnnxValueMapType>;

}

export interface Point {

  x: number;

  y: number;

}

export type LabeledPoint = Point & { label: number };

export type Size = { w: number, h: number };

export type Bounds = Size & { x: number, y: number};
