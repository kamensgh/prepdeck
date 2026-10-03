import type { Result, Segment, Word } from '../analysis/types.ts';
import type { Dtypes } from './models.ts';

export type Backend = 'webgpu' | 'wasm';
export type AnalysisStep = 'transcribing' | 'pauses' | 'content';
export type Tips = { hit: string; avoid: string };
export type Transcribed = { words: Word[]; segments: Segment[]; ms: { whisper: number; vad: number } };

export type ToWorker =
  | { type: 'load'; backend: Backend; dtypes: Dtypes }
  | { type: 'transcribe'; id: number; audio: Float32Array; prompt: boolean }
  | { type: 'analyse'; id: number; audio: Float32Array; tips: Tips };

export type FromWorker =
  | { type: 'progress'; file: string; loaded: number; total: number }
  | { type: 'loaded' }
  | { type: 'load-error'; message: string }
  | { type: 'step'; id: number; step: AnalysisStep }
  | { type: 'transcribed'; id: number; data: Transcribed }
  | { type: 'analysed'; id: number; result: Result }
  | { type: 'failed'; id: number; message: string };
