import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDeck, shuffle, type DeckSelection } from './deck.ts';
import { seedContent } from './content/seed.ts';

const frontendReact: DeckSelection = {
  industryId: 'technology',
  roleFamilyId: 'software-engineering',
  specialisationId: 'frontend',
  stacks: ['react'],
  level: 'mid',
  types: [],
};

test('frontend deck includes universal, frontend and selected stack questions', () => {
  const ids = buildDeck(seedContent, frontendReact).map((q) => q.id);
  assert.ok(ids.includes('U-01'), 'universal');
  assert.ok(ids.includes('FE-01'), 'specialisation');
  assert.ok(ids.includes('RE-01'), 'selected stack');
});

test('unselected stacks, other industries and higher levels are excluded', () => {
  const ids = buildDeck(seedContent, frontendReact).map((q) => q.id);
  assert.ok(!ids.includes('NX-03'), 'Next.js not selected');
  assert.ok(!ids.includes('MA-01'), 'other industry');
  assert.ok(!ids.includes('SD-01'), 'senior question at mid level');
});

test('type filter narrows the deck', () => {
  const deck = buildDeck(seedContent, { ...frontendReact, types: ['situational'] });
  assert.ok(deck.length > 0);
  assert.ok(deck.every((q) => q.type === 'situational'));
});

test('M&A deck includes industry and universal questions', () => {
  const ids = buildDeck(seedContent, {
    industryId: 'm-and-a',
    roleFamilyId: 'm-and-a',
    specialisationId: 'ma-analyst',
    stacks: [],
    level: 'mid',
    types: [],
  }).map((q) => q.id);
  assert.ok(ids.includes('VA-02') && ids.includes('U-02'));
  assert.ok(!ids.includes('FE-01'));
});

test('backend deck gets backend, shared engineering and selected stack questions only', () => {
  const ids = buildDeck(seedContent, {
    ...frontendReact,
    specialisationId: 'backend',
    stacks: ['nodejs'],
  }).map((q) => q.id);
  assert.ok(ids.includes('BE-01') && ids.includes('SE-01') && ids.includes('ND-01'));
  assert.ok(!ids.includes('PY-01'), 'Python not selected');
  assert.ok(!ids.includes('FE-01') && !ids.includes('FS-01'), 'other specialisations');
});

test('fullstack deck shares stack questions with frontend', () => {
  const ids = buildDeck(seedContent, {
    ...frontendReact,
    specialisationId: 'fullstack',
    stacks: ['react', 'nodejs'],
  }).map((q) => q.id);
  assert.ok(ids.includes('FS-01') && ids.includes('RE-01') && ids.includes('ND-01'));
  assert.ok(!ids.includes('FE-01') && !ids.includes('BE-01'));
});

test('shuffle keeps every item exactly once', () => {
  const input = Array.from({ length: 50 }, (_, i) => i);
  const out = shuffle(input);
  assert.equal(out.length, 50);
  assert.deepEqual([...out].sort((a, b) => a - b), input);
});
