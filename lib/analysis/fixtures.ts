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
