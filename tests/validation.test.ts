import { describe, expect, it } from 'vitest';
import { compressDeterministic } from '../src/compression';
import { FIXTURES } from '../src/fixtures';
import { getCompressionPolicy } from '../src/policies';
import { countBytes, countWords, validateCompressionResult } from '../src/validation';

describe('structural validation', () => {
  it('checks protected kinds, removals, and measured output sizes', () => {
    const fixture = FIXTURES.find((candidate) => candidate.id === 'table-reference')!;
    const result = compressDeterministic(fixture, getCompressionPolicy('full-source'));
    const names = result.structuralChecks.map((check) => check.name);
    expect(names).toEqual(expect.arrayContaining(['provenance', 'headings', 'links', 'code', 'tables', 'quotes', 'removals', 'output-words', 'output-bytes']));
    expect(result.metrics.words).toBe(countWords(result.output));
    expect(result.metrics.bytes).toBe(countBytes(result.output));
    expect(result.structuralChecks.every((check) => check.passed)).toBe(true);
  });

  it('fails when a protected block is altered or a removed block is restored', () => {
    const fixture = FIXTURES.find((candidate) => candidate.id === 'fallback')!;
    const result = compressDeterministic(fixture, getCompressionPolicy('full-source'));
    const broken = {
      ...result,
      output: result.output.replace('# Offline fallback', '# Changed heading') + '\n\nPrevious · Next · Subscribe',
    };
    const checks = validateCompressionResult(fixture, broken);
    expect(checks.find((check) => check.name === 'protected:fallback-heading')?.passed).toBe(false);
    expect(checks.find((check) => check.name === 'removed:fallback-chrome')?.passed).toBe(false);
  });
});
