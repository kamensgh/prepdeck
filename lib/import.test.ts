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
