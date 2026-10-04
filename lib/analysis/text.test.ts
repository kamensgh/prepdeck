import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatClock, tokens, wordToken } from './text.ts';

test('tokens lowercases and splits on punctuation', () => {
  assert.deepEqual(tokens('TCP/TLS, HTTP.'), ['tcp', 'tls', 'http']);
});

test('wordToken strips punctuation but keeps apostrophes', () => {
  assert.equal(wordToken(' Like,'), 'like');
  assert.equal(wordToken("don't"), "don't");
});

test('formatClock renders m:ss', () => {
  assert.equal(formatClock(161), '2:41');
  assert.equal(formatClock(9.6), '0:10');
  assert.equal(formatClock(-3), '0:00');
});
