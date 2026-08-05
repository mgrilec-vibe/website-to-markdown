export const EXPORT_FORMAT_VERSION = 1 as const;
export const SUPPORTED_SUMMARY_LANGUAGES = ['en', 'es', 'ja', 'de', 'fr'] as const;

export type ExportMode = 'focused' | 'complete';
export type SummarizationProvider = 'none' | 'browser' | 'custom';
export type SummaryOrigin = 'none' | 'deterministic-diverse-extractive' | 'local-ai';
export type BlockKind = 'provenance' | 'protected' | 'removable' | 'summarizable';
export type ModelAvailability = 'available' | 'downloadable' | 'downloading' | 'unavailable' | 'cancelled' | 'failed' | 'unchecked';
export type LanguageOrigin = 'detected' | 'declared' | 'mixed' | 'unknown';
export type SummaryLength = 'short' | 'medium' | 'long';
export type SummaryType = 'key-points' | 'tldr' | 'headline';

export interface CaptureMetadata {
  readonly title: string;
  readonly sourceUrl: string;
  readonly canonicalUrl?: string;
  readonly capturedAt: string;
  readonly pageLanguage?: string;
}

export interface CapturedPage {
  readonly metadata: CaptureMetadata;
  readonly focusedHtml?: string;
  readonly completeHtml: string;
  readonly limitations: readonly string[];
}

export interface MarkdownBlock {
  readonly id: string;
  readonly markdown: string;
  readonly kind: BlockKind;
  readonly sourceOrder: number;
}

export interface DetailPolicy {
  readonly version: 1 | 2;
  readonly detail: number;
  readonly retainRatio: number;
  readonly extractiveSentenceRatio: number;
  readonly summaryEnabled: boolean;
  readonly summaryLength?: SummaryLength;
  readonly summaryType?: SummaryType;
  readonly description: string;
}

export interface LanguageState {
  readonly origin: LanguageOrigin;
  readonly declaredLanguage?: string;
  readonly primaryLanguage?: string;
  readonly confidence?: number;
  readonly alternatives: readonly LanguageCandidate[];
  readonly supported: boolean;
  readonly warning?: string;
}

export interface LanguageCandidate {
  readonly language: string;
  readonly confidence: number;
}

export interface CapabilityState {
  readonly detector: ModelAvailability;
  readonly summarizer: ModelAvailability;
  readonly detectorError?: string;
  readonly summarizerError?: string;
}

export interface ExportMetadata extends CaptureMetadata {
  readonly exportMode: ExportMode;
  readonly requestedProvider: SummarizationProvider;
  readonly compressionMode: 'complete' | 'custom-extractive' | 'local-ai-assisted';
  readonly summaryOrigin: SummaryOrigin;
  readonly detail: number;
  readonly words: number;
  readonly bytes: number;
  readonly language: LanguageState;
  readonly generatedSummaryCount: number;
  readonly summaryChunkCount: number;
  readonly policyVersion: 1 | 2;
}

export interface CompressionResult {
  readonly markdown: string;
  readonly metadata: ExportMetadata;
  readonly removedBlockIds: readonly string[];
  readonly summarizableBlocks: readonly MarkdownBlock[];
  readonly blocks: readonly MarkdownBlock[];
}

export interface StoredExport {
  readonly id: string;
  readonly captured: CapturedPage;
}