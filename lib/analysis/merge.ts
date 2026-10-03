import type { Segment } from './types.ts';

/** Moves chunk-relative times to recording time. */
export function shiftTimes<T extends { start: number; end: number }>(items: T[], offsetSec: number): T[] {
  return items.map((it) => ({ ...it, start: it.start + offsetSec, end: it.end + offsetSec }));
}

/** Sorts segments and joins those that touch or nearly touch: a chunk cut splits one stretch of speech in two. */
export function mergeSegments(segments: Segment[], joinGapSec = 0.1): Segment[] {
  const out: Segment[] = [];
  for (const s of [...segments].sort((a, b) => a.start - b.start)) {
    const last = out.at(-1);
    if (last && s.start - last.end <= joinGapSec) last.end = Math.max(last.end, s.end);
    else out.push({ ...s });
  }
  return out;
}
