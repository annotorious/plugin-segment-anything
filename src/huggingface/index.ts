import { env, SamModel, AutoProcessor, RawImage, Tensor, PreTrainedModel, Processor } from '@huggingface/transformers';

// Since we will download the model from the Hugging Face Hub, we can skip the local model check
env.allowLocalModels = false;

const MODEL_ID = 'Xenova/slimsam-77-uniform';

export const createSAM = () => {

  let model: Promise<PreTrainedModel>;
  let processor: Promise<Processor>;

  const loadModel = () => {
    if (!model) {
      model = SamModel.from_pretrained(MODEL_ID, {
        dtype: 'fp32', // or "fp32"
        device: 'webgpu',
      });
    }

    if (!processor) {
      processor = AutoProcessor.from_pretrained(MODEL_ID, { /** **/ });
    }

    return Promise.all([model, processor]);
  }

  return {
    loadModel
  }
}
