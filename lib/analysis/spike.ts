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
