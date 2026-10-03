import type { Result } from '../analysis/types.ts';
import { ACTIVE_PROFILE, dtypesFor, MODEL_BYTES_ESTIMATE, MODELS, type Dtypes, type ProfileId } from './models.ts';
import type { AnalysisStep, Backend, FromWorker, Tips, ToWorker, Transcribed } from './protocol.ts';

/** Thrown to pending callers when the user cancels; callers should stay silent. */
export class Cancelled extends Error {}

let worker: Worker | null = null;
let loaded = false;
let backendUsed: Backend = 'wasm';
let loadedDtypes: Dtypes | null = null;
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
export const currentDtypes = () => loadedDtypes;

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

/** True when the browser offers a usable WebGPU adapter. */
export async function hasWebGPU(): Promise<boolean> {
  return (await pickBackend()).backend === 'webgpu';
}

export async function loadModels(onProgress: (loaded: number, total: number) => void, profile: ProfileId = ACTIVE_PROFILE): Promise<void> {
  if (loaded) return;
  const { backend, f16 } = await pickBackend();
  backendUsed = backend;
  const dtypes = dtypesFor(profile, backend, f16);
  loadedDtypes = dtypes;
  return new Promise<void>((resolve, reject) => {
    const files = new Map<string, { loaded: number; total: number }>();
    const finish = () => {
      stop();
      rejectors.delete(fail);
    };
    const fail = (e: Error) => {
      finish();
      reject(e);
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
        fail(new Error(m.message));
      }
    });
    rejectors.add(fail);
    getWorker().postMessage({ type: 'load', backend: backendUsed, dtypes } satisfies ToWorker);
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
  loadedDtypes = null;
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
