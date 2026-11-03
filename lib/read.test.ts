import { test } from 'node:test';
import assert from 'node:assert/strict';
import { passagesForRole, pickRandom, paragraphs, readingMinutes, type RoleScope } from './read.ts';
import type { Passage } from './content/schema.ts';

const base = { kind: 'talk-about', text: 'x', status: 'approved' } as const;
const passages: Passage[] = [
  { ...base, id: 'universal', title: 'U', scope: {} },
  { ...base, id: 'fe', title: 'FE', scope: { industryId: 'technology', roleFamilyId: 'software-engineering', specialisationId: 'frontend' } },
  { ...base, id: 'react', title: 'React', scope: { industryId: 'technology', roleFamilyId: 'software-engineering', stack: 'react' } },
  { ...base, id: 'be', title: 'BE', scope: { industryId: 'technology', roleFamilyId: 'software-engineering', specialisationId: 'backend' } },
  { ...base, id: 'mna', title: 'MNA', scope: { industryId: 'm-and-a', roleFamilyId: 'm-and-a' } },
  { ...base, id: 'draft', title: 'Draft', scope: {}, status: 'to-review' },
];

const frontend: RoleScope = {
  industryId: 'technology',
  roleFamilyId: 'software-engineering',
  specialisationId: 'frontend',
  stacks: ['react', 'nextjs'],
};

test('a role gets universal, industry, specialisation and stack passages only', () => {
  const ids = passagesForRole(passages, frontend).map((p) => p.id);
  assert.deepEqual(ids, ['universal', 'fe', 'react']);
});

test('stack passages need the role to offer that stack', () => {
  const ids = passagesForRole(passages, { ...frontend, specialisationId: 'backend', stacks: ['nodejs'] }).map((p) => p.id);
  assert.deepEqual(ids, ['universal', 'be']);
});

test('only approved passages are returned', () => {
  assert.ok(!passagesForRole(passages, frontend).some((p) => p.id === 'draft'));
});

test('pickRandom never repeats the current passage when there is a choice', () => {
  const list = passagesForRole(passages, frontend);
  for (let i = 0; i < 50; i++) assert.notEqual(pickRandom(list, 'fe')?.id, 'fe');
  assert.equal(pickRandom([list[0]], list[0].id)?.id, list[0].id, 'single passage is still returned');
  assert.equal(pickRandom([], undefined), undefined);
});

test('splits text into paragraphs and estimates reading time', () => {
  assert.deepEqual(paragraphs('One.\n\n  Two.  \n\n\nThree.'), ['One.', 'Two.', 'Three.']);
  assert.equal(readingMinutes('word '.repeat(140)), 1);
  assert.equal(readingMinutes('word '.repeat(300)), 2);
});

test('seed passages link to real questions and share their scope', async () => {
  const { seedContent } = await import('./content/seed.ts');
  const byId = new Map(seedContent.questions.map((q) => [q.id, q]));
  for (const p of seedContent.passages) {
    assert.ok(p.text.split(/\s+/).length < 260, `${p.id} is short enough to read in about two minutes`);
    if (p.kind !== 'model-answer') continue;
    const q = byId.get(p.questionId ?? '');
    assert.ok(q, `${p.id} links to an existing question`);
    assert.deepEqual(p.scope, q!.scope, `${p.id} uses the scope of ${q!.id}`);
  }
});
