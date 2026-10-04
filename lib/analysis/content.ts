import { tokens } from './text.ts';
import { CONTENT } from './thresholds.ts';
import type { ContentMetrics, Embed, RubricPoint, Word } from './types.ts';

const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'with', 'at', 'by', 'from', 'your', 'you', 'how', 'what',
  'is', 'are', 'it', 'its', 'it\'s', 'be', 'that', 'this', 'each', 'every', 'vs',
]);

/** Splits a tips.hit sentence into rubric points: commas, semicolons, colons and arrows, ignoring separators in parentheses. */
export function splitRubric(hit: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of hit) {
    if (ch === '(') depth++;
    if (ch === ')') depth = Math.max(0, depth - 1);
    if (depth === 0 && (ch === ',' || ch === ';' || ch === ':' || ch === '→')) {
      parts.push(cur);
      cur = '';
    } else cur += ch;
  }
  parts.push(cur);
  return parts.map((p) => p.trim().replace(/\.+$/, '').trim()).filter((p) => p.length >= 2);
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

function windows(words: Word[]): string[] {
  const text = words.map((w) => w.text);
  if (text.length <= CONTENT.windowWords) return [text.join(' ')];
  const out: string[] = [];
  for (let i = 0; i < text.length; i += CONTENT.windowStep) {
    out.push(text.slice(i, i + CONTENT.windowWords).join(' '));
    if (i + CONTENT.windowWords >= text.length) break;
  }
  return out;
}

function lexicallyCovered(point: string, said: Set<string>): boolean {
  const key = tokens(point).filter((t) => !STOPWORDS.has(t));
  return key.length > 0 && key.every((t) => said.has(t));
}

const STAR = [
  { text: 'situation or task', cues: ['when i was', 'at my previous', 'at my last', 'we had', 'the situation', 'my role', 'i was responsible', 'the goal', 'our team'] },
  { text: 'action', cues: ['i decided', 'i did', 'so i', 'i built', 'i started', 'i spoke', 'i proposed', 'i worked', 'i set up', 'i led'] },
  { text: 'result', cues: ['as a result', 'the result', 'in the end', 'we ended up', 'which led', 'the outcome', 'i learned', 'improved', 'reduced', 'increased'] },
];

function structure(words: Word[]): ContentMetrics {
  const said = ` ${tokens(words.map((w) => w.text).join(' ')).join(' ')} `;
  const points: RubricPoint[] = STAR.map((p) => ({ text: p.text, covered: p.cues.some((c) => said.includes(` ${c} `)) }));
  return { mode: 'structure', points, coverage: points.filter((p) => p.covered).length / points.length };
}

// tips.avoid is not graded: sentence embeddings can't see negation, so answers ON the avoid topic matched it (Stage 1 golden set).
export async function content<T extends { hit: string }>(words: Word[], tips: T, embed: Embed): Promise<ContentMetrics> {
  const pointTexts = splitRubric(tips.hit);
  if (pointTexts.length < CONTENT.minRubricPoints) return structure(words);

  const windowTexts = windows(words);
  const vectors = await embed([...pointTexts, ...windowTexts]);
  const pointVecs = vectors.slice(0, pointTexts.length);
  const windowVecs = vectors.slice(pointTexts.length);
  const best = (v: number[]) => Math.max(0, ...windowVecs.map((w) => cosine(v, w)));

  const said = new Set(words.flatMap((w) => tokens(w.text)));
  const points = pointTexts.map((text, i) => ({
    text,
    covered: lexicallyCovered(text, said) || best(pointVecs[i]) >= CONTENT.coverSimilarity,
  }));
  return {
    mode: 'rubric',
    points,
    coverage: points.filter((p) => p.covered).length / points.length,
  };
}
