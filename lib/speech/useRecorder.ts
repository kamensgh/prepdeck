'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { RECORDING } from '../analysis/thresholds.ts';
import { SAMPLE_RATE, decodeTo16kMono, rms } from './audio.ts';

export type Recording = { audio: Float32Array; url: string; durationSec: number };

type Live = { stream: MediaStream; recorder: MediaRecorder; ctx: AudioContext; raf: number; clock: number; lost: boolean };
type Options = {
  onStop: (r: Recording) => void; // normal stop or the 3:00 limit
  onLost: (r: Recording) => void; // mic unplugged mid-recording
};

export function useRecorder({ onStop, onLost }: Options) {
  const [active, setActive] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [levels, setLevels] = useState<number[]>([]);
  const [flat, setFlat] = useState(false);
  const [recording, setRecording] = useState<Recording | null>(null);
  const live = useRef<Live | null>(null);
  const handlers = useRef({ onStop, onLost });
  handlers.current = { onStop, onLost };

  const teardown = useCallback(() => {
    const l = live.current;
    if (!l) return;
    cancelAnimationFrame(l.raf);
    clearInterval(l.clock);
    l.stream.getTracks().forEach((t) => t.stop());
    void l.ctx.close();
    live.current = null;
    setActive(false);
  }, []);

  const start = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true } });
    const recorder = new MediaRecorder(stream);
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const buf = new Float32Array(analyser.fftSize);
    const chunks: Blob[] = [];
    const startedAt = performance.now();
    let lastSound = startedAt;
    let lastPaint = 0;
    const l: Live = { stream, recorder, ctx, raf: 0, clock: 0, lost: false };
    live.current = l;

    // Waveform and flat-mic check: animation frames (paused in hidden tabs, which is fine).
    const frame = () => {
      analyser.getFloatTimeDomainData(buf);
      const now = performance.now();
      const level = rms(buf);
      if (level > RECORDING.flatRms) lastSound = now;
      if (now - lastPaint > 50) {
        lastPaint = now;
        setLevels((ls) => [...ls.slice(-47), level]);
        setFlat(now - lastSound > RECORDING.flatMicSec * 1000);
      }
      l.raf = requestAnimationFrame(frame);
    };
    // Clock and 3:00 limit: an interval, so they keep running when the tab is hidden.
    const tick = () => {
      const sec = (performance.now() - startedAt) / 1000;
      setElapsed(sec);
      if (sec >= RECORDING.maxSec && recorder.state === 'recording') recorder.stop();
    };

    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = async () => {
      const lost = l.lost;
      teardown();
      const blob = new Blob(chunks, { type: recorder.mimeType });
      const audio = await decodeTo16kMono(blob);
      const rec: Recording = { audio, url: URL.createObjectURL(blob), durationSec: audio.length / SAMPLE_RATE };
      setRecording(rec);
      (lost ? handlers.current.onLost : handlers.current.onStop)(rec);
    };
    stream.getAudioTracks()[0].onended = () => {
      l.lost = true;
      if (recorder.state === 'recording') recorder.stop();
    };

    setLevels([]);
    setElapsed(0);
    setFlat(false);
    setActive(true);
    recorder.start(250);
    l.raf = requestAnimationFrame(frame);
    l.clock = window.setInterval(tick, 250);
  }, [teardown]);

  const stop = useCallback(() => {
    const r = live.current?.recorder;
    if (r?.state === 'recording') r.stop();
  }, []);

  /** Throws away any recording in progress or finished. Nothing is kept. */
  const discard = useCallback(() => {
    const l = live.current;
    if (l) {
      l.recorder.onstop = null;
      if (l.recorder.state === 'recording') l.recorder.stop();
      teardown();
    }
    setRecording((r) => {
      if (r) URL.revokeObjectURL(r.url);
      return null;
    });
  }, [teardown]);

  useEffect(() => discard, [discard]);

  return { start, stop, discard, active, elapsed, levels, flat, recording };
}
