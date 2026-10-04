import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fillerRecall } from './spike.ts';

test('recall counts found fillers against the hand label, capped per filler', () => {
  const label = 'Um so, like, the uh event loop is um like a queue';
  const transcript = 'So, like, the event loop is um a queue';
  const r = fillerRecall(label, transcript);
  assert.deepEqual(r.perFiller.um, { labelled: 2, found: 1 });
  assert.deepEqual(r.perFiller.uh, { labelled: 1, found: 0 });
  assert.deepEqual(r.perFiller.like, { labelled: 2, found: 1 });
  assert.equal(r.recall, 2 / 5);
});

test('variant spellings count as the same filler', () => {
  const r = fillerRecall('umm uhh', 'um uh');
  assert.equal(r.recall, 1);
});
