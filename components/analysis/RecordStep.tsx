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
