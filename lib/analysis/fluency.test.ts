import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fluency } from './fluency.ts';
import { wordsFromText } from './fixtures.ts';

const count = (text: string, filler: string) =>
  fluency(wordsFromText(text)).counts.find((c) => c.filler === filler)?.count ?? 0;

test('counts um, uh and filler "like"', () => {
  const m = fluency(wordsFromText('So um the event loop is, like, really uh simple'));
  assert.equal(m.total, 3);
  assert.equal(count('So um the event loop is, like, really uh simple', 'like'), 1);
});

test('"like" after a subject or a comparison verb is not a filler', () => {
  assert.equal(count("I like React and it looks like a library and I'd like that", 'like'), 0);
  assert.equal(count('something like a cache', 'like'), 0);
});

test('"you know" counts unless it introduces a clause', () => {
  assert.equal(count('it was, you know, fine and you know how it works', 'you know'), 1);
});

test('"sort of" counts unless it means "a kind of"', () => {
  assert.equal(count('a sort of tool that is sort of slow', 'sort of'), 1);
});

test('sentence-starting "so" counts from the second one', () => {
  assert.equal(count('So we began. So then we shipped. So it worked.', 'so'), 2);
});

test('variant spellings are merged', () => {
  assert.equal(count('umm uhh erm', 'um'), 1);
  assert.equal(count('umm uhh erm', 'uh'), 1);
  assert.equal(count('umm uhh erm', 'er'), 1);
});

test('per-minute rate uses the spoken span', () => {
  // 30 words at 0.4 s each: span 11.92 s → 3 fillers ≈ 15.1 per minute
  const text = 'um ' + 'word '.repeat(13) + 'um ' + 'word '.repeat(13) + 'um word';
  const m = fluency(wordsFromText(text));
  assert.equal(m.total, 3);
  assert.equal(Math.round(m.perMinute), 15);
});

test('indexes cover both words of a two-word filler, sorted by frequency', () => {
  const m = fluency(wordsFromText('it was, you know, fine um um'));
  assert.deepEqual(m.indexes, [2, 3, 5, 6]);
  assert.deepEqual(m.counts, [
    { filler: 'um', count: 2 },
    { filler: 'you know', count: 1 },
  ]);
});

test('hesitations count toward the per-minute rate', () => {
  const words = [
    { text: 'so', start: 0, end: 0.3 },
    { text: 'then', start: 3, end: 3.3 },
  ];
  const m = fluency(words, [{ start: 0, end: 3.5 }]);
  assert.equal(m.total, 0); // the first sentence-starting "so" is not a filler
  assert.equal(m.hesitations.length, 1);
  assert.equal(Math.round(m.perMinute), 18); // 1 per 3.3 s
});
