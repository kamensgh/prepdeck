# Spoken Answer Analysis (v2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users answer a dealt card out loud in a full-screen overlay and get on-device ratings for Content, Fluency and Pacing with a specific breakdown.

**Architecture:** A Web Worker owns three models (Whisper `base.en` with word timestamps, Silero VAD, MiniLM embeddings) loaded through Transformers.js and `@ricky0123/vad-web`. The worker turns audio into `words` and `segments`, then calls pure TypeScript functions in `lib/analysis/` (`fluency`, `pacing`, `content`, `rate`) that produce the `Result`. The overlay is a native `<dialog>` driven by a pure session reducer; nothing is persisted.

**Tech Stack:** Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS 4, `@huggingface/transformers`, `@ricky0123/vad-web`, `node:test` with `--experimental-strip-types`.

**Spec:** `docs/superpowers/specs/2026-10-03-v2-spoken-answer-analysis-design.md`

**Stage 0 results and amendment (2026-10-03):** `docs/superpowers/specs/2026-10-03-v2-stage0-results.md`. Tasks 15–18 were added after Stage 0. **Execution order: 1–8, 15, 16, 17, 18, 9, 10, 11, 12, 13, 14.** Tasks 9, 12, 13 and 14 below are already updated for them.

## Global Constraints

- Everything runs in the browser. No audio, transcript or score is ever sent to a server. Model files are downloaded from Hugging Face / jsDelivr only.
- Nothing is persisted: no localStorage, IndexedDB or server writes of recordings or results. (The browser's model cache is the only storage.)
- Recording limit: 3 minutes (`RECORDING.maxSec = 180`), 3-second count-in.
- Ratings: `Strong / Good / Needs work` for Content, Fluency, Pacing. No blended overall score.
- Button label on the card: **Analyse my answer** (British spelling throughout: "Analyse", "analysing", "behavioural").
- User-facing copy is copied verbatim from the spec where the spec quotes it.
- Breakdown lines describe what happened, never the person.
- Thresholds live only in `lib/analysis/thresholds.ts`.
- Code in `lib/` imports siblings with relative paths **including the `.ts` extension** (matches `lib/deck.ts`) so `node --test --experimental-strip-types` can run it. App and component code imports with `@/…` and no extension.
- Tests use `node:test` + `node:assert/strict`, as in `lib/deck.test.ts`.
- Work on branch `feat/v2-spoken-analysis`. Do **not** push to `main`: pushing `main` deploys production via the Vercel Git integration. Pushing the branch creates a preview deployment.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` when committed by Claude.

**Spec deviation (recorded on purpose):** the spec says to set COOP/COEP headers "only on the practice route". Response headers only apply on a full document load, and users reach the practice route by client-side navigation, so route-scoped headers would never take effect. This plan sets them site-wide. The site has no third-party embeds or scripts today, so nothing breaks. Task 2 verifies `crossOriginIsolated === true` after navigating from `/` to a practice page.

---

## File Structure

```
lib/analysis/                 pure grading logic (no browser APIs, no models)
  types.ts                    Word, Segment, Pause, metrics, Dimension, Result, Embed
  thresholds.ts               every tunable number
  text.ts                     tokens(), wordToken(), formatClock()
  fixtures.ts                 wordsFromText() for tests and the golden set
  fluency.ts (+ .test.ts)     filler counting with context rules
  pacing.ts  (+ .test.ts)     long pauses, rate, length
  content.ts (+ .test.ts)     rubric splitting, coverage, avoid check, STAR fallback
  rate.ts    (+ .test.ts)     ratings + breakdown lines
  analyse.ts (+ .test.ts)     analyseAnswer() orchestration, looksNonEnglish()
  spike.ts   (+ .test.ts)     fillerRecall() for Stage 0 measurements
  golden.ts                   30 golden answers (10 questions × strong/partial/off-topic)
lib/speech/                   browser side
  models.ts                   model ids, dtypes, asset URLs, prompt, size estimate
  protocol.ts                 worker message types
  engine.ts                   runs INSIDE the worker: load/transcribe/detectSpeech/embed
  client.ts                   main-thread wrapper: load, transcribe, analyse, cancel, cache checks
  audio.ts                    rms(), decodeTo16kMono()
  useRecorder.ts              mic capture hook, waveform levels, flat-mic detection, 3:00 stop
  mic.ts                      requestMic(), micHelp()
  support.ts                  supportsAnalysis(), isLikelyPhone()
  session.ts (+ .test.ts)     overlay state machine (pure reducer)
workers/analysis.worker.ts    worker entry: routes messages to engine + analyseAnswer
app/lab/speech/               Stage 0 dev-only measurement page
  page.tsx, LabClient.tsx
components/analysis/
  AnalysisOverlay.tsx         <dialog>, history/Back, orchestration
  SetupStep.tsx               consent, download progress, setup errors
  RecordStep.tsx              ready / count-in / recording UI
  ResultsStep.tsx             ratings, breakdown, playback, tips, next actions
  Transcript.tsx              transcript with fillers and pauses highlighted
scripts/golden.ts             runs the golden set with real MiniLM in Node
Modified: package.json, next.config.ts, components/Deck.tsx, components/QuestionCard.tsx, README.md
```

---

# Stage 0: Spike (gate)

Stage 0 builds the real model plumbing (engine, worker, client, recorder) plus a dev-only lab page, then measures filler retention and speed. **Stage 1 Task 9 onward must not start until the Stage 0 results doc says PASS** (Tasks 5–8 are pure logic and may proceed in parallel).

### Task 1: Dependencies, test glob, model config, audio helpers

**Files:**
- Modify: `package.json`
- Create: `lib/speech/models.ts`, `lib/speech/audio.ts`, `lib/analysis/text.ts`, `lib/analysis/text.test.ts`

**Interfaces:**
- Produces: `MODELS`, `WHISPER_DTYPE`, `VAD_ASSETS`, `ORT_WASM`, `FILLER_PROMPT`, `USE_FILLER_PROMPT`, `MODEL_BYTES_ESTIMATE`, `APPROX_DOWNLOAD_MB` (models.ts); `rms(buf: Float32Array): number`, `decodeTo16kMono(blob: Blob): Promise<Float32Array>`, `SAMPLE_RATE = 16000` (audio.ts); `tokens(s: string): string[]`, `wordToken(s: string): string`, `formatClock(sec: number): string` (text.ts)

- [ ] **Step 1: Create the branch and install dependencies**

```bash
git checkout -b feat/v2-spoken-analysis
npm install @huggingface/transformers @ricky0123/vad-web
npm ls @ricky0123/vad-web onnxruntime-web
```

Note the two versions printed by `npm ls`; Step 4 uses them.

- [ ] **Step 2: Make `npm test` find tests in subfolders**

In `package.json`, change the `test` script and add `test:golden`:

```json
"test": "node --test --experimental-strip-types 'lib/**/*.test.ts'",
"test:golden": "node --experimental-strip-types scripts/golden.ts",
```

Run: `npm test`
Expected: the existing 9 tests still PASS.

- [ ] **Step 3: Write the failing test for text helpers**

`lib/analysis/text.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatClock, tokens, wordToken } from './text.ts';

test('tokens lowercases and splits on punctuation', () => {
  assert.deepEqual(tokens('TCP/TLS, HTTP.'), ['tcp', 'tls', 'http']);
});

test('wordToken strips punctuation but keeps apostrophes', () => {
  assert.equal(wordToken(' Like,'), 'like');
  assert.equal(wordToken("don't"), "don't");
});

