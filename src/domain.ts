export const SUITE_VERSION = '1.0.0';
export const REPORT_SCHEMA_VERSION = 1;

export type BlockClass = 'protected' | 'removable' | 'summarizable';
export type BlockKind =
  | 'frontmatter'
  | 'heading'
  | 'paragraph'
  | 'link-list'
  | 'code'
  | 'table'
  | 'quote'
  | 'callout'
  | 'chrome';

export interface FixtureBlock {
  readonly id: string;
  readonly classification: BlockClass;
  readonly kind: BlockKind;
  readonly markdown: string;
  readonly label: string;
}

export interface FixtureExpectations {
  readonly version: string;
  readonly requiredProtectedBlockIds: readonly string[];
  readonly requiredRemovedBlockIds: readonly string[];
  readonly expectedSummaryInputBlockIds: readonly string[];
}

export interface AssessmentFixture {
  readonly id: string;
  readonly title: string;
  readonly category: 'article' | 'documentation' | 'code' | 'table' | 'long-prose' | 'fallback';
  readonly blocks: readonly FixtureBlock[];
  readonly expectations: FixtureExpectations;
}

export type CompressionProfileId = 'full-source' | 'compact' | 'brief' | 'outline';
export type SummaryType = 'key-points' | 'tldr' | 'teaser' | 'headline';
export type SummaryLength = 'short' | 'medium' | 'long';
export type SummaryPreference = 'auto' | 'speed' | 'capability';
export type SupportedSummaryLanguage = 'de' | 'en' | 'es' | 'fr' | 'ja';

export interface SummarizerSettings {
  readonly type: SummaryType;
  readonly length: SummaryLength;
  readonly format: 'markdown';
  readonly preference: SummaryPreference;
  readonly expectedInputLanguages: readonly SupportedSummaryLanguage[];
  readonly expectedContextLanguages: readonly SupportedSummaryLanguage[];
  readonly outputLanguage: SupportedSummaryLanguage;
}

export interface CompressionPolicy {
  readonly id: CompressionProfileId;
  readonly label: string;
  readonly description: string;
  readonly includeSummarizableSource: boolean;
  readonly summarize: SummarizerSettings | null;
}

export type AvailabilityState = 'unavailable' | 'downloadable' | 'downloading' | 'available' | 'unknown';
export type ProvisioningState =
  | 'not-checked'
  | 'available'
  | 'downloadable'
  | 'downloading'
  | 'creating-session'
  | 'ready'
  | 'cancelled'
  | 'failed'
  | 'unavailable';

export type ProvisionEventKind =
  | 'availability'
  | 'session-create-start'
  | 'monitor-attached'
  | 'monitor-listener-registered'
  | 'download-progress'
  | 'session-created'
  | 'cancelled'
  | 'error';

export interface ProvisionEvent {
  readonly id: string;
  readonly at: string;
  readonly elapsedMs: number;
  readonly kind: ProvisionEventKind;
  readonly detail: string;
  readonly progress: number | null;
  readonly context: Readonly<Record<string, string | number | boolean | null>>;
}

export interface CapabilityDiagnostic {
  readonly apiPresent: boolean;
  readonly availability: AvailabilityState;
  readonly browserUserAgent: string;
  readonly checkedAt: string;
  readonly sessionOutcome: 'not-attempted' | 'created' | 'cancelled' | 'failed';
  readonly events: readonly ProvisionEvent[];
  readonly error: string | null;
}

export interface SummaryStage {
  readonly inputBlockIds: readonly string[];
  readonly output: string;
  readonly status: 'completed' | 'failed';
  readonly error: string | null;
}

export interface StructuralCheck {
  readonly name: string;
  readonly passed: boolean;
  readonly detail: string;
}

export interface CompressionMetrics {
  readonly words: number;
  readonly bytes: number;
  readonly durationMs: number;
}

export interface CompressionResult {
  readonly mode: 'deterministic' | 'local-ai';
  readonly fixtureId: string;
  readonly profileId: CompressionProfileId;
  readonly output: string;
  readonly removedBlockIds: readonly string[];
  readonly summaryInputBlockIds: readonly string[];
  readonly summaryStages: readonly SummaryStage[];
  readonly structuralChecks: readonly StructuralCheck[];
  readonly metrics: CompressionMetrics;
  readonly error: string | null;
}

export interface PairedResult {
  readonly fixture: AssessmentFixture;
  readonly profile: CompressionPolicy;
  readonly deterministic: CompressionResult;
  readonly localAi: CompressionResult | null;
}

export type RelativeUsefulness = 'better' | 'same' | 'worse' | 'not-reviewed';

export interface ReviewerInput {
  readonly centralClaimPreserved: boolean | null;
  readonly materialOmissionFound: boolean | null;
  readonly protectedStructuresSurvived: boolean | null;
  readonly relativeUsefulness: RelativeUsefulness;
  readonly notes: string;
}

export interface FixtureReport {
  readonly fixtureId: string;
  readonly profileId: CompressionProfileId;
  readonly deterministic: CompressionResult;
  readonly localAi: CompressionResult | null;
  readonly reviewer: ReviewerInput;
}

export interface AssessmentReport {
  readonly schemaVersion: number;
  readonly suiteVersion: string;
  readonly startedAt: string;
  readonly generatedAt: string;
  readonly capability: CapabilityDiagnostic;
  readonly policies: readonly CompressionPolicy[];
  readonly results: readonly FixtureReport[];
}
