import type { Tensor } from 'onnxruntime-web/all';
import type { Point, SAM2DecoderInput } from '@/types';
import type { InferenceSession } from 'onnxruntime-web';

/** Commands **/
interface SAM2WorkerInitCommand {

  type: 'init';

}

interface SAM2WorkerEncodeImageCommand {

  type: 'encode_image';

  data: {
    
    float32Array: Float32Array<ArrayBuffer>;

    shape: any[];

  };

}

interface SAM2WorkerDecodePreviewCommand {

  type: 'decode_preview';

  point: Point;

}

interface SAM2WorkerDecodeCommand {

  type: 'decode';

  input: SAM2DecoderInput;
}

export type SAM2WorkerCommand = SAM2WorkerInitCommand | SAM2WorkerEncodeImageCommand | SAM2WorkerDecodePreviewCommand | SAM2WorkerDecodeCommand;

/** Results **/

interface SAM2WorkerSuccessInit {

  type: 'init_complete';

}

interface SAM2WorkerSuccessEncodedImage {

  type: 'encoding_complete';

}

interface SAM2WorkerSuccessDecoded {

  type: 'preview_complete' | 'decoding_complete';

  result: InferenceSession.ReturnType;

}

type SAM2WorkerSuccess = SAM2WorkerSuccessInit | SAM2WorkerSuccessEncodedImage | SAM2WorkerSuccessDecoded;

interface SAM2WorkerError {

  type: 'error';

  error: any;

}

export type SAM2WorkerResult = SAM2WorkerSuccess | SAM2WorkerError;


export interface EncodedImage {
  
  high_res_feats_0: Tensor;
  
  high_res_feats_1: Tensor;
  
  image_embed: Tensor;

}