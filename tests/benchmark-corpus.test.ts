import { describe, expect, it } from 'vitest';
import {
  BENCHMARK_CORPUS,
  BENCHMARK_FIXTURE_IDS,
  assertValidBenchmarkCorpus,
  validateBenchmarkCorpus,
} from '../src/benchmark/corpus';

describe('browser benchmark corpus', () => {
  it('contains the ten fixtures in deterministic order with every asset', () => {
    expect(BENCHMARK_CORPUS.map((fixture) => fixture.id)).toEqual([...BENCHMARK_FIXTURE_IDS]);
    expect(BENCHMARK_CORPUS).toHaveLength(10);
    for (const fixture of BENCHMARK_CORPUS) {
      expect(fixture.manifest.id).toBe(fixture.id);
      expect(fixture.captured.completeHtml).toMatch(/\S/u);
      expect(fixture.captured.focusedHtml).toMatch(/\S/u);
      expect(fixture.expectedMarkdown.complete).toMatch(/\S/u);
      expect(fixture.expectedMarkdown.focused).toMatch(/\S/u);
      expect(fixture.sourceScreenshot.fileName).toBe('source.png');
      expect(fixture.sourceScreenshot.url).toMatch(/source\.png$/u);
      expect(fixture.captured.metadata.sourceUrl).toBe(fixture.manifest.provenance.finalUrl);
    }
    expect(validateBenchmarkCorpus(BENCHMARK_CORPUS)).toEqual([]);
  });

  it('rejects missing records and order changes deterministically', () => {
    const missing = BENCHMARK_CORPUS.slice(0, -1);
    expect(validateBenchmarkCorpus(missing)).toEqual(expect.arrayContaining([
      expect.objectContaining({ fixtureId: 'technical-blog-cloudflare-pingora' }),
      expect.objectContaining({ fixtureId: 'corpus' }),
    ]));
    expect(() => assertValidBenchmarkCorpus([BENCHMARK_CORPUS[1]!, BENCHMARK_CORPUS[0]!, ...BENCHMARK_CORPUS.slice(2)])).toThrow(/expected api-reference-mdn-fetch/u);
  });

  it('exposes immutable corpus records', () => {
    expect(Object.isFrozen(BENCHMARK_CORPUS)).toBe(true);
    expect(Object.isFrozen(BENCHMARK_CORPUS[0])).toBe(true);
    expect(Object.isFrozen(BENCHMARK_CORPUS[0]!.manifest)).toBe(true);
  });
});
