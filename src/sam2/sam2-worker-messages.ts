import type { Point, SAM2DecoderInput } from '@/types';
import type { InferenceSession } from 'onnxruntime-web';

/** 
 * Command: initialize the SAM2 instance.
 * - Load the models from local storage or download them
 * - Instantiate the encoder and decoder sessions
 */
interface SAM2WorkerInitCommand {

  type: 'init';

}

/**
 * Command: encode the attached image.
 */
interface SAM2WorkerEncodeCommand {

  type: 'encode';

  data: {
    
    float32Array: Float32Array<ArrayBuffer>;

    shape: any[];

  };

}

/**
 * Command: decode a mask for the given point.
 * 
 * Note that this will perform the same operation as the 'decode'
 * command, but result in a different response ('preview_complete' 
 * instead of 'decoding_complete'), so that the app can trigger 
 * different UI behavior accordingly.
 */
interface SAM2WorkerDecodePreviewCommand {

  type: 'decode_preview';

  point: Point;

}

interface SAM2WorkerDecodeCommand {

  type: 'decode';

  input: SAM2DecoderInput;

}

export type SAM2WorkerCommand = 
  SAM2WorkerInitCommand | 
  SAM2WorkerEncodeCommand | 
  SAM2WorkerDecodePreviewCommand | 
  SAM2WorkerDecodeCommand;

/**
 * Response: initialization completed successfully.
 */
interface SAM2WorkerInitSuccess {

  type: 'init_success';

}

/**
 * Response: image encoding completed sucessfully.
 */
interface SAM2WorkerEncodeSuccess {

  type: 'encode_success';

}

/**
 * Response: decoding completed successfully.
 */
interface SAM2WorkerDecodeSuccess {

  type: 'decode_preview_success' | 'decode_success';

  result: InferenceSession.ReturnType;

}

type SAM2WorkerSuccess = 
  SAM2WorkerInitSuccess | 
  SAM2WorkerEncodeSuccess | 
  SAM2WorkerDecodeSuccess;

/** Error **/
interface SAM2WorkerError {

  type: 'error';

  error: any;

}

export type SAM2WorkerResult = SAM2WorkerSuccess | SAM2WorkerError;