import { test } from 'node:test';
import assert from 'node:assert/strict';
import { content, cosine, splitRubric } from './content.ts';
import { wordsFromText } from './fixtures.ts';
import type { Embed } from './types.ts';

// Embedding that never matches: forces the lexical path.
const noMatch: Embed = async (texts) => texts.map((_, i) => texts.map((__, j) => (i === j ? 1 : 0)));

test('splitRubric splits on commas, semicolons, colons and arrows, but not inside parentheses', () => {
  assert.deepEqual(
    splitRubric('DNS, TCP/TLS, HTTP, HTML parse, CSSOM, render tree, layout, paint, JS hydration.'),
    ['DNS', 'TCP/TLS', 'HTTP', 'HTML parse', 'CSSOM', 'render tree', 'layout', 'paint', 'JS hydration'],
  );
  assert.deepEqual(splitRubric('Dependency array, cleanup, "you might not need an effect" (derive state, event handlers).'), [
    'Dependency array',
    'cleanup',
    '"you might not need an effect" (derive state, event handlers)',
  ]);
  assert.deepEqual(splitRubric("They're public endpoints: validate input and authorise every call, revalidate after."), [
    "They're public endpoints",
    'validate input and authorise every call',
    'revalidate after',
  ]);
  assert.deepEqual(splitRubric('Present → past → why this job, in under two minutes.'), ['Present', 'past', 'why this job', 'in under two minutes']);
});

test('a point is covered when all its key words appear in the answer', async () => {
  const words = wordsFromText('First DNS resolves the name, then a TCP and TLS handshake, then HTTP.');
  const m = await content(words, { hit: 'DNS, TCP/TLS, HTTP, layout, paint.', avoid: 'Skipping steps.' }, noMatch);
  assert.equal(m.mode, 'rubric');
  assert.deepEqual(m.points.map((p) => p.covered), [true, true, true, false, false]);
  assert.equal(m.coverage, 3 / 5);
});

test('a point is covered when a transcript window is similar enough', async () => {
  // "render tree" shares a vector with the transcript window; the other two points do not.
  const embed: Embed = async (texts) => texts.map((t) => (t === 'cssom' || t === 'layout' ? [0, 1] : [1, 0]));
  const m = await content(wordsFromText('the browser combines the dom and styles'), { hit: 'render tree, cssom, layout', avoid: 'x' }, embed);
  assert.deepEqual(m.points.map((p) => p.covered), [true, false, false]);
});

test('an avoid match is reported', async () => {
  const embed: Embed = async (texts) => texts.map((t) => (t.includes('threaded') ? [1, 0] : [0, 1]));
  const m = await content(
    wordsFromText('javascript is multi threaded so it runs in parallel'),
    { hit: 'Call stack, task queue, microtask queue.', avoid: 'Saying JS is multi-threaded.' },
    embed,
  );
  assert.equal(m.avoidHit, 'Saying JS is multi-threaded');
});

test('fewer than 3 rubric points falls back to a STAR structure check', async () => {
  const words = wordsFromText('At my previous job we had a failing release. I decided to roll it back. As a result we recovered in an hour.');
  const m = await content(words, { hit: 'Ownership and learning.', avoid: 'Blaming others.' }, noMatch);
  assert.equal(m.mode, 'structure');
  assert.deepEqual(m.points.map((p) => p.covered), [true, true, true]);
});

test('cosine handles zero vectors', () => {
  assert.equal(cosine([0, 0], [1, 0]), 0);
  assert.equal(cosine([1, 0], [1, 0]), 1);
});
