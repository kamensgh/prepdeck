import { detectSpeech, embed, loadModels, transcribe } from '../lib/speech/engine.ts';
import { USE_FILLER_PROMPT } from '../lib/speech/models.ts';
import { analyseAnswer } from '../lib/analysis/analyse.ts';
import { mergeSegments, shiftTimes } from '../lib/analysis/merge.ts';
import type { Segment, Word } from '../lib/analysis/types.ts';
import type { FromWorker, ToWorker } from '../lib/speech/protocol.ts';

const post = (m: FromWorker) => self.postMessage(m);

// One recording at a time. Chunks are transcribed in arrival order while the user is still talking.
type Session = { id: number; words: Word[]; segments: Segment[]; queue: Promise<void>; error: string | null };
const fresh = (id: number): Session => ({ id, words: [], segments: [], queue: Promise.resolve(), error: null });
let current = fresh(-1);
const sessionFor = (id: number) => (current.id === id ? current : (current = fresh(id)));

self.onmessage = async ({ data }: MessageEvent<ToWorker>) => {
  if (data.type === 'load') {
    try {
      await loadModels(data.backend, data.dtypes, (p) => post({ type: 'progress', ...p }));
      post({ type: 'loaded' });
    } catch (e) {
      post({ type: 'load-error', message: String(e) });
    }
    return;
  }

  if (data.type === 'reset') {
    current = fresh(-1);
    return;
  }

  if (data.type === 'chunk') {
    const s = sessionFor(data.session);
    const { audio, offsetSec } = data;
    s.queue = s.queue
      .then(async () => {
        if (current !== s || s.error) return;
        const t0 = performance.now();
        const words = await transcribe(audio, USE_FILLER_PROMPT);
        const segments = await detectSpeech(audio);
        if (current !== s) return; // reset while this chunk was running
        s.words.push(...shiftTimes(words, offsetSec));
        s.segments.push(...shiftTimes(segments, offsetSec));
        post({ type: 'chunk-done', session: s.id, offsetSec, ms: performance.now() - t0 });
      })
      .catch((e) => {
        s.error = String(e);
      });
    return;
  }

  const { id } = data;
  try {
    if (data.type === 'transcribe') {
      const t0 = performance.now();
      const words = await transcribe(data.audio, data.prompt);
      const t1 = performance.now();
      const segments = await detectSpeech(data.audio);
      post({ type: 'transcribed', id, data: { words, segments, ms: { whisper: t1 - t0, vad: performance.now() - t1 } } });
      return;
    }
    if (data.type === 'finish') {
      const s = sessionFor(data.session);
      post({ type: 'step', id, step: 'transcribing' });
      await s.queue; // the last chunk
      if (s.error) throw new Error(s.error);
      post({ type: 'step', id, step: 'pauses' });
      const segments = mergeSegments(s.segments);
      post({ type: 'step', id, step: 'content' });
      const result = await analyseAnswer({ words: s.words, segments, tips: data.tips, embed });
      if (current === s) current = fresh(-1);
      post({ type: 'analysed', id, result });
      return;
    }
  } catch (e) {
    post({ type: 'failed', id, message: String(e) });
  }
};
