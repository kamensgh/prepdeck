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
