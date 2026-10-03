export const SAMPLE_RATE = 16000;

/** Root-mean-square level of a block of samples, 0 for silence. */
export function rms(buf: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
  return buf.length ? Math.sqrt(sum / buf.length) : 0;
}

/** Decodes a recorded blob and resamples it to 16 kHz mono, the format Whisper and Silero expect. */
export async function decodeTo16kMono(blob: Blob): Promise<Float32Array> {
  const ctx = new AudioContext({ sampleRate: SAMPLE_RATE });
  try {
    const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
    return decoded.getChannelData(0).slice();
  } finally {
    void ctx.close();
  }
}