test('formatClock renders m:ss', () => {
  assert.equal(formatClock(161), '2:41');
  assert.equal(formatClock(9.6), '0:10');
  assert.equal(formatClock(-3), '0:00');
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npm test`
Expected: FAIL, `Cannot find module '.../lib/analysis/text.ts'`.

- [ ] **Step 5: Implement text helpers, model config and audio helpers**

`lib/analysis/text.ts`:

```ts
/** Lowercase word tokens; splits "TCP/TLS" into ["tcp", "tls"]. */
export function tokens(s: string): string[] {
  return s.toLowerCase().split(/[^a-z0-9']+/).filter(Boolean);
}

/** One transcript word as a bare lowercase token: " Like," → "like". */
export function wordToken(s: string): string {
  return s.toLowerCase().replace(/[^a-z']/g, '');
}

/** Seconds → "m:ss", rounded to the nearest second. */
export function formatClock(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
```

`lib/speech/models.ts` (replace `<vad-web version>` and `<onnxruntime-web version>` with the exact versions from Step 1):

```ts
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

export const VAD_ASSETS = 'https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@<vad-web version>/dist/';
export const ORT_WASM = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@<onnxruntime-web version>/dist/';

/** A filler-heavy prompt nudges Whisper to transcribe disfluencies verbatim. */
export const FILLER_PROMPT = 'Umm, let me think, like, hmm. Okay, so, uh, I mean, you know, basically it is, like, sort of this.';
export const USE_FILLER_PROMPT = true;

/** Total model download, measured in Stage 0. Used for the storage check and setup copy. */
export const MODEL_BYTES_ESTIMATE = 100 * 1024 * 1024;
export const APPROX_DOWNLOAD_MB = 100;
```

`lib/speech/audio.ts`:

```ts
export const SAMPLE_RATE = 16000;

/** Root-mean-square level of a block of samples, 0 for silence. */
export function rms(buf: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
  return buf.length ? Math.sqrt(sum / buf.length) : 0;
}

/** Decodes a recorded blob and resamples it to 16 kHz mono, the format Whisper and Silero expect. */
export async function decodeTo16kMono(blob: Blob): Promise<Float32Array> {
  const ctx = new AudioContext({ sampleRate: SAMPLE_RATE });
  try {
    const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
    return decoded.getChannelData(0).slice();
  } finally {
    void ctx.close();
  }
}
```

- [ ] **Step 6: Run tests and typecheck**

Run: `npm test && npm run typecheck`
Expected: all PASS, no type errors.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json lib/speech/models.ts lib/speech/audio.ts lib/analysis/text.ts lib/analysis/text.test.ts
git commit -m "feat(speech): add model config, audio and text helpers"
```

### Task 2: Engine, worker, client and cross-origin isolation

**Files:**
- Create: `lib/analysis/types.ts`, `lib/speech/protocol.ts`, `lib/speech/engine.ts`, `lib/speech/client.ts`, `workers/analysis.worker.ts`
- Modify: `next.config.ts`

**Interfaces:**
- Consumes: `MODELS`, `WHISPER_DTYPE`, `VAD_ASSETS`, `ORT_WASM`, `FILLER_PROMPT`, `USE_FILLER_PROMPT`, `MODEL_BYTES_ESTIMATE` (Task 1)
- Produces (types.ts): `Word = { text: string; start: number; end: number }` (seconds), `Segment = { start: number; end: number }`, `Embed = (texts: string[]) => Promise<number[][]>`, plus the result types listed below
- Produces (client.ts): `loadModels(onProgress: (loaded: number, total: number) => void): Promise<void>`, `transcribe(audio: Float32Array, prompt: boolean): Promise<Transcribed>`, `analyse(audio: Float32Array, tips: Tips, onStep: (s: AnalysisStep) => void): Promise<Result>`, `cancel(): void`, `isLoaded(): boolean`, `currentBackend(): Backend`, `modelsCached(): Promise<boolean>`, `hasRoomForModels(): Promise<boolean>`, `class Cancelled extends Error`
- Produces (protocol.ts): `Backend = 'webgpu' | 'wasm'`, `AnalysisStep = 'transcribing' | 'pauses' | 'content'`, `Tips = { hit: string; avoid: string }`, `Transcribed = { words: Word[]; segments: Segment[]; ms: { whisper: number; vad: number } }`, `ToWorker`, `FromWorker`

The `analyse` path is wired here but its `analyseAnswer` import lands in Task 8; until then the worker answers `analyse` with `failed`.

- [ ] **Step 1: Write the shared types**

`lib/analysis/types.ts`:

```ts
/** A transcribed word; times are seconds from the start of the recording. */
export type Word = { text: string; start: number; end: number };
/** A stretch of detected speech, in seconds from the start of the recording. */
export type Segment = { start: number; end: number };
export type Rating = 'strong' | 'good' | 'needs-work';
/** A long silence; `before` holds up to three words spoken just before it ("" for the lead-in). */
export type Pause = { start: number; end: number; duration: number; before: string };

export type FluencyMetrics = {
  counts: { filler: string; count: number }[]; // most frequent first
  total: number;
  perMinute: number;
  indexes: number[]; // indexes into words[], for highlighting
};
export type PacingMetrics = {
  answerSec: number; // recording start → end of last speech
  wordsPerMinute: number;
  longPauses: Pause[];
  longest: Pause | null;
};
export type RubricPoint = { text: string; covered: boolean };
export type ContentMetrics = {
  mode: 'rubric' | 'structure';
  points: RubricPoint[];
  coverage: number; // 0..1
  avoidHit: string | null;
};
export type Dimension = { rating: Rating; lines: string[] };
export type GradedResult = {
  graded: true;
  content: Dimension;
  fluency: Dimension;
  pacing: Dimension;
  words: Word[];
  fillerIndexes: number[];
  longPauses: Pause[];
  englishWarning: boolean;
};
export type Result = GradedResult | { graded: false; reason: 'too-short'; words: Word[] };
export type Embed = (texts: string[]) => Promise<number[][]>;
```

- [ ] **Step 2: Write the worker protocol**

`lib/speech/protocol.ts`:

```ts
import type { Result, Segment, Word } from '../analysis/types.ts';

export type Backend = 'webgpu' | 'wasm';
export type AnalysisStep = 'transcribing' | 'pauses' | 'content';
export type Tips = { hit: string; avoid: string };
export type Transcribed = { words: Word[]; segments: Segment[]; ms: { whisper: number; vad: number } };

export type ToWorker =
  | { type: 'load'; backend: Backend }
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
```

- [ ] **Step 3: Write the engine (runs inside the worker)**

`lib/speech/engine.ts`:

```ts
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
  vad ??= await NonRealTimeVAD.new({ baseAssetPath: VAD_ASSETS, onnxWASMBasePath: ORT_WASM });
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
```

If `npm run typecheck` reports that `NonRealTimeVAD.new` does not accept `baseAssetPath` / `onnxWASMBasePath`, open `node_modules/@ricky0123/vad-web/dist/*.d.ts`, find `NonRealTimeVADOptions`, and pass the model URL option it declares (e.g. `modelURL: VAD_ASSETS + 'silero_vad_legacy.onnx'`) instead. Record the change in the Stage 0 results doc.

- [ ] **Step 4: Write the worker entry**

`workers/analysis.worker.ts`:

```ts
import { detectSpeech, embed, loadModels, transcribe } from '../lib/speech/engine.ts';
import { USE_FILLER_PROMPT } from '../lib/speech/models.ts';
import type { FromWorker, ToWorker } from '../lib/speech/protocol.ts';

const post = (m: FromWorker) => self.postMessage(m);

self.onmessage = async ({ data }: MessageEvent<ToWorker>) => {
  if (data.type === 'load') {
    try {
      await loadModels(data.backend, (p) => post({ type: 'progress', ...p }));
      post({ type: 'loaded' });
    } catch (e) {
      post({ type: 'load-error', message: String(e) });
    }
    return;
  }

  const { id } = data;
  try {
    if (data.type === 'transcribe') {
      const t0 = performance.now();
      const words = await transcribe(data.audio, data.prompt);
      const t1 = performance.now();
      const segments = await detectSpeech(data.audio);
      post({ type: 'transcribed', id, data: { words, segments, ms: { whisper: t1 - t0, vad: performance.now() - t1 } } });
      return;
    }
    // Wired up in Task 8.
    void USE_FILLER_PROMPT;
    void embed;
    post({ type: 'failed', id, message: 'analyse is not implemented yet' });
  } catch (e) {
    post({ type: 'failed', id, message: String(e) });
  }
};
```

- [ ] **Step 5: Write the main-thread client**

`lib/speech/client.ts`:

```ts
import type { Result } from '../analysis/types.ts';
import { MODEL_BYTES_ESTIMATE, MODELS } from './models.ts';
import type { AnalysisStep, Backend, FromWorker, Tips, ToWorker, Transcribed } from './protocol.ts';

/** Thrown to pending callers when the user cancels; callers should stay silent. */
export class Cancelled extends Error {}

let worker: Worker | null = null;
let loaded = false;
let backendUsed: Backend = 'wasm';
let nextId = 1;
const listeners = new Set<(m: FromWorker) => void>();
const rejectors = new Set<(e: Error) => void>();

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('../../workers/analysis.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<FromWorker>) => listeners.forEach((l) => l(e.data));
  }
  return worker;
}

function listen(fn: (m: FromWorker) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export const isLoaded = () => loaded;
export const currentBackend = () => backendUsed;

async function pickBackend(): Promise<Backend> {
  const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
  try {
    return gpu && (await gpu.requestAdapter()) ? 'webgpu' : 'wasm';
  } catch {
    return 'wasm';
  }
}

/** True when the browser offers a usable WebGPU adapter. */
export async function hasWebGPU(): Promise<boolean> {
  return (await pickBackend()) === 'webgpu';
}

export async function loadModels(onProgress: (loaded: number, total: number) => void): Promise<void> {
  if (loaded) return;
  backendUsed = await pickBackend();
  return new Promise<void>((resolve, reject) => {
    const files = new Map<string, { loaded: number; total: number }>();
    const finish = () => {
      stop();
      rejectors.delete(reject);
    };
    const stop = listen((m) => {
      if (m.type === 'progress') {
        files.set(m.file, m);
        let l = 0;
        let t = 0;
        files.forEach((f) => {
          l += f.loaded;
          t += f.total;
        });
        onProgress(l, t);
      } else if (m.type === 'loaded') {
        finish();
        loaded = true;
        resolve();
      } else if (m.type === 'load-error') {
        finish();
        reject(new Error(m.message));
      }
    });
    rejectors.add(reject);
    getWorker().postMessage({ type: 'load', backend: backendUsed } satisfies ToWorker);
  });
}

function request<T>(
  msg: Extract<ToWorker, { id: number }>,
  pick: (m: FromWorker) => T | undefined,
  onStep?: (s: AnalysisStep) => void,
): Promise<T> {
  const timeoutMs = backendUsed === 'webgpu' ? 60_000 : 180_000;
  return new Promise<T>((resolve, reject) => {
    const finish = () => {
      clearTimeout(timer);
      stop();
      rejectors.delete(fail);
    };
    const fail = (e: Error) => {
      finish();
      reject(e);
    };
    const timer = setTimeout(() => {
      fail(new Error('timeout'));
      cancel(); // restart the worker; cached model files survive
    }, timeoutMs);
    const stop = listen((m) => {
      if (!('id' in m) || m.id !== msg.id) return;
      if (m.type === 'step') onStep?.(m.step);
      else if (m.type === 'failed') fail(new Error(m.message));
      else {
        const value = pick(m);
        if (value !== undefined) {
          finish();
          resolve(value);
        }
      }
    });
    rejectors.add(fail);
    getWorker().postMessage(msg, [msg.audio.buffer as ArrayBuffer]);
  });
}

export function transcribe(audio: Float32Array, prompt: boolean): Promise<Transcribed> {
  return request({ type: 'transcribe', id: nextId++, audio, prompt }, (m) => (m.type === 'transcribed' ? m.data : undefined));
}

export function analyse(audio: Float32Array, tips: Tips, onStep: (s: AnalysisStep) => void): Promise<Result> {
  return request({ type: 'analyse', id: nextId++, audio, tips }, (m) => (m.type === 'analysed' ? m.result : undefined), onStep);
}

/** Stops all work. The next load re-initialises from the browser cache. */
export function cancel(): void {
  worker?.terminate();
  worker = null;
  loaded = false;
  rejectors.forEach((r) => r(new Cancelled('cancelled')));
  rejectors.clear();
}

/** Whether the Whisper files are already in Transformers.js's browser cache. */
export async function modelsCached(): Promise<boolean> {
  try {
    if (!('caches' in globalThis)) return false;
    const keys = await (await caches.open('transformers-cache')).keys();
    return keys.some((r) => r.url.includes(MODELS.whisper));
  } catch {
    return false;
  }
}

export async function hasRoomForModels(): Promise<boolean> {
  try {
    const est = await navigator.storage?.estimate();
    if (!est?.quota) return true;
    return est.quota - (est.usage ?? 0) > MODEL_BYTES_ESTIMATE * 1.5;
  } catch {
    return true;
  }
}
```

- [ ] **Step 6: Enable cross-origin isolation site-wide**

`next.config.ts`:

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Multi-threaded WASM needs SharedArrayBuffer, which needs cross-origin isolation.
  // Site-wide on purpose: headers only apply on a full page load, and the practice
  // route is usually reached by client-side navigation.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
        ],
      },
    ];
  },
};

export default nextConfig;
```

- [ ] **Step 7: Typecheck, build, verify isolation**

Run: `npm run typecheck && npm test && npm run build`
Expected: no errors; the build lists a worker chunk.

Run `npm run dev`, open `http://localhost:3000/`, click through to Technology → Frontend Engineer, then in the browser console run `crossOriginIsolated`.
Expected: `true`. Also confirm fonts and the deck still render.

- [ ] **Step 8: Commit**

```bash
git add lib/analysis/types.ts lib/speech/protocol.ts lib/speech/engine.ts lib/speech/client.ts workers/analysis.worker.ts next.config.ts
git commit -m "feat(speech): on-device engine, worker and client; enable cross-origin isolation"
```

### Task 3: Recorder hook and microphone helpers

**Files:**
- Create: `lib/speech/useRecorder.ts`, `lib/speech/mic.ts`, `lib/analysis/thresholds.ts`

**Interfaces:**
- Consumes: `rms`, `decodeTo16kMono`, `SAMPLE_RATE` (Task 1)
- Produces: `RECORDING`, `MIN_WORDS`, `FLUENCY`, `PACING`, `CONTENT`, `ENGLISH` (thresholds.ts); `type Recording = { audio: Float32Array; url: string; durationSec: number }`; `useRecorder({ onStop, onLost }) → { start(): Promise<void>; stop(): void; discard(): void; active: boolean; elapsed: number; levels: number[]; flat: boolean; recording: Recording | null }`; `requestMic(): Promise<'ok' | 'mic-denied' | 'no-device'>`; `micHelp(): string`

- [ ] **Step 1: Write the thresholds file (used from here on)**

`lib/analysis/thresholds.ts`:

```ts
/** Every tunable number for grading and recording. Starting values; tuned during calibration (Task 14). */
export const MIN_WORDS = 15;

/** Fillers per minute. */
export const FLUENCY = { strongBelow: 3, goodUpTo: 6 } as const;

export const PACING = {
  longPauseSec: 2.5,
  thinkingSec: 5, // silence before the first word that is free
  minWpm: 110,
  maxWpm: 170,
  minAnswerSec: 30,
  maxAnswerSec: 150,
  goodMaxPauses: 3,
} as const;

export const CONTENT = {
  strongFrom: 0.7,
  goodFrom: 0.4,
  coverSimilarity: 0.5,
  avoidSimilarity: 0.6,
  windowWords: 12,
  windowStep: 6,
  minRubricPoints: 3,
} as const;

/** Heuristic for "This works best for answers in English"; set from Stage 0 recordings. */
export const ENGLISH = { minSpeechSec: 20, minWordsPerSpeechSec: 1.0 } as const;

export const RECORDING = { maxSec: 180, countInSec: 3, flatMicSec: 5, flatRms: 0.001 } as const;
```

- [ ] **Step 2: Write the mic helpers**

`lib/speech/mic.ts`:

```ts
/** Asks for the microphone once (during setup) and releases it straight away. */
export async function requestMic(): Promise<'ok' | 'mic-denied' | 'no-device'> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
    return 'ok';
  } catch (e) {
    return e instanceof DOMException && e.name === 'NotFoundError' ? 'no-device' : 'mic-denied';
  }
}

/** Browser-specific steps to re-enable a denied microphone. */
export function micHelp(): string {
  const safari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  return safari
    ? 'Open Safari Settings → Websites → Microphone, set this site to Allow, then try again.'
    : 'Click the icon to the left of the address bar, set Microphone to Allow, then try again.';
}
```

- [ ] **Step 3: Write the recorder hook**

`lib/speech/useRecorder.ts`:

```ts
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { RECORDING } from '../analysis/thresholds.ts';
import { SAMPLE_RATE, decodeTo16kMono, rms } from './audio.ts';

export type Recording = { audio: Float32Array; url: string; durationSec: number };

type Live = { stream: MediaStream; recorder: MediaRecorder; ctx: AudioContext; raf: number; clock: number; lost: boolean };
type Options = {
  onStop: (r: Recording) => void; // normal stop or the 3:00 limit
  onLost: (r: Recording) => void; // mic unplugged mid-recording
};

export function useRecorder({ onStop, onLost }: Options) {
  const [active, setActive] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [levels, setLevels] = useState<number[]>([]);
  const [flat, setFlat] = useState(false);
  const [recording, setRecording] = useState<Recording | null>(null);
  const live = useRef<Live | null>(null);
  const handlers = useRef({ onStop, onLost });
  handlers.current = { onStop, onLost };

  const teardown = useCallback(() => {
    const l = live.current;
    if (!l) return;
    cancelAnimationFrame(l.raf);
    clearInterval(l.clock);
    l.stream.getTracks().forEach((t) => t.stop());
    void l.ctx.close();
    live.current = null;
    setActive(false);
  }, []);

  const start = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true } });
    const recorder = new MediaRecorder(stream);
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const buf = new Float32Array(analyser.fftSize);
    const chunks: Blob[] = [];
    const startedAt = performance.now();
    let lastSound = startedAt;
    let lastPaint = 0;
    const l: Live = { stream, recorder, ctx, raf: 0, clock: 0, lost: false };
    live.current = l;

    // Waveform and flat-mic check: animation frames (paused in hidden tabs, which is fine).
    const frame = () => {
      analyser.getFloatTimeDomainData(buf);
      const now = performance.now();
      const level = rms(buf);
      if (level > RECORDING.flatRms) lastSound = now;
      if (now - lastPaint > 50) {
        lastPaint = now;
        setLevels((ls) => [...ls.slice(-47), level]);
        setFlat(now - lastSound > RECORDING.flatMicSec * 1000);
      }
      l.raf = requestAnimationFrame(frame);
    };
    // Clock and 3:00 limit: an interval, so they keep running when the tab is hidden.
    const tick = () => {
      const sec = (performance.now() - startedAt) / 1000;
      setElapsed(sec);
      if (sec >= RECORDING.maxSec && recorder.state === 'recording') recorder.stop();
    };

    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = async () => {
      const lost = l.lost;
      teardown();
      const blob = new Blob(chunks, { type: recorder.mimeType });
      const audio = await decodeTo16kMono(blob);
      const rec: Recording = { audio, url: URL.createObjectURL(blob), durationSec: audio.length / SAMPLE_RATE };
      setRecording(rec);
      (lost ? handlers.current.onLost : handlers.current.onStop)(rec);
    };
    stream.getAudioTracks()[0].onended = () => {
      l.lost = true;
      if (recorder.state === 'recording') recorder.stop();
    };

    setLevels([]);
    setElapsed(0);
    setFlat(false);
    setActive(true);
    recorder.start(250);
    l.raf = requestAnimationFrame(frame);
    l.clock = window.setInterval(tick, 250);
  }, [teardown]);

  const stop = useCallback(() => {
    const r = live.current?.recorder;
    if (r?.state === 'recording') r.stop();
  }, []);

  /** Throws away any recording in progress or finished. Nothing is kept. */
  const discard = useCallback(() => {
    const l = live.current;
    if (l) {
      l.recorder.onstop = null;
      if (l.recorder.state === 'recording') l.recorder.stop();
      teardown();
    }
    setRecording((r) => {
      if (r) URL.revokeObjectURL(r.url);
      return null;
    });
  }, [teardown]);

  useEffect(() => discard, [discard]);

  return { start, stop, discard, active, elapsed, levels, flat, recording };
}
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck && npm test`
Expected: PASS. (The hook is exercised in the browser in Task 4 and Task 13.)

- [ ] **Step 5: Commit**

```bash
git add lib/analysis/thresholds.ts lib/speech/mic.ts lib/speech/useRecorder.ts
git commit -m "feat(speech): recorder hook with waveform, flat-mic detection and 3:00 limit"
```

### Task 4: Lab page, filler recall, run the spike

**Files:**
- Create: `lib/analysis/spike.ts`, `lib/analysis/spike.test.ts`, `app/lab/speech/page.tsx`, `app/lab/speech/LabClient.tsx`, `docs/superpowers/specs/2026-10-03-v2-stage0-results.md`

**Interfaces:**
- Consumes: `loadModels`, `transcribe`, `currentBackend` (Task 2); `useRecorder`, `requestMic` (Task 3); `decodeTo16kMono` (Task 1)
- Produces: `fillerRecall(label: string, transcript: string): { perFiller: Record<'um' | 'uh' | 'like', { labelled: number; found: number }>; recall: number }`

- [ ] **Step 1: Write the failing test**

`lib/analysis/spike.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fillerRecall } from './spike.ts';

test('recall counts found fillers against the hand label, capped per filler', () => {
  const label = 'Um so, like, the uh event loop is um like a queue';
  const transcript = 'So, like, the event loop is um a queue';
  const r = fillerRecall(label, transcript);
  assert.deepEqual(r.perFiller.um, { labelled: 2, found: 1 });
  assert.deepEqual(r.perFiller.uh, { labelled: 1, found: 0 });
  assert.deepEqual(r.perFiller.like, { labelled: 2, found: 1 });
  assert.equal(r.recall, 2 / 5);
});

test('variant spellings count as the same filler', () => {
  const r = fillerRecall('umm uhh', 'um uh');
  assert.equal(r.recall, 1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL, cannot find `./spike.ts`.

- [ ] **Step 3: Implement `fillerRecall`**

`lib/analysis/spike.ts`:

```ts
import { tokens } from './text.ts';

const FILLERS = ['um', 'uh', 'like'] as const;
type Filler = (typeof FILLERS)[number];
const CANON: Record<string, Filler> = { um: 'um', umm: 'um', uh: 'uh', uhh: 'uh', like: 'like' };

function countFillers(text: string): Record<Filler, number> {
  const counts: Record<Filler, number> = { um: 0, uh: 0, like: 0 };
  for (const t of tokens(text)) {
    const f = CANON[t];
    if (f) counts[f]++;
  }
  return counts;
}

/** Stage 0 metric: share of hand-labelled um/uh/like that Whisper kept. */
export function fillerRecall(label: string, transcript: string) {
  const l = countFillers(label);
  const h = countFillers(transcript);
  const perFiller = Object.fromEntries(
    FILLERS.map((f) => [f, { labelled: l[f], found: Math.min(l[f], h[f]) }]),
  ) as Record<Filler, { labelled: number; found: number }>;
  const labelled = FILLERS.reduce((s, f) => s + l[f], 0);
  const found = FILLERS.reduce((s, f) => s + perFiller[f].found, 0);
  return { perFiller, recall: labelled ? found / labelled : 1 };
}
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Write the lab page (dev only)**

`app/lab/speech/page.tsx`:

```tsx
import { notFound } from 'next/navigation';
import { LabClient } from './LabClient';

/** Stage 0 measurement bench. Never available in production. */
export default function SpeechLabPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return (
    <main>
      <h1 className="font-display text-3xl font-extrabold">Speech lab</h1>
      <LabClient />
    </main>
  );
}
```

`app/lab/speech/LabClient.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { fillerRecall } from '@/lib/analysis/spike';
import { decodeTo16kMono } from '@/lib/speech/audio';
import * as engine from '@/lib/speech/client';
import type { Transcribed } from '@/lib/speech/protocol';
import { useRecorder } from '@/lib/speech/useRecorder';

type Run = { prompt: boolean; data: Transcribed; totalMs: number };

export function LabClient() {
  const [status, setStatus] = useState('Models not loaded');
  const [audio, setAudio] = useState<Float32Array | null>(null);
  const [label, setLabel] = useState('');
  const [runs, setRuns] = useState<Run[]>([]);
  const recorder = useRecorder({ onStop: (r) => setAudio(r.audio), onLost: (r) => setAudio(r.audio) });

  const load = async () => {
    const t0 = performance.now();
    await engine.loadModels((l, t) => setStatus(`Downloading ${(l / 1e6).toFixed(1)} / ${(t / 1e6).toFixed(1)} MB`));
    setStatus(
      `Loaded on ${engine.currentBackend()} in ${((performance.now() - t0) / 1000).toFixed(1)} s · crossOriginIsolated=${String(crossOriginIsolated)}`,
    );
  };

  const run = async (prompt: boolean) => {
    if (!audio) return;
    const t0 = performance.now();
    const data = await engine.transcribe(audio.slice(), prompt); // slice: the buffer is transferred
    setRuns((r) => [...r, { prompt, data, totalMs: performance.now() - t0 }]);
  };

  return (
    <div className="mt-6 space-y-6">
      <p>{status}</p>
      <button type="button" className="rounded-full border-2 border-ink px-4 py-2 font-bold" onClick={load}>
        Load models
      </button>

      <div className="flex flex-wrap gap-3">
        <button type="button" className="rounded-full border-2 border-ink px-4 py-2 font-bold" onClick={() => (recorder.active ? recorder.stop() : recorder.start())}>
          {recorder.active ? `Stop (${recorder.elapsed.toFixed(0)} s)` : 'Record'}
        </button>
        <input
          type="file"
          accept="audio/*"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) setAudio(await decodeTo16kMono(f));
          }}
        />
        {audio && <span>{(audio.length / 16000).toFixed(1)} s of audio ready</span>}
      </div>

      <label className="block">
        <span className="font-bold">Hand label (verbatim, every um/uh/like)</span>
        <textarea className="mt-2 block h-24 w-full rounded border-2 border-ink p-2" value={label} onChange={(e) => setLabel(e.target.value)} />
      </label>

      <div className="flex gap-3">
        <button type="button" className="rounded-full border-2 border-ink px-4 py-2 font-bold" onClick={() => run(false)}>
          Transcribe (no prompt)
        </button>
        <button type="button" className="rounded-full border-2 border-ink px-4 py-2 font-bold" onClick={() => run(true)}>
          Transcribe (filler prompt)
        </button>
      </div>

      {runs.map((r, i) => {
        const text = r.data.words.map((w) => w.text).join(' ');
        const recall = label ? fillerRecall(label, text) : null;
        return (
          <section key={i} className="card-surface bg-white p-4">
            <p className="font-bold">
              Run {i + 1} · prompt {r.prompt ? 'on' : 'off'} · total {(r.totalMs / 1000).toFixed(1)} s · whisper {(r.data.ms.whisper / 1000).toFixed(1)} s · vad{' '}
              {(r.data.ms.vad / 1000).toFixed(1)} s
            </p>
            {recall && <p>Filler recall: {(recall.recall * 100).toFixed(0)}% {JSON.stringify(recall.perFiller)}</p>}
            <p className="mt-2">{text}</p>
            <details className="mt-2">
              <summary>Words and segments</summary>
              <pre className="overflow-x-auto text-xs">{JSON.stringify(r.data, null, 1)}</pre>
            </details>
          </section>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 6: Smoke-test the lab**

Run: `npm run dev`, open `http://localhost:3000/lab/speech`, click **Load models**, record 10 seconds saying "um, so, like, the event loop", stop, click both Transcribe buttons.
Expected: a status line naming the backend with `crossOriginIsolated=true`; two runs with words, timings and segments. If the model id fails to load, try `onnx-community/whisper-base_timestamped` in `MODELS.whisper` and note it.

Also check `npm run build` then `npm start` and open `/lab/speech`: expected 404.

- [ ] **Step 7: Run the measurements and write the results doc**

Record 20 answers to seed questions (deliberately filler-heavy, 30–90 s each), hand-label each verbatim, and run both prompt modes. Time a 3-minute answer on: an M1 or recent Windows laptop with WebGPU, the same laptop in a browser without WebGPU (Firefox, or Chrome with `chrome://flags/#enable-unsafe-webgpu` disabled), and a mid-range Android phone. Record 2 non-English answers and note words per speech-second. Check the browser cache (DevTools → Application → Cache Storage) for the cache name and note it.

Create `docs/superpowers/specs/2026-10-03-v2-stage0-results.md` with these sections, filled with the measured numbers:

```markdown
# v2 Stage 0 results

## Filler retention (20 answers)
| Prompt | um recall | uh recall | like recall | overall | pass (≥ 80%)? |
| --- | --- | --- | --- | --- | --- |
| off | | | | | |
| on | | | | | |

## Speed (3-minute answer, Stop → words + segments)
| Device | Backend | Whisper s | VAD s | Total s | pass? |
| --- | --- | --- | --- | --- | --- |

## Other findings
- Model id that loaded: 
- Total download (MB, from the lab status line): 
- Transformers.js cache name: 
- Non-English words per speech-second (2 samples): 
- VAD options change needed (Task 2 Step 3 note): 

## Decision
PASS / FAIL, with the settings Stage 1 uses: MODELS.whisper, USE_FILLER_PROMPT, MODEL_BYTES_ESTIMATE, APPROX_DOWNLOAD_MB, ENGLISH.minWordsPerSpeechSec, phone support label.
```

Then update `lib/speech/models.ts` and `lib/analysis/thresholds.ts` to the decided values.

If filler recall fails with both prompt modes: stop and raise it with the product owner before Stage 1 Task 9. The spec's fallback (acoustic um/uh detection from VAD segments with no matching word, then CrisperWhisper) needs its own plan.

- [ ] **Step 8: Commit**

```bash
git add lib/analysis/spike.ts lib/analysis/spike.test.ts app/lab docs/superpowers/specs/2026-10-03-v2-stage0-results.md lib/speech/models.ts lib/analysis/thresholds.ts
git commit -m "chore(speech): Stage 0 lab bench and results"
```

---

# Stage 1: Core v2

### Task 5: Test fixtures and `fluency()`

**Files:**
- Create: `lib/analysis/fixtures.ts`, `lib/analysis/fluency.ts`, `lib/analysis/fluency.test.ts`

**Interfaces:**
- Consumes: `Word`, `FluencyMetrics` (Task 2); `wordToken` (Task 1)
- Produces: `wordsFromText(text: string, opts?: { start?: number; secPerWord?: number; pauses?: Record<number, number> }): Word[]`; `fluency(words: Word[]): FluencyMetrics`

- [ ] **Step 1: Write the fixture helper**

`lib/analysis/fixtures.ts`:

```ts
import type { Word } from './types.ts';

/**
 * Synthetic word timings for tests: 0.4 s per word (150 wpm) by default.
 * `pauses[i]` adds that many seconds of silence before word i.
 */
export function wordsFromText(
  text: string,
  { start = 0, secPerWord = 0.4, pauses = {} }: { start?: number; secPerWord?: number; pauses?: Record<number, number> } = {},
): Word[] {
  let t = start;
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((w, i) => {
      t += pauses[i] ?? 0;
      const word = { text: w, start: t, end: t + secPerWord * 0.8 };
      t += secPerWord;
      return word;
    });
}
```

- [ ] **Step 2: Write the failing tests**

`lib/analysis/fluency.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fluency } from './fluency.ts';
import { wordsFromText } from './fixtures.ts';

const count = (text: string, filler: string) =>
  fluency(wordsFromText(text)).counts.find((c) => c.filler === filler)?.count ?? 0;

test('counts um, uh and filler "like"', () => {
  const m = fluency(wordsFromText('So um the event loop is, like, really uh simple'));
  assert.equal(m.total, 3);
  assert.equal(count('So um the event loop is, like, really uh simple', 'like'), 1);
});

test('"like" after a subject or a comparison verb is not a filler', () => {
  assert.equal(count("I like React and it looks like a library and I'd like that", 'like'), 0);
  assert.equal(count('something like a cache', 'like'), 0);
});

test('"you know" counts unless it introduces a clause', () => {
  assert.equal(count('it was, you know, fine and you know how it works', 'you know'), 1);
});

test('"sort of" counts unless it means "a kind of"', () => {
  assert.equal(count('a sort of tool that is sort of slow', 'sort of'), 1);
});

test('sentence-starting "so" counts from the second one', () => {
  assert.equal(count('So we began. So then we shipped. So it worked.', 'so'), 2);
});

test('variant spellings are merged', () => {
  assert.equal(count('umm uhh erm', 'um'), 1);
  assert.equal(count('umm uhh erm', 'uh'), 1);
  assert.equal(count('umm uhh erm', 'er'), 1);
});

test('per-minute rate uses the spoken span', () => {
  // 30 words at 0.4 s each: span 11.92 s → 3 fillers ≈ 15.1 per minute
  const text = 'um ' + 'word '.repeat(13) + 'um ' + 'word '.repeat(13) + 'um word';
  const m = fluency(wordsFromText(text));
  assert.equal(m.total, 3);
  assert.equal(Math.round(m.perMinute), 15);
});

test('indexes cover both words of a two-word filler, sorted by frequency', () => {
  const m = fluency(wordsFromText('it was, you know, fine um um'));
  assert.deepEqual(m.indexes, [2, 3, 5, 6]);
  assert.deepEqual(m.counts, [
    { filler: 'um', count: 2 },
    { filler: 'you know', count: 1 },
  ]);
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL, cannot find `./fluency.ts`.

- [ ] **Step 4: Implement `fluency()`**

`lib/analysis/fluency.ts`:

```ts
import { wordToken } from './text.ts';
import type { FluencyMetrics, Word } from './types.ts';

const SIMPLE: Record<string, string> = {
  um: 'um', umm: 'um', uh: 'uh', uhh: 'uh', er: 'er', erm: 'er', hmm: 'hmm', basically: 'basically',
};
// "like" is a real word after these: "I like", "looks like", "something like".
const LIKE_KEEP_AFTER = new Set([
  'i', 'you', 'we', 'they', "i'd", "you'd", "we'd", "they'd", 'would', 'to', "don't", "didn't", 'do', 'does',
  'look', 'looks', 'looked', 'feel', 'feels', 'felt', 'sound', 'sounds', 'seem', 'seems', 'something', 'things', 'more', 'much',
]);
// "you know how/what/that…" introduces a clause rather than filling a gap.
const YOU_KNOW_KEEP_BEFORE = new Set(['how', 'what', 'that', 'why', 'where', 'when', 'if', 'whether', 'the', 'about']);
// "a sort of tool" means "a kind of".
const SORT_OF_KEEP_AFTER = new Set(['a', 'the', 'this', 'that', 'what', 'any', 'some']);

const startsSentence = (words: Word[], i: number) => i === 0 || /[.?!]$/.test(words[i - 1].text.trim());

export function fluency(words: Word[]): FluencyMetrics {
  const t = words.map((w) => wordToken(w.text));
  const counts = new Map<string, number>();
  const indexes: number[] = [];
  let total = 0;
  const add = (filler: string, ...idx: number[]) => {
    counts.set(filler, (counts.get(filler) ?? 0) + 1);
    indexes.push(...idx);
    total++;
  };
  let sentenceSo = 0;

  for (let i = 0; i < t.length; i++) {
    const w = t[i];
    const prev = t[i - 1];
    const next = t[i + 1];
    if (SIMPLE[w]) add(SIMPLE[w], i);
    else if (w === 'like' && !(prev && LIKE_KEEP_AFTER.has(prev))) add('like', i);
    else if (w === 'you' && next === 'know' && !YOU_KNOW_KEEP_BEFORE.has(t[i + 2] ?? '')) {
      add('you know', i, i + 1);
      i++;
    } else if (w === 'sort' && next === 'of' && !(prev && SORT_OF_KEEP_AFTER.has(prev))) {
      add('sort of', i, i + 1);
      i++;
    } else if (w === 'so' && startsSentence(words, i) && ++sentenceSo > 1) add('so', i);
  }

  const span = words.length ? words.at(-1)!.end - words[0].start : 0;
  return {
    counts: [...counts].map(([filler, count]) => ({ filler, count })).sort((a, b) => b.count - a.count || a.filler.localeCompare(b.filler)),
    total,
    perMinute: total / (Math.max(span, 1) / 60),
    indexes,
  };
}
```

`total` counts filler occurrences, not words: "you know" adds two highlight indexes but one occurrence.

- [ ] **Step 5: Run tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/analysis/fixtures.ts lib/analysis/fluency.ts lib/analysis/fluency.test.ts
git commit -m "feat(analysis): filler counting with context rules"
```

### Task 6: `pacing()`

**Files:**
- Create: `lib/analysis/pacing.ts`, `lib/analysis/pacing.test.ts`

**Interfaces:**
- Consumes: `Word`, `Segment`, `Pause`, `PacingMetrics` (Task 2); `PACING` (Task 3); `wordsFromText` (Task 5)
- Produces: `pacing(segments: Segment[], words: Word[]): PacingMetrics`; `segmentsFromWords(words: Word[], joinGapSec?: number): Segment[]`

- [ ] **Step 1: Write the failing tests**

`lib/analysis/pacing.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pacing, segmentsFromWords } from './pacing.ts';
import { wordsFromText } from './fixtures.ts';

test('a mid-answer gap of 2.5 s or more is a long pause, with the words before it', () => {
  const words = wordsFromText('so the browser parses the html and paints', { pauses: { 3: 4 } });
  const m = pacing([], words);
  assert.equal(m.longPauses.length, 1);
  assert.equal(m.longPauses[0].before, 'so the browser');
  assert.ok(Math.abs(m.longPauses[0].duration - 4.08) < 0.01);
});

test('a gap just under the threshold is not a pause', () => {
  const words = wordsFromText('one two three four', { pauses: { 2: 2.3 } });
  assert.equal(pacing([], words).longPauses.length, 0);
});

test('up to 5 s of thinking time before the first word is free', () => {
  assert.equal(pacing([], wordsFromText('hello there friend', { start: 4 })).longPauses.length, 0);
  const late = pacing([], wordsFromText('hello there friend', { start: 6 }));
  assert.equal(late.longPauses.length, 1);
  assert.equal(late.longPauses[0].before, '');
  assert.equal(late.longPauses[0].duration, 6);
});

test('VAD segments take precedence over word timings', () => {
  const words = wordsFromText('a b c d e f');
  const m = pacing([{ start: 0, end: 1 }, { start: 4, end: 5 }], words);
  assert.equal(m.longPauses.length, 1);
  assert.equal(m.longPauses[0].duration, 3);
  assert.equal(m.answerSec, 5);
});

test('words per minute over the speaking span', () => {
  const m = pacing([], wordsFromText('word '.repeat(30)));
  assert.equal(m.wordsPerMinute, 151);
});

test('longest picks the biggest pause', () => {
  const m = pacing([], wordsFromText('a b c d e f', { pauses: { 2: 3, 4: 5 } }));
  assert.equal(m.longPauses.length, 2);
  assert.equal(m.longest?.before, 'b c d');
});

test('segmentsFromWords merges words closer than 0.3 s', () => {
  const s = segmentsFromWords(wordsFromText('a b c', { pauses: { 2: 1 } }));
  assert.equal(s.length, 2);
});

test('no speech gives empty metrics', () => {
  assert.deepEqual(pacing([], []), { answerSec: 0, wordsPerMinute: 0, longPauses: [], longest: null });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL, cannot find `./pacing.ts`.

- [ ] **Step 3: Implement `pacing()`**

`lib/analysis/pacing.ts`:

```ts
import { PACING } from './thresholds.ts';
import type { PacingMetrics, Pause, Segment, Word } from './types.ts';

/** Fallback when VAD returns nothing: merge words separated by less than `joinGapSec`. */
export function segmentsFromWords(words: Word[], joinGapSec = 0.3): Segment[] {
  const out: Segment[] = [];
  for (const w of words) {
    const last = out.at(-1);
    if (last && w.start - last.end < joinGapSec) last.end = w.end;
    else out.push({ start: w.start, end: w.end });
  }
  return out;
}

export function pacing(segments: Segment[], words: Word[]): PacingMetrics {
  const speech = segments.length > 0 ? segments : segmentsFromWords(words);
  if (speech.length === 0) return { answerSec: 0, wordsPerMinute: 0, longPauses: [], longest: null };

  const wordsBefore = (sec: number) =>
    words
      .filter((w) => w.end <= sec + 0.05)
      .slice(-3)
      .map((w) => w.text.trim().replace(/[.,!?;:]+$/, ''))
      .join(' ');

  const longPauses: Pause[] = [];
  const leadIn = speech[0].start;
  if (leadIn > PACING.thinkingSec) longPauses.push({ start: 0, end: leadIn, duration: leadIn, before: '' });
  for (let i = 1; i < speech.length; i++) {
    const gap = speech[i].start - speech[i - 1].end;
    if (gap >= PACING.longPauseSec) {
      longPauses.push({ start: speech[i - 1].end, end: speech[i].start, duration: gap, before: wordsBefore(speech[i - 1].end) });
    }
  }

  const span = speech.at(-1)!.end - speech[0].start;
  return {
    answerSec: speech.at(-1)!.end,
    wordsPerMinute: span > 0 ? Math.round(words.length / (span / 60)) : 0,
    longPauses,
    longest: longPauses.reduce<Pause | null>((a, p) => (!a || p.duration > a.duration ? p : a), null),
  };
}
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/analysis/pacing.ts lib/analysis/pacing.test.ts
git commit -m "feat(analysis): pause, rate and length metrics"
```

### Task 7: `content()`

**Files:**
- Create: `lib/analysis/content.ts`, `lib/analysis/content.test.ts`

**Interfaces:**
- Consumes: `Word`, `ContentMetrics`, `Embed` (Task 2); `CONTENT` (Task 3); `tokens` (Task 1); `wordsFromText` (Task 5)
- Produces: `splitRubric(hit: string): string[]`; `content(words: Word[], tips: { hit: string; avoid: string }, embed: Embed): Promise<ContentMetrics>`; `cosine(a: number[], b: number[]): number`

- [ ] **Step 1: Write the failing tests**

`lib/analysis/content.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { content, cosine, splitRubric } from './content.ts';
import { wordsFromText } from './fixtures.ts';
import type { Embed } from './types.ts';

// Embedding that never matches: forces the lexical path.
const noMatch: Embed = async (texts) => texts.map((_, i) => texts.map((__, j) => (i === j ? 1 : 0)));

test('splitRubric splits on commas, semicolons, colons and arrows, but not inside parentheses', () => {
  assert.deepEqual(
    splitRubric('DNS, TCP/TLS, HTTP, HTML parse, CSSOM, render tree, layout, paint, JS hydration.'),
    ['DNS', 'TCP/TLS', 'HTTP', 'HTML parse', 'CSSOM', 'render tree', 'layout', 'paint', 'JS hydration'],
  );
  assert.deepEqual(splitRubric('Dependency array, cleanup, "you might not need an effect" (derive state, event handlers).'), [
    'Dependency array',
    'cleanup',
    '"you might not need an effect" (derive state, event handlers)',
  ]);
  assert.deepEqual(splitRubric("They're public endpoints: validate input and authorise every call, revalidate after."), [
    "They're public endpoints",
    'validate input and authorise every call',
    'revalidate after',
  ]);
  assert.deepEqual(splitRubric('Present → past → why this job, in under two minutes.'), ['Present', 'past', 'why this job', 'in under two minutes']);
});

test('a point is covered when all its key words appear in the answer', async () => {
  const words = wordsFromText('First DNS resolves the name, then a TCP and TLS handshake, then HTTP.');
  const m = await content(words, { hit: 'DNS, TCP/TLS, HTTP, layout, paint.', avoid: 'Skipping steps.' }, noMatch);
  assert.equal(m.mode, 'rubric');
  assert.deepEqual(m.points.map((p) => p.covered), [true, true, true, false, false]);
  assert.equal(m.coverage, 3 / 5);
});

test('a point is covered when a transcript window is similar enough', async () => {
  // "render tree" shares a vector with the transcript window; the other two points do not.
  const embed: Embed = async (texts) => texts.map((t) => (t === 'cssom' || t === 'layout' ? [0, 1] : [1, 0]));
  const m = await content(wordsFromText('the browser combines the dom and styles'), { hit: 'render tree, cssom, layout', avoid: 'x' }, embed);
  assert.deepEqual(m.points.map((p) => p.covered), [true, false, false]);
});

test('an avoid match is reported', async () => {
  const embed: Embed = async (texts) => texts.map((t) => (t.includes('threaded') ? [1, 0] : [0, 1]));
  const m = await content(
    wordsFromText('javascript is multi threaded so it runs in parallel'),
    { hit: 'Call stack, task queue, microtask queue.', avoid: 'Saying JS is multi-threaded.' },
    embed,
  );
  assert.equal(m.avoidHit, 'Saying JS is multi-threaded');
});

test('fewer than 3 rubric points falls back to a STAR structure check', async () => {
  const words = wordsFromText('At my previous job we had a failing release. I decided to roll it back. As a result we recovered in an hour.');
  const m = await content(words, { hit: 'Ownership and learning.', avoid: 'Blaming others.' }, noMatch);
  assert.equal(m.mode, 'structure');
  assert.deepEqual(m.points.map((p) => p.covered), [true, true, true]);
});

test('cosine handles zero vectors', () => {
  assert.equal(cosine([0, 0], [1, 0]), 0);
  assert.equal(cosine([1, 0], [1, 0]), 1);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL, cannot find `./content.ts`.

- [ ] **Step 3: Implement `content()`**

`lib/analysis/content.ts`:

```ts
import { tokens } from './text.ts';
import { CONTENT } from './thresholds.ts';
import type { ContentMetrics, Embed, RubricPoint, Word } from './types.ts';

const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'with', 'at', 'by', 'from', 'your', 'you', 'how', 'what',
  'is', 'are', 'it', 'its', 'it\'s', 'be', 'that', 'this', 'each', 'every', 'vs',
]);

/** Splits a tips.hit sentence into rubric points: commas, semicolons, colons and arrows, ignoring separators in parentheses. */
export function splitRubric(hit: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of hit) {
    if (ch === '(') depth++;
    if (ch === ')') depth = Math.max(0, depth - 1);
    if (depth === 0 && (ch === ',' || ch === ';' || ch === ':' || ch === '→')) {
      parts.push(cur);
      cur = '';
    } else cur += ch;
  }
  parts.push(cur);
  return parts.map((p) => p.trim().replace(/\.+$/, '').trim()).filter((p) => p.length >= 2);
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

function windows(words: Word[]): string[] {
  const text = words.map((w) => w.text);
  if (text.length <= CONTENT.windowWords) return [text.join(' ')];
  const out: string[] = [];
  for (let i = 0; i < text.length; i += CONTENT.windowStep) {
    out.push(text.slice(i, i + CONTENT.windowWords).join(' '));
    if (i + CONTENT.windowWords >= text.length) break;
  }
  return out;
}

function lexicallyCovered(point: string, said: Set<string>): boolean {
  const key = tokens(point).filter((t) => !STOPWORDS.has(t));
  return key.length > 0 && key.every((t) => said.has(t));
}

const STAR = [
  { text: 'situation or task', cues: ['when i was', 'at my previous', 'at my last', 'we had', 'the situation', 'my role', 'i was responsible', 'the goal', 'our team'] },
  { text: 'action', cues: ['i decided', 'i did', 'so i', 'i built', 'i started', 'i spoke', 'i proposed', 'i worked', 'i set up', 'i led'] },
  { text: 'result', cues: ['as a result', 'the result', 'in the end', 'we ended up', 'which led', 'the outcome', 'i learned', 'improved', 'reduced', 'increased'] },
];

function structure(words: Word[]): ContentMetrics {
  const said = ` ${tokens(words.map((w) => w.text).join(' ')).join(' ')} `;
  const points: RubricPoint[] = STAR.map((p) => ({ text: p.text, covered: p.cues.some((c) => said.includes(` ${c} `)) }));
  return { mode: 'structure', points, coverage: points.filter((p) => p.covered).length / points.length, avoidHit: null };
}

export async function content(words: Word[], tips: { hit: string; avoid: string }, embed: Embed): Promise<ContentMetrics> {
  const pointTexts = splitRubric(tips.hit);
  if (pointTexts.length < CONTENT.minRubricPoints) return structure(words);

  const windowTexts = windows(words);
  const vectors = await embed([...pointTexts, tips.avoid, ...windowTexts]);
  const pointVecs = vectors.slice(0, pointTexts.length);
  const avoidVec = vectors[pointTexts.length];
  const windowVecs = vectors.slice(pointTexts.length + 1);
  const best = (v: number[]) => Math.max(0, ...windowVecs.map((w) => cosine(v, w)));

  const said = new Set(words.flatMap((w) => tokens(w.text)));
  const points = pointTexts.map((text, i) => ({
    text,
    covered: lexicallyCovered(text, said) || best(pointVecs[i]) >= CONTENT.coverSimilarity,
  }));
  return {
    mode: 'rubric',
    points,
    coverage: points.filter((p) => p.covered).length / points.length,
    avoidHit: best(avoidVec) >= CONTENT.avoidSimilarity ? tips.avoid.replace(/\.+$/, '') : null,
  };
}
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/analysis/content.ts lib/analysis/content.test.ts
git commit -m "feat(analysis): rubric coverage, avoid check and STAR fallback"
```

### Task 8: `rate()` and `analyseAnswer()`, wire the worker

**Files:**
- Create: `lib/analysis/rate.ts`, `lib/analysis/rate.test.ts`, `lib/analysis/analyse.ts`, `lib/analysis/analyse.test.ts`
- Modify: `workers/analysis.worker.ts`

**Interfaces:**
- Consumes: `fluency` (Task 5), `pacing` (Task 6), `content` (Task 7), thresholds (Task 3), `formatClock` (Task 1)
- Produces: `rateFluency(m: FluencyMetrics): Dimension`, `ratePacing(m: PacingMetrics): Dimension`, `rateContent(m: ContentMetrics): Dimension`; `analyseAnswer(input: { words: Word[]; segments: Segment[]; tips: { hit: string; avoid: string }; embed: Embed }): Promise<Result>`; `looksNonEnglish(words: Word[], segments: Segment[]): boolean`

- [ ] **Step 1: Write the failing rating tests**

`lib/analysis/rate.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rateContent, rateFluency, ratePacing } from './rate.ts';
import type { ContentMetrics, PacingMetrics } from './types.ts';

const fl = (perMinute: number, counts = [{ filler: 'like', count: 6 }, { filler: 'um', count: 4 }, { filler: 'basically', count: 3 }, { filler: 'uh', count: 1 }]) =>
  rateFluency({ counts, total: counts.reduce((s, c) => s + c.count, 0), perMinute, indexes: [] });

test('fluency boundaries: under 3 strong, 3–6 good, over 6 needs work', () => {
  assert.equal(fl(2.9).rating, 'strong');
  assert.equal(fl(3).rating, 'good');
  assert.equal(fl(6).rating, 'good');
  assert.equal(fl(6.1).rating, 'needs-work');
});

test('fluency names the top three fillers', () => {
  assert.equal(fl(8).lines[0], "you said 'like' 6 times, 'um' 4 times, 'basically' 3 times");
  assert.equal(fl(0, []).lines[0], 'no filler words detected');
  assert.equal(fl(1, [{ filler: 'um', count: 1 }]).lines[0], "you said 'um' 1 time");
});

const pace = (over: Partial<PacingMetrics>): PacingMetrics => ({ answerSec: 90, wordsPerMinute: 140, longPauses: [], longest: null, ...over });
const pause = (duration: number, before = 'so the browser') => ({ start: 10, end: 10 + duration, duration, before });

test('pacing: strong with at most one pause and normal rate and length', () => {
  assert.equal(ratePacing(pace({ longPauses: [pause(3)], longest: pause(3) })).rating, 'strong');
});

test('pacing: good with 2–3 pauses or one of rate/length off', () => {
  assert.equal(ratePacing(pace({ longPauses: [pause(3), pause(3)], longest: pause(3) })).rating, 'good');
  assert.equal(ratePacing(pace({ wordsPerMinute: 185 })).rating, 'good');
  assert.equal(ratePacing(pace({ answerSec: 20 })).rating, 'good');
});

test('pacing: needs work with 4+ pauses or both rate and length off', () => {
  const four = [pause(3), pause(3), pause(3), pause(4.2)];
  assert.equal(ratePacing(pace({ longPauses: four, longest: four[3] })).rating, 'needs-work');
  assert.equal(ratePacing(pace({ wordsPerMinute: 185, answerSec: 161 })).rating, 'needs-work');
});

test('pacing lines', () => {
  const four = [pause(3), pause(3), pause(3), pause(4.2)];
  assert.deepEqual(ratePacing(pace({ longPauses: four, longest: four[3], wordsPerMinute: 185, answerSec: 161 })).lines, [
    "longest pause 4.2s, after 'so the browser…'",
    '4 long pauses',
    '185 words/min, slightly fast',
    '2:41, consider tightening',
  ]);
  assert.deepEqual(ratePacing(pace({ longPauses: [pause(6, '')], longest: pause(6, ''), answerSec: 20, wordsPerMinute: 100 })).lines, [
    '6.0s before you started speaking',
    '100 words/min, slightly slow',
    '0:20, quite short for this question',
  ]);
  assert.deepEqual(ratePacing(pace({})).lines, ['steady pace, no long pauses']);
});

const cm = (covered: boolean[], over: Partial<ContentMetrics> = {}): ContentMetrics => ({
  mode: 'rubric',
  points: covered.map((c, i) => ({ text: ['DNS', 'TCP/TLS', 'HTTP', 'HTML parse', 'CSSOM', 'layout', 'paint'][i], covered: c })),
  coverage: covered.filter(Boolean).length / covered.length,
  avoidHit: null,
  ...over,
});

test('content boundaries: 70% strong, 40% good', () => {
  assert.equal(rateContent(cm([true, true, true, true, true, true, false])).rating, 'strong'); // 86%
  assert.equal(rateContent(cm([true, true, false, false, false])).rating, 'good'); // 40%
  assert.equal(rateContent(cm([true, false, false, false, false, false, false])).rating, 'needs-work');
});

test('content lists missed points and downgrades on an avoid match', () => {
  const m = cm([true, true, true, true, true, false, false], { avoidHit: 'Saying JS is multi-threaded' });
  const d = rateContent(m);
  assert.equal(d.rating, 'good');
  assert.deepEqual(d.lines, ["covered 5 of 7 points; missed: layout, paint", "⚠ sounded like: 'Saying JS is multi-threaded'"]);
});

test('structure mode names the missing STAR parts', () => {
  const d = rateContent({
    mode: 'structure',
    points: [{ text: 'situation or task', covered: true }, { text: 'action', covered: true }, { text: 'result', covered: false }],
    coverage: 2 / 3,
    avoidHit: null,
  });
  assert.equal(d.rating, 'good');
  assert.deepEqual(d.lines, ['covered 2 of 3 parts of a STAR answer', 'no clear result']);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL, cannot find `./rate.ts`.

- [ ] **Step 3: Implement `rate.ts`**

`lib/analysis/rate.ts`:

```ts
import { formatClock } from './text.ts';
import { CONTENT, FLUENCY, PACING } from './thresholds.ts';
import type { ContentMetrics, Dimension, FluencyMetrics, PacingMetrics, Rating } from './types.ts';

const downgrade = (r: Rating): Rating => (r === 'strong' ? 'good' : 'needs-work');

export function rateFluency(m: FluencyMetrics): Dimension {
  const rating: Rating = m.perMinute < FLUENCY.strongBelow ? 'strong' : m.perMinute <= FLUENCY.goodUpTo ? 'good' : 'needs-work';
  if (m.counts.length === 0) return { rating, lines: ['no filler words detected'] };
  const top = m.counts.slice(0, 3).map((c) => `'${c.filler}' ${c.count} ${c.count === 1 ? 'time' : 'times'}`);
  return { rating, lines: [`you said ${top.join(', ')}`] };
}

export function ratePacing(m: PacingMetrics): Dimension {
  const pauses = m.longPauses.length;
  const rateOff = m.wordsPerMinute < PACING.minWpm || m.wordsPerMinute > PACING.maxWpm;
  const lengthOff = m.answerSec < PACING.minAnswerSec || m.answerSec > PACING.maxAnswerSec;
  const rating: Rating =
    pauses <= 1 && !rateOff && !lengthOff ? 'strong' : pauses > PACING.goodMaxPauses || (rateOff && lengthOff) ? 'needs-work' : 'good';

  const lines: string[] = [];
  if (m.longest) {
    const secs = `${m.longest.duration.toFixed(1)}s`;
    lines.push(m.longest.before ? `longest pause ${secs}, after '${m.longest.before}…'` : `${secs} before you started speaking`);
  }
  if (pauses >= 2) lines.push(`${pauses} long pauses`);
  if (m.wordsPerMinute > PACING.maxWpm) lines.push(`${m.wordsPerMinute} words/min, slightly fast`);
  if (m.wordsPerMinute < PACING.minWpm) lines.push(`${m.wordsPerMinute} words/min, slightly slow`);
  if (m.answerSec < PACING.minAnswerSec) lines.push(`${formatClock(m.answerSec)}, quite short for this question`);
  if (m.answerSec > PACING.maxAnswerSec) lines.push(`${formatClock(m.answerSec)}, consider tightening`);
  if (lines.length === 0) lines.push('steady pace, no long pauses');
  return { rating, lines };
}

export function rateContent(m: ContentMetrics): Dimension {
  let rating: Rating = m.coverage >= CONTENT.strongFrom ? 'strong' : m.coverage >= CONTENT.goodFrom ? 'good' : 'needs-work';
  const covered = m.points.filter((p) => p.covered).length;
  const missed = m.points.filter((p) => !p.covered).map((p) => p.text);

  if (m.mode === 'structure') {
    return { rating, lines: [`covered ${covered} of 3 parts of a STAR answer`, ...missed.map((p) => `no clear ${p}`)] };
  }
  const lines = [`covered ${covered} of ${m.points.length} points${missed.length ? `; missed: ${missed.join(', ')}` : ''}`];
  if (m.avoidHit) {
    rating = downgrade(rating);
    lines.push(`⚠ sounded like: '${m.avoidHit}'`);
  }
  return { rating, lines };
}
```

- [ ] **Step 4: Run the rating tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Write the failing orchestration tests**

`lib/analysis/analyse.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyseAnswer, looksNonEnglish } from './analyse.ts';
import { wordsFromText } from './fixtures.ts';

const embed = async (texts: string[]) => texts.map(() => [1, 0]);
const tips = { hit: 'Call stack, task queue, microtask queue drains first.', avoid: 'Saying JS is multi-threaded.' };

test('fewer than 15 words is not graded', async () => {
  const r = await analyseAnswer({ words: wordsFromText('um I am not sure'), segments: [], tips, embed });
  assert.equal(r.graded, false);
});

test('a full answer returns three dimensions plus highlights', async () => {
  const words = wordsFromText(
    'um so the call stack runs code and the task queue holds callbacks while the microtask queue drains first after each task like always',
  );
  const r = await analyseAnswer({ words, segments: [], tips, embed });
  assert.equal(r.graded, true);
  if (!r.graded) return;
  assert.ok(['strong', 'good', 'needs-work'].includes(r.content.rating));
  assert.ok(r.fillerIndexes.includes(0));
  assert.equal(r.englishWarning, false);
});

test('sparse words over long speech looks non-English', () => {
  assert.equal(looksNonEnglish(wordsFromText('the a of'), [{ start: 0, end: 30 }]), true);
  assert.equal(looksNonEnglish(wordsFromText('word '.repeat(60)), [{ start: 0, end: 30 }]), false);
  assert.equal(looksNonEnglish(wordsFromText('the a of'), [{ start: 0, end: 10 }]), false);
});
```

- [ ] **Step 6: Implement `analyse.ts`**

`lib/analysis/analyse.ts`:

```ts
import { content } from './content.ts';
import { fluency } from './fluency.ts';
import { pacing } from './pacing.ts';
import { rateContent, rateFluency, ratePacing } from './rate.ts';
import { ENGLISH, MIN_WORDS } from './thresholds.ts';
import type { Embed, Result, Segment, Word } from './types.ts';

/** base.en emits few words for long non-English speech; flag it rather than grade nonsense silently. */
export function looksNonEnglish(words: Word[], segments: Segment[]): boolean {
  const speechSec = segments.reduce((s, seg) => s + (seg.end - seg.start), 0);
  return speechSec >= ENGLISH.minSpeechSec && words.length / speechSec < ENGLISH.minWordsPerSpeechSec;
}

export async function analyseAnswer(input: {
  words: Word[];
  segments: Segment[];
  tips: { hit: string; avoid: string };
  embed: Embed;
}): Promise<Result> {
  const { words, segments, tips, embed } = input;
  if (words.length < MIN_WORDS) return { graded: false, reason: 'too-short', words };
  const f = fluency(words);
  const p = pacing(segments, words);
  const c = await content(words, tips, embed);
  return {
    graded: true,
    content: rateContent(c),
    fluency: rateFluency(f),
    pacing: ratePacing(p),
    words,
    fillerIndexes: f.indexes,
    longPauses: p.longPauses,
    englishWarning: looksNonEnglish(words, segments),
  };
}
```

- [ ] **Step 7: Wire `analyse` in the worker**

In `workers/analysis.worker.ts`, add the import and replace the three lines after `// Wired up in Task 8.`:

```ts
import { analyseAnswer } from '../lib/analysis/analyse.ts';
```

```ts
    post({ type: 'step', id, step: 'transcribing' });
    const words = await transcribe(data.audio, USE_FILLER_PROMPT);
    post({ type: 'step', id, step: 'pauses' });
    const segments = await detectSpeech(data.audio);
    post({ type: 'step', id, step: 'content' });
    const result = await analyseAnswer({ words, segments, tips: data.tips, embed });
    post({ type: 'analysed', id, result });
```

- [ ] **Step 8: Run tests and typecheck**

Run: `npm test && npm run typecheck`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add lib/analysis/rate.ts lib/analysis/rate.test.ts lib/analysis/analyse.ts lib/analysis/analyse.test.ts workers/analysis.worker.ts
git commit -m "feat(analysis): ratings, breakdown lines and analyse pipeline in the worker"
```

### Task 9: Golden set

**Files:**
- Create: `lib/analysis/golden.ts`, `scripts/golden.ts`

**Interfaces:**
- Consumes: `analyseAnswer` (Task 8), `wordsFromText` (Task 5), `seedContent` (`lib/content/seed.ts`), `MODELS.embed` (Task 1)
- Produces: `goldenAnswers: { questionId: string; kind: 'strong' | 'partial' | 'off-topic'; text: string }[]`; `npm run test:golden` (exit 1 on a hard failure)

- [ ] **Step 1: Write the golden answers**

`lib/analysis/golden.ts`:

```ts
/** 10 seed questions × 3 answers. Expected Content: strong → Strong, partial → Good, off-topic → Needs work. */
export type GoldenAnswer = { questionId: string; kind: 'strong' | 'partial' | 'off-topic'; text: string };

export const goldenAnswers: GoldenAnswer[] = [
  { questionId: 'FE-01', kind: 'strong', text: 'JavaScript runs on a single call stack. When the stack is empty the event loop takes work from the queues. Callbacks like setTimeout go to the task queue, while promise callbacks go to the microtask queue, and the microtask queue drains first after each task. For example, if I log one, schedule a setTimeout that logs two, and resolve a promise that logs three, the order is one, three, two.' },
  { questionId: 'FE-01', kind: 'partial', text: 'The event loop is how JavaScript handles async code. There is a call stack where functions run, and when something async finishes its callback waits in a queue until the stack is clear, then the event loop pushes it onto the stack.' },
  { questionId: 'FE-01', kind: 'off-topic', text: 'I would start by gathering requirements from the product team, then set up a design system with reusable buttons and forms, and make sure the colours and spacing are consistent across every page of the app.' },

  { questionId: 'FE-03', kind: 'strong', text: 'First the browser resolves the domain with DNS to get an IP address. It opens a TCP connection and does the TLS handshake for HTTPS, then sends an HTTP request. When the HTML arrives the browser parses it into the DOM and parses the CSS into the CSSOM. Together they form the render tree, then the browser does layout to work out positions and paint to draw pixels. Finally JavaScript loads and hydration makes the page interactive.' },
  { questionId: 'FE-03', kind: 'partial', text: 'The browser looks up the domain using DNS, connects to the server and sends an HTTP request. The server returns HTML, and the browser parses the HTML and shows the page to the user once it has downloaded the scripts.' },
  { questionId: 'FE-03', kind: 'off-topic', text: 'My favourite project was a mobile app for booking gym classes. I worked with two other developers, we used weekly sprints, and I learned a lot about working with designers and getting feedback from real users.' },

  { questionId: 'FE-06', kind: 'strong', text: 'I start with semantic HTML, like a real button to open it, and only add ARIA roles where native elements fall short, such as role dialog with aria modal. For a modal I trap focus inside while it is open and return focus to the trigger when it closes. I make sure there is full keyboard support, Escape to close and arrow keys in a dropdown, and I test it with a screen reader like VoiceOver.' },
  { questionId: 'FE-06', kind: 'partial', text: 'I would add ARIA attributes like aria label and aria expanded so screen readers know what it is, and make sure the dropdown can be opened with the keyboard as well as the mouse.' },
  { questionId: 'FE-06', kind: 'off-topic', text: 'For performance I would lazy load images, split the bundle by route, and cache API responses so the page loads faster on slow networks.' },

  { questionId: 'RE-03', kind: 'strong', text: 'useEffect synchronises a component with something outside React. The dependency array decides when it re-runs, so every value it reads should be listed. It can return a cleanup function, for example to unsubscribe or abort a fetch. A common mistake is using an effect when you might not need an effect at all: you can derive state during render, or put the logic in an event handler instead.' },
  { questionId: 'RE-03', kind: 'partial', text: 'useEffect runs after the component renders. You pass a dependency array so it only runs when those values change, and a common mistake is leaving values out of the array, which causes stale data in the component.' },
  { questionId: 'RE-03', kind: 'off-topic', text: 'Redux is a state management library with a single store, actions and reducers. I like Redux Toolkit because it removes a lot of the boilerplate and makes the store easier to set up.' },

  { questionId: 'NX-04', kind: 'strong', text: 'Server Actions are functions that run on the server and can be called directly from forms or client components. The big risk is that they are public endpoints, so anyone can call them with any payload. I validate input with a schema and authorise every call by checking the session and permissions inside the action. After a mutation I revalidate the affected paths or tags so the UI shows fresh data.' },
  { questionId: 'NX-04', kind: 'partial', text: 'Server Actions let you run server code from a form without writing an API route. They are convenient for mutations, but you have to be careful about security because they run on the server and can be called.' },
  { questionId: 'NX-04', kind: 'off-topic', text: 'I usually deploy my projects to Vercel and connect the GitHub repository so every pull request gets a preview deployment that the team can review before merging.' },

  { questionId: 'BE-02', kind: 'strong', text: 'An index is a separate data structure, usually a B-tree, that lets the database look up rows quickly instead of doing a full table scan. With a composite index the column order matters, because it can only be used from the leftmost column. Indexes can hurt because every insert and update must also update the index, so writes get slower, and they take extra storage.' },
  { questionId: 'BE-02', kind: 'partial', text: 'An index makes queries faster, a bit like the index at the back of a book, so the database does not have to scan every row to find what you want, and it uses a tree structure.' },
  { questionId: 'BE-02', kind: 'off-topic', text: 'I prefer working in small teams where everyone reviews each other\'s code and we have a clear definition of done for every ticket before it moves to testing.' },

  { questionId: 'BE-04', kind: 'strong', text: 'I would require a client-supplied idempotency key on every payment request. The server stores the key together with the result of the first attempt. If the same key arrives again, it returns the stored result instead of charging twice. To handle concurrent duplicates, I insert the key with a unique constraint before processing, so a second request arriving at the same time is rejected or waits.' },
  { questionId: 'BE-04', kind: 'partial', text: 'I would give each request an idempotency key so that if the client retries we can check whether the payment already happened and avoid charging the customer twice.' },
  { questionId: 'BE-04', kind: 'off-topic', text: 'I would choose PostgreSQL for most projects because it is reliable, supports JSON columns and has a great ecosystem of tools and hosting options.' },

  { questionId: 'ND-01', kind: 'strong', text: 'Node runs all your JavaScript on one thread, so if a request does heavy CPU work, like hashing or parsing a huge file, it stalls every other request waiting on that thread. To avoid it I keep I/O asynchronous, move CPU-heavy work to worker threads, or push it onto a job queue that a separate worker process handles.' },
  { questionId: 'ND-01', kind: 'partial', text: 'Blocking the event loop is bad because Node runs JavaScript on one thread, so the server becomes slow and unresponsive for other users while it is busy.' },
  { questionId: 'ND-01', kind: 'off-topic', text: 'TypeScript adds static types to JavaScript, which catches bugs earlier and makes refactoring large codebases much safer for the whole team.' },

  { questionId: 'FS-02', kind: 'strong', text: 'I would compare session cookies with tokens. For a web app I prefer an HttpOnly session cookie with SameSite set, so JavaScript cannot read it, and I add CSRF protection for state-changing requests. If the API needs tokens, I use short-lived access tokens with a token refresh flow. Either way the API authorises on the server every time, checking permissions on each request rather than trusting the client.' },
  { questionId: 'FS-02', kind: 'partial', text: 'I would use tokens. The user logs in, the server returns a token, the frontend sends it on every request, and when it expires we do a token refresh to get a new one.' },
  { questionId: 'FS-02', kind: 'off-topic', text: 'For styling I like Tailwind because utility classes keep the CSS close to the markup and the design stays consistent across components.' },

  { questionId: 'VA-02', kind: 'strong', text: 'You project the company\'s unlevered free cash flow, the unlevered FCF, for around five years. Then you calculate a terminal value using either a perpetuity growth rate or an exit multiple. You discount the cash flows and terminal value back at the WACC, and sum them to get enterprise value, the EV. Finally you bridge from enterprise value to equity value by subtracting net debt.' },
  { questionId: 'VA-02', kind: 'partial', text: 'A DCF values a company based on its future cash flows. You forecast the free cash flows, add a terminal value, and discount them back to today to get the value of the business.' },
  { questionId: 'VA-02', kind: 'off-topic', text: 'I am interested in this bank because of its culture and its strong presence in the technology sector, and I enjoyed meeting the team at the careers fair last month.' },
];
```

- [ ] **Step 2: Write the golden runner**

`scripts/golden.ts`:

```ts
/**
 * Runs the golden answers through analyseAnswer with the real MiniLM model (downloaded on first run).
 *   npm run test:golden
 * Fails on a hard error: a strong answer rated Needs work, or an off-topic answer rated Strong.
 */
import { pipeline, type FeatureExtractionPipeline } from '@huggingface/transformers';
import { analyseAnswer } from '../lib/analysis/analyse.ts';
import { wordsFromText } from '../lib/analysis/fixtures.ts';
import { goldenAnswers } from '../lib/analysis/golden.ts';
import { seedContent } from '../lib/content/seed.ts';
import { ACTIVE_PROFILE, MODELS, dtypesFor } from '../lib/speech/models.ts';

const expected = { strong: 'strong', partial: 'good', 'off-topic': 'needs-work' } as const;

// Same quantisation the app ships with (Node runs the WASM/CPU build).
const extractor = (await pipeline('feature-extraction', MODELS.embed, {
  dtype: dtypesFor(ACTIVE_PROFILE, 'wasm', false).embed,
})) as FeatureExtractionPipeline;
const embed = async (texts: string[]) => (await extractor(texts, { pooling: 'mean', normalize: true })).tolist() as number[][];

let agree = 0;
const hard: string[] = [];
for (const g of goldenAnswers) {
  const q = seedContent.questions.find((x) => x.id === g.questionId);
  if (!q) throw new Error(`Unknown question ${g.questionId}`);
  const r = await analyseAnswer({ words: wordsFromText(g.text), segments: [], tips: q.tips, embed });
  const rating = r.graded ? r.content.rating : 'not-graded';
  if (rating === expected[g.kind]) agree++;
  if ((g.kind === 'strong' && rating === 'needs-work') || (g.kind === 'off-topic' && rating === 'strong')) {
    hard.push(`${g.questionId} ${g.kind} → ${rating}`);
  }
  console.log(`${g.questionId.padEnd(6)} ${g.kind.padEnd(9)} → ${rating.padEnd(10)} ${r.graded ? r.content.lines.join(' | ') : ''}`);
}

console.log(`\nAgreement with expected ratings: ${agree}/${goldenAnswers.length} (${Math.round((100 * agree) / goldenAnswers.length)}%)`);
if (hard.length) {
  console.error(`Hard failures:\n  ${hard.join('\n  ')}`);
  process.exit(1);
}
```

- [ ] **Step 3: Run the golden set**

Run: `npm run test:golden`
Expected: one line per answer, an agreement percentage, and exit code 0. If there are hard failures, adjust `CONTENT.coverSimilarity` / `CONTENT.avoidSimilarity` in `thresholds.ts` (not the answers) until there are none, re-running `npm test` after each change. Record the final agreement percentage in the commit message.

- [ ] **Step 4: Commit**

```bash
git add lib/analysis/golden.ts scripts/golden.ts lib/analysis/thresholds.ts
git commit -m "test(analysis): golden set with real embeddings (agreement N%)"
```

### Task 10: Session reducer

**Files:**
- Create: `lib/speech/session.ts`, `lib/speech/session.test.ts`

**Interfaces:**
- Consumes: `Result` (Task 2), `AnalysisStep` (Task 2), `RECORDING` (Task 3)
- Produces: `SessionState`, `SessionEvent`, `SetupError = 'load-failed' | 'storage-full' | 'mic-denied' | 'no-device'`, `initialSession(modelsLoaded: boolean): SessionState`, `sessionReducer(s: SessionState, e: SessionEvent): SessionState`

- [ ] **Step 1: Write the failing tests**

`lib/speech/session.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialSession, sessionReducer as r, type SessionState } from './session.ts';

const result = { graded: false as const, reason: 'too-short' as const, words: [] };

test('starts in setup unless models are already loaded', () => {
  assert.equal(initialSession(false).step, 'setup');
  assert.equal(initialSession(true).step, 'ready');
});

test('setup tracks progress and errors, and retry clears them', () => {
  let s = r(initialSession(false), { type: 'download-progress', loaded: 5, total: 10 });
  assert.deepEqual(s, { step: 'setup', progress: { loaded: 5, total: 10 }, error: null });
  s = r(s, { type: 'setup-failed', error: 'storage-full' });
  assert.equal(s.step === 'setup' && s.error, 'storage-full');
  s = r(s, { type: 'retry-setup' });
  assert.deepEqual(s, { step: 'setup', progress: null, error: null });
  assert.equal(r(s, { type: 'ready' }).step, 'ready');
});

test('start counts in from 3, then records', () => {
  let s: SessionState = r({ step: 'ready' }, { type: 'start' });
  assert.deepEqual(s, { step: 'count-in', remaining: 3 });
  s = r(r(r(s, { type: 'tick' }), { type: 'tick' }), { type: 'tick' });
  assert.deepEqual(s, { step: 'recording' });
});

test('stopping records analyses, steps advance, results arrive', () => {
  let s = r({ step: 'recording' }, { type: 'recording-stopped' });
  assert.deepEqual(s, { step: 'analysing', stage: 'transcribing' });
  s = r(s, { type: 'stage', stage: 'content' });
  assert.deepEqual(s, { step: 'analysing', stage: 'content' });
  assert.deepEqual(r(s, { type: 'analysed', result }), { step: 'results', result });
  assert.deepEqual(r(s, { type: 'analysis-failed' }), { step: 'failed', reason: 'analysis' });
});

test('a lost mic offers analyse-what-we-have or discard', () => {
  const s = r({ step: 'recording' }, { type: 'mic-lost' });
  assert.deepEqual(s, { step: 'interrupted' });
  assert.equal(r(s, { type: 'recording-stopped' }).step, 'analysing');
  assert.equal(r(s, { type: 'try-again' }).step, 'ready');
});

test('a mic that fails to start while recording ends in a mic failure', () => {
  assert.deepEqual(r({ step: 'recording' }, { type: 'mic-failed' }), { step: 'failed', reason: 'mic' });
});

test('try again returns to ready from results and failure', () => {
  assert.equal(r({ step: 'results', result }, { type: 'try-again' }).step, 'ready');
  assert.equal(r({ step: 'failed', reason: 'analysis' }, { type: 'try-again' }).step, 'ready');
});

test('events that do not apply leave the state unchanged', () => {
  const s: SessionState = { step: 'ready' };
  assert.equal(r(s, { type: 'tick' }), s);
  assert.equal(r(s, { type: 'analysed', result }), s);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL, cannot find `./session.ts`.

- [ ] **Step 3: Implement the reducer**

`lib/speech/session.ts`:

```ts
import { RECORDING } from '../analysis/thresholds.ts';
import type { Result } from '../analysis/types.ts';
import type { AnalysisStep } from './protocol.ts';

export type SetupError = 'load-failed' | 'storage-full' | 'mic-denied' | 'no-device';

export type SessionState =
  | { step: 'setup'; progress: { loaded: number; total: number } | null; error: SetupError | null }
  | { step: 'ready' }
  | { step: 'count-in'; remaining: number }
  | { step: 'recording' }
  | { step: 'interrupted' }
  | { step: 'analysing'; stage: AnalysisStep }
  | { step: 'results'; result: Result }
  | { step: 'failed'; reason: 'analysis' | 'mic' };

export type SessionEvent =
  | { type: 'download-progress'; loaded: number; total: number }
  | { type: 'setup-failed'; error: SetupError }
  | { type: 'retry-setup' }
  | { type: 'ready' }
  | { type: 'start' }
  | { type: 'tick' }
  | { type: 'recording-stopped' }
  | { type: 'mic-lost' }
  | { type: 'mic-failed' }
  | { type: 'stage'; stage: AnalysisStep }
  | { type: 'analysed'; result: Result }
  | { type: 'analysis-failed' }
  | { type: 'try-again' };

export function initialSession(modelsLoaded: boolean): SessionState {
  return modelsLoaded ? { step: 'ready' } : { step: 'setup', progress: null, error: null };
}

export function sessionReducer(s: SessionState, e: SessionEvent): SessionState {
  switch (s.step) {
    case 'setup':
      if (e.type === 'download-progress') return { ...s, progress: { loaded: e.loaded, total: e.total }, error: null };
      if (e.type === 'setup-failed') return { ...s, error: e.error };
      if (e.type === 'retry-setup') return { step: 'setup', progress: null, error: null };
      if (e.type === 'ready') return { step: 'ready' };
      return s;
    case 'ready':
      return e.type === 'start' ? { step: 'count-in', remaining: RECORDING.countInSec } : s;
    case 'count-in':
      if (e.type !== 'tick') return s;
      return s.remaining <= 1 ? { step: 'recording' } : { step: 'count-in', remaining: s.remaining - 1 };
    case 'recording':
      if (e.type === 'recording-stopped') return { step: 'analysing', stage: 'transcribing' };
      if (e.type === 'mic-lost') return { step: 'interrupted' };
      if (e.type === 'mic-failed') return { step: 'failed', reason: 'mic' };
      return s;
    case 'interrupted':
      if (e.type === 'recording-stopped') return { step: 'analysing', stage: 'transcribing' };
      if (e.type === 'try-again') return { step: 'ready' };
      return s;
    case 'analysing':
      if (e.type === 'stage') return { step: 'analysing', stage: e.stage };
      if (e.type === 'analysed') return { step: 'results', result: e.result };
      if (e.type === 'analysis-failed') return { step: 'failed', reason: 'analysis' };
      return s;
    case 'results':
    case 'failed':
      return e.type === 'try-again' ? { step: 'ready' } : s;
  }
}
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/speech/session.ts lib/speech/session.test.ts
git commit -m "feat(speech): overlay session state machine"
```

### Task 11: Setup and record steps

**Files:**
- Create: `lib/speech/support.ts`, `components/analysis/SetupStep.tsx`, `components/analysis/RecordStep.tsx`

**Interfaces:**
- Consumes: `SessionState`, `SetupError` (Task 10); `micHelp` (Task 3); `APPROX_DOWNLOAD_MB` (Task 1); `formatClock` (Task 1); `RECORDING` (Task 3)
- Produces: `supportsAnalysis(): boolean`, `isLikelyPhone(): boolean`; `<SetupStep cached webgpu phone state onBegin onCancel onRetry />`; `<RecordStep state elapsed levels flat onStart onStop />`

- [ ] **Step 1: Write the support checks**

`lib/speech/support.ts`:

```ts
/** The "Analyse my answer" button only appears when all of these exist. */
export function supportsAnalysis(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof WebAssembly === 'object' &&
    typeof Worker !== 'undefined' &&
    typeof MediaRecorder !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia
  );
}

export function isLikelyPhone(): boolean {
  return matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 768;
}
```

- [ ] **Step 2: Write the setup step**

`components/analysis/SetupStep.tsx`:

```tsx
'use client';

import type { SessionState, SetupError } from '@/lib/speech/session';
import { micHelp } from '@/lib/speech/mic';
import { APPROX_DOWNLOAD_MB } from '@/lib/speech/models';

type Props = {
  state: Extract<SessionState, { step: 'setup' }>;
  cached: boolean | null; // null while checking
  webgpu: boolean | null;
  phone: boolean;
  startedAt: number | null; // performance.now() when the download began
  onBegin: () => void;
  onCancel: () => void;
  onRetry: () => void;
};

const errorText: Record<SetupError, string> = {
  'load-failed': "Your device couldn't load the analysis model",
  'storage-full': `Not enough space to store the analysis model (~${APPROX_DOWNLOAD_MB} MB)`,
  'mic-denied': 'Microphone access is blocked.',
  'no-device': "We can't find a microphone. Plug one in and try again.",
};

const mb = (bytes: number) => (bytes / 1024 / 1024).toFixed(0);

export function SetupStep({ state, cached, webgpu, phone, startedAt, onBegin, onCancel, onRetry }: Props) {
  if (state.error) {
    return (
      <div className="text-center">
        <p className="font-display text-2xl font-bold">{errorText[state.error]}</p>
        {state.error === 'mic-denied' && <p className="mt-3 text-ink-soft">{micHelp()}</p>}
        <button type="button" onClick={onRetry} className="card-surface mt-6 rounded-full! bg-[var(--industry)] px-6 py-3 font-bold text-white">
          Retry
        </button>
      </div>
    );
  }

  if (state.progress) {
    const { loaded, total } = state.progress;
    const pct = total ? Math.min(100, (loaded / total) * 100) : 0;
    const elapsed = startedAt ? (performance.now() - startedAt) / 1000 : 0;
    const rate = elapsed > 1 ? loaded / elapsed : 0;
    const left = rate && total > loaded ? Math.ceil((total - loaded) / rate) : null;
    return (
      <div className="mx-auto w-full max-w-md text-center">
        <p className="font-display text-2xl font-bold">Downloading the analysis model</p>
        <div className="mt-5 h-4 overflow-hidden rounded-full border-2 border-ink bg-white" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full bg-[var(--industry)] transition-[width]" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-2 text-sm text-ink-soft">
          {mb(loaded)} of {total ? mb(total) : '…'} MB{left !== null ? ` · about ${left}s left` : ''}
        </p>
        <button type="button" onClick={onCancel} className="mt-5 rounded-full border-2 border-ink bg-white px-5 py-2 font-bold">
          Cancel
        </button>
      </div>
    );
  }

  if (cached === null || cached) {
    return <p className="text-center font-display text-2xl font-bold">Loading the analysis model…</p>;
  }

  return (
    <div className="mx-auto max-w-md text-center">
      <p className="font-display text-2xl font-bold">Grading runs on your device. Nothing is uploaded.</p>
      <p className="mt-3 text-ink-soft">We&apos;ll download about {APPROX_DOWNLOAD_MB} MB once.</p>
      {webgpu === false && <p className="mt-3 text-ink-soft">Analysis may take up to a minute on this device.</p>}
      {phone && <p className="mt-3 text-ink-soft">Works best on a laptop.</p>}
      <button type="button" onClick={onBegin} className="card-surface mt-6 rounded-full! bg-[var(--industry)] px-6 py-3 font-display text-lg font-extrabold text-white">
        Download and continue
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Write the record step**

`components/analysis/RecordStep.tsx`:

```tsx
'use client';

import { formatClock } from '@/lib/analysis/text';
import { RECORDING } from '@/lib/analysis/thresholds';

type Props = {
  step: 'ready' | 'count-in' | 'recording';
  remaining: number; // count-in seconds
  elapsed: number;
  levels: number[];
  flat: boolean;
  onStart: () => void;
  onStop: () => void;
};

export function RecordStep({ step, remaining, elapsed, levels, flat, onStart, onStop }: Props) {
  if (step === 'ready') {
    return (
      <button type="button" onClick={onStart} className="card-surface mx-auto block rounded-full! bg-[var(--industry)] px-10 py-5 font-display text-2xl font-extrabold text-white">
        Start recording
      </button>
    );
  }

  if (step === 'count-in') {
    return (
      <p className="text-center font-display text-8xl font-extrabold" aria-hidden="true">
        {remaining}
      </p>
    );
  }

  return (
    <div className="text-center">
      <div className="mx-auto flex h-24 max-w-md items-center justify-center gap-1" aria-hidden="true">
        {levels.map((l, i) => (
          <span key={i} className="w-1.5 rounded-full bg-[var(--industry)]" style={{ height: `${Math.max(6, Math.min(96, l * 600))}px` }} />
        ))}
      </div>
      <p className="mt-4 font-display text-2xl font-bold">{formatClock(Math.ceil(RECORDING.maxSec - elapsed))} left</p>
      {flat && <p className="mt-2 font-bold text-coral">We can&apos;t hear you. Check your microphone</p>}
      <button type="button" onClick={onStop} className="mt-6 rounded-full border-2 border-ink bg-white px-8 py-3 font-display text-lg font-extrabold">
        Stop
      </button>
      <p className="mt-2 text-sm text-ink-soft">Press Space to stop.</p>
    </div>
  );
}
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/speech/support.ts components/analysis/SetupStep.tsx components/analysis/RecordStep.tsx
git commit -m "feat(ui): setup and recording steps for the analysis overlay"
```

### Task 12: Results step and transcript

**Files:**
- Create: `components/analysis/Transcript.tsx`, `components/analysis/ResultsStep.tsx`

**Interfaces:**
- Consumes: `Result`, `Dimension`, `Rating`, `Pause`, `Word` (Task 2), `Hesitation` and `GradedResult.hesitations` (Task 16); `TipsPanel` (`components/TipsPanel.tsx`); `Question` (`lib/content/schema.ts`)
- Produces: `<Transcript words fillerIndexes longPauses hesitations />`; `<ResultsStep result question audioUrl deckDone onTryAgain onNewQuestion onBack />`

- [ ] **Step 1: Write the transcript**

`components/analysis/Transcript.tsx`:

```tsx
import type { Hesitation, Pause, Word } from '@/lib/analysis/types';

type Props = { words: Word[]; fillerIndexes: number[]; longPauses: Pause[]; hesitations: Hesitation[] };

/** The answer as said, with fillers marked and long pauses and hesitations shown where they fell. */
export function Transcript({ words, fillerIndexes, longPauses, hesitations }: Props) {
  const fillers = new Set(fillerIndexes);
  const heldAfter = new Map(hesitations.map((h) => [h.afterIndex, h]));
  // A pause sits before the first word that starts after it ends.
  const pauseBefore = new Map<number, Pause>();
  for (const p of longPauses) {
    const i = words.findIndex((w) => w.start >= p.end - 0.05);
    if (i >= 0) pauseBefore.set(i, p);
  }
  return (
    <p className="leading-loose">
      {words.map((w, i) => (
        <span key={i}>
          {pauseBefore.has(i) && (
            <span className="mx-1 rounded-full bg-sky/30 px-2 py-0.5 text-sm font-bold">⏸ {pauseBefore.get(i)!.duration.toFixed(1)}s</span>
          )}
          {fillers.has(i) ? <mark className="rounded bg-sun px-0.5">{w.text}</mark> : w.text}{' '}
          {heldAfter.has(i) && (
            <span className="mr-1 rounded-full bg-sun/40 px-2 py-0.5 text-sm font-bold">… {heldAfter.get(i)!.duration.toFixed(1)}s </span>
          )}
        </span>
      ))}
    </p>
  );
}
```

- [ ] **Step 2: Write the results step**

`components/analysis/ResultsStep.tsx`:

```tsx
'use client';

import type { Question } from '@/lib/content/schema';
import type { Dimension, Rating, Result } from '@/lib/analysis/types';
import { TipsPanel } from '../TipsPanel';
import { Transcript } from './Transcript';

const ratingLabel: Record<Rating, string> = { strong: 'Strong', good: 'Good', 'needs-work': 'Needs work' };
const ratingColour: Record<Rating, string> = {
  strong: 'var(--color-emerald)',
  good: 'var(--color-sky)',
  'needs-work': 'var(--color-coral)',
};

function RatingCard({ title, d }: { title: string; d: Dimension }) {
  return (
    <section className="card-surface bg-white p-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-lg font-bold">{title}</h3>
        <span className="rounded-full border-2 border-ink px-3 py-0.5 text-sm font-bold" style={{ background: ratingColour[d.rating] }}>
          {ratingLabel[d.rating]}
        </span>
      </div>
      <ul className="mt-3 space-y-1 text-ink-soft">
        {d.lines.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
    </section>
  );
}

type Props = {
  result: Result;
  question: Question;
  audioUrl: string | null;
  deckDone: boolean;
  onTryAgain: () => void;
  onNewQuestion: () => void;
  onBack: () => void;
};

export function ResultsStep({ result, question, audioUrl, deckDone, onTryAgain, onNewQuestion, onBack }: Props) {
  const actions = (
    <div className="mt-8 flex flex-wrap justify-center gap-3">
      <button type="button" onClick={onTryAgain} className="card-surface rounded-full! bg-[var(--industry)] px-6 py-3 font-display font-extrabold text-white">
        Try again
      </button>
      {!deckDone && (
        <button type="button" onClick={onNewQuestion} className="rounded-full border-2 border-ink bg-white px-6 py-3 font-display font-extrabold">
          New question
        </button>
      )}
      <button type="button" onClick={onBack} className="rounded-full border-2 border-ink bg-white px-6 py-3 font-bold">
        Back to deck
      </button>
    </div>
  );

  if (!result.graded) {
    return (
      <div className="text-center">
        <p className="font-display text-2xl font-bold">We couldn&apos;t hear enough to grade. Check your mic and try again</p>
        {actions}
      </div>
    );
  }

  return (
    <div>
      {result.englishWarning && <p className="mb-4 text-center font-bold">This works best for answers in English</p>}
      <div className="grid gap-4 md:grid-cols-3">
        <RatingCard title="Content" d={result.content} />
        <RatingCard title="Fluency" d={result.fluency} />
        <RatingCard title="Pacing" d={result.pacing} />
      </div>
      <section className="card-surface mt-6 bg-white p-5">
        <h3 className="font-display text-lg font-bold">What you said</h3>
        {audioUrl && <audio controls src={audioUrl} className="mt-3 w-full" />}
        <div className="mt-3">
          <Transcript words={result.words} fillerIndexes={result.fillerIndexes} longPauses={result.longPauses} hesitations={result.hesitations} />
        </div>
      </section>
      <TipsPanel question={question} />
      {actions}
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add components/analysis/Transcript.tsx components/analysis/ResultsStep.tsx
git commit -m "feat(ui): results with ratings, breakdown, playback and transcript"
```

### Task 13: Overlay and deck integration

**Files:**
- Create: `components/analysis/AnalysisOverlay.tsx`
- Modify: `components/QuestionCard.tsx`, `components/Deck.tsx`

**Interfaces:**
- Consumes: everything from Tasks 2, 3, 10, 11, 12, plus `engine.startSession(): AnalysisSession` with `push(audio, offsetSec)`, `finish(tips, onStep): Promise<Result>`, `reset()` (Task 18) and `useRecorder`'s `onChunk` option (Task 17)
- Produces: `<AnalysisOverlay question deckDone onClose onNewQuestion />`; `QuestionCard` gains optional `onAnalyse?: () => void`

- [ ] **Step 1: Write the overlay**

`components/analysis/AnalysisOverlay.tsx`:

```tsx
'use client';

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import type { Question } from '@/lib/content/schema';
import * as engine from '@/lib/speech/client';
import { micHelp, requestMic } from '@/lib/speech/mic';
import { RECORDING } from '@/lib/analysis/thresholds';
import { initialSession, sessionReducer } from '@/lib/speech/session';
import { isLikelyPhone } from '@/lib/speech/support';
import { useRecorder } from '@/lib/speech/useRecorder';
import { RecordStep } from './RecordStep';
import { ResultsStep } from './ResultsStep';
import { SetupStep } from './SetupStep';

type Props = {
  question: Question | undefined; // undefined once the deck is used up
  deckDone: boolean;
  onClose: () => void;
  onNewQuestion: () => void;
};

const stageLabel = { transcribing: 'Transcribing', pauses: 'Checking pauses', content: 'Checking content' } as const;

export function AnalysisOverlay({ question, deckDone, onClose, onNewQuestion }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [state, dispatch] = useReducer(sessionReducer, engine.isLoaded(), initialSession);
  const [cached, setCached] = useState<boolean | null>(null);
  const [webgpu, setWebgpu] = useState<boolean | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [announce, setAnnounce] = useState('');
  // The worker transcribes ~25 s chunks while the user is still talking (Stage 0: whole-recording
  // analysis of a 3-minute answer took ~24 s). Stop only waits for the last chunk.
  const session = useRef<engine.AnalysisSession | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const dropSession = () => {
    session.current?.reset();
    session.current = null;
  };

  const finishAnalysis = useCallback(async () => {
    const s = session.current;
    if (!question || !s) return;
    dispatch({ type: 'recording-stopped' });
    try {
      const result = await s.finish(question.tips, (stage) => dispatch({ type: 'stage', stage }));
      dispatch({ type: 'analysed', result });
    } catch (e) {
      if (!(e instanceof engine.Cancelled)) dispatch({ type: 'analysis-failed' });
    } finally {
      if (session.current === s) session.current = null;
    }
  }, [question]);

  const recorder = useRecorder({
    onChunk: (audio, offsetSec) => session.current?.push(audio, offsetSec),
    onStop: () => void finishAnalysis(),
    onLost: () => dispatch({ type: 'mic-lost' }),
  });

  const opened = useRef(false);

  // Open as a modal, and give the browser Back button an entry to close.
  // Guarded because StrictMode runs effects twice in development.
  useEffect(() => {
    const returnFocus = document.activeElement as HTMLElement | null;
    if (!dialog.current?.open) dialog.current?.showModal();
    if (!opened.current) {
      opened.current = true;
      history.pushState({ prepdeckAnalyse: true }, '');
    }
    const onPop = () => {
      if (stateRef.current.step === 'analysing') engine.cancel();
      else dropSession();
      onClose();
    };
    window.addEventListener('popstate', onPop);
    void engine.modelsCached().then(setCached);
    void engine.hasWebGPU().then(setWebgpu);
    return () => {
      window.removeEventListener('popstate', onPop);
      returnFocus?.focus(); // the dialog unmounts without close(), so restore focus ourselves
    };
  }, [onClose]);

  const requestClose = useCallback(() => {
    const s = stateRef.current.step;
    if ((s === 'count-in' || s === 'recording') && !window.confirm('Discard this recording?')) return;
    recorder.discard();
    dropSession();
    history.back(); // fires popstate → onClose
  }, [recorder]);

  const beginSetup = useCallback(async () => {
    if (!(await engine.hasRoomForModels())) return dispatch({ type: 'setup-failed', error: 'storage-full' });
    setStartedAt(performance.now());
    try {
      await engine.loadModels((loaded, total) => dispatch({ type: 'download-progress', loaded, total }));
    } catch (e) {
      if (!(e instanceof engine.Cancelled)) dispatch({ type: 'setup-failed', error: 'load-failed' });
      return;
    }
    const mic = await requestMic();
    if (mic !== 'ok') return dispatch({ type: 'setup-failed', error: mic });
    dispatch({ type: 'ready' });
  }, []);

  // Returning visitors skip the consent screen: load straight from the cache.
  useEffect(() => {
    if (cached && state.step === 'setup' && !state.progress && !state.error) void beginSetup();
  }, [cached, state, beginSetup]);

  // Count-in ticks, then recording starts.
  useEffect(() => {
    if (state.step !== 'count-in') return;
    setAnnounce(String(state.remaining));
    const t = setTimeout(() => dispatch({ type: 'tick' }), 1000);
    return () => clearTimeout(t);
  }, [state]);

  useEffect(() => {
    if (state.step === 'recording' && !recorder.active) {
      setAnnounce('Recording started');
      session.current = engine.startSession();
      recorder.start().catch(() => {
        dropSession();
        dispatch({ type: 'mic-failed' });
      });
    }
    if (state.step === 'analysing') setAnnounce(stageLabel[state.stage]);
    if (state.step === 'results') setAnnounce('Results ready');
    // recorder.start is stable; recorder.active is read once per step change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.step, state.step === 'analysing' ? state.stage : null]);

  // Announce time left at 1:00 and 0:10.
  const left = Math.ceil(RECORDING.maxSec - recorder.elapsed);
  useEffect(() => {
    if (state.step === 'recording' && (left === 60 || left === 10)) setAnnounce(left === 60 ? '1 minute left' : '10 seconds left');
  }, [left, state.step]);

  // New question (or the deck running out): start over on the new card.
  const questionId = question?.id;
  useEffect(() => {
    recorder.discard();
    dropSession();
    dispatch({ type: 'try-again' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionId]);

  const tryAgain = () => {
    recorder.discard();
    dropSession();
    dispatch({ type: 'try-again' });
  };

  return (
    <dialog
      ref={dialog}
      aria-label="Analyse my answer"
      onCancel={(e) => {
        e.preventDefault(); // Esc: confirm first when recording
        requestClose();
      }}
      onKeyDown={(e) => {
        if (e.code === 'Space' && state.step === 'recording') {
          e.preventDefault();
          recorder.stop();
        }
      }}
      className="m-0 h-dvh max-h-none w-screen max-w-none overflow-y-auto bg-paper p-0 backdrop:bg-ink/60"
    >
      <div className="mx-auto flex min-h-full max-w-4xl flex-col px-4 py-6 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-display text-xl font-bold text-balance sm:text-2xl">{question?.text ?? 'That’s the whole deck'}</h2>
          <button type="button" onClick={requestClose} className="shrink-0 rounded-full border-2 border-ink bg-white px-4 py-2 font-bold" aria-label="Close">
            ✕ Close
          </button>
        </div>

        <div className="flex flex-1 flex-col justify-center py-10">
          {!question ? (
            <div className="text-center">
              <p className="text-ink-soft">You’ve seen every question. Shuffle again for a fresh order.</p>
              <button type="button" onClick={requestClose} className="mt-6 rounded-full border-2 border-ink bg-white px-6 py-3 font-bold">
                Back to deck
              </button>
            </div>
          ) : state.step === 'setup' ? (
            <SetupStep
              state={state}
              cached={cached}
              webgpu={webgpu}
              phone={isLikelyPhone()}
              startedAt={startedAt}
              onBegin={beginSetup}
              onCancel={() => {
                engine.cancel();
                dispatch({ type: 'retry-setup' });
                setCached(false);
              }}
              onRetry={() => dispatch({ type: 'retry-setup' })}
            />
          ) : state.step === 'ready' || state.step === 'count-in' || state.step === 'recording' ? (
            <RecordStep
              step={state.step}
              remaining={state.step === 'count-in' ? state.remaining : 0}
              elapsed={recorder.elapsed}
              levels={recorder.levels}
              flat={recorder.flat}
              onStart={() => dispatch({ type: 'start' })}
              onStop={recorder.stop}
            />
          ) : state.step === 'interrupted' ? (
            <div className="text-center">
              <p className="font-display text-2xl font-bold">Your microphone disconnected.</p>
              <div className="mt-6 flex justify-center gap-3">
                <button type="button" onClick={() => void finishAnalysis()} className="card-surface rounded-full! bg-[var(--industry)] px-6 py-3 font-bold text-white">
                  Analyse what we have
                </button>
                <button type="button" onClick={tryAgain} className="rounded-full border-2 border-ink bg-white px-6 py-3 font-bold">
                  Discard
                </button>
              </div>
            </div>
          ) : state.step === 'analysing' ? (
            <div className="text-center">
              <p className="font-display text-3xl font-extrabold">Listening back…</p>
              <ol className="mt-4 flex justify-center gap-3 text-sm font-bold">
                {(['transcribing', 'pauses', 'content'] as const).map((s) => (
                  <li key={s} className={s === state.stage ? 'text-ink' : 'text-ink-soft/50'}>
                    {stageLabel[s]}
                  </li>
                ))}
              </ol>
            </div>
          ) : state.step === 'failed' ? (
            <div className="text-center">
              <p className="font-display text-2xl font-bold">
                {state.reason === 'mic' ? 'Microphone access is blocked.' : 'Analysis failed. Try again'}
              </p>
              {state.reason === 'mic' && <p className="mt-3 text-ink-soft">{micHelp()}</p>}
              <button type="button" onClick={tryAgain} className="card-surface mt-6 rounded-full! bg-[var(--industry)] px-6 py-3 font-bold text-white">
                Try again
              </button>
            </div>
          ) : (
            <ResultsStep
              result={state.result}
              question={question}
              audioUrl={recorder.recording?.url ?? null}
              deckDone={deckDone}
              onTryAgain={tryAgain}
              onNewQuestion={onNewQuestion}
              onBack={requestClose}
            />
          )}
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
    </dialog>
  );
}
```

- [ ] **Step 2: Add the button to the card**

In `components/QuestionCard.tsx`, add `onAnalyse?: () => void` to `Props`, accept it in the function signature, and replace the single tips `<button>` with a wrapper holding both buttons:

```tsx
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onToggleTips}
          aria-expanded={tipsOpen}
          className="rounded-full border-2 border-ink px-4 py-2 text-sm font-bold transition-colors hover:bg-ink/5"
          style={tipsOpen ? { background: 'var(--industry)', color: 'white' } : undefined}
        >
          {tipsOpen ? 'Hide tips' : 'What makes a great answer?'}
        </button>
        {onAnalyse && (
          <button
            type="button"
            onClick={onAnalyse}
            className="rounded-full border-2 border-ink bg-[var(--industry)] px-4 py-2 text-sm font-bold text-white"
          >
            Analyse my answer
          </button>
        )}
      </div>
```

- [ ] **Step 3: Wire the overlay into the deck**

In `components/Deck.tsx`:

1. Add imports:

```tsx
import { AnalysisOverlay } from './analysis/AnalysisOverlay';
import { supportsAnalysis } from '@/lib/speech/support';
```

2. Add state after `showTips`:

```tsx
  const [analysing, setAnalysing] = useState(false);
  const [canAnalyse, setCanAnalyse] = useState(false);
  // Checked after mount so server and client render the same markup.
  useEffect(() => setCanAnalyse(supportsAnalysis()), []);
  const closeAnalysis = useCallback(() => setAnalysing(false), []);
```

3. In the keyboard `useEffect`, return early while the overlay is open, so Space does not deal cards behind it. First line inside `onKey`:

```tsx
      if (analysing) return;
```

and add `analysing` to that effect's dependency array: `[phase, primary, analysing]`.

4. Pass the handler to the card:

```tsx
              <QuestionCard
                key={`${round}-${current.id}`}
                question={current}
                instant={effectiveStyle === 'instant'}
                onToggleTips={() => setShowTips((s) => !s)}
                tipsOpen={showTips}
                onAnalyse={canAnalyse ? () => setAnalysing(true) : undefined}
              />
```

5. Render the overlay just before the closing `</section>`:

```tsx
      {analysing && (current || phase === 'done') && (
        <AnalysisOverlay question={current} deckDone={phase === 'done'} onClose={closeAnalysis} onNewQuestion={dealNext} />
      )}
```

- [ ] **Step 4: Typecheck, test, build**

Run: `npm run typecheck && npm test && npm run build`
Expected: PASS.

- [ ] **Step 5: Verify in the browser**

Run `npm run dev` and check each item on `http://localhost:3000/technology/frontend`:

1. Deal a card. **Analyse my answer** appears next to "What makes a great answer?".
2. Click it: a full-screen overlay hides the deck; the question is at the top; first visit shows the consent copy and **Download and continue**.
3. Download shows MB progress and a time estimate; **Cancel** returns to the consent screen; downloading again resumes.
4. After the mic prompt: **Start recording** → 3 · 2 · 1 → waveform, `2:59 left`, **Stop**. Space stops.
5. Analysing shows Transcribing → Checking pauses → Checking content.
6. Results: three ratings with breakdown lines, transcript with fillers highlighted and pauses marked, audio playback, tips.
7. **Try again** returns to Start recording on the same question. **New question** shows the next question at Start recording. **Back to deck** closes and the deck shows the same card it was on before.
8. Esc and the browser Back button close the overlay; mid-recording both ask "Discard this recording?".
9. Tab cycles only inside the overlay; focus returns to the page after close.
10. Close the tab and reopen the page: the overlay skips the consent screen ("Loading the analysis model…").
11. Say fewer than 15 words: "We couldn't hear enough to grade. Check your mic and try again".
12. Deny the mic in site settings and reopen: "Microphone access is blocked." plus the browser-specific steps.

- [ ] **Step 6: Commit**

```bash
git add components/analysis/AnalysisOverlay.tsx components/QuestionCard.tsx components/Deck.tsx
git commit -m "feat(ui): Analyse my answer overlay wired into the deck"
```

### Task 14: Calibration, docs and pull request

**Files:**
- Modify: `lib/analysis/thresholds.ts`, `README.md`

- [ ] **Step 1: Calibrate with real answers**

Record about 20 real answers through the overlay (a mix of strong, partial and off-topic, with natural fillers and pauses). For each, note the rating a human reviewer would give on Content, Fluency and Pacing, and the app's ratings. Adjust `thresholds.ts` (including `HESITATION`) until they agree on at least 80% of ratings. Set `ACTIVE_PROFILE`, `MODEL_BYTES_ESTIMATE` and `APPROX_DOWNLOAD_MB` in `lib/speech/models.ts` from the Stage 0b profile comparison (Task 15 Step 6) and record the choice in the Stage 0 results doc. Re-run `npm test && npm run test:golden` after every change; update unit tests only where a boundary value deliberately moved.

- [ ] **Step 2: Update the README**

In `README.md`, add after the "How content works" section:

```markdown
## Spoken answer analysis (v2)

On a dealt card, **Analyse my answer** opens a full-screen overlay: record up to 3 minutes and get Content, Fluency and Pacing ratings with a breakdown. Everything runs in the browser (Whisper `base.en`, Silero VAD and MiniLM via Transformers.js, about 100 MB downloaded once and cached). No audio, transcript or score leaves the device, and nothing is saved.

- Grading logic: `lib/analysis/` (pure functions, thresholds in `thresholds.ts`)
- Models and worker: `lib/speech/`, `workers/analysis.worker.ts`
- Overlay UI: `components/analysis/`
- `npm run test:golden` runs 30 golden answers through the real embedding model
- `/lab/speech` (development only) measures filler retention and speed
```

- [ ] **Step 3: Final checks**

Run: `npm test && npm run typecheck && npm run build && npm run test:golden`
Expected: all PASS.

- [ ] **Step 4: Commit, push the branch, open a PR**

```bash
git add lib/analysis/thresholds.ts README.md
git commit -m "chore: calibrate thresholds and document spoken answer analysis"
git push -u origin feat/v2-spoken-analysis
gh pr create --title "v2: on-device spoken answer analysis" --body "Implements docs/superpowers/specs/2026-10-03-v2-spoken-answer-analysis-design.md (Stage 0 + Stage 1). Stage 0 results: docs/superpowers/specs/2026-10-03-v2-stage0-results.md."
```

The branch push creates a Vercel preview deployment; check the overlay there (cross-origin isolation, model download) before merging to `main`.

---

# Stage 0 amendment (run after Task 8, before Task 9)

These tasks implement the three changes agreed after Stage 0 (`docs/superpowers/specs/2026-10-03-v2-stage0-results.md`): model profiles to cut the ~300 MB download, hesitation detection because Whisper absorbs natural "um"s into stretched words, and chunked transcription during recording because whole-recording analysis of a 3-minute answer takes ~24 s.

### Task 15: Model profiles and lab A/B

**Files:**
- Modify: `lib/speech/models.ts`, `lib/speech/protocol.ts`, `lib/speech/engine.ts`, `lib/speech/client.ts`, `workers/analysis.worker.ts`, `app/lab/speech/LabClient.tsx`
- Create: `lib/speech/models.test.ts`

**Interfaces:**
- Produces: `type ProfileId = 'quality' | 'compact'`, `type Dtypes = { whisper: string | Record<string, string>; embed: string }`, `PROFILES`, `ACTIVE_PROFILE`, `dtypesFor(profile: ProfileId, backend: 'webgpu' | 'wasm', f16: boolean): Dtypes` (models.ts); load message becomes `{ type: 'load'; backend: Backend; dtypes: Dtypes }`; `engine.loadModels(backend: Backend, dtypes: Dtypes, onProgress)`; `client.loadModels(onProgress, profile?: ProfileId)`, `client.currentDtypes(): Dtypes | null`
- Removes: `WHISPER_DTYPE` (replaced by `PROFILES`)

- [ ] **Step 1: Write the failing test**

`lib/speech/models.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PROFILES, dtypesFor } from './models.ts';

test('dtypesFor picks the wasm, webgpu or webgpu-f16 dtypes', () => {
  assert.equal(dtypesFor('compact', 'wasm', true), PROFILES.compact.wasm);
  assert.equal(dtypesFor('compact', 'webgpu', true), PROFILES.compact.webgpuF16);
  assert.equal(dtypesFor('compact', 'webgpu', false), PROFILES.compact.webgpu);
  assert.equal(dtypesFor('quality', 'webgpu', false), PROFILES.quality.webgpu);
});

test('no profile asks for f16 weights without shader-f16', () => {
  for (const id of ['quality', 'compact'] as const) {
    assert.ok(!JSON.stringify(dtypesFor(id, 'webgpu', false)).includes('16'));
    assert.ok(!JSON.stringify(dtypesFor(id, 'wasm', false)).includes('16'));
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL, `dtypesFor` is not exported.

- [ ] **Step 3: Replace the dtype config in `lib/speech/models.ts`**

Delete the `WHISPER_DTYPE` constant and its comment, and add after `MODELS`:

```ts
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
```

Also in `models.ts`:
- Set `USE_FILLER_PROMPT = false` and change its comment to `// Stage 0: Transformers.js ignores Whisper prompts (no get_prompt_ids), so this stays off.`
- Set `MODEL_BYTES_ESTIMATE = 140 * 1024 * 1024` and `APPROX_DOWNLOAD_MB = 140` with the comment `// Compact profile on WebGPU, from the Stage 0 file sizes; Task 14 sets the measured value.`
- Add above `ORT_WASM`: `// vad-web bundles onnxruntime-web 1.30.0; Transformers.js uses its own runtime build.`

- [ ] **Step 4: Thread the dtypes through protocol, worker, engine and client**

`lib/speech/protocol.ts`: import `type Dtypes` from `./models.ts` and change the load message to `{ type: 'load'; backend: Backend; dtypes: Dtypes }`.

`workers/analysis.worker.ts`: call `loadModels(data.backend, data.dtypes, (p) => post({ type: 'progress', ...p }))`.

`lib/speech/engine.ts`: change the signature to `loadModels(backend: Backend, dtypes: Dtypes, onProgress: Progress)`, pass `dtype: dtypes.whisper` to the Whisper pipeline and `dtype: dtypes.embed` to the feature-extraction pipeline, and drop the `WHISPER_DTYPE` import. If the pipeline's `dtype` typing rejects `string`, cast at the call site only (e.g. `dtype: dtypes.embed as 'q8'`) and note it in the report.

`lib/speech/client.ts`:

```ts
type Gpu = { requestAdapter(): Promise<{ features: { has(name: string): boolean } } | null> };

async function pickBackend(): Promise<{ backend: Backend; f16: boolean }> {
  const gpu = (navigator as Navigator & { gpu?: Gpu }).gpu;
  try {
    const adapter = gpu ? await gpu.requestAdapter() : null;
    return adapter ? { backend: 'webgpu', f16: adapter.features.has('shader-f16') } : { backend: 'wasm', f16: false };
  } catch {
    return { backend: 'wasm', f16: false }; // requestAdapter can throw on blocklisted GPUs
  }
}

export async function hasWebGPU(): Promise<boolean> {
  return (await pickBackend()).backend === 'webgpu';
}
```

In `loadModels`, add the parameter `profile: ProfileId = ACTIVE_PROFILE`, replace `backendUsed = await pickBackend();` with:

```ts
  const { backend, f16 } = await pickBackend();
  backendUsed = backend;
  loadedDtypes = dtypesFor(profile, backend, f16);
```

and post `{ type: 'load', backend, dtypes: loadedDtypes }`. Add `let loadedDtypes: Dtypes | null = null;` beside `backendUsed` and `export const currentDtypes = () => loadedDtypes;`. In `cancel()`, also set `loadedDtypes = null`.

- [ ] **Step 5: Add a profile picker to the lab**

In `app/lab/speech/LabClient.tsx`:
- `import { PROFILES, type ProfileId } from '@/lib/speech/models';` and add `const [profile, setProfile] = useState<ProfileId>('compact');`.
- In `load()`, call `engine.cancel()` first (so switching profile reloads), then `engine.loadModels(progress, profile)`. Keep the last progress total in a variable and include it, the profile and `JSON.stringify(engine.currentDtypes())` in the success status, e.g. `Loaded compact on webgpu in 9.1 s · 134.7 MB · {"whisper":…,"embed":"q8"} · crossOriginIsolated=true`.
- Next to **Load models**, add:

```tsx
<select value={profile} onChange={(e) => setProfile(e.target.value as ProfileId)} className="rounded border-2 border-ink px-2 py-1 font-bold">
  {(Object.keys(PROFILES) as ProfileId[]).map((id) => (
    <option key={id} value={id}>
      {id}
    </option>
  ))}
</select>
```

The recorded audio stays in React state across profile switches (`run()` already transcribes a copy), so the same recording can be transcribed under both profiles.

- [ ] **Step 6: Verify, then hand the comparison to the human**

Run: `npm test && npm run typecheck && npm run build`
Expected: PASS.

Human step (Stage 0b, does not block Tasks 16–18): on `/lab/speech`, for 5 recordings, transcribe each under `quality` and `compact` and compare the transcripts word for word. Record the download size of each profile and the comparison in the Stage 0 results doc. Task 14 sets `ACTIVE_PROFILE` from it.

- [ ] **Step 7: Commit**

```bash
git add lib/speech/models.ts lib/speech/models.test.ts lib/speech/protocol.ts lib/speech/engine.ts lib/speech/client.ts workers/analysis.worker.ts app/lab/speech/LabClient.tsx
git commit -m "feat(speech): quality and compact model profiles with lab A/B"
```

### Task 16: Hesitations and punctuation-only tokens

**Files:**
- Create: `lib/analysis/hesitation.ts`, `lib/analysis/hesitation.test.ts`
- Modify: `lib/analysis/types.ts`, `lib/analysis/thresholds.ts`, `lib/analysis/fluency.ts`, `lib/analysis/fluency.test.ts`, `lib/analysis/rate.ts`, `lib/analysis/rate.test.ts`, `lib/analysis/analyse.ts`, `lib/analysis/analyse.test.ts`

**Interfaces:**
- Produces: `type Hesitation = { afterIndex: number; duration: number; before: string }`; `FluencyMetrics.hesitations: Hesitation[]`; `GradedResult.hesitations: Hesitation[]`; `HESITATION` thresholds; `hesitations(words: Word[], segments: Segment[], fillerIndexes: Set<number>): Hesitation[]`; `fluency(words: Word[], segments?: Segment[])`
- Behaviour change: `perMinute` counts fillers plus hesitations; `analyseAnswer` drops punctuation-only tokens before counting words.

- [ ] **Step 1: Types and thresholds**

In `lib/analysis/types.ts` add:

```ts
/** Voiced time no transcribed word accounts for (a held "um" Whisper folded into a word), after words[afterIndex]. */
export type Hesitation = { afterIndex: number; duration: number; before: string };
```

add `hesitations: Hesitation[]; // perMinute counts fillers and hesitations` to `FluencyMetrics`, and `hesitations: Hesitation[];` to `GradedResult` after `longPauses`.

In `lib/analysis/thresholds.ts` add:

```ts
/** A word "should" take base + perChar × letters; voiced time beyond that, up to the next word, is a hesitation. */
export const HESITATION = { minVoicedSec: 0.8, baseWordSec: 0.25, perCharSec: 0.07 } as const;
```

- [ ] **Step 2: Write the failing hesitation tests**

`lib/analysis/hesitation.test.ts` (the first fixture is real Stage 0 data: run 1, 10.8–26.4 s):

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hesitations } from './hesitation.ts';
import type { Segment, Word } from './types.ts';

const words: Word[] = [
  { text: 'This', start: 10.78, end: 11.84 },
  { text: 'company', start: 11.84, end: 12.64 },
  { text: 'called', start: 12.64, end: 13.1 },
  { text: 'Zego', start: 13.1, end: 16 },
  { text: 'Insurance.', start: 16, end: 17 },
  { text: 'And', start: 17.24, end: 22.36 },
  { text: 'the', start: 22.36, end: 22.56 },
  { text: 'thing', start: 22.56, end: 22.88 },
  { text: 'about', start: 22.88, end: 25.84 },
  { text: 'Zegico', start: 25.84, end: 26.42 },
];
const segments: Segment[] = [
  { start: 1.536, end: 15.072 },
  { start: 15.456, end: 18.72 },
  { start: 21.888, end: 24.48 },
  { start: 24.48, end: 28.896 },
];

test('finds the held hesitations in a real Stage 0 recording', () => {
  const h = hesitations(words, segments, new Set());
  assert.deepEqual(h.map((x) => x.before), ['company called Zego', 'Zego Insurance And', 'the thing about']);
  assert.deepEqual(h.map((x) => x.afterIndex), [3, 5, 8]);
  assert.equal(Math.round(h[2].duration * 100) / 100, 2.36);
});

test('silence between words is a pause, not a hesitation', () => {
  const w: Word[] = [
    { text: 'a', start: 0, end: 0.3 },
    { text: 'b', start: 5, end: 5.3 },
  ];
  assert.deepEqual(hesitations(w, [{ start: 0, end: 0.4 }, { start: 4.9, end: 5.4 }], new Set()), []);
});

test('a stretched filler word is not counted twice', () => {
  const w: Word[] = [
    { text: 'um', start: 0, end: 3 },
    { text: 'next', start: 3, end: 3.3 },
  ];
  const seg = [{ start: 0, end: 3.5 }];
  assert.equal(hesitations(w, seg, new Set([0])).length, 0);
  assert.equal(hesitations(w, seg, new Set()).length, 1);
});

test('no VAD segments means no hesitations', () => {
  assert.deepEqual(hesitations(words, [], new Set()), []);
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL, cannot find `./hesitation.ts`.

- [ ] **Step 4: Implement `hesitations()`**

`lib/analysis/hesitation.ts`:

```ts
import { wordToken } from './text.ts';
import { HESITATION } from './thresholds.ts';
import type { Hesitation, Segment, Word } from './types.ts';

const voicedBetween = (from: number, to: number, segments: Segment[]) =>
  segments.reduce((sum, g) => sum + Math.max(0, Math.min(to, g.end) - Math.max(from, g.start)), 0);

const clean = (w: Word) => w.text.trim().replace(/[.,!?;:]+$/, '');

/**
 * Whisper rarely writes down a natural "um"; it stretches the word before it instead (Stage 0).
 * After each word, the time beyond its expected length up to the next word is checked against VAD:
 * voiced time there is a hesitation; silence is a pause and belongs to pacing.
 */
export function hesitations(words: Word[], segments: Segment[], fillerIndexes: Set<number>): Hesitation[] {
  if (segments.length === 0) return [];
  const out: Hesitation[] = [];
  for (let i = 0; i < words.length; i++) {
    if (fillerIndexes.has(i)) continue; // already counted as a filler
    const w = words[i];
    const expectedEnd = w.start + HESITATION.baseWordSec + HESITATION.perCharSec * wordToken(w.text).length;
    const spanEnd = i + 1 < words.length ? words[i + 1].start : w.end;
    if (spanEnd <= expectedEnd) continue;
    const voiced = voicedBetween(expectedEnd, spanEnd, segments);
    if (voiced >= HESITATION.minVoicedSec) {
      out.push({ afterIndex: i, duration: voiced, before: words.slice(Math.max(0, i - 2), i + 1).map(clean).join(' ') });
    }
  }
  return out;
}
```

- [ ] **Step 5: Run the hesitation tests**

Run: `node --test --experimental-strip-types lib/analysis/hesitation.test.ts`
Expected: the four hesitation tests PASS. (Other suites may now fail to typecheck against the new required fields; Steps 6–8 fix them.)

- [ ] **Step 6: Fold hesitations into `fluency()`**

In `lib/analysis/fluency.ts`:
- import `{ hesitations }` from `./hesitation.ts` and `type Segment` from `./types.ts`;
- change the signature to `export function fluency(words: Word[], segments: Segment[] = []): FluencyMetrics`;
- after the loop, add `const held = hesitations(words, segments, new Set(indexes));`;
- compute `perMinute: (total + held.length) / (Math.max(span, 1) / 60)` and add `hesitations: held` to the returned object.

Add to `lib/analysis/fluency.test.ts`:

```ts
test('hesitations count toward the per-minute rate', () => {
  const words = [
    { text: 'so', start: 0, end: 0.3 },
    { text: 'then', start: 3, end: 3.3 },
  ];
  const m = fluency(words, [{ start: 0, end: 3.5 }]);
  assert.equal(m.total, 0); // the first sentence-starting "so" is not a filler
  assert.equal(m.hesitations.length, 1);
  assert.equal(Math.round(m.perMinute), 18); // 1 per 3.3 s
});
```

- [ ] **Step 7: Report hesitations in `rateFluency()`**

Replace `rateFluency` in `lib/analysis/rate.ts` with:

```ts
export function rateFluency(m: FluencyMetrics): Dimension {
  const rating: Rating = m.perMinute < FLUENCY.strongBelow ? 'strong' : m.perMinute <= FLUENCY.goodUpTo ? 'good' : 'needs-work';
  const lines: string[] = [];
  if (m.counts.length > 0) {
    const top = m.counts.slice(0, 3).map((c) => `'${c.filler}' ${c.count} ${c.count === 1 ? 'time' : 'times'}`);
    lines.push(`you said ${top.join(', ')}`);
  }
  if (m.hesitations.length > 0) {
    const n = m.hesitations.length;
    const longest = m.hesitations.reduce((a, h) => (h.duration > a.duration ? h : a));
    lines.push(`${n} ${n === 1 ? 'hesitation' : 'hesitations'}, longest after '${longest.before}…'`);
  }
  if (lines.length === 0) lines.push('no filler words detected');
  return { rating, lines };
}
```

In `lib/analysis/rate.test.ts`, add `hesitations: []` to the object the `fl` helper passes to `rateFluency`, and add:

```ts
test('fluency reports hesitations with the longest one', () => {
  const d = rateFluency({
    counts: [],
    total: 0,
    perMinute: 4,
    indexes: [],
    hesitations: [
      { afterIndex: 3, duration: 1.2, before: 'company called Zego' },
      { afterIndex: 8, duration: 2.4, before: 'the thing about' },
    ],
  });
  assert.equal(d.rating, 'good');
  assert.deepEqual(d.lines, ["2 hesitations, longest after 'the thing about…'"]);
});

test('fluency lists fillers and hesitations together', () => {
  const d = rateFluency({
    counts: [{ filler: 'like', count: 2 }],
    total: 2,
    perMinute: 2.5,
    indexes: [4, 9],
    hesitations: [{ afterIndex: 3, duration: 1.2, before: 'company called Zego' }],
  });
  assert.deepEqual(d.lines, ["you said 'like' 2 times", "1 hesitation, longest after 'company called Zego…'"]);
});
```

- [ ] **Step 8: Clean tokens and pass segments in `analyseAnswer()`**

In `lib/analysis/analyse.ts`, replace the start of `analyseAnswer`'s body (the destructuring, the `MIN_WORDS` check and `const f = fluency(words);`) with:

```ts
  const { segments, tips, embed } = input;
  // Whisper emits punctuation-only tokens such as "..."; they are not words.
  const words = input.words.filter((w) => /[a-z0-9]/i.test(w.text));
  if (words.length < MIN_WORDS) return { graded: false, reason: 'too-short', words };
  const f = fluency(words, segments);
```

and add `hesitations: f.hesitations,` after `longPauses: p.longPauses,` in the returned object.

Add to `lib/analysis/analyse.test.ts`:

```ts
test('punctuation-only tokens are not counted as words', async () => {
  const words = [
    ...wordsFromText('one two three four five six seven eight nine ten eleven twelve thirteen fourteen'),
    { text: '...', start: 9, end: 9.1 },
  ];
  const r = await analyseAnswer({ words, segments: [], tips, embed });
  assert.equal(r.graded, false); // 14 real words is under the 15-word minimum
  assert.ok(r.words.every((w) => w.text !== '...'));
});
```

and in the existing "a full answer returns three dimensions" test, after the `englishWarning` assertion, add `assert.deepEqual(r.hesitations, []);`.

- [ ] **Step 9: Run tests and typecheck**

Run: `npm test && npm run typecheck`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add lib/analysis
git commit -m "feat(analysis): detect hesitations Whisper folds into words; drop punctuation tokens"
```

### Task 17: Live 16 kHz capture and chunking

**Files:**
- Create: `lib/speech/pcm.ts`, `lib/speech/pcm.test.ts`, `lib/speech/chunker.ts`, `lib/speech/chunker.test.ts`
- Modify: `lib/speech/useRecorder.ts`

**Interfaces:**
- Consumes: `SAMPLE_RATE`, `rms` (`lib/speech/audio.ts`)
- Produces: `resampleTo16k(input: Float32Array, fromRate: number): Float32Array`; `CHUNK`; `quietestPoint(samples, from, to, win): number`; `class Chunker { constructor(emit: (audio: Float32Array, offsetSec: number) => void); push(samples: Float32Array): void; flush(): void }`; `useRecorder` option `onChunk?: (audio: Float32Array, offsetSec: number) => void` — called with ~25 s 16 kHz chunks during recording and once with the remainder when recording stops (before `onStop`/`onLost`), never after `discard()`.

Note: Node's `--experimental-strip-types` cannot run TypeScript parameter properties (`constructor(private x)`); declare fields explicitly.

- [ ] **Step 1: Write the failing tests**

`lib/speech/pcm.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resampleTo16k } from './pcm.ts';

test('48 kHz to 16 kHz averages each group of three samples', () => {
  assert.deepEqual([...resampleTo16k(new Float32Array([1, 1, 1, 4, 4, 4]), 48000)], [1, 4]);
});

test('output length follows the rate ratio', () => {
  assert.equal(resampleTo16k(new Float32Array(44100), 44100).length, 16000);
});

test('16 kHz input is copied, not shared', () => {
  const input = new Float32Array([0.1, 0.2]);
  const out = resampleTo16k(input, 16000);
  assert.deepEqual([...out], [...input]);
  assert.notEqual(out, input);
});
```

`lib/speech/chunker.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Chunker, quietestPoint } from './chunker.ts';

const SR = 16000;
const tone = (sec: number) => Float32Array.from({ length: Math.round(sec * SR) }, (_, i) => 0.5 * Math.sin(i / 5));
const silence = (sec: number) => new Float32Array(Math.round(sec * SR));

test('quietestPoint lands in the silent window', () => {
  const s = new Float32Array([...tone(1), ...silence(0.1), ...tone(1)]);
  const at = quietestPoint(s, 0, s.length, 800);
  assert.ok(at > SR && at < 1.1 * SR);
});

test('a long recording is cut at the quiet spot before 25 s, with offsets that add up', () => {
  const chunks: { sec: number; offsetSec: number }[] = [];
  const c = new Chunker((audio, offsetSec) => chunks.push({ sec: audio.length / SR, offsetSec }));
  c.push(tone(23.5));
  c.push(silence(0.2));
  c.push(tone(2)); // 25.7 s buffered, quiet at 23.5–23.7 s
  assert.equal(chunks.length, 1);
  assert.equal(chunks[0].offsetSec, 0);
  assert.ok(chunks[0].sec > 23.5 && chunks[0].sec < 23.7);
  c.flush();
  assert.equal(chunks.length, 2);
  assert.ok(Math.abs(chunks[1].offsetSec - chunks[0].sec) < 1e-9);
  assert.ok(Math.abs(chunks[0].sec + chunks[1].sec - 25.7) < 0.001);
});

test('flush with nothing buffered emits nothing', () => {
  let calls = 0;
  new Chunker(() => calls++).flush();
  assert.equal(calls, 0);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL, cannot find `./pcm.ts` / `./chunker.ts`.

- [ ] **Step 3: Implement resampling and chunking**

`lib/speech/pcm.ts`:

```ts
import { SAMPLE_RATE } from './audio.ts';

/** Resamples to 16 kHz, averaging the source samples behind each output sample (a cheap low-pass, fine for speech). */
export function resampleTo16k(input: Float32Array, fromRate: number): Float32Array {
  if (fromRate === SAMPLE_RATE) return input.slice();
  const ratio = fromRate / SAMPLE_RATE;
  const out = new Float32Array(Math.floor(input.length / ratio));
  for (let i = 0; i < out.length; i++) {
    const a = Math.floor(i * ratio);
    const b = Math.min(input.length, Math.floor((i + 1) * ratio));
    let sum = 0;
    for (let j = a; j < b; j++) sum += input[j];
    out[i] = b > a ? sum / (b - a) : input[a];
  }
  return out;
}
```

`lib/speech/chunker.ts`:

```ts
import { SAMPLE_RATE, rms } from './audio.ts';

/** Whisper takes up to 30 s; cut at ~25 s, at the quietest point of the last 3 s, so no word is split. */
export const CHUNK = { targetSec: 25, searchSec: 3, windowSec: 0.05 } as const;

/** Middle of the quietest `win`-sample window in samples[from, to). */
export function quietestPoint(samples: Float32Array, from: number, to: number, win: number): number {
  let best = to;
  let bestLevel = Infinity;
  for (let i = Math.max(0, from); i + win <= to; i += win) {
    const level = rms(samples.subarray(i, i + win));
    if (level < bestLevel) {
      bestLevel = level;
      best = i + Math.floor(win / 2);
    }
  }
  return best;
}

/** Buffers 16 kHz audio and emits chunks with their start time in the recording. */
export class Chunker {
  private readonly emit: (audio: Float32Array, offsetSec: number) => void;
  private parts: Float32Array[] = [];
  private length = 0;
  private offsetSec = 0;

  constructor(emit: (audio: Float32Array, offsetSec: number) => void) {
    this.emit = emit;
  }

  push(samples: Float32Array): void {
    this.parts.push(samples);
    this.length += samples.length;
    if (this.length >= CHUNK.targetSec * SAMPLE_RATE) this.cut();
  }

  /** Emits whatever is buffered: the end of the recording. */
  flush(): void {
    if (this.length === 0) return;
    const all = this.drain();
    this.emit(all, this.offsetSec);
    this.offsetSec += all.length / SAMPLE_RATE;
  }

  private cut(): void {
    const all = this.drain();
    const win = Math.round(CHUNK.windowSec * SAMPLE_RATE);
    const at = quietestPoint(all, all.length - CHUNK.searchSec * SAMPLE_RATE, all.length, win);
    this.emit(all.slice(0, at), this.offsetSec);
    this.offsetSec += at / SAMPLE_RATE;
    const rest = all.slice(at);
    this.parts = rest.length ? [rest] : [];
    this.length = rest.length;
  }

  private drain(): Float32Array {
    const all = new Float32Array(this.length);
    let o = 0;
    for (const p of this.parts) {
      all.set(p, o);
      o += p.length;
    }
    this.parts = [];
    this.length = 0;
    return all;
  }
}
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Tap live audio in `useRecorder`**

Read `lib/speech/useRecorder.ts` as it is now (it has a `session` counter ref, a `starting` ref and try/catch/finally in `start()` from earlier fix rounds; keep all of that). Then:

1. Imports: add `import { Chunker } from './chunker.ts';` and `import { resampleTo16k } from './pcm.ts';`.
2. `Options`: add `onChunk?: (audio: Float32Array, offsetSec: number) => void; // ~25 s 16 kHz chunks while recording, then the remainder`. Include `onChunk` in the `handlers` ref alongside `onStop` and `onLost`.
3. `Live`: add `chunker: Chunker`.
4. Above the hook, add the worklet source (an inline module, so no separate asset needs bundling):

```ts
// Batches 128-sample render quanta into 4096-sample messages.
const PCM_TAP = `class PcmTap extends AudioWorkletProcessor{constructor(){super();this.b=new Float32Array(4096);this.n=0}process(inputs){const c=inputs[0]&&inputs[0][0];if(c){for(let k=0;k<c.length;k++){this.b[this.n++]=c[k];if(this.n===4096){this.port.postMessage(this.b.slice(0));this.n=0}}}return true}}registerProcessor('pcm-tap',PcmTap)`;
let tapUrl: string | null = null;
const tapModuleUrl = () => (tapUrl ??= URL.createObjectURL(new Blob([PCM_TAP], { type: 'text/javascript' })));
```

5. In `start()`, keep the `MediaStreamAudioSourceNode` in a variable (`const source = ctx.createMediaStreamSource(stream); source.connect(analyser);`). After the session counter value for this session (`mine`) is assigned, create the chunker and the tap:

```ts
    const chunker = new Chunker((audio, offsetSec) => {
      if (mine === session.current) handlers.current.onChunk?.(audio, offsetSec);
    });
    await ctx.audioWorklet.addModule(tapModuleUrl());
    const tap = new AudioWorkletNode(ctx, 'pcm-tap');
    tap.port.onmessage = (e: MessageEvent<Float32Array>) => {
      if (mine === session.current) chunker.push(resampleTo16k(e.data, ctx.sampleRate));
    };
    const mute = ctx.createGain();
    mute.gain.value = 0; // the tap must be pulled by the graph, but nothing should be audible
    source.connect(tap);
    tap.connect(mute).connect(ctx.destination);
```

   and store `chunker` on the `Live` object. Do this before `recorder.start(250)` so no audio is missed, and inside the existing try block so a failure tears down as before.
6. In `recorder.onstop`, as the first statement (before `teardown()` and before the decode `await`), add `if (mine === session.current) l.chunker.flush();` so the remainder reaches `onChunk` before `onStop`/`onLost` fire.

- [ ] **Step 6: Typecheck and test**

Run: `npm run typecheck && npm test`
Expected: PASS. (The hook is exercised in the browser in Task 18.)

- [ ] **Step 7: Commit**

```bash
git add lib/speech/pcm.ts lib/speech/pcm.test.ts lib/speech/chunker.ts lib/speech/chunker.test.ts lib/speech/useRecorder.ts
git commit -m "feat(speech): stream 16 kHz chunks from the recorder"
```

### Task 18: Incremental analysis sessions

**Files:**
- Create: `lib/analysis/merge.ts`, `lib/analysis/merge.test.ts`
- Modify: `lib/speech/protocol.ts`, `workers/analysis.worker.ts`, `lib/speech/client.ts`, `app/lab/speech/LabClient.tsx`

**Interfaces:**
- Consumes: `analyseAnswer` (Task 8, updated in Task 16), `useRecorder`'s `onChunk` (Task 17)
- Produces: `shiftTimes<T extends { start: number; end: number }>(items: T[], offsetSec: number): T[]`, `mergeSegments(segments: Segment[], joinGapSec?: number): Segment[]`; messages `chunk`, `finish`, `reset` replacing `analyse`; `client.startSession(): AnalysisSession` with `push(audio, offsetSec): void`, `finish(tips, onStep): Promise<Result>`, `reset(): void`
- Removes: `client.analyse()` and the worker's `analyse` message (nothing uses them; Task 13 uses sessions).

- [ ] **Step 1: Write the failing tests**

`lib/analysis/merge.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeSegments, shiftTimes } from './merge.ts';

test('shiftTimes moves start and end and keeps other fields', () => {
  assert.deepEqual(shiftTimes([{ text: 'hi', start: 1, end: 1.5 }], 25), [{ text: 'hi', start: 26, end: 26.5 }]);
});

test('mergeSegments sorts and joins segments split by a chunk cut', () => {
  const merged = mergeSegments([
    { start: 25.02, end: 30 },
    { start: 10, end: 24.98 },
    { start: 40, end: 41 },
  ]);
  assert.deepEqual(merged, [
    { start: 10, end: 30 },
    { start: 40, end: 41 },
  ]);
});

test('mergeSegments keeps real gaps', () => {
  assert.equal(mergeSegments([{ start: 0, end: 1 }, { start: 3.5, end: 4 }]).length, 2);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL, cannot find `./merge.ts`.

- [ ] **Step 3: Implement the merge helpers**

`lib/analysis/merge.ts`:

```ts
import type { Segment } from './types.ts';

/** Moves chunk-relative times to recording time. */
export function shiftTimes<T extends { start: number; end: number }>(items: T[], offsetSec: number): T[] {
  return items.map((it) => ({ ...it, start: it.start + offsetSec, end: it.end + offsetSec }));
}

/** Sorts segments and joins those that touch or nearly touch: a chunk cut splits one stretch of speech in two. */
export function mergeSegments(segments: Segment[], joinGapSec = 0.1): Segment[] {
  const out: Segment[] = [];
  for (const s of [...segments].sort((a, b) => a.start - b.start)) {
    const last = out.at(-1);
    if (last && s.start - last.end <= joinGapSec) last.end = Math.max(last.end, s.end);
    else out.push({ ...s });
  }
  return out;
}
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Protocol**

In `lib/speech/protocol.ts`, replace the `analyse` member of `ToWorker` with:

```ts
  | { type: 'chunk'; session: number; offsetSec: number; audio: Float32Array }
  | { type: 'finish'; id: number; session: number; tips: Tips }
  | { type: 'reset' };
```

and add to `FromWorker`: `| { type: 'chunk-done'; session: number; offsetSec: number; ms: number }`.

- [ ] **Step 6: Worker sessions**

In `workers/analysis.worker.ts`, add imports `import { mergeSegments, shiftTimes } from '../lib/analysis/merge.ts';` and `import type { Segment, Word } from '../lib/analysis/types.ts';`, then above `self.onmessage`:

```ts
// One recording at a time. Chunks are transcribed in arrival order while the user is still talking.
type Session = { id: number; words: Word[]; segments: Segment[]; queue: Promise<void>; error: string | null };
const fresh = (id: number): Session => ({ id, words: [], segments: [], queue: Promise.resolve(), error: null });
let current = fresh(-1);
const sessionFor = (id: number) => (current.id === id ? current : (current = fresh(id)));
```

Inside `self.onmessage`, after the `load` branch and before `const { id } = data;`, add:

```ts
  if (data.type === 'reset') {
    current = fresh(-1);
    return;
  }

  if (data.type === 'chunk') {
    const s = sessionFor(data.session);
    const { audio, offsetSec } = data;
    s.queue = s.queue
      .then(async () => {
        if (current !== s || s.error) return;
        const t0 = performance.now();
        const words = await transcribe(audio, USE_FILLER_PROMPT);
        const segments = await detectSpeech(audio);
        if (current !== s) return; // reset while this chunk was running
        s.words.push(...shiftTimes(words, offsetSec));
        s.segments.push(...shiftTimes(segments, offsetSec));
        post({ type: 'chunk-done', session: s.id, offsetSec, ms: performance.now() - t0 });
      })
      .catch((e) => {
        s.error = String(e);
      });
    return;
  }
```

and replace the whole-recording `analyse` branch (the block from `post({ type: 'step', id, step: 'transcribing' });` through `post({ type: 'analysed', id, result });`) with:

```ts
    if (data.type === 'finish') {
      const s = sessionFor(data.session);
      post({ type: 'step', id, step: 'transcribing' });
      await s.queue; // the last chunk
      if (s.error) throw new Error(s.error);
      post({ type: 'step', id, step: 'pauses' });
      const segments = mergeSegments(s.segments);
      post({ type: 'step', id, step: 'content' });
      const result = await analyseAnswer({ words: s.words, segments, tips: data.tips, embed });
      if (current === s) current = fresh(-1);
      post({ type: 'analysed', id, result });
      return;
    }
```

Keep the `transcribe` branch (the lab uses it) and the existing error handling.

- [ ] **Step 7: Client sessions**

In `lib/speech/client.ts`:
- delete `analyse()`;
- in `request()`, replace `getWorker().postMessage(msg, [msg.audio.buffer as ArrayBuffer]);` with:

```ts
    getWorker().postMessage(msg, 'audio' in msg ? [msg.audio.buffer as ArrayBuffer] : []);
```

- add:

```ts
/** One recording's analysis: push chunks while recording, then finish once to grade. */
export type AnalysisSession = {
  push(audio: Float32Array, offsetSec: number): void;
  finish(tips: Tips, onStep: (s: AnalysisStep) => void): Promise<Result>;
  reset(): void; // discard everything pushed so far
};

let nextSession = 1;

export function startSession(): AnalysisSession {
  const session = nextSession++;
  return {
    push: (audio, offsetSec) =>
      getWorker().postMessage({ type: 'chunk', session, offsetSec, audio } satisfies ToWorker, [audio.buffer as ArrayBuffer]),
    finish: (tips, onStep) =>
      request({ type: 'finish', id: nextId++, session, tips }, (m) => (m.type === 'analysed' ? m.result : undefined), onStep),
    reset: () => worker?.postMessage({ type: 'reset' } satisfies ToWorker),
  };
}
```

- [ ] **Step 8: Streaming check on the lab bench**

In `app/lab/speech/LabClient.tsx`:
- import `useRef` from React (beside `useState`) and `import { seedContent } from '@/lib/content/seed';`;
- `const TIPS = seedContent.questions.find((q) => q.id === 'FE-03')!.tips;` at module level;
- state `const [streaming, setStreaming] = useState(false);`, `const [streamResult, setStreamResult] = useState<{ ms: number; result: unknown } | null>(null);`, and `const session = useRef<engine.AnalysisSession | null>(null);`;
- pass `onChunk: (audio, offsetSec) => session.current?.push(audio, offsetSec)` to `useRecorder`, and in both `onStop` and `onLost`, after `setAudio(r.audio)`, call `void finishStream()`;
- add:

```tsx
  const finishStream = async () => {
    const s = session.current;
    session.current = null;
    if (!s) return;
    const t0 = performance.now();
    setStatus('Analysing…');
    try {
      const result = await s.finish(TIPS, (step) => setStatus(`Analysing: ${step}`));
      setStreamResult({ ms: performance.now() - t0, result });
      setStatus('Ready');
    } catch (e) {
      setStatus(`Analysis failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const toggleRecording = async () => {
    if (recorder.active) return recorder.stop();
    if (streaming) {
      if (!engine.isLoaded()) return setStatus('Load models first');
      session.current = engine.startSession();
    }
    await recorder.start();
  };
```

- point the Record button's `onClick` at `toggleRecording`, add a checkbox labelled **Streaming analysis (FE-03 rubric)** bound to `streaming`, and render, when `streamResult` is set:

```tsx
<section className="card-surface bg-white p-4">
  <p className="font-bold">Stop → result {(streamResult.ms / 1000).toFixed(1)} s</p>
  <pre className="mt-2 overflow-x-auto text-xs">{JSON.stringify(streamResult.result, null, 1)}</pre>
</section>
```

- [ ] **Step 9: Verify**

Run: `npm test && npm run typecheck && npm run build`
Expected: PASS.

Human step (Stage 0b): on `/lab/speech`, load models, tick **Streaming analysis**, record a 3-minute answer, stop. Pass = "Stop → result" under 15 s on the WebGPU laptop. Record the number in the Stage 0 results doc.

- [ ] **Step 10: Commit**

```bash
git add lib/analysis/merge.ts lib/analysis/merge.test.ts lib/speech/protocol.ts workers/analysis.worker.ts lib/speech/client.ts app/lab/speech/LabClient.tsx
git commit -m "feat(speech): analyse in chunks while recording"
```

---

## Not in this plan

- **Stage 2 (optional on-device LLM feedback):** its own plan after Stage 1 ships.
- **Analytics events** (`setup_completed`, `analysis_run`, `try_again`): blocked on the open analytics-provider decision in the README.
- **Self-hosting models:** follow-up per the spec.
