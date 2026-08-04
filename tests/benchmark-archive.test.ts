import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { jsdomHtmlParser } from '../src/conversion/jsdom-parser';
import type { CapabilityState, LanguageState } from '../src/export-domain';
import type { BrowserSummaryAdapter } from '../src/export-workflow';
import { createBenchmarkArchive } from '../src/benchmark/archive';
import { BENCHMARK_CORPUS } from '../src/benchmark/corpus';
import { runBenchmarkSuite, type BenchmarkSuite } from '../src/benchmark/runner';

const unavailableCapability: CapabilityState = { detector: 'unavailable', summarizer: 'unavailable' };
const unsupportedLanguage: LanguageState = { origin: 'unknown', alternatives: [], supported: false };
const adapter: BrowserSummaryAdapter = {
  htmlParser: jsdomHtmlParser,
  checkCapability: async () => unavailableCapability,
  createLanguageDetector: async () => { throw new Error('unavailable'); },
  detectEligibleLanguage: async () => unsupportedLanguage,
  createSummarizer: async () => { throw new Error('unavailable'); },
  summarizeBlocks: async () => ({ summaries: [], chunkCount: 0, reductionStages: 0 }),
};

async function archiveEntries(suite: BenchmarkSuite): Promise<Record<string, Uint8Array>> {
  const archive = await createBenchmarkArchive(suite, {
    fetch: async () => new Response(new Uint8Array([137, 80, 78, 71]), { status: 200 }),
    environment: { browser: 'test' },
  });
  return unzipSync(new Uint8Array(await archive.arrayBuffer()));
}

describe('benchmark archive', () => {
  it('packages completed Markdown, conversion snapshots, and bundled fixture evidence', async () => {
    const fixture = BENCHMARK_CORPUS[0]!;
    const suite = await runBenchmarkSuite([
      { fixtureId: fixture.id, mode: 'complete', provider: 'none', detail: 100 },
    ], BENCHMARK_CORPUS, { adapter, clock: () => '2026-08-01T00:00:00.000Z' });
    const entries = await archiveEntries(suite);

    expect(Object.keys(entries)).toContain('benchmark-report.json');
    expect(Object.keys(entries)).toContain('README.txt');
    expect(Object.keys(entries)).toContain(`fixtures/${fixture.id}/source.png`);
    expect(Object.keys(entries)).toContain(`runs/${fixture.id}/complete--none--detail-100/result.md`);
    expect(Object.keys(entries)).toContain(`runs/${fixture.id}/complete--none--detail-100/conversion.md`);
    const report = JSON.parse(strFromU8(entries['benchmark-report.json']!)) as { outcomes: { completed: number } };
    expect(report.outcomes.completed).toBe(1);
    const metadata = JSON.parse(strFromU8(entries[`runs/${fixture.id}/complete--none--detail-100/metadata.json`]!)) as { expectedConversionSha256: string; observedConversionSha256: string };
    expect(metadata.expectedConversionSha256).toBe(metadata.observedConversionSha256);
  });

  it('keeps cancelled cells report-only in a partial archive', async () => {
    const fixture = BENCHMARK_CORPUS[0]!;
    const complete = await runBenchmarkSuite([
      { fixtureId: fixture.id, mode: 'complete', provider: 'none', detail: 100 },
    ], BENCHMARK_CORPUS, { adapter });
    const cancelled = { fixture, definition: { fixtureId: fixture.id, mode: 'focused' as const, provider: 'browser' as const, detail: 40 }, status: 'cancelled' as const };
    const partial: BenchmarkSuite = {
      ...complete,
      definitions: [...complete.definitions, cancelled.definition],
      runs: [...complete.runs, cancelled],
      selectedMatrixIsComplete: false,
    };
    const entries = await archiveEntries(partial);

    expect(Object.keys(entries)).not.toContain(`runs/${fixture.id}/focused--browser--detail-40/result.md`);
    const report = JSON.parse(strFromU8(entries['benchmark-report.json']!)) as { outcomes: { cancelled: number }; selectedMatrixIsComplete: boolean };
    expect(report.outcomes.cancelled).toBe(1);
    expect(report.selectedMatrixIsComplete).toBe(false);
  });
});
