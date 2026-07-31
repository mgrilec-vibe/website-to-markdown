import { strToU8, zip as zipAsync, type Zippable } from 'fflate';
import type { BenchmarkCorpusFixture } from './corpus';
import type { BenchmarkChecks, BenchmarkRun, BenchmarkSuite, BenchmarkTiming } from './runner';

export const BENCHMARK_ARCHIVE_SCHEMA_VERSION = 1 as const;

export interface BenchmarkArchiveOptions {
  readonly fetch?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  readonly environment?: Record<string, unknown>;
  readonly now?: () => string;
}

export interface BenchmarkRunMetadata {
  readonly schemaVersion: typeof BENCHMARK_ARCHIVE_SCHEMA_VERSION;
  readonly status: BenchmarkRun['status'];
  readonly fixture: Pick<BenchmarkCorpusFixture, 'id' | 'manifest'>;
  readonly definition: BenchmarkRun['definition'];
  readonly expectedConversionSha256?: string;
  readonly observedConversionSha256?: string;
  readonly conversionSnapshotPath?: string;
  readonly outputSha256?: string;
  readonly checks?: BenchmarkChecks;
  readonly timings?: BenchmarkTiming;
  readonly capability?: unknown;
  readonly language?: unknown;
  readonly exportMetadata?: unknown;
  readonly browserFailure?: string;
  readonly error?: string;
}

export interface BenchmarkArchiveOutcomes {
  readonly completed: number;
  readonly failed: number;
  readonly cancelled: number;
  readonly failedGoldenChecks: number;
  readonly localAiResults: number;
  readonly browserFallbacks: number;
}

export interface BenchmarkArchiveReport {
  readonly schemaVersion: typeof BENCHMARK_ARCHIVE_SCHEMA_VERSION;
  readonly matrixVersion: BenchmarkSuite['matrixVersion'];
  readonly completedAt: string;
  readonly selectedMatrixIsComplete: boolean;
  readonly definitions: BenchmarkSuite['definitions'];
  readonly runs: readonly Record<string, unknown>[];
  readonly outcomes: BenchmarkArchiveOutcomes;
}

const encoder = new TextEncoder();

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return [...new Uint8Array(digest)].map((part) => part.toString(16).padStart(2, '0')).join('');
}

function json(value: unknown): Uint8Array {
  return strToU8(JSON.stringify(value, null, 2));
}

function localScreenshotUrl(url: string): boolean {
  if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) return true;
  try {
    const protocol = new URL(url).protocol;
    return protocol === 'chrome-extension:' || protocol === 'moz-extension:' || protocol === 'file:';
  } catch {
    return false;
  }
}

