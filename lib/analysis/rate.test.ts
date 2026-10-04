import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rateContent, rateFluency, ratePacing } from './rate.ts';
import type { ContentMetrics, PacingMetrics } from './types.ts';

const fl = (perMinute: number, counts = [{ filler: 'like', count: 6 }, { filler: 'um', count: 4 }, { filler: 'basically', count: 3 }, { filler: 'uh', count: 1 }]) =>
  rateFluency({ counts, total: counts.reduce((s, c) => s + c.count, 0), perMinute, indexes: [], hesitations: [] });

test('fluency boundaries: under 3 strong, 3–6 good, over 6 needs work', () => {
  assert.equal(fl(2.9).rating, 'strong');
  assert.equal(fl(3).rating, 'good');
  assert.equal(fl(6).rating, 'good');
  assert.equal(fl(6.1).rating, 'needs-work');
});

test('fluency names the top three fillers', () => {
  assert.equal(fl(8).lines[0], "you said 'like' 6 times, 'um' 4 times, 'basically' 3 times");
  assert.equal(fl(0, []).lines[0], 'no filler words detected');
  assert.equal(fl(1, [{ filler: 'um', count: 1 }]).lines[0], "you said 'um' 1 time");
});

const pace = (over: Partial<PacingMetrics>): PacingMetrics => ({ answerSec: 90, wordsPerMinute: 140, longPauses: [], longest: null, ...over });
const pause = (duration: number, before = 'so the browser') => ({ start: 10, end: 10 + duration, duration, before });

test('pacing: strong with at most one pause and normal rate and length', () => {
  assert.equal(ratePacing(pace({ longPauses: [pause(3)], longest: pause(3) })).rating, 'strong');
});

test('pacing: good with 2–3 pauses or one of rate/length off', () => {
  assert.equal(ratePacing(pace({ longPauses: [pause(3), pause(3)], longest: pause(3) })).rating, 'good');
  assert.equal(ratePacing(pace({ wordsPerMinute: 185 })).rating, 'good');
  assert.equal(ratePacing(pace({ answerSec: 20 })).rating, 'good');
});

test('pacing: needs work with 4+ pauses or both rate and length off', () => {
  const four = [pause(3), pause(3), pause(3), pause(4.2)];
  assert.equal(ratePacing(pace({ longPauses: four, longest: four[3] })).rating, 'needs-work');
  assert.equal(ratePacing(pace({ wordsPerMinute: 185, answerSec: 161 })).rating, 'needs-work');
});

test('pacing lines', () => {
  const four = [pause(3), pause(3), pause(3), pause(4.2)];
  assert.deepEqual(ratePacing(pace({ longPauses: four, longest: four[3], wordsPerMinute: 185, answerSec: 161 })).lines, [
    "longest pause 4.2s, after 'so the browser…'",
    '4 long pauses',
    '185 words/min, slightly fast',
    '2:41, consider tightening',
  ]);
  assert.deepEqual(ratePacing(pace({ longPauses: [pause(6, '')], longest: pause(6, ''), answerSec: 20, wordsPerMinute: 100 })).lines, [
    '6.0s before you started speaking',
    '100 words/min, slightly slow',
    '0:20, quite short for this question',
  ]);
  assert.deepEqual(ratePacing(pace({})).lines, ['steady pace, no long pauses']);
});

const cm = (covered: boolean[], over: Partial<ContentMetrics> = {}): ContentMetrics => ({
  mode: 'rubric',
  points: covered.map((c, i) => ({ text: ['DNS', 'TCP/TLS', 'HTTP', 'HTML parse', 'CSSOM', 'layout', 'paint'][i], covered: c })),
  coverage: covered.filter(Boolean).length / covered.length,
  ...over,
});

test('content boundaries: 70% strong, 40% good', () => {
  assert.equal(rateContent(cm([true, true, true, true, true, true, false])).rating, 'strong'); // 86%
  assert.equal(rateContent(cm([true, true, false, false, false])).rating, 'good'); // 40%
  assert.equal(rateContent(cm([true, false, false, false, false, false, false])).rating, 'needs-work');
});

test('content lists missed points', () => {
  const d = rateContent(cm([true, true, true, true, true, false, false]));
  assert.equal(d.rating, 'strong'); // 5 of 7 = 71%
  assert.deepEqual(d.lines, ['covered 5 of 7 points; missed: layout, paint']);
});

test('structure mode names the missing STAR parts', () => {
  const d = rateContent({
    mode: 'structure',
    points: [{ text: 'situation or task', covered: true }, { text: 'action', covered: true }, { text: 'result', covered: false }],
    coverage: 2 / 3,
  });
  assert.equal(d.rating, 'good');
  assert.deepEqual(d.lines, ['covered 2 of 3 parts of a STAR answer', 'no clear result']);
});

test('fluency reports hesitations with the longest one', () => {
  const d = rateFluency({
    counts: [],
    total: 0,
    perMinute: 4,
    indexes: [],
    hesitations: [
      { afterIndex: 3, duration: 1.2, before: 'company called Zego' },
      { afterIndex: 8, duration: 2.4, before: 'the thing about' },
    ],
  });
  assert.equal(d.rating, 'good');
  assert.deepEqual(d.lines, ["2 hesitations, longest after 'the thing about…'"]);
});

test('fluency lists fillers and hesitations together', () => {
  const d = rateFluency({
    counts: [{ filler: 'like', count: 2 }],
    total: 2,
    perMinute: 2.5,
    indexes: [4, 9],
    hesitations: [{ afterIndex: 3, duration: 1.2, before: 'company called Zego' }],
  });
  assert.deepEqual(d.lines, ["you said 'like' 2 times", "1 hesitation, longest after 'company called Zego…'"]);
});
