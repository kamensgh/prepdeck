'use client';

import { useCallback, useMemo, useState } from 'react';
import { passageKindLabels, passageKinds, type Passage, type PassageKind } from '@/lib/content/schema';
import { pickRandom, readingMinutes } from '@/lib/read';
import { Chip } from '../Chip';
import { Reader } from './Reader';

const filterLabels: Record<PassageKind, string> = { 'model-answer': 'Model answers', 'talk-about': 'Talk about it' };

const simplify = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();

type Props = {
  passages: Passage[];
  questionText: Record<string, string>;
};

export function ReadAloud({ passages, questionText }: Props) {
  const [kind, setKind] = useState<PassageKind | 'all'>('all');
  const [open, setOpen] = useState<number | null>(null); // index into `shown`

  const shown = useMemo(() => (kind === 'all' ? passages : passages.filter((p) => p.kind === kind)), [passages, kind]);
  const kindsPresent = passageKinds.filter((k) => passages.some((p) => p.kind === k));

  const openRandom = () => {
    const pick = pickRandom(shown, undefined);
    if (pick) setOpen(shown.indexOf(pick));
  };
  const close = useCallback(() => setOpen(null), []);

  return (
    <section aria-labelledby="read-aloud-heading" className="mt-10">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-xl">
          <h2 id="read-aloud-heading" className="font-display text-2xl font-bold">
            Read aloud
          </h2>
          <p className="mt-2 text-lg text-ink-soft">
            Pick a passage and read it out loud, again and again, until the words come easily. Model answers follow
            the structure of a strong answer to a real question.
          </p>
        </div>
        <button
          type="button"
          onClick={openRandom}
          disabled={shown.length === 0}
          className="card-surface rounded-full! bg-[var(--industry)] px-6 py-3 font-display text-lg font-extrabold text-white transition-[transform,box-shadow] active:translate-x-1 active:translate-y-1 active:shadow-none disabled:opacity-50"
        >
          Pick one for me
        </button>
      </div>

      {kindsPresent.length > 1 && (
        <div className="mt-6 flex flex-wrap gap-2" aria-label="Filter passages">
          <Chip pressed={kind === 'all'} onClick={() => setKind('all')}>
            All
          </Chip>
          {kindsPresent.map((k) => (
            <Chip key={k} pressed={kind === k} onClick={() => setKind(k)}>
              {filterLabels[k]}
            </Chip>
          ))}
        </div>
      )}

      {shown.length === 0 ? (
        <p className="mt-8 text-lg text-ink-soft">There are no passages for this role yet. Try the deck instead.</p>
      ) : (
        <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((p, i) => {
            const question = p.questionId ? questionText[p.questionId] : undefined;
            const sameAsTitle = question && simplify(question) === simplify(p.title);
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => setOpen(i)}
                  className="card-surface flex h-full w-full flex-col bg-white p-5 text-left transition-[transform,box-shadow] duration-200 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[var(--shadow-card-lift)]"
                >
                  <span className="flex items-center justify-between gap-2 text-sm">
                    <span
                      className={[
                        'rounded-full border-2 border-ink px-2.5 py-0.5 font-bold',
                        p.kind === 'model-answer' ? 'bg-sun' : 'bg-sky',
                      ].join(' ')}
                    >
                      {passageKindLabels[p.kind]}
                    </span>
                    <span className="font-semibold text-ink-soft">About {readingMinutes(p.text)} min</span>
                  </span>
                  <span className="mt-4 font-display text-xl font-bold leading-snug">{p.title}</span>
                  {question && !sameAsTitle && <span className="mt-2 line-clamp-2 text-ink-soft">{question}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {open !== null && shown[open] && (
        <Reader passages={shown} index={open} questionText={questionText} onIndex={setOpen} onClose={close} />
      )}
    </section>
  );
}
