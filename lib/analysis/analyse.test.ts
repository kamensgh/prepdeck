import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyseAnswer, looksNonEnglish } from './analyse.ts';
import { wordsFromText } from './fixtures.ts';

const embed = async (texts: string[]) => texts.map(() => [1, 0]);
const tips = { hit: 'Call stack, task queue, microtask queue drains first.', avoid: 'Saying JS is multi-threaded.' };

test('fewer than 15 words is not graded', async () => {
  const r = await analyseAnswer({ words: wordsFromText('um I am not sure'), segments: [], tips, embed });
  assert.equal(r.graded, false);
});

test('a full answer returns three dimensions plus highlights', async () => {
  const words = wordsFromText(
    'um so the call stack runs code and the task queue holds callbacks while the microtask queue drains first after each task like always',
  );
  const r = await analyseAnswer({ words, segments: [], tips, embed });
  assert.equal(r.graded, true);
  if (!r.graded) return;
  assert.ok(['strong', 'good', 'needs-work'].includes(r.content.rating));
  assert.ok(r.fillerIndexes.includes(0));
  assert.equal(r.englishWarning, false);
});

test('sparse words over long speech looks non-English', () => {
  assert.equal(looksNonEnglish(wordsFromText('the a of'), [{ start: 0, end: 30 }]), true);
  assert.equal(looksNonEnglish(wordsFromText('word '.repeat(60)), [{ start: 0, end: 30 }]), false);
  assert.equal(looksNonEnglish(wordsFromText('the a of'), [{ start: 0, end: 10 }]), false);
});
