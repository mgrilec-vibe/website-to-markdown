export const CONVERSION_REPORT_SCHEMA_VERSION = 1;
export const CONVERSION_SUITE_VERSION = '1.0.0';

export type ConversionCheck = 'pass' | 'fail';

export interface ConversionEnvironment {
  readonly nodeVersion?: string;
  readonly parser: string;
  readonly turndownVersion: string;
  readonly readabilityVersion: string;
}

export interface ConversionFixtureReport {
  readonly fixtureId: string;
  readonly mode: 'complete' | 'focused';
  readonly focusExtractionMs?: number;
  readonly parseMs: number;
  readonly conversionMs: number;
  readonly classificationMs: number;
  readonly outputBytes: number;
  readonly outputSha256: string;
  readonly goldenSha256: string;
  readonly blockCount: number;
  readonly limitations: readonly string[];
  readonly structuralCheck: ConversionCheck;
  readonly goldenCheck: ConversionCheck;
  readonly diffSummary?: string;
}

export interface ConversionReportOutcomes {
  readonly results: number;
  readonly failedStructuralChecks: number;
  readonly failedGoldenDiffs: number;
}

export interface ConversionReport {
  readonly schemaVersion: number;
  readonly suiteVersion: string;
  readonly startedAt: string;
  readonly generatedAt: string;
  readonly environment: ConversionEnvironment;
  readonly results: readonly ConversionFixtureReport[];
  readonly outcomes: ConversionReportOutcomes;
}

export type ConversionReportInput = Pick<ConversionReport, 'environment' | 'results'> &
  Partial<Pick<ConversionReport, 'schemaVersion' | 'suiteVersion' | 'startedAt' | 'generatedAt'>>;

export type ConversionReportClock = () => string;

export interface ConversionReportDownloadOptions {
  readonly filename?: string;
  readonly pretty?: boolean;
  readonly document?: Document;
}

const DEFAULT_FILENAME = 'conversion-report.json';

export function createConversionReport(
  input: ConversionReportInput,
  clock: ConversionReportClock = () => new Date().toISOString(),
): ConversionReport {
  const startedAt = input.startedAt ?? clock();
  const generatedAt = input.generatedAt ?? clock();
  const results = input.results.map((result) => ({ ...result, limitations: [...result.limitations] }));
  return {
    schemaVersion: input.schemaVersion ?? CONVERSION_REPORT_SCHEMA_VERSION,
    suiteVersion: input.suiteVersion ?? CONVERSION_SUITE_VERSION,
    startedAt,
    generatedAt,
    environment: { ...input.environment },
    results,
    outcomes: {
      results: results.length,
      failedStructuralChecks: results.filter((result) => result.structuralCheck === 'fail').length,
      failedGoldenDiffs: results.filter((result) => result.goldenCheck === 'fail').length,
    },
  };
}

export function serializeConversionReport(report: ConversionReport, pretty = true): string {
  return JSON.stringify(report, null, pretty ? 2 : 0);
}

export function createConversionReportBlob(report: ConversionReport, pretty = true): Blob {
  return new Blob([serializeConversionReport(report, pretty)], { type: 'application/json' });
}

export function downloadConversionReport(
  report: ConversionReport,
  options: ConversionReportDownloadOptions = {},
): Blob {
  const blob = createConversionReportBlob(report, options.pretty ?? true);
  const documentRef = options.document ?? (typeof document === 'undefined' ? undefined : document);
  if (!documentRef) return blob;

  const url = URL.createObjectURL(blob);
  const link = documentRef.createElement('a');
  link.href = url;
  link.download = options.filename ?? DEFAULT_FILENAME;
  link.rel = 'noopener';
  documentRef.body?.append(link);
  link.click();
  link.remove();
  if (typeof URL.revokeObjectURL === 'function') setTimeout(() => URL.revokeObjectURL(url), 0);
  return blob;
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
