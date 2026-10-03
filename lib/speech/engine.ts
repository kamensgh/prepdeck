import {
  pipeline,
  type AutomaticSpeechRecognitionPipeline,
  type FeatureExtractionPipeline,
} from '@huggingface/transformers';
import { NonRealTimeVAD } from '@ricky0123/vad-web';
import type { Embed, Segment, Word } from '../analysis/types.ts';
import { FILLER_PROMPT, MODELS, ORT_WASM, VAD_ASSETS, WHISPER_DTYPE } from './models.ts';
import type { Backend } from './protocol.ts';

type Progress = (p: { file: string; loaded: number; total: number }) => void;
type AsrChunk = { text: string; timestamp: [number, number | null] };

let asr: AutomaticSpeechRecognitionPipeline | null = null;
let extractor: FeatureExtractionPipeline | null = null;
let vad: NonRealTimeVAD | null = null;

/** Loads all three models once; each file is cached by the browser, so a retry resumes. */
export async function loadModels(backend: Backend, onProgress: Progress): Promise<void> {
  const progress_callback = (e: { status: string; name?: string; file?: string; loaded?: number; total?: number }) => {
    if (e.status === 'progress') onProgress({ file: `${e.name}/${e.file}`, loaded: e.loaded ?? 0, total: e.total ?? 0 });
  };
  asr ??= (await pipeline('automatic-speech-recognition', MODELS.whisper, {
    device: backend,
    dtype: WHISPER_DTYPE[backend],
    progress_callback,
  })) as AutomaticSpeechRecognitionPipeline;
  extractor ??= (await pipeline('feature-extraction', MODELS.embed, {
    device: backend,
    progress_callback,
  })) as FeatureExtractionPipeline;
  // NonRealTimeVADOptions (node_modules/@ricky0123/vad-web/dist/non-real-time-vad.d.ts) has no
  // baseAssetPath/onnxWASMBasePath; it takes modelURL (the .onnx file itself) plus an optional
  // ortConfig callback for configuring the onnxruntime-web instance it imports internally.
  vad ??= await NonRealTimeVAD.new({
    modelURL: `${VAD_ASSETS}silero_vad_legacy.onnx`,
    ortConfig: (ort) => {
      ort.env.wasm.wasmPaths = ORT_WASM;
    },
  });
}

/** Whisper transcription with a timestamp per word. */
export async function transcribe(audio: Float32Array, usePrompt: boolean): Promise<Word[]> {
  const options: Record<string, unknown> = { return_timestamps: 'word', chunk_length_s: 30 };
  if (usePrompt) {
    const tokenizer = asr!.tokenizer as unknown as { get_prompt_ids?: (text: string) => unknown };
    const ids = tokenizer.get_prompt_ids?.(FILLER_PROMPT);
    if (ids) options.prompt_ids = ids;
  }
  const run = asr as unknown as (a: Float32Array, o: object) => Promise<{ chunks?: AsrChunk[] }>;
  const out = await run(audio, options);
  return (out.chunks ?? []).map((c) => ({
    text: c.text.trim(),
    start: c.timestamp[0],
    end: c.timestamp[1] ?? c.timestamp[0],
  }));
}

/** Speech segments from the audio itself (Silero VAD), in seconds. */
export async function detectSpeech(audio: Float32Array): Promise<Segment[]> {
  const segments: Segment[] = [];
  for await (const s of vad!.run(audio, 16000)) segments.push({ start: s.start / 1000, end: s.end / 1000 });
  return segments;
}

export const embed: Embed = async (texts) => {
  const out = await extractor!(texts, { pooling: 'mean', normalize: true });
  return out.tolist() as number[][];
};
