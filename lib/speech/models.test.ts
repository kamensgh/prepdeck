import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PROFILES, dtypesFor } from './models.ts';

test('dtypesFor picks the wasm, webgpu or webgpu-f16 dtypes', () => {
  assert.equal(dtypesFor('compact', 'wasm', true), PROFILES.compact.wasm);
  assert.equal(dtypesFor('compact', 'webgpu', true), PROFILES.compact.webgpuF16);
  assert.equal(dtypesFor('compact', 'webgpu', false), PROFILES.compact.webgpu);
  assert.equal(dtypesFor('quality', 'webgpu', false), PROFILES.quality.webgpu);
});

test('no profile asks for f16 weights without shader-f16', () => {
  for (const id of ['quality', 'compact'] as const) {
    assert.ok(!JSON.stringify(dtypesFor(id, 'webgpu', false)).includes('16'));
    assert.ok(!JSON.stringify(dtypesFor(id, 'wasm', false)).includes('16'));
  }
});
