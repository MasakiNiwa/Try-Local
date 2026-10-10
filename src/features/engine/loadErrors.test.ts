import { describe, expect, it } from 'vitest';
import { classifyLoadError, explainLoadError, isWebModelName } from './loadErrors';

describe('classifyLoadError', () => {
  it('LiteRT-LM のエラーメッセージを分類する', () => {
    expect(classifyLoadError('No GPU adapter found.')).toBe('webgpu');
    expect(classifyLoadError('Streaming HF_Tokenizer_Zlib section is not supported yet.')).toBe(
      'streaming-unsupported',
    );
    expect(classifyLoadError('Invalid magic number or failed to read: xx')).toBe('invalid-file');
    expect(classifyLoadError('Array buffer allocation failed')).toBe('memory');
    expect(classifyLoadError('something else')).toBe('unknown');
  });
});

describe('isWebModelName / explainLoadError', () => {
  it('Web 版でないファイルには Web 版を勧める', () => {
    expect(isWebModelName('gemma-4-E2B-it-web.litertlm')).toBe(true);
    expect(isWebModelName('gemma-4-E2B-it.litertlm')).toBe(false);
    expect(explainLoadError('streaming-unsupported', 'gemma-4-E2B-it.litertlm')).toContain(
      '-web.litertlm',
    );
    expect(explainLoadError('unknown', 'gemma-4-E2B-it-web.litertlm')).toBeUndefined();
  });
});
