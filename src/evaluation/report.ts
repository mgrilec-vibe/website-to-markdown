import type { ExportMode } from '../export-domain';
import {
  WEBSITE_EVALUATION_SCHEMA_VERSION,
} from './domain';
import type {
  CaptureProvenance,
  EvaluationModeResult,
  EvaluationStructuralCheck,
  EvaluationTarget,
  WebsiteEvaluationReport,
} from './domain';

export type EvaluationCheck = 'pass' | 'fail';

export interface EvaluationModeResultInput {
  readonly mode: ExportMode;
  readonly markdown: string;
  readonly limitations?: readonly string[];
  readonly structuralChecks?: readonly EvaluationStructuralCheck[];
  readonly expectedMarkdown?: string;
  readonly goldenCheck?: EvaluationCheck;
}

export interface WebsiteEvaluationReportInput {
  readonly target: EvaluationTarget;
  readonly fixtureId?: string;
  readonly provenance: CaptureProvenance;
  readonly generatedAt?: string;
  readonly results: Readonly<Partial<Record<ExportMode, EvaluationModeResultInput>>>;
}

export type EvaluationReportClock = () => string;

/** Return the UTF-8 byte count for generated Markdown. */
export function countMarkdownBytes(markdown: string): number {
  return new TextEncoder().encode(markdown).byteLength;
}

/** Return a lowercase SHA-256 digest for generated Markdown. */
export async function sha256Hex(markdown: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(markdown));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Compare generated Markdown with the approved fixture golden. */
export function checkExpectedMarkdown(markdown: string, expectedMarkdown: string): EvaluationCheck {
  return markdown === expectedMarkdown ? 'pass' : 'fail';
}

/** Report whether every supplied deterministic structural check passed. */
export function checkStructuralChecks(checks: readonly EvaluationStructuralCheck[]): boolean {
  return checks.every((check) => check.passed);
}

export async function createEvaluationModeResult(input: EvaluationModeResultInput): Promise<EvaluationModeResult> {
  const goldenCheck = input.expectedMarkdown === undefined
    ? input.goldenCheck
    : checkExpectedMarkdown(input.markdown, input.expectedMarkdown);

  const result: EvaluationModeResult = {
    mode: input.mode,
    markdown: input.markdown,
    outputSha256: await sha256Hex(input.markdown),
    outputBytes: countMarkdownBytes(input.markdown),
    limitations: [...(input.limitations ?? [])],
    structuralChecks: (input.structuralChecks ?? []).map((check) => ({ ...check })),
    ...(goldenCheck === undefined ? {} : { goldenCheck }),
  };
  return result;
}

export async function createWebsiteEvaluationReport(
  input: WebsiteEvaluationReportInput,
  clock: EvaluationReportClock = () => new Date().toISOString(),
): Promise<WebsiteEvaluationReport> {
  const completeInput = input.results.complete;
  const focusedInput = input.results.focused;
  if (!completeInput || !focusedInput) {
    throw new Error('Website evaluation reports require both complete and focused results.');
  }
  if (completeInput.mode !== 'complete' || focusedInput.mode !== 'focused') {
    throw new Error('Evaluation result keys must match their complete or focused mode.');
  }

  const generatedAt = input.generatedAt ?? clock();
  const results: Record<ExportMode, EvaluationModeResult> = {
    complete: await createEvaluationModeResult(completeInput),
    focused: await createEvaluationModeResult(focusedInput),
  };
  const target = { ...input.target };
  const profile = {
    ...input.provenance.profile,
    viewport: { ...input.provenance.profile.viewport },
  };
  const provenance = { ...input.provenance, profile };
  const fixtureId = input.fixtureId ?? input.target.fixtureId;
  const report: WebsiteEvaluationReport = {
    schemaVersion: WEBSITE_EVALUATION_SCHEMA_VERSION,
    target,
    provenance,
    generatedAt,
    results,
    ...(fixtureId === undefined ? {} : { fixtureId }),
  };
  return report;
}

export function serializeWebsiteEvaluationReport(report: WebsiteEvaluationReport, pretty = true): string {
  return JSON.stringify(report, null, pretty ? 2 : 0);
}
