import type { Result } from '../analysis/types.ts';
import { ACTIVE_PROFILE, dtypesFor, MODEL_BYTES_ESTIMATE, modelFiles, type Dtypes, type ProfileId } from './models.ts';
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
let loadingPromise: Promise<void> | null = null;

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
  if (loadingPromise) return loadingPromise; // a double click (or StrictMode double effect) must not post `load` twice
  const { backend, f16 } = await pickBackend();
  backendUsed = backend;
  const dtypes = dtypesFor(profile, backend, f16);
  loadedDtypes = dtypes;
  const promise = new Promise<void>((resolve, reject) => {
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
  loadingPromise = promise.finally(() => {
    loadingPromise = null;
  });
  return loadingPromise;
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
    getWorker().postMessage(msg, 'audio' in msg ? [msg.audio.buffer as ArrayBuffer] : []);
  });
}

export function transcribe(audio: Float32Array, prompt: boolean): Promise<Transcribed> {
  return request({ type: 'transcribe', id: nextId++, audio, prompt }, (m) => (m.type === 'transcribed' ? m.data : undefined));
}

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
    push: (audio, offsetSec) => {
      if (!loaded) return; // a worker without models must not be spawned by a push
      getWorker().postMessage({ type: 'chunk', session, offsetSec, audio } satisfies ToWorker, [audio.buffer as ArrayBuffer]);
    },
    finish: (tips, onStep) =>
      request({ type: 'finish', id: nextId++, session, tips }, (m) => (m.type === 'analysed' ? m.result : undefined), onStep),
    reset: () => worker?.postMessage({ type: 'reset' } satisfies ToWorker),
  };
}

/** Stops all work. The next load re-initialises from the browser cache. */
export function cancel(): void {
  worker?.terminate();
  worker = null;
  loaded = false;
  loadedDtypes = null;
  loadingPromise = null;
  rejectors.forEach((r) => r(new Cancelled('cancelled')));
  rejectors.clear();
}

/** Whether every weight file of the profile (for this device's backend) is already in the browser cache. */
export async function modelsCached(profile: ProfileId = ACTIVE_PROFILE): Promise<boolean> {
  try {
    if (!('caches' in globalThis)) return false;
    const { backend, f16 } = await pickBackend();
    const urls = (await (await caches.open('transformers-cache')).keys()).map((r) => r.url);
    return modelFiles(dtypesFor(profile, backend, f16)).every((f) => urls.some((u) => u.includes(`${f.repo}/resolve/main/${f.path}`)));
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