async function screenshotBytes(fixture: BenchmarkCorpusFixture, fetchImpl: NonNullable<BenchmarkArchiveOptions['fetch']>): Promise<Uint8Array> {
  if (!localScreenshotUrl(fixture.sourceScreenshot.url)) {
    throw new Error(`Refusing non-local screenshot URL for ${fixture.id}`);
  }
  const response = await fetchImpl(fixture.sourceScreenshot.url);
  if (!response.ok) throw new Error(`Unable to fetch screenshot for ${fixture.id}: ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
}

function runKey(run: BenchmarkRun): string {
  const { fixtureId, mode, provider, detail } = run.definition;
  return `${fixtureId}/${mode}--${provider}--detail-${detail}`;
}

function fixtureIdentity(fixture: BenchmarkCorpusFixture): Pick<BenchmarkCorpusFixture, 'id' | 'manifest'> {
  return { id: fixture.id, manifest: fixture.manifest };
}

function runRecord(run: BenchmarkRun): Record<string, unknown> {
  if (run.status === 'completed') {
    return {
      key: runKey(run),
      status: run.status,
      fixture: fixtureIdentity(run.fixture),
      definition: run.definition,
      checks: run.checks,
      timings: run.timings,
      outputSha256: run.outputSha256,
      actualSummaryOrigin: run.finalExport.result.metadata.summaryOrigin,
      capability: run.finalExport.capability,
      language: run.finalExport.language,
      browserFailure: run.finalExport.browserFailure,
    };
  }
  if (run.status === 'failed') return { key: runKey(run), status: run.status, fixture: fixtureIdentity(run.fixture), definition: run.definition, timings: run.timings, error: run.error };
  return { key: runKey(run), status: run.status, fixture: fixtureIdentity(run.fixture), definition: run.definition };
}

function outcomes(runs: readonly BenchmarkRun[]): BenchmarkArchiveOutcomes {
  return {
    completed: runs.filter((run) => run.status === 'completed').length,
    failed: runs.filter((run) => run.status === 'failed').length,
    cancelled: runs.filter((run) => run.status === 'cancelled').length,
    failedGoldenChecks: runs.filter((run) => run.status === 'completed' && run.checks.golden === 'fail').length,
    localAiResults: runs.filter((run) => run.status === 'completed' && run.finalExport.result.metadata.summaryOrigin === 'local-ai').length,
    browserFallbacks: runs.filter((run) => run.status === 'completed' && run.definition.provider === 'browser' && run.definition.detail < 100 && run.finalExport.result.metadata.summaryOrigin === 'deterministic-diverse-extractive').length,
  };
}

function readEnvironment(override?: Record<string, unknown>): Record<string, unknown> {
  return override ?? {
    userAgent: typeof navigator === 'undefined' ? undefined : navigator.userAgent,
    language: typeof navigator === 'undefined' ? undefined : navigator.language,
    platform: typeof navigator === 'undefined' ? undefined : navigator.platform,
  };
}

function readme(): string {
  return 'Website to Markdown benchmark archive\n\nThis archive is schema-versioned and contains only locally bundled corpus evidence and benchmark runs. `expected-*.md` is conversion-stage golden Markdown used for comparison; it intentionally has no final-export frontmatter. Completed runs store exact final-export Markdown in `result.md`, including its frontmatter, and the byte-compared conversion snapshot in `conversion.md`. Failed and cancelled cells remain in benchmark-report.json but have no fabricated result Markdown.\n';
}

export async function createBenchmarkArchive(suite: BenchmarkSuite, options: BenchmarkArchiveOptions = {}): Promise<Blob> {
  const fetchImpl = options.fetch ?? ((input, init) => fetch(input, init));
  const files: Zippable = {
    'benchmark-report.json': json({
      schemaVersion: BENCHMARK_ARCHIVE_SCHEMA_VERSION,
      matrixVersion: suite.matrixVersion,
      completedAt: suite.completedAt,
      selectedMatrixIsComplete: suite.selectedMatrixIsComplete,
      definitions: suite.definitions,
      runs: suite.runs.map(runRecord),
      outcomes: outcomes(suite.runs),
    } satisfies BenchmarkArchiveReport),
    'environment.json': json(readEnvironment(options.environment)),
    'README.txt': strToU8(readme()),
  };
  for (const fixture of suite.runs.map((run) => run.fixture).filter((fixture, index, all) => all.findIndex((item) => item.id === fixture.id) === index)) {
    const base = `fixtures/${fixture.id}`;
    files[base] = {
      'manifest.json': json(fixture.manifest),
      'complete.html': strToU8(fixture.captured.completeHtml),
      ...(fixture.captured.focusedHtml === undefined ? {} : { 'focused.html': strToU8(fixture.captured.focusedHtml) }),
      'expected-complete.md': strToU8(fixture.expectedMarkdown.complete),
      'expected-focused.md': strToU8(fixture.expectedMarkdown.focused),
      [fixture.sourceScreenshot.fileName]: await screenshotBytes(fixture, fetchImpl),
    };
  }
  for (const run of suite.runs) {
    if (run.status !== 'completed') continue;
    const base = `runs/${runKey(run)}`;
    const expected = run.fixture.expectedMarkdown[run.definition.mode];
    files[base] = {
      'result.md': strToU8(run.finalExport.result.markdown),
      'conversion.md': strToU8(run.conversionMarkdown),
      'metadata.json': json({
        schemaVersion: BENCHMARK_ARCHIVE_SCHEMA_VERSION,
        status: run.status,
        fixture: fixtureIdentity(run.fixture),
        definition: run.definition,
        expectedConversionSha256: await sha256(expected),
        observedConversionSha256: await sha256(run.conversionMarkdown),
        conversionSnapshotPath: `fixtures/${run.fixture.id}/expected-${run.definition.mode}.md`,
        outputSha256: run.outputSha256,
        checks: run.checks,
        timings: run.timings,
        capability: run.finalExport.capability,
        language: run.finalExport.language,
        exportMetadata: run.finalExport.result.metadata,
        ...(run.finalExport.browserFailure ? { browserFailure: run.finalExport.browserFailure } : {}),
      } satisfies BenchmarkRunMetadata),
    };
  }
  const bytes = await new Promise<Uint8Array>((resolve, reject) => {
    zipAsync(files, {}, (error, data) => error ? reject(error) : resolve(data));
  });
  return new Blob([bytes.buffer as ArrayBuffer], { type: 'application/zip' });
}

export interface BenchmarkArchiveDownloadOptions { readonly document?: Document; readonly filename?: string; }

export function downloadBenchmarkArchive(blob: Blob, options: BenchmarkArchiveDownloadOptions = {}): Blob {
  const documentRef = options.document ?? (typeof document === 'undefined' ? undefined : document);
  if (!documentRef) return blob;
  const url = URL.createObjectURL(blob);
  const link = documentRef.createElement('a');
  link.href = url;
  link.download = options.filename ?? 'benchmark-archive.zip';
  link.rel = 'noopener';
  documentRef.body?.append(link);
  link.click();
  link.remove();
  if (typeof URL.revokeObjectURL === 'function') setTimeout(() => URL.revokeObjectURL(url), 0);
  return blob;
}
