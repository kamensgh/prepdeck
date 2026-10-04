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
