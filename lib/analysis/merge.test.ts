import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeSegments, shiftTimes } from './merge.ts';

test('shiftTimes moves start and end and keeps other fields', () => {
  assert.deepEqual(shiftTimes([{ text: 'hi', start: 1, end: 1.5 }], 25), [{ text: 'hi', start: 26, end: 26.5 }]);
});

test('mergeSegments sorts and joins segments split by a chunk cut', () => {
  const merged = mergeSegments([
    { start: 25.02, end: 30 },
    { start: 10, end: 24.98 },
    { start: 40, end: 41 },
  ]);
  assert.deepEqual(merged, [
    { start: 10, end: 30 },
    { start: 40, end: 41 },
  ]);
});

test('mergeSegments keeps real gaps', () => {
  assert.equal(mergeSegments([{ start: 0, end: 1 }, { start: 3.5, end: 4 }]).length, 2);
});
