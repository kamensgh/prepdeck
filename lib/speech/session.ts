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
