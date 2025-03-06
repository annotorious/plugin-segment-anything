import type { InferenceSession } from 'onnxruntime-web';
import type { Point, SAM2DecoderPrompt } from '@/types';

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

  viewportVersion?: number;

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

  prompt: SAM2DecoderPrompt;

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

  viewportVersion?: number;

}

/**
 * Response: decoding completed successfully.
 */
interface SAM2WorkerDecodeSuccess {

  type: 'decode_preview_success' | 'decode_success';

  result: InferenceSession.ReturnType;

  viewportVersion?: number;

}

export type SAM2WorkerSuccess = 
  SAM2WorkerInitSuccess | 
  SAM2WorkerEncodeSuccess | 
  SAM2WorkerDecodeSuccess;

/** Error **/
interface SAM2WorkerInitError {

  type: 'init_error';

  error: any;

}

interface SAM2WorkerEncodeError {

  type: 'encode_error';

  error: any;

  viewportVersion?: number;

}

interface SAM2WorkerDecodePreviewError {

  type: 'decode_preview_error';

  error: any;
  
}

interface SAM2WorkerDecodeError {

  type: 'decode_error';

  error: any;

}

export type SAM2WorkerError =
  SAM2WorkerInitError |
  SAM2WorkerEncodeError |
  SAM2WorkerDecodePreviewError |
  SAM2WorkerDecodeError;

export type SAM2WorkerResult = SAM2WorkerSuccess | SAM2WorkerError;