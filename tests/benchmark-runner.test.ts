import { describe, expect, it } from 'vitest';
import { jsdomHtmlParser } from '../src/conversion/jsdom-parser';
import type { BrowserSummaryAdapter } from '../src/export-workflow';
import type { CapabilityState, LanguageState } from '../src/export-domain';
import { BENCHMARK_CORPUS } from '../src/benchmark/corpus';
import {
  createDefaultBenchmarkMatrix,
  createQuickBenchmarkMatrix,
  isBrowserModelAttempt,
  runBenchmarkCell,
  runBenchmarkSuite,
} from '../src/benchmark/runner';

const unavailableCapability: CapabilityState = { detector: 'unavailable', summarizer: 'unavailable' };
const unsupportedLanguage: LanguageState = { origin: 'unknown', alternatives: [], supported: false };

const unavailableAdapter: BrowserSummaryAdapter = {
  htmlParser: jsdomHtmlParser,
  checkCapability: async () => unavailableCapability,
  createLanguageDetector: async () => { throw new Error('unavailable'); },
  detectEligibleLanguage: async () => unsupportedLanguage,
  createSummarizer: async () => { throw new Error('unavailable'); },
  summarizeBlocks: async () => ({ summaries: [], chunkCount: 0, reductionStages: 0 }),
};

describe('benchmark runner', () => {
  it('creates the stable 130-cell focused default matrix', () => {
    const matrix = createDefaultBenchmarkMatrix(BENCHMARK_CORPUS);

    expect(matrix).toHaveLength(130);
    expect(matrix[0]).toEqual({ fixtureId: 'api-reference-mdn-fetch', mode: 'focused', provider: 'none', detail: 100 });
    expect(matrix[12]).toEqual({ fixtureId: 'api-reference-mdn-fetch', mode: 'focused', provider: 'browser', detail: 100 });
    expect(matrix[13]).toEqual({ fixtureId: 'boundary-threejs-webgl', mode: 'focused', provider: 'none', detail: 100 });
    expect(matrix.every((definition) => definition.mode === 'focused')).toBe(true);
    expect(matrix.filter(isBrowserModelAttempt)).toHaveLength(50);
  });

  it('creates a three-cell focused quick matrix', () => {
    const matrix = createQuickBenchmarkMatrix(BENCHMARK_CORPUS);

    expect(matrix).toEqual([
      { fixtureId: 'api-reference-mdn-fetch', mode: 'focused', provider: 'none', detail: 100 },
      { fixtureId: 'api-reference-mdn-fetch', mode: 'focused', provider: 'custom', detail: 40 },
      { fixtureId: 'api-reference-mdn-fetch', mode: 'focused', provider: 'browser', detail: 40 },
    ]);
  });

  it('compares None against the conversion golden and keeps final Markdown separately', async () => {
    const fixture = BENCHMARK_CORPUS[0]!;
    const run = await runBenchmarkCell(
      { fixtureId: fixture.id, mode: 'complete', provider: 'none', detail: 100 },
      fixture,
      { adapter: unavailableAdapter },
    );

    expect(run.status).toBe('completed');
    if (run.status !== 'completed') return;
    expect(run.checks).toMatchObject({ golden: 'pass', output: 'pass', provenance: 'pass', providerOrigin: 'pass' });
    expect(run.conversionMarkdown).toBe(fixture.expectedMarkdown.complete);
    expect(run.finalExport.result.markdown).toContain('source_url:');
    expect(run.outputSha256).toMatch(/^[a-f0-9]{64}$/u);
  });

  it('records Browser fallback and serial cancellation without fabricating outputs', async () => {
    const fixture = BENCHMARK_CORPUS[0]!;
    const controller = new AbortController();
    const runs = await runBenchmarkSuite([
      { fixtureId: fixture.id, mode: 'complete', provider: 'browser', detail: 40 },
    ], BENCHMARK_CORPUS, { adapter: unavailableAdapter, signal: controller.signal });

    expect(runs.runs[0]).toMatchObject({ status: 'completed' });
    const completed = runs.runs[0];
    if (!completed || completed.status !== 'completed') return;
    expect(completed.finalExport.result.metadata.summaryOrigin).toBe('deterministic-diverse-extractive');
    expect(completed.checks.providerOrigin).toBe('pass');

    controller.abort();
    const cancelled = await runBenchmarkSuite([
      { fixtureId: fixture.id, mode: 'complete', provider: 'none', detail: 100 },
    ], BENCHMARK_CORPUS, { adapter: unavailableAdapter, signal: controller.signal });
    expect(cancelled.runs).toMatchObject([{ status: 'cancelled' }]);
    expect(cancelled.selectedMatrixIsComplete).toBe(false);
  });

  it('reports conversion, capability, and finalization stages', async () => {
    const fixture = BENCHMARK_CORPUS[0]!;
    const stages: string[] = [];

    await runBenchmarkCell(
      { fixtureId: fixture.id, mode: 'complete', provider: 'browser', detail: 40 },
      fixture,
      { adapter: unavailableAdapter, onStage: (_definition, stage) => stages.push(stage) },
    );

    expect(stages[0]).toBe('converting');
    expect(stages).toContain('checking-capability');
    expect(stages.at(-1)).toBe('finalizing');
  });
});
