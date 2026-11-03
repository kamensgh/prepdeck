import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseBank, parseTips } from '../scripts/import-question-bank.ts';

test('parses tips into asking, hit and avoid', () => {
  const tips = parseTips('Asking: one thing. Hit: two, three. Avoid: four.');
  assert.deepEqual(tips, { asking: 'one thing.', hit: 'two, three.', avoid: 'four.' });
});

test('parses the question bank tables with scope and status', () => {
  const { docs, problems } = parseBank(readFileSync('scripts/fixtures/sample-bank.md', 'utf8'));
  assert.deepEqual(problems, []);
  assert.equal(docs.length, 5);
  const re01 = docs.find((d) => d.code === 'RE-01') as any;
  assert.equal(re01.status, 'approved');
  assert.equal(re01.scope.stack, 'react');
  assert.equal(re01.scope.roleFamily._ref, 'roleFamily-software-engineering');
  assert.equal(re01.scope.specialisation, undefined, 'stack questions are shared across roles');
  const u07 = docs.find((d) => d.code === 'U-07') as any;
  assert.equal(u07.type, 'culture-fit');
  assert.equal(u07.status, 'needs-edit');
  assert.deepEqual(u07.scope, {});
  const lr02 = docs.find((d) => d.code === 'LR-02') as any;
  assert.equal(lr02.scope.industry._ref, 'industry-m-and-a');
  const cs01 = docs.find((d) => d.code === 'CS-01') as any;
  assert.equal(cs01.type, 'case-study');
});

test('passage docs link strongly to imported questions and weakly to the rest', async () => {
  const { passageDocs } = await import('../scripts/import-question-bank.ts');
  const docs = passageDocs(new Set(['U-01'])) as any[];
  const u01 = docs.find((d) => d.code === 'RA-U-01');
  const fe01 = docs.find((d) => d.code === 'RA-FE-01');
  assert.equal(u01.question._ref, 'question-U-01');
  assert.equal(u01.question._weak, undefined);
  assert.equal(fe01.question._weak, true);
  assert.equal(fe01.scope.specialisation._ref, 'specialisation-frontend');
  assert.ok(docs.every((d) => d._type === 'passage' && d._id === `passage-${d.code}`));
});
