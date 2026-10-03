/** Model choices. Stage 0 may change `MODELS.whisper` and `USE_FILLER_PROMPT`; record why in the results doc. */
export const MODELS = {
  whisper: 'onnx-community/whisper-base.en_timestamped',
  embed: 'Xenova/all-MiniLM-L6-v2',
} as const;

// Whisper's encoder is sensitive to quantisation; keep it fp32 on WebGPU.
export const WHISPER_DTYPE = {
  webgpu: { encoder_model: 'fp32', decoder_model_merged: 'q4' },
  wasm: 'q8',
} as const;

export const VAD_ASSETS = 'https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.31/dist/';
export const ORT_WASM = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.30.0/dist/';

/** A filler-heavy prompt nudges Whisper to transcribe disfluencies verbatim. */
export const FILLER_PROMPT = 'Umm, let me think, like, hmm. Okay, so, uh, I mean, you know, basically it is, like, sort of this.';
export const USE_FILLER_PROMPT = true;

/** Total model download, measured in Stage 0. Used for the storage check and setup copy. */
export const MODEL_BYTES_ESTIMATE = 100 * 1024 * 1024;
export const APPROX_DOWNLOAD_MB = 100;
