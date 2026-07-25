import { describe, expect, it } from 'vitest';
import { compressDeterministic, compressFixture, GENERATED_BOUNDARY } from '../src/compression';
import { FIXTURES } from '../src/fixtures';
import { getCompressionPolicy } from '../src/policies';

const article = FIXTURES.find((fixture) => fixture.id === 'article-chrome')!;

describe('deterministic compression', () => {
  it('removes chrome and preserves every protected block verbatim', () => {
    const result = compressDeterministic(article, getCompressionPolicy('full-source'));
    expect(result.output).toContain('source: bundled-assessment');
    expect(result.output).toContain('# Designing Calm Interfaces');
    expect(result.output).toContain('https://example.invalid/interface-checklist');
    expect(result.output).toContain('> A quiet surface can still make important state visible.');
    expect(result.output).not.toContain('Home / Topics / Synthetic Systems');
    expect(result.output).not.toContain('Share · Save · Print');
    expect(result.removedBlockIds).toEqual(['article-breadcrumb', 'article-share']);
    expect(result.structuralChecks.every((check) => check.passed)).toBe(true);
  });

  it('exposes only eligible prose to the replacement summary provider', async () => {
    const inputs: string[] = [];
    const result = await compressFixture(article, getCompressionPolicy('brief'), {
      summarize: ({ input }) => {
        inputs.push(input);
        return '- Calm hierarchy makes the next action clear.';
      },
    });
    expect(inputs).toHaveLength(1);
    expect(inputs[0]).toContain('A calm interface makes the next useful action obvious');
    expect(inputs[0]).not.toContain('Designing Calm Interfaces');
    expect(inputs[0]).not.toContain('https://example.invalid/interface-checklist');
    expect(result.output).toContain(GENERATED_BOUNDARY);
    expect(result.output).toContain('- Calm hierarchy makes the next action clear.');
    expect(result.output).toContain('# Designing Calm Interfaces');
    expect(result.summaryStages[0]?.status).toBe('completed');
  });

  it('retains the deterministic output when summary generation fails', async () => {
    const result = await compressFixture(article, getCompressionPolicy('compact'), {
      summarize: () => { throw new Error('model unavailable'); },
    });
    expect(result.error).toBe('model unavailable');
    expect(result.summaryStages[0]?.status).toBe('failed');
    expect(result.output).toContain('A calm interface makes the next useful action obvious');
    expect(result.output).not.toContain(GENERATED_BOUNDARY);
  });
});
