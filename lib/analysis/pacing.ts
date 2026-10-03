import { PACING } from './thresholds.ts';
import type { PacingMetrics, Pause, Segment, Word } from './types.ts';

/** Fallback when VAD returns nothing: merge words separated by less than `joinGapSec`. */
export function segmentsFromWords(words: Word[], joinGapSec = 0.3): Segment[] {
  const out: Segment[] = [];
  for (const w of words) {
    const last = out.at(-1);
    if (last && w.start - last.end < joinGapSec) last.end = w.end;
    else out.push({ start: w.start, end: w.end });
  }
  return out;
}

export function pacing(segments: Segment[], words: Word[]): PacingMetrics {
  const speech = segments.length > 0 ? segments : segmentsFromWords(words);
  if (speech.length === 0) return { answerSec: 0, wordsPerMinute: 0, longPauses: [], longest: null };

  const wordsBefore = (sec: number) =>
    words
      .filter((w) => w.end <= sec + 0.05)
      .slice(-3)
      .map((w) => w.text.trim().replace(/[.,!?;:]+$/, ''))
      .join(' ');

  const longPauses: Pause[] = [];
  const leadIn = speech[0].start;
  if (leadIn > PACING.thinkingSec) longPauses.push({ start: 0, end: leadIn, duration: leadIn, before: '' });
  for (let i = 1; i < speech.length; i++) {
    const gap = speech[i].start - speech[i - 1].end;
    if (gap >= PACING.longPauseSec) {
      longPauses.push({ start: speech[i - 1].end, end: speech[i].start, duration: gap, before: wordsBefore(speech[i - 1].end) });
    }
  }

  const span = speech.at(-1)!.end - speech[0].start;
  return {
    answerSec: speech.at(-1)!.end,
    wordsPerMinute: span > 0 ? Math.round(words.length / (span / 60)) : 0,
    longPauses,
    longest: longPauses.reduce<Pause | null>((a, p) => (!a || p.duration > a.duration ? p : a), null),
  };
}
