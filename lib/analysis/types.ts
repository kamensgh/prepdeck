/** A transcribed word; times are seconds from the start of the recording. */
export type Word = { text: string; start: number; end: number };
/** A stretch of detected speech, in seconds from the start of the recording. */
export type Segment = { start: number; end: number };
export type Rating = 'strong' | 'good' | 'needs-work';
/** A long silence; `before` holds up to three words spoken just before it ("" for the lead-in). */
export type Pause = { start: number; end: number; duration: number; before: string };
/** Voiced time no transcribed word accounts for (a held "um" Whisper folded into a word), after words[afterIndex]. */
export type Hesitation = { afterIndex: number; duration: number; before: string };

export type FluencyMetrics = {
  counts: { filler: string; count: number }[]; // most frequent first
  total: number;
  perMinute: number;
  indexes: number[]; // indexes into words[], for highlighting
  hesitations: Hesitation[]; // perMinute counts fillers and hesitations
};
export type PacingMetrics = {
  answerSec: number; // recording start → end of last speech
  wordsPerMinute: number;
  longPauses: Pause[];
  longest: Pause | null;
};
export type RubricPoint = { text: string; covered: boolean };
export type ContentMetrics = {
  mode: 'rubric' | 'structure';
  points: RubricPoint[];
  coverage: number; // 0..1
  avoidHit: string | null;
};
export type Dimension = { rating: Rating; lines: string[] };
export type GradedResult = {
  graded: true;
  content: Dimension;
  fluency: Dimension;
  pacing: Dimension;
  words: Word[];
  fillerIndexes: number[];
  longPauses: Pause[];
  hesitations: Hesitation[];
  englishWarning: boolean;
};
export type Result = GradedResult | { graded: false; reason: 'too-short'; words: Word[] };
export type Embed = (texts: string[]) => Promise<number[][]>;
