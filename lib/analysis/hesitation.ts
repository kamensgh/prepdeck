import { wordToken } from './text.ts';
import { HESITATION } from './thresholds.ts';
import type { Hesitation, Segment, Word } from './types.ts';

const voicedBetween = (from: number, to: number, segments: Segment[]) =>
  segments.reduce((sum, g) => sum + Math.max(0, Math.min(to, g.end) - Math.max(from, g.start)), 0);

const clean = (w: Word) => w.text.trim().replace(/[.,!?;:]+$/, '');

/**
 * Whisper rarely writes down a natural "um"; it stretches the word before it instead (Stage 0).
 * After each word, the time beyond its expected length up to the next word is checked against VAD:
 * voiced time there is a hesitation; silence is a pause and belongs to pacing.
 */
export function hesitations(words: Word[], segments: Segment[], fillerIndexes: Set<number>): Hesitation[] {
  if (segments.length === 0) return [];
  const out: Hesitation[] = [];
  for (let i = 0; i < words.length; i++) {
    if (fillerIndexes.has(i)) continue; // already counted as a filler
    const w = words[i];
    const expectedEnd = w.start + HESITATION.baseWordSec + HESITATION.perCharSec * wordToken(w.text).length;
    const spanEnd = i + 1 < words.length ? words[i + 1].start : w.end;
    if (spanEnd <= expectedEnd) continue;
    const voiced = voicedBetween(expectedEnd, spanEnd, segments);
    if (voiced >= HESITATION.minVoicedSec) {
      out.push({ afterIndex: i, duration: voiced, before: words.slice(Math.max(0, i - 2), i + 1).map(clean).join(' ') });
    }
  }
  return out;
}
