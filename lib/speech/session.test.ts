import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialSession, sessionReducer as r, type SessionState } from './session.ts';

const result = { graded: false as const, reason: 'too-short' as const, words: [] };

test('starts in setup unless models are already loaded', () => {
  assert.equal(initialSession(false).step, 'setup');
  assert.equal(initialSession(true).step, 'ready');
});

test('setup tracks progress and errors, and retry clears them', () => {
  let s = r(initialSession(false), { type: 'download-progress', loaded: 5, total: 10 });
  assert.deepEqual(s, { step: 'setup', progress: { loaded: 5, total: 10 }, error: null });
  s = r(s, { type: 'setup-failed', error: 'storage-full' });
  assert.equal(s.step === 'setup' && s.error, 'storage-full');
  s = r(s, { type: 'retry-setup' });
  assert.deepEqual(s, { step: 'setup', progress: null, error: null });
  assert.equal(r(s, { type: 'ready' }).step, 'ready');
});

test('start counts in from 3, then records', () => {
  let s: SessionState = r({ step: 'ready' }, { type: 'start' });
  assert.deepEqual(s, { step: 'count-in', remaining: 3 });
  s = r(r(r(s, { type: 'tick' }), { type: 'tick' }), { type: 'tick' });
  assert.deepEqual(s, { step: 'recording' });
});

test('stopping records analyses, steps advance, results arrive', () => {
  let s = r({ step: 'recording' }, { type: 'recording-stopped' });
  assert.deepEqual(s, { step: 'analysing', stage: 'transcribing' });
  s = r(s, { type: 'stage', stage: 'content' });
  assert.deepEqual(s, { step: 'analysing', stage: 'content' });
  assert.deepEqual(r(s, { type: 'analysed', result }), { step: 'results', result });
  assert.deepEqual(r(s, { type: 'analysis-failed' }), { step: 'failed', reason: 'analysis' });
});

test('a lost mic offers analyse-what-we-have or discard', () => {
  const s = r({ step: 'recording' }, { type: 'mic-lost' });
  assert.deepEqual(s, { step: 'interrupted' });
  assert.equal(r(s, { type: 'recording-stopped' }).step, 'analysing');
  assert.equal(r(s, { type: 'try-again' }).step, 'ready');
});

test('a mic that fails to start while recording ends in a mic failure', () => {
  assert.deepEqual(r({ step: 'recording' }, { type: 'mic-failed' }), { step: 'failed', reason: 'mic' });
});

test('try again returns to ready from results and failure', () => {
  assert.equal(r({ step: 'results', result }, { type: 'try-again' }).step, 'ready');
  assert.equal(r({ step: 'failed', reason: 'analysis' }, { type: 'try-again' }).step, 'ready');
});

test('events that do not apply leave the state unchanged', () => {
  const s: SessionState = { step: 'ready' };
  assert.equal(r(s, { type: 'tick' }), s);
  assert.equal(r(s, { type: 'analysed', result }), s);
});
