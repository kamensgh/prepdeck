'use client';

import { useState } from 'react';
import { fillerRecall } from '@/lib/analysis/spike';
import { decodeTo16kMono } from '@/lib/speech/audio';
import * as engine from '@/lib/speech/client';
import type { Transcribed } from '@/lib/speech/protocol';
import { useRecorder } from '@/lib/speech/useRecorder';

type Run = { prompt: boolean; data: Transcribed; totalMs: number };

export function LabClient() {
  const [status, setStatus] = useState('Models not loaded');
  const [audio, setAudio] = useState<Float32Array | null>(null);
  const [label, setLabel] = useState('');
  const [runs, setRuns] = useState<Run[]>([]);
  const recorder = useRecorder({ onStop: (r) => setAudio(r.audio), onLost: (r) => setAudio(r.audio) });

  const load = async () => {
    try {
      setStatus('Loading…');
      const t0 = performance.now();
      await engine.loadModels((l, t) => setStatus(`Downloading ${(l / 1e6).toFixed(1)} / ${(t / 1e6).toFixed(1)} MB`));
      setStatus(
        `Loaded on ${engine.currentBackend()} in ${((performance.now() - t0) / 1000).toFixed(1)} s · crossOriginIsolated=${String(crossOriginIsolated)}`,
      );
    } catch (e) {
      setStatus(`Load failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const run = async (prompt: boolean) => {
    if (!audio) return;
    if (!engine.isLoaded()) {
      setStatus('Load models first');
      return;
    }
    try {
      setStatus('Transcribing…');
      const t0 = performance.now();
      const data = await engine.transcribe(audio.slice(), prompt); // slice: the buffer is transferred
      setRuns((r) => [...r, { prompt, data, totalMs: performance.now() - t0 }]);
      setStatus('Ready');
    } catch (e) {
      setStatus(`Transcribe failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  return (
    <div className="mt-6 space-y-6">
      <p>{status}</p>
      <button type="button" className="rounded-full border-2 border-ink px-4 py-2 font-bold" onClick={load}>
        Load models
      </button>

      <div className="flex flex-wrap gap-3">
        <button type="button" className="rounded-full border-2 border-ink px-4 py-2 font-bold" onClick={() => (recorder.active ? recorder.stop() : recorder.start())}>
          {recorder.active ? `Stop (${recorder.elapsed.toFixed(0)} s)` : 'Record'}
        </button>
        <input
          type="file"
          accept="audio/*"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) setAudio(await decodeTo16kMono(f));
          }}
        />
        {audio && <span>{(audio.length / 16000).toFixed(1)} s of audio ready</span>}
      </div>

      <label className="block">
        <span className="font-bold">Hand label (verbatim, every um/uh/like)</span>
        <textarea className="mt-2 block h-24 w-full rounded border-2 border-ink p-2" value={label} onChange={(e) => setLabel(e.target.value)} />
      </label>

      <div className="flex gap-3">
        <button type="button" className="rounded-full border-2 border-ink px-4 py-2 font-bold" onClick={() => run(false)}>
          Transcribe (no prompt)
        </button>
        <button type="button" className="rounded-full border-2 border-ink px-4 py-2 font-bold" onClick={() => run(true)}>
          Transcribe (filler prompt)
        </button>
      </div>

      {runs.map((r, i) => {
        const text = r.data.words.map((w) => w.text).join(' ');
        const recall = label ? fillerRecall(label, text) : null;
        return (
          <section key={i} className="card-surface bg-white p-4">
            <p className="font-bold">
              Run {i + 1} · prompt {r.prompt ? 'on' : 'off'} · total {(r.totalMs / 1000).toFixed(1)} s · whisper {(r.data.ms.whisper / 1000).toFixed(1)} s · vad{' '}
              {(r.data.ms.vad / 1000).toFixed(1)} s
            </p>
            {recall && <p>Filler recall: {(recall.recall * 100).toFixed(0)}% {JSON.stringify(recall.perFiller)}</p>}
            <p className="mt-2">{text}</p>
            <details className="mt-2">
              <summary>Words and segments</summary>
              <pre className="overflow-x-auto text-xs">{JSON.stringify(r.data, null, 1)}</pre>
            </details>
          </section>
        );
      })}
    </div>
  );
}
