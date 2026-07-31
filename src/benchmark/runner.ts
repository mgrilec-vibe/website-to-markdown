import {
  checkLocalAiCapability,
  createLanguageDetector,
  createSummarizer,
  detectEligibleLanguage,
  summarizeBlocks,
  type LocalAiCreateOptions,
} from '../export-ai';
import { detailPolicy } from '../export-compression';
import { browserHtmlParser, convertCapturedPage, type HtmlParser, type MarkdownConversion } from '../conversion';
import { createFinalExport, type BrowserSummaryAdapter, type FinalExport, type FinalExportProgress } from '../export-workflow';
import type {
  CapabilityState,
  ExportMode,
  LanguageState,
  MarkdownBlock,
  SummarizationProvider,
} from '../export-domain';
import type { BenchmarkCorpusFixture } from './corpus';

export const BENCHMARK_MATRIX_VERSION = 1 as const;
export const BENCHMARK_DETAIL_VALUES = [0, 15, 40, 65, 85, 100] as const;
const BENCHMARK_MODES = ['complete', 'focused'] as const;
const encoder = new TextEncoder();

export interface BenchmarkRunDefinition {
  readonly fixtureId: string;
  readonly mode: ExportMode;
  readonly provider: SummarizationProvider;
  readonly detail: number;
}

export type BenchmarkRunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface BenchmarkTiming {
  readonly conversionMs: number;
  readonly capabilityMs?: number;
  readonly languageDetectorMs?: number;
  readonly languageDetectionMs?: number;
  readonly summarizerCreationMs?: number;
  readonly summarizationMs?: number;
  readonly totalMs: number;
}

export interface BenchmarkChecks {
  readonly golden?: 'pass' | 'fail';
  readonly output: 'pass' | 'fail';
  readonly provenance: 'pass' | 'fail';
  readonly providerOrigin: 'pass' | 'fail';
  readonly noModelAtMaximumDetail?: 'pass' | 'fail';
}

export interface CompletedBenchmarkRun {
  readonly definition: BenchmarkRunDefinition;
  readonly fixture: BenchmarkCorpusFixture;
  readonly status: 'completed';
  readonly finalExport: FinalExport;
  readonly checks: BenchmarkChecks;
  readonly conversion: MarkdownConversion;
  readonly conversionMarkdown: string;
  readonly timings: BenchmarkTiming;
  readonly outputSha256: string;
}

export interface FailedBenchmarkRun {
  readonly definition: BenchmarkRunDefinition;
  readonly fixture: BenchmarkCorpusFixture;
  readonly status: 'failed';
  readonly error: string;
  readonly timings: Pick<BenchmarkTiming, 'totalMs'>;
}

export interface CancelledBenchmarkRun {
  readonly definition: BenchmarkRunDefinition;
  readonly fixture: BenchmarkCorpusFixture;
  readonly status: 'cancelled';
}

export type BenchmarkRun = CompletedBenchmarkRun | FailedBenchmarkRun | CancelledBenchmarkRun;

export interface BenchmarkSuite {
  readonly matrixVersion: typeof BENCHMARK_MATRIX_VERSION;
  readonly definitions: readonly BenchmarkRunDefinition[];
  readonly runs: readonly BenchmarkRun[];
  readonly selectedMatrixIsComplete: boolean;
  readonly completedAt: string;
}

export interface BenchmarkRunnerOptions {
  readonly adapter?: BrowserSummaryAdapter;
  readonly signal?: AbortSignal;
  readonly now?: () => number;
  readonly clock?: () => string;
  readonly onRunState?: (definition: BenchmarkRunDefinition, status: BenchmarkRunStatus) => void;
  readonly onProgress?: (definition: BenchmarkRunDefinition, progress: FinalExportProgress) => void;
}

interface MutableTimings {
  conversionMs: number;
  capabilityMs?: number;
  languageDetectorMs?: number;
  languageDetectionMs?: number;
  summarizerCreationMs?: number;
  summarizationMs?: number;
}

