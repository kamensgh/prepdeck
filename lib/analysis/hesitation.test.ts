import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hesitations } from './hesitation.ts';
import type { Segment, Word } from './types.ts';

const words: Word[] = [
  { text: 'This', start: 10.78, end: 11.84 },
  { text: 'company', start: 11.84, end: 12.64 },
  { text: 'called', start: 12.64, end: 13.1 },
  { text: 'Zego', start: 13.1, end: 16 },
  { text: 'Insurance.', start: 16, end: 17 },
  { text: 'And', start: 17.24, end: 22.36 },
  { text: 'the', start: 22.36, end: 22.56 },
  { text: 'thing', start: 22.56, end: 22.88 },
  { text: 'about', start: 22.88, end: 25.84 },
  { text: 'Zegico', start: 25.84, end: 26.42 },
];
const segments: Segment[] = [
  { start: 1.536, end: 15.072 },
  { start: 15.456, end: 18.72 },
  { start: 21.888, end: 24.48 },
  { start: 24.48, end: 28.896 },
];

test('finds the held hesitations in a real Stage 0 recording', () => {
  const h = hesitations(words, segments, new Set());
  assert.deepEqual(h.map((x) => x.before), ['company called Zego', 'Zego Insurance And', 'the thing about']);
  assert.deepEqual(h.map((x) => x.afterIndex), [3, 5, 8]);
  assert.equal(Math.round(h[2].duration * 100) / 100, 2.36);
});

test('silence between words is a pause, not a hesitation', () => {
  const w: Word[] = [
    { text: 'a', start: 0, end: 0.3 },
    { text: 'b', start: 5, end: 5.3 },
  ];
  assert.deepEqual(hesitations(w, [{ start: 0, end: 0.4 }, { start: 4.9, end: 5.4 }], new Set()), []);
});

test('a stretched filler word is not counted twice', () => {
  const w: Word[] = [
    { text: 'um', start: 0, end: 3 },
    { text: 'next', start: 3, end: 3.3 },
  ];
  const seg = [{ start: 0, end: 3.5 }];
  assert.equal(hesitations(w, seg, new Set([0])).length, 0);
  assert.equal(hesitations(w, seg, new Set()).length, 1);
});

test('no VAD segments means no hesitations', () => {
  assert.deepEqual(hesitations(words, [], new Set()), []);
});
