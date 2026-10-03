import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MODELS, PROFILES, dtypesFor, modelFiles } from './models.ts';

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

test('modelFiles lists the ONNX files a profile downloads', () => {
  assert.deepEqual(modelFiles(PROFILES.compact.webgpuF16), [
    { repo: MODELS.whisper, path: 'onnx/encoder_model_fp16.onnx' },
    { repo: MODELS.whisper, path: 'onnx/decoder_model_merged_q4f16.onnx' },
    { repo: MODELS.embed, path: 'onnx/model_quantized.onnx' },
  ]);
  assert.deepEqual(modelFiles(PROFILES.quality.webgpu), [
    { repo: MODELS.whisper, path: 'onnx/encoder_model.onnx' },
    { repo: MODELS.whisper, path: 'onnx/decoder_model_merged_q4.onnx' },
    { repo: MODELS.embed, path: 'onnx/model.onnx' },
  ]);
});

test('a single whisper dtype applies to both whisper files', () => {
  assert.deepEqual(modelFiles(PROFILES.compact.wasm).map((f) => f.path), [
    'onnx/encoder_model_quantized.onnx',
    'onnx/decoder_model_merged_quantized.onnx',
    'onnx/model_quantized.onnx',
  ]);
});
