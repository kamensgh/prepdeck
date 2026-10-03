import { detectSpeech, embed, loadModels, transcribe } from '../lib/speech/engine.ts';
import { USE_FILLER_PROMPT } from '../lib/speech/models.ts';
import type { FromWorker, ToWorker } from '../lib/speech/protocol.ts';

const post = (m: FromWorker) => self.postMessage(m);

self.onmessage = async ({ data }: MessageEvent<ToWorker>) => {
  if (data.type === 'load') {
    try {
      await loadModels(data.backend, (p) => post({ type: 'progress', ...p }));
      post({ type: 'loaded' });
    } catch (e) {
      post({ type: 'load-error', message: String(e) });
    }
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
    // Wired up in Task 8.
    void USE_FILLER_PROMPT;
    void embed;
    post({ type: 'failed', id, message: 'analyse is not implemented yet' });
  } catch (e) {
    post({ type: 'failed', id, message: String(e) });
  }
};
