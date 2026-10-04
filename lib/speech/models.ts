/** Model choices. Stage 0 may change `MODELS.whisper` and `USE_FILLER_PROMPT`; record why in the results doc. */
export const MODELS = {
  whisper: 'onnx-community/whisper-base.en_timestamped',
  embed: 'Xenova/all-MiniLM-L6-v2',
} as const;

export type ProfileId = 'quality' | 'compact';
export type Dtypes = { whisper: string | Record<string, string>; embed: string };
type Profile = { webgpuF16: Dtypes; webgpu: Dtypes; wasm: Dtypes };

// Whisper's encoder is sensitive to quantisation, so "quality" keeps it fp32 on WebGPU.
// f16 weights need WebGPU's shader-f16 feature. Sizes are in the Stage 0 results doc.
export const PROFILES: Record<ProfileId, Profile> = {
  quality: {
    webgpuF16: { whisper: { encoder_model: 'fp32', decoder_model_merged: 'q4' }, embed: 'fp32' },
    webgpu: { whisper: { encoder_model: 'fp32', decoder_model_merged: 'q4' }, embed: 'fp32' },
    wasm: { whisper: 'q8', embed: 'q8' },
  },
  compact: {
    webgpuF16: { whisper: { encoder_model: 'fp16', decoder_model_merged: 'q4f16' }, embed: 'q8' },
    webgpu: { whisper: { encoder_model: 'fp32', decoder_model_merged: 'q8' }, embed: 'q8' },
    wasm: { whisper: 'q8', embed: 'q8' },
  },
};

/** The profile the app ships with. Task 14 confirms it from the Step 6 comparison. */
export const ACTIVE_PROFILE: ProfileId = 'compact';

export function dtypesFor(profile: ProfileId, backend: 'webgpu' | 'wasm', f16: boolean): Dtypes {
  const p = PROFILES[profile];
  return backend === 'wasm' ? p.wasm : f16 ? p.webgpuF16 : p.webgpu;
}

// Transformers.js names weight files by dtype (DEFAULT_DTYPE_SUFFIX_MAPPING in its utils/dtypes.js).
const SUFFIX: Record<string, string> = {
  fp32: '', fp16: '_fp16', int8: '_int8', uint8: '_uint8', q8: '_quantized', q4: '_q4', q4f16: '_q4f16', bnb4: '_bnb4',
};

/** The ONNX weight files a set of dtypes downloads. */
export function modelFiles(d: Dtypes): { repo: string; path: string }[] {
  const whisper = (module: string) => (typeof d.whisper === 'string' ? d.whisper : d.whisper[module]);
  return [
    { repo: MODELS.whisper, path: `onnx/encoder_model${SUFFIX[whisper('encoder_model')]}.onnx` },
    { repo: MODELS.whisper, path: `onnx/decoder_model_merged${SUFFIX[whisper('decoder_model_merged')]}.onnx` },
    { repo: MODELS.embed, path: `onnx/model${SUFFIX[d.embed]}.onnx` },
  ];
}

// vad-web bundles onnxruntime-web 1.30.0; Transformers.js uses its own runtime build.
export const VAD_ASSETS = 'https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.31/dist/';
export const ORT_WASM = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.30.0/dist/';

/** A filler-heavy prompt nudges Whisper to transcribe disfluencies verbatim. */
export const FILLER_PROMPT = 'Umm, let me think, like, hmm. Okay, so, uh, I mean, you know, basically it is, like, sort of this.';
// Stage 0: Transformers.js ignores Whisper prompts (no get_prompt_ids), so this stays off.
export const USE_FILLER_PROMPT = false;

/** Total model download, measured in Stage 0. Used for the storage check and setup copy. */
// Compact profile on WebGPU, from the Stage 0 file sizes; Task 14 sets the measured value.
export const MODEL_BYTES_ESTIMATE = 140 * 1024 * 1024;
export const APPROX_DOWNLOAD_MB = 140;
