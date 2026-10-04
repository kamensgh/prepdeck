import { SAMPLE_RATE, rms } from './audio.ts';

/** Whisper takes up to 30 s; cut at ~25 s, at the quietest point of the last 3 s, so no word is split. */
export const CHUNK = { targetSec: 25, searchSec: 3, windowSec: 0.05 } as const;

/** Middle of the quietest `win`-sample window in samples[from, to). */
export function quietestPoint(samples: Float32Array, from: number, to: number, win: number): number {
  let best = to;
  let bestLevel = Infinity;
  for (let i = Math.max(0, from); i + win <= to; i += win) {
    const level = rms(samples.subarray(i, i + win));
    if (level < bestLevel) {
      bestLevel = level;
      best = i + Math.floor(win / 2);
    }
  }
  return best;
}

/** Buffers 16 kHz audio and emits chunks with their start time in the recording. */
export class Chunker {
  private readonly emit: (audio: Float32Array, offsetSec: number) => void;
  private parts: Float32Array[] = [];
  private length = 0;
  private offsetSec = 0;

  constructor(emit: (audio: Float32Array, offsetSec: number) => void) {
    this.emit = emit;
  }

  push(samples: Float32Array): void {
    this.parts.push(samples);
    this.length += samples.length;
    if (this.length >= CHUNK.targetSec * SAMPLE_RATE) this.cut();
  }

  /** Emits whatever is buffered: the end of the recording. */
  flush(): void {
    if (this.length === 0) return;
    const all = this.drain();
    this.emit(all, this.offsetSec);
    this.offsetSec += all.length / SAMPLE_RATE;
  }

  private cut(): void {
    const all = this.drain();
    const win = Math.round(CHUNK.windowSec * SAMPLE_RATE);
    const at = quietestPoint(all, all.length - CHUNK.searchSec * SAMPLE_RATE, all.length, win);
    this.emit(all.slice(0, at), this.offsetSec);
    this.offsetSec += at / SAMPLE_RATE;
    const rest = all.slice(at);
    this.parts = rest.length ? [rest] : [];
    this.length = rest.length;
  }

  private drain(): Float32Array {
    const all = new Float32Array(this.length);
    let o = 0;
    for (const p of this.parts) {
      all.set(p, o);
      o += p.length;
    }
    this.parts = [];
    this.length = 0;
    return all;
  }
}
