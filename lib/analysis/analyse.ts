import { content } from './content.ts';
import { fluency } from './fluency.ts';
import { pacing } from './pacing.ts';
import { rateContent, rateFluency, ratePacing } from './rate.ts';
import { ENGLISH, MIN_WORDS } from './thresholds.ts';
import type { Embed, Result, Segment, Word } from './types.ts';

/** base.en emits few words for long non-English speech; flag it rather than grade nonsense silently. */
export function looksNonEnglish(words: Word[], segments: Segment[]): boolean {
  const speechSec = segments.reduce((s, seg) => s + (seg.end - seg.start), 0);
  return speechSec >= ENGLISH.minSpeechSec && words.length / speechSec < ENGLISH.minWordsPerSpeechSec;
}

export async function analyseAnswer(input: {
  words: Word[];
  segments: Segment[];
  tips: { hit: string; avoid: string };
  embed: Embed;
}): Promise<Result> {
  const { segments, tips, embed } = input;
  // Whisper emits punctuation-only tokens such as "..."; they are not words.
  const words = input.words.filter((w) => /[a-z0-9]/i.test(w.text));
  if (words.length < MIN_WORDS) return { graded: false, reason: 'too-short', words };
  const f = fluency(words, segments);
  const p = pacing(segments, words);
  const c = await content(words, tips, embed);
  return {
    graded: true,
    content: rateContent(c),
    fluency: rateFluency(f),
    pacing: ratePacing(p),
    words,
    fillerIndexes: f.indexes,
    longPauses: p.longPauses,
    hesitations: f.hesitations,
    englishWarning: looksNonEnglish(words, segments),
  };
}
