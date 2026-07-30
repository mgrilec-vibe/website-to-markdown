import { describe, expect, it } from 'vitest';
import { estimateMarkdownTokens } from '../src/export-metrics';

describe('Markdown token estimate', () => {
  it('uses the ceiling of UTF-8 bytes divided by four for ASCII Markdown', () => {
    expect(estimateMarkdownTokens('abcde')).toBe(2);
  });

  it('counts UTF-8 bytes before estimating multibyte Markdown', () => {
    expect(estimateMarkdownTokens('é🙂')).toBe(2);
  });
});
