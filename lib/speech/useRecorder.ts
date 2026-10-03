'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { RECORDING } from '../analysis/thresholds.ts';
import { SAMPLE_RATE, decodeTo16kMono, rms } from './audio.ts';
import { Chunker } from './chunker.ts';
import { resampleTo16k } from './pcm.ts';

export type Recording = { audio: Float32Array; url: string; durationSec: number };

type Live = { stream: MediaStream; recorder: MediaRecorder; ctx: AudioContext; raf: number; clock: number; lost: boolean; chunker: Chunker };
type Options = {
  onStop: (r: Recording) => void; // normal stop or the 3:00 limit
  onLost: (r: Recording) => void; // mic unplugged mid-recording
  onChunk?: (audio: Float32Array, offsetSec: number) => void; // ~25 s 16 kHz chunks while recording, then the remainder
};

// Batches 128-sample render quanta into 4096-sample messages.
const PCM_TAP = `class PcmTap extends AudioWorkletProcessor{constructor(){super();this.b=new Float32Array(4096);this.n=0}process(inputs){const c=inputs[0]&&inputs[0][0];if(c){for(let k=0;k<c.length;k++){this.b[this.n++]=c[k];if(this.n===4096){this.port.postMessage(this.b.slice(0));this.n=0}}}return true}}registerProcessor('pcm-tap',PcmTap)`;
let tapUrl: string | null = null;
const tapModuleUrl = () => (tapUrl ??= URL.createObjectURL(new Blob([PCM_TAP], { type: 'text/javascript' })));

export function useRecorder({ onStop, onLost, onChunk }: Options) {
  const [active, setActive] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [levels, setLevels] = useState<number[]>([]);
  const [flat, setFlat] = useState(false);
  const [recording, setRecording] = useState<Recording | null>(null);
  const live = useRef<Live | null>(null);
  const starting = useRef(false);
  const session = useRef(0);
  const handlers = useRef({ onStop, onLost, onChunk });
  handlers.current = { onStop, onLost, onChunk };

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
    if (live.current || starting.current) return;
    starting.current = true;
    const ticket = session.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true } });
      if (session.current !== ticket) {
        // discard() ran while getUserMedia was pending: don't start a session nobody wants.
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      const recorder = new MediaRecorder(stream);
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);
      const buf = new Float32Array(analyser.fftSize);
      const chunks: Blob[] = [];
      const startedAt = performance.now();
      let lastSound = startedAt;
      let lastPaint = 0;
      const mine = ++session.current;

      const chunker = new Chunker((audio, offsetSec) => {
        if (mine === session.current) handlers.current.onChunk?.(audio, offsetSec);
      });
      const l: Live = { stream, recorder, ctx, raf: 0, clock: 0, lost: false, chunker };
      live.current = l;

      await ctx.audioWorklet.addModule(tapModuleUrl());
      const tap = new AudioWorkletNode(ctx, 'pcm-tap');
      tap.port.onmessage = (e: MessageEvent<Float32Array>) => {
        // Each 4096-sample block from the worklet is resampled independently (tiny boundary effects, acceptable for speech).
        if (mine === session.current) chunker.push(resampleTo16k(e.data, ctx.sampleRate));
      };
      const mute = ctx.createGain();
      mute.gain.value = 0; // the tap must be pulled by the graph, but nothing should be audible
      source.connect(tap);
      tap.connect(mute).connect(ctx.destination);

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
        const elapsedSec = (performance.now() - startedAt) / 1000;
        if (mine === session.current) l.chunker.flush();
        teardown();
        const blob = new Blob(chunks, { type: recorder.mimeType });
        let audio: Float32Array;
        let durationSec: number;
        try {
          audio = await decodeTo16kMono(blob);
          durationSec = audio.length / SAMPLE_RATE;
        } catch {
          // Empty blob on a very fast Stop, or a codec quirk: still deliver the recording so the
          // overlay doesn't hang in "recording" — just with no audio to analyse.
          audio = new Float32Array(0);
          durationSec = elapsedSec;
        }
        if (mine !== session.current) return;
        const rec: Recording = { audio, url: URL.createObjectURL(blob), durationSec };
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
    } catch (e) {
      teardown();
      throw e;
    } finally {
      starting.current = false;
    }
  }, [teardown]);

  const stop = useCallback(() => {
    const r = live.current?.recorder;
    if (r?.state === 'recording') r.stop();
  }, []);

  /** Throws away any recording in progress or finished. Nothing is kept. */
  const discard = useCallback(() => {
    session.current++;
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
