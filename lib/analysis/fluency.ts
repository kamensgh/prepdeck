import { wordToken } from './text.ts';
import type { FluencyMetrics, Word } from './types.ts';

const SIMPLE: Record<string, string> = {
  um: 'um', umm: 'um', uh: 'uh', uhh: 'uh', er: 'er', erm: 'er', hmm: 'hmm', basically: 'basically',
};
// "like" is a real word after these: "I like", "looks like", "something like".
const LIKE_KEEP_AFTER = new Set([
  'i', 'you', 'we', 'they', "i'd", "you'd", "we'd", "they'd", 'would', 'to', "don't", "didn't", 'do', 'does',
  'look', 'looks', 'looked', 'feel', 'feels', 'felt', 'sound', 'sounds', 'seem', 'seems', 'something', 'things', 'more', 'much',
]);
// "you know how/what/that…" introduces a clause rather than filling a gap.
const YOU_KNOW_KEEP_BEFORE = new Set(['how', 'what', 'that', 'why', 'where', 'when', 'if', 'whether', 'the', 'about']);
// "a sort of tool" means "a kind of".
const SORT_OF_KEEP_AFTER = new Set(['a', 'the', 'this', 'that', 'what', 'any', 'some']);

const startsSentence = (words: Word[], i: number) => i === 0 || /[.?!]$/.test(words[i - 1].text.trim());

export function fluency(words: Word[]): FluencyMetrics {
  const t = words.map((w) => wordToken(w.text));
  const counts = new Map<string, number>();
  const indexes: number[] = [];
  let total = 0;
  const add = (filler: string, ...idx: number[]) => {
    counts.set(filler, (counts.get(filler) ?? 0) + 1);
    indexes.push(...idx);
    total++;
  };
  let sentenceSo = 0;

  for (let i = 0; i < t.length; i++) {
    const w = t[i];
    const prev = t[i - 1];
    const next = t[i + 1];
    if (SIMPLE[w]) add(SIMPLE[w], i);
    else if (w === 'like' && !(prev && LIKE_KEEP_AFTER.has(prev))) add('like', i);
    else if (w === 'you' && next === 'know' && !YOU_KNOW_KEEP_BEFORE.has(t[i + 2] ?? '')) {
      add('you know', i, i + 1);
      i++;
    } else if (w === 'sort' && next === 'of' && !(prev && SORT_OF_KEEP_AFTER.has(prev))) {
      add('sort of', i, i + 1);
      i++;
    } else if (w === 'so' && startsSentence(words, i) && ++sentenceSo > 1) add('so', i);
  }

  const span = words.length ? words.at(-1)!.end - words[0].start : 0;
  return {
    counts: [...counts].map(([filler, count]) => ({ filler, count })).sort((a, b) => b.count - a.count || a.filler.localeCompare(b.filler)),
    total,
    perMinute: total / (Math.max(span, 1) / 60),
    indexes,
  };
}
