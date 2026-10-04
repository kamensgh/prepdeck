/** Every tunable number for grading and recording. Starting values; tuned during calibration (Task 14). */
export const MIN_WORDS = 15;

/** Fillers per minute. */
export const FLUENCY = { strongBelow: 3, goodUpTo: 6 } as const;

/** A word "should" take base + perChar × letters; voiced time beyond that, up to the next word, is a hesitation. */
export const HESITATION = { minVoicedSec: 0.8, baseWordSec: 0.25, perCharSec: 0.07 } as const;

export const PACING = {
  longPauseSec: 2.5,
  thinkingSec: 5, // silence before the first word that is free
  minWpm: 110,
  maxWpm: 170,
  minAnswerSec: 30,
  maxAnswerSec: 150,
  goodMaxPauses: 3,
} as const;

export const CONTENT = {
  strongFrom: 0.7,
  goodFrom: 0.4,
  coverSimilarity: 0.5,
  windowWords: 12,
  windowStep: 6,
  minRubricPoints: 3,
} as const;

/** Heuristic for "This works best for answers in English"; set from Stage 0 recordings. */
export const ENGLISH = { minSpeechSec: 20, minWordsPerSpeechSec: 1.0 } as const;

export const RECORDING = { maxSec: 180, countInSec: 3, flatMicSec: 5, flatRms: 0.001 } as const;

export const SEGMENTS = { joinGapSec: 0.1 } as const; // VAD segments split by a chunk cut are joined across gaps this small
