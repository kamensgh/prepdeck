import { formatClock } from './text.ts';
import { CONTENT, FLUENCY, PACING } from './thresholds.ts';
import type { ContentMetrics, Dimension, FluencyMetrics, PacingMetrics, Rating } from './types.ts';

const downgrade = (r: Rating): Rating => (r === 'strong' ? 'good' : 'needs-work');

export function rateFluency(m: FluencyMetrics): Dimension {
  const rating: Rating = m.perMinute < FLUENCY.strongBelow ? 'strong' : m.perMinute <= FLUENCY.goodUpTo ? 'good' : 'needs-work';
  const lines: string[] = [];
  if (m.counts.length > 0) {
    const top = m.counts.slice(0, 3).map((c) => `'${c.filler}' ${c.count} ${c.count === 1 ? 'time' : 'times'}`);
    lines.push(`you said ${top.join(', ')}`);
  }
  if (m.hesitations.length > 0) {
    const n = m.hesitations.length;
    const longest = m.hesitations.reduce((a, h) => (h.duration > a.duration ? h : a));
    lines.push(`${n} ${n === 1 ? 'hesitation' : 'hesitations'}, longest after '${longest.before}…'`);
  }
  if (lines.length === 0) lines.push('no filler words detected');
  return { rating, lines };
}

export function ratePacing(m: PacingMetrics): Dimension {
  const pauses = m.longPauses.length;
  const rateOff = m.wordsPerMinute < PACING.minWpm || m.wordsPerMinute > PACING.maxWpm;
  const lengthOff = m.answerSec < PACING.minAnswerSec || m.answerSec > PACING.maxAnswerSec;
  const rating: Rating =
    pauses <= 1 && !rateOff && !lengthOff ? 'strong' : pauses > PACING.goodMaxPauses || (rateOff && lengthOff) ? 'needs-work' : 'good';

  const lines: string[] = [];
  if (m.longest) {
    const secs = `${m.longest.duration.toFixed(1)}s`;
    lines.push(m.longest.before ? `longest pause ${secs}, after '${m.longest.before}…'` : `${secs} before you started speaking`);
  }
  if (pauses >= 2) lines.push(`${pauses} long pauses`);
  if (m.wordsPerMinute > PACING.maxWpm) lines.push(`${m.wordsPerMinute} words/min, slightly fast`);
  if (m.wordsPerMinute < PACING.minWpm) lines.push(`${m.wordsPerMinute} words/min, slightly slow`);
  if (m.answerSec < PACING.minAnswerSec) lines.push(`${formatClock(m.answerSec)}, quite short for this question`);
  if (m.answerSec > PACING.maxAnswerSec) lines.push(`${formatClock(m.answerSec)}, consider tightening`);
  if (lines.length === 0) lines.push('steady pace, no long pauses');
  return { rating, lines };
}

export function rateContent(m: ContentMetrics): Dimension {
  let rating: Rating = m.coverage >= CONTENT.strongFrom ? 'strong' : m.coverage >= CONTENT.goodFrom ? 'good' : 'needs-work';
  const covered = m.points.filter((p) => p.covered).length;
  const missed = m.points.filter((p) => !p.covered).map((p) => p.text);

  if (m.mode === 'structure') {
    return { rating, lines: [`covered ${covered} of 3 parts of a STAR answer`, ...missed.map((p) => `no clear ${p}`)] };
  }
  const lines = [`covered ${covered} of ${m.points.length} points${missed.length ? `; missed: ${missed.join(', ')}` : ''}`];
  if (m.avoidHit) {
    rating = downgrade(rating);
    lines.push(`⚠ sounded like: '${m.avoidHit}'`);
  }
  return { rating, lines };
}
