/**
 * Runs the golden answers through analyseAnswer with the real MiniLM model (downloaded on first run).
 *   npm run test:golden
 * Fails on a hard error: a strong answer rated Needs work, or an off-topic answer rated Strong.
 */
import { pipeline, type DataType, type FeatureExtractionPipeline } from '@huggingface/transformers';
import { analyseAnswer } from '../lib/analysis/analyse.ts';
import { wordsFromText } from '../lib/analysis/fixtures.ts';
import { goldenAnswers } from '../lib/analysis/golden.ts';
import { seedContent } from '../lib/content/seed.ts';
import { ACTIVE_PROFILE, MODELS, dtypesFor } from '../lib/speech/models.ts';

const expected = { strong: 'strong', partial: 'good', 'off-topic': 'needs-work' } as const;

// Same quantisation the app ships with (Node runs the WASM/CPU build).
// dtypesFor's `Dtypes.embed` is typed as plain `string` for flexibility across callers; the pipeline's
// own `dtype` option expects the narrower `DataType` union, so the known-good embed dtype needs a cast here.
const extractor = (await pipeline('feature-extraction', MODELS.embed, {
  dtype: dtypesFor(ACTIVE_PROFILE, 'wasm', false).embed as DataType,
})) as FeatureExtractionPipeline;
const embed = async (texts: string[]) => (await extractor(texts, { pooling: 'mean', normalize: true })).tolist() as number[][];

let agree = 0;
const hard: string[] = [];
for (const g of goldenAnswers) {
  const q = seedContent.questions.find((x) => x.id === g.questionId);
  if (!q) throw new Error(`Unknown question ${g.questionId}`);
  const r = await analyseAnswer({ words: wordsFromText(g.text), segments: [], tips: q.tips, embed });
  const rating = r.graded ? r.content.rating : 'not-graded';
  if (rating === expected[g.kind]) agree++;
  if ((g.kind === 'strong' && rating === 'needs-work') || (g.kind === 'off-topic' && rating === 'strong')) {
    hard.push(`${g.questionId} ${g.kind} → ${rating}`);
  }
  console.log(`${g.questionId.padEnd(6)} ${g.kind.padEnd(9)} → ${rating.padEnd(10)} ${r.graded ? r.content.lines.join(' | ') : ''}`);
}

console.log(`\nAgreement with expected ratings: ${agree}/${goldenAnswers.length} (${Math.round((100 * agree) / goldenAnswers.length)}%)`);
if (hard.length) {
  console.error(`Hard failures:\n  ${hard.join('\n  ')}`);
  process.exit(1);
}
