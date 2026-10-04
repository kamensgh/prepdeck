import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resampleTo16k } from './pcm.ts';

test('48 kHz to 16 kHz averages each group of three samples', () => {
  assert.deepEqual([...resampleTo16k(new Float32Array([1, 1, 1, 4, 4, 4]), 48000)], [1, 4]);
});

test('output length follows the rate ratio', () => {
  assert.equal(resampleTo16k(new Float32Array(44100), 44100).length, 16000);
});

test('16 kHz input is copied, not shared', () => {
  const input = new Float32Array([0.1, 0.2]);
  const out = resampleTo16k(input, 16000);
  assert.deepEqual([...out], [...input]);
  assert.notEqual(out, input);
});
