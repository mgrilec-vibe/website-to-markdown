import {
  REPORT_SCHEMA_VERSION,
  SUITE_VERSION,
  type AssessmentReport,
} from './domain';

/**
 * The caller supplies all run-specific evidence. Metadata is filled in here so
 * callers cannot accidentally omit the report and suite schema versions.
 */
export type AssessmentReportInput = Pick<AssessmentReport, 'capability' | 'policies' | 'results'> &
  Partial<Pick<AssessmentReport, 'schemaVersion' | 'suiteVersion' | 'startedAt' | 'generatedAt'>>;

export type ReportClock = () => string;

export interface ReportDownloadOptions {
  readonly filename?: string;
  readonly pretty?: boolean;
  /** Override the document in browser tests or embedded extension pages. */
  readonly document?: Document;
}

const DEFAULT_FILENAME = 'assessment-report.json';

/**
 * Construct a report without modifying the caller's result collection.
 * Generated summaries and final outputs remain in `results` by default; this
 * module deliberately performs no redaction or network submission.
 */
export function createAssessmentReport(
  input: AssessmentReportInput,
  clock: ReportClock = () => new Date().toISOString(),
): AssessmentReport {
  const startedAt = input.startedAt ?? clock();
  const generatedAt = input.generatedAt ?? clock();

  return {
    schemaVersion: input.schemaVersion ?? REPORT_SCHEMA_VERSION,
    suiteVersion: input.suiteVersion ?? SUITE_VERSION,
    startedAt,
    generatedAt,
    capability: input.capability,
    policies: input.policies.map((policy) => ({ ...policy })),
    results: input.results.map((result) => ({ ...result })),
  };
}

/**
 * Serialize a complete report for local download or test inspection.
 * `JSON.stringify` preserves generated fixture outputs, diagnostics, checks,
 * measurements, errors, and reviewer input because the report is serialized
 * as a whole rather than projected to metadata.
 */
export function serializeAssessmentReport(report: AssessmentReport, pretty = true): string {
  return JSON.stringify(report, null, pretty ? 2 : 0);
}

export function createReportBlob(report: AssessmentReport, pretty = true): Blob {
  return new Blob([serializeAssessmentReport(report, pretty)], {
    type: 'application/json',
  });
}

/**
 * Create a JSON Blob and, when a DOM document is available, start a local
 * browser download. With no document (for example in Vitest), this remains a
 * pure Blob-producing helper and performs no browser or network operation.
 */
export function downloadAssessmentReport(
  report: AssessmentReport,
  options: ReportDownloadOptions = {},
): Blob {
  const blob = createReportBlob(report, options.pretty ?? true);
  const documentRef = options.document ?? (typeof document === 'undefined' ? undefined : document);

  if (!documentRef) {
    return blob;
  }

  const url = URL.createObjectURL(blob);
  const link = documentRef.createElement('a');
  link.href = url;
  link.download = options.filename ?? DEFAULT_FILENAME;
  link.rel = 'noopener';
  documentRef.body?.append(link);
  link.click();
  link.remove();

  // Revoke after the click has been dispatched so the browser can consume the
  // object URL. The guard keeps the helper usable in lightweight DOM tests.
  if (typeof URL.revokeObjectURL === 'function') {
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  return blob;
}