function withoutImplicitProvisioning(capability: CapabilityState): CapabilityState {
  const detectorNeedsProvisioning = capability.detector === 'downloadable' || capability.detector === 'downloading';
  const summarizerNeedsProvisioning = capability.summarizer === 'downloadable' || capability.summarizer === 'downloading';
  if (!detectorNeedsProvisioning && !summarizerNeedsProvisioning) return capability;
  return {
    ...capability,
    ...(detectorNeedsProvisioning
      ? { detector: 'unavailable' as const, detectorError: 'Provision the Chrome local model explicitly before running Browser benchmark cells.' }
      : {}),
    ...(summarizerNeedsProvisioning
      ? { summarizer: 'unavailable' as const, summarizerError: 'Provision the Chrome local model explicitly before running Browser benchmark cells.' }
      : {}),
  };
}

const browserBenchmarkAdapter: BrowserSummaryAdapter = {
  htmlParser: browserHtmlParser,
  checkCapability: async () => withoutImplicitProvisioning(await checkLocalAiCapability()),
  createLanguageDetector,
  detectEligibleLanguage,
  createSummarizer,
  summarizeBlocks,
};

function elapsed(now: () => number, start: number): number {
  return Math.max(0, now() - start);
}

function markdownFromBlocks(blocks: readonly MarkdownBlock[]): string {
  return `${blocks
    .filter((block) => block.kind !== 'provenance')
    .map((block) => block.markdown.trim())
    .filter(Boolean)
    .join('\n\n')}\n`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function timingAdapter(adapter: BrowserSummaryAdapter, timings: MutableTimings, now: () => number): BrowserSummaryAdapter {
  const timed = async <T>(name: keyof MutableTimings, operation: () => Promise<T>): Promise<T> => {
    const started = now();
    try {
      return await operation();
    } finally {
      timings[name] = elapsed(now, started);
    }
  };

  const parser: HtmlParser = {
    parseHtml(html, baseUrl) {
      return adapter.htmlParser.parseHtml(html, baseUrl);
    },
  };

  return {
    htmlParser: parser,
    checkCapability: () => timed('capabilityMs', () => adapter.checkCapability()),
    createLanguageDetector: (options?: LocalAiCreateOptions) => timed('languageDetectorMs', () => adapter.createLanguageDetector(options)),
    detectEligibleLanguage: (prose, declaredLanguage, detector) => timed('languageDetectionMs', () => adapter.detectEligibleLanguage(prose, declaredLanguage, detector)),
    createSummarizer: (policy, language, options) => timed('summarizerCreationMs', () => adapter.createSummarizer(policy, language, options)),
    summarizeBlocks: (session, blocks) => timed('summarizationMs', () => adapter.summarizeBlocks(session, blocks)),
  };
}

function check(condition: boolean): 'pass' | 'fail' {
  return condition ? 'pass' : 'fail';
}

function checksFor(
  fixture: BenchmarkCorpusFixture,
  definition: BenchmarkRunDefinition,
  conversionMarkdown: string,
  finalExport: FinalExport,
): BenchmarkChecks {
  const output = finalExport.result.markdown.trim().length > 0 ? 'pass' : 'fail';
  const provenance = finalExport.result.metadata.sourceUrl === fixture.manifest.provenance.finalUrl
    && finalExport.result.markdown.includes('source_url:')
    ? 'pass'
    : 'fail';
  const origin = finalExport.result.metadata.summaryOrigin;
  const providerOrigin = definition.provider === 'none'
    ? check(origin === 'none')
    : definition.provider === 'custom' && definition.detail < 100
      ? check(origin === 'deterministic-diverse-extractive')
      : definition.detail === 100
        ? check(origin === 'none')
        : check(origin === 'local-ai' || origin === 'deterministic-diverse-extractive');
  const golden = definition.provider === 'none'
    ? conversionMarkdown === fixture.expectedMarkdown[definition.mode] ? 'pass' : 'fail'
    : undefined;
  const noModelAtMaximumDetail = definition.provider === 'browser' && definition.detail === 100
    ? origin === 'none' && finalExport.result.metadata.generatedSummaryCount === 0 ? 'pass' : 'fail'
    : undefined;

  return { output, provenance, providerOrigin, ...(golden ? { golden } : {}), ...(noModelAtMaximumDetail ? { noModelAtMaximumDetail } : {}) };
}

export function createDefaultBenchmarkMatrix(fixtures: readonly BenchmarkCorpusFixture[]): readonly BenchmarkRunDefinition[] {
  return fixtures.flatMap((fixture) => BENCHMARK_MODES.flatMap((mode) => [
    { fixtureId: fixture.manifest.id, mode, provider: 'none' as const, detail: 100 },
    ...BENCHMARK_DETAIL_VALUES.map((detail) => ({ fixtureId: fixture.manifest.id, mode, provider: 'custom' as const, detail })),
    ...BENCHMARK_DETAIL_VALUES.map((detail) => ({ fixtureId: fixture.manifest.id, mode, provider: 'browser' as const, detail })),
  ]));
}

export async function runBenchmarkCell(
  definition: BenchmarkRunDefinition,
  fixture: BenchmarkCorpusFixture,
  options: BenchmarkRunnerOptions = {},
): Promise<CompletedBenchmarkRun | FailedBenchmarkRun> {
  const now = options.now ?? (() => performance.now());
  const started = now();
  const timings: MutableTimings = { conversionMs: 0 };
  const adapter = options.adapter ?? browserBenchmarkAdapter;

  try {
    const conversionStarted = now();
    const conversion = convertCapturedPage(fixture.captured, definition.mode, adapter.htmlParser);
    timings.conversionMs = elapsed(now, conversionStarted);
    const conversionMarkdown = markdownFromBlocks(conversion.blocks);
    const finalExport = await createFinalExport(
      fixture.captured,
      definition.mode,
      definition.detail,
      definition.provider,
      timingAdapter(adapter, timings, now),
      (progress) => options.onProgress?.(definition, progress),
    );
    return {
      definition,
      fixture,
      status: 'completed',
      finalExport,
      checks: checksFor(fixture, definition, conversionMarkdown, finalExport),
      conversion,
      conversionMarkdown,
      timings: { ...timings, totalMs: elapsed(now, started) },
      outputSha256: await sha256(finalExport.result.markdown),
    };
  } catch (error) {
    return {
      definition,
      fixture,
      status: 'failed',
      error: errorMessage(error),
      timings: { totalMs: elapsed(now, started) },
    };
  }
}

export async function runBenchmarkSuite(
  definitions: readonly BenchmarkRunDefinition[],
  fixtures: readonly BenchmarkCorpusFixture[],
  options: BenchmarkRunnerOptions = {},
): Promise<BenchmarkSuite> {
  const byId = new Map(fixtures.map((fixture) => [fixture.manifest.id, fixture]));
  const runs: BenchmarkRun[] = [];
  let cancelled = false;

  for (const definition of definitions) {
    const fixture = byId.get(definition.fixtureId);
    if (!fixture) throw new Error(`Benchmark matrix references unknown fixture: ${definition.fixtureId}`);
    if (options.signal?.aborted) {
      cancelled = true;
      options.onRunState?.(definition, 'cancelled');
      runs.push({ definition, fixture, status: 'cancelled' });
      continue;
    }
    options.onRunState?.(definition, 'running');
    const run = await runBenchmarkCell(definition, fixture, options);
    options.onRunState?.(definition, run.status);
    runs.push(run);
  }

  return {
    matrixVersion: BENCHMARK_MATRIX_VERSION,
    definitions: [...definitions],
    runs,
    selectedMatrixIsComplete: !cancelled && runs.length === definitions.length && runs.every((run) => run.status === 'completed'),
    completedAt: (options.clock ?? (() => new Date().toISOString()))(),
  };
}

export function isBrowserModelAttempt(definition: BenchmarkRunDefinition): boolean {
  return definition.provider === 'browser' && detailPolicy(definition.detail).detail < 100;
}
