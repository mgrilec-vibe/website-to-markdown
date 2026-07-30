import type { CapturedPage, ExportMode } from '../export-domain';

export const WEBSITE_EVALUATION_SCHEMA_VERSION = 1 as const;
export const WEBSITE_EVALUATION_DEFAULT_FIXTURE_ID = 'api-reference-mdn-fetch' as const;

export const EVALUATION_CATEGORIES = [
  'api-reference',
  'developer-guide',
  'rendered-documentation',
  'technical-blog',
  'editorial-article',
  'knowledge-reference',
  'question-answer',
  'forum-thread',
  'release-notes',
  'conversion-boundary',
] as const;

export type EvaluationCategory = (typeof EVALUATION_CATEGORIES)[number];
export type FocusExpectation = 'article' | 'thread' | 'ambiguous' | 'unavailable';
export type EvaluationTargetKind = 'approved-fixture' | 'candidate-capture';
export type ReviewGrade = number | 'not-gradeable';

export interface CaptureProfile {
  readonly viewport: {
    readonly width: number;
    readonly height: number;
  };
  readonly readyState: 'domcontentloaded' | 'load';
  readonly readySelector?: string;
  readonly screenshotMode?: 'full-page' | 'viewport';
  readonly stabilityMs: number;
  readonly navigationTimeoutMs: number;
  readonly maxRedirects: number;
  readonly maxResponseBytes: number;
}

export interface CaptureProvenance {
  readonly originUrl: string;
  readonly finalUrl: string;
  readonly capturedAt: string;
  readonly documentSha256: string;
  readonly screenshotSha256: string;
  readonly profile: CaptureProfile;
}

export interface FocusEvidence {
  readonly pageTitle: string;
  readonly readabilityTitle?: string;
  readonly selectedHeading?: string;
}

export interface FixtureSourceReview {
  readonly reviewedAt: string;
  readonly reviewer: string;
  readonly sourceUseApproved: boolean;
}

export interface EvaluationFixtureManifest {
  readonly schemaVersion: typeof WEBSITE_EVALUATION_SCHEMA_VERSION;
  readonly id: string;
  readonly category: EvaluationCategory;
  readonly tags: readonly string[];
  readonly publisherDomain: string;
  readonly markupPlatform: string;
  readonly expectedFocus: FocusExpectation;
  readonly provenance: CaptureProvenance;
  readonly focusEvidence: FocusEvidence;
  readonly limitations: readonly string[];
  readonly sourceReview: FixtureSourceReview;
}

export interface EvaluationFixtureEvidence {
  readonly manifest: EvaluationFixtureManifest;
  readonly captured: CapturedPage;
  readonly expectedMarkdown: Readonly<Record<ExportMode, string>>;
  readonly screenshot: Uint8Array;
}

export interface EvaluationTarget {
  readonly kind: EvaluationTargetKind;
  readonly fixtureId?: string;
  readonly url?: string;
}

export interface EvaluationStructuralCheck {
  readonly name: string;
  readonly passed: boolean;
  readonly detail: string;
}

export interface EvaluationModeResult {
  readonly mode: ExportMode;
  readonly markdown: string;
  readonly outputSha256: string;
  readonly outputBytes: number;
  readonly limitations: readonly string[];
  readonly structuralChecks: readonly EvaluationStructuralCheck[];
  readonly goldenCheck?: 'pass' | 'fail';
}

export interface WebsiteEvaluationReport {
  readonly schemaVersion: typeof WEBSITE_EVALUATION_SCHEMA_VERSION;
  readonly target: EvaluationTarget;
  readonly fixtureId?: string;
  readonly provenance: CaptureProvenance;
  readonly generatedAt: string;
  readonly results: Readonly<Record<ExportMode, EvaluationModeResult>>;
}

export interface ReviewDeduction {
  readonly points: number;
  readonly reason: string;
  readonly sourceEvidence: string;
  readonly markdownEvidence: string;
}

export interface ModeReview {
  readonly grade: ReviewGrade;
  readonly rubric: Readonly<Record<string, number>>;
  readonly deductions: readonly ReviewDeduction[];
  readonly limitations: readonly string[];
  readonly rationale: string;
}

export interface WebsiteConversionReview {
  readonly fixtureId?: string;
  readonly complete: ModeReview;
  readonly focused: ModeReview;
}
