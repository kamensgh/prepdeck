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
