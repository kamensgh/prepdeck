import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Chunker, quietestPoint } from './chunker.ts';

const SR = 16000;
const tone = (sec: number) => Float32Array.from({ length: Math.round(sec * SR) }, (_, i) => 0.5 * Math.sin(i / 5));
const silence = (sec: number) => new Float32Array(Math.round(sec * SR));

test('quietestPoint lands in the silent window', () => {
  const s = new Float32Array([...tone(1), ...silence(0.1), ...tone(1)]);
  const at = quietestPoint(s, 0, s.length, 800);
  assert.ok(at > SR && at < 1.1 * SR);
});

test('a long recording is cut at the quiet spot before 25 s, with offsets that add up', () => {
  const chunks: { sec: number; offsetSec: number }[] = [];
  const c = new Chunker((audio, offsetSec) => chunks.push({ sec: audio.length / SR, offsetSec }));
  c.push(tone(23.5));
  c.push(silence(0.2));
  c.push(tone(2)); // 25.7 s buffered, quiet at 23.5–23.7 s
  assert.equal(chunks.length, 1);
  assert.equal(chunks[0].offsetSec, 0);
  assert.ok(chunks[0].sec > 23.5 && chunks[0].sec < 23.7);
  c.flush();
  assert.equal(chunks.length, 2);
  assert.ok(Math.abs(chunks[1].offsetSec - chunks[0].sec) < 1e-9);
  assert.ok(Math.abs(chunks[0].sec + chunks[1].sec - 25.7) < 0.001);
});

test('flush with nothing buffered emits nothing', () => {
  let calls = 0;
  new Chunker(() => calls++).flush();
  assert.equal(calls, 0);
});
