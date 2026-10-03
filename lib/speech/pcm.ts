import { SAMPLE_RATE } from './audio.ts';

/** Resamples to 16 kHz, averaging the source samples behind each output sample (a cheap low-pass, fine for speech). */
export function resampleTo16k(input: Float32Array, fromRate: number): Float32Array {
  if (fromRate === SAMPLE_RATE) return input.slice();
  const ratio = fromRate / SAMPLE_RATE;
  const out = new Float32Array(Math.floor(input.length / ratio));
  for (let i = 0; i < out.length; i++) {
    const a = Math.floor(i * ratio);
    const b = Math.min(input.length, Math.floor((i + 1) * ratio));
    let sum = 0;
    for (let j = a; j < b; j++) sum += input[j];
    out[i] = b > a ? sum / (b - a) : input[a];
  }
  return out;
}
