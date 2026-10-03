import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pacing, segmentsFromWords } from './pacing.ts';
import { wordsFromText } from './fixtures.ts';

test('a mid-answer gap of 2.5 s or more is a long pause, with the words before it', () => {
  const words = wordsFromText('so the browser parses the html and paints', { pauses: { 3: 4 } });
  const m = pacing([], words);
  assert.equal(m.longPauses.length, 1);
  assert.equal(m.longPauses[0].before, 'so the browser');
  assert.ok(Math.abs(m.longPauses[0].duration - 4.08) < 0.01);
});

test('a gap just under the threshold is not a pause', () => {
  const words = wordsFromText('one two three four', { pauses: { 2: 2.3 } });
  assert.equal(pacing([], words).longPauses.length, 0);
});

test('up to 5 s of thinking time before the first word is free', () => {
  assert.equal(pacing([], wordsFromText('hello there friend', { start: 4 })).longPauses.length, 0);
  const late = pacing([], wordsFromText('hello there friend', { start: 6 }));
  assert.equal(late.longPauses.length, 1);
  assert.equal(late.longPauses[0].before, '');
  assert.equal(late.longPauses[0].duration, 6);
});

test('VAD segments take precedence over word timings', () => {
  const words = wordsFromText('a b c d e f');
  const m = pacing([{ start: 0, end: 1 }, { start: 4, end: 5 }], words);
  assert.equal(m.longPauses.length, 1);
  assert.equal(m.longPauses[0].duration, 3);
  assert.equal(m.answerSec, 5);
});

test('words per minute over the speaking span', () => {
  const m = pacing([], wordsFromText('word '.repeat(30)));
  assert.equal(m.wordsPerMinute, 151);
});

test('longest picks the biggest pause', () => {
  const m = pacing([], wordsFromText('a b c d e f', { pauses: { 2: 3, 4: 5 } }));
  assert.equal(m.longPauses.length, 2);
  assert.equal(m.longest?.before, 'b c d');
});

test('segmentsFromWords merges words closer than 0.3 s', () => {
  const s = segmentsFromWords(wordsFromText('a b c', { pauses: { 2: 1 } }));
  assert.equal(s.length, 2);
});

test('no speech gives empty metrics', () => {
  assert.deepEqual(pacing([], []), { answerSec: 0, wordsPerMinute: 0, longPauses: [], longest: null });
});
