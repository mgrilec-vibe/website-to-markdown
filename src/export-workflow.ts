import {
  checkLocalAiCapability,
  createLanguageDetector,
  createSummarizer,
  detectEligibleLanguage,
  summarizeBlocks,
  type LanguageDetectorSession,
  type LocalAiCreateOptions,
  type LocalSummaryOutput,
  type SummarizerSession,
} from './export-ai';
import {
  completeCompression,
  detailPolicy,
  deterministicCompression,
  deterministicExtractiveCompression,
  unknownLanguageState,
  withGeneratedSummaries,
} from './export-compression';
import { browserHtmlParser, convertCapturedPage, type HtmlParser, type MarkdownConversion } from './conversion';
import type {
  CapabilityState,
  CapturedPage,
  CompressionResult,
  DetailPolicy,
  ExportMode,
  LanguageState,
  MarkdownBlock,
  SummarizationProvider,
} from './export-domain';

export interface BrowserSummaryAdapter {
  readonly htmlParser: HtmlParser;
  readonly checkCapability: () => Promise<CapabilityState>;
  readonly createLanguageDetector: (options?: LocalAiCreateOptions) => Promise<LanguageDetectorSession>;
  readonly detectEligibleLanguage: (prose: string, declaredLanguage: string | undefined, detector: LanguageDetectorSession | undefined) => Promise<LanguageState>;
  readonly createSummarizer: (policy: DetailPolicy, language: LanguageState, options?: LocalAiCreateOptions) => Promise<SummarizerSession>;
  readonly summarizeBlocks: (session: SummarizerSession, blocks: readonly MarkdownBlock[]) => Promise<LocalSummaryOutput>;
}

const browserSummaryAdapter: BrowserSummaryAdapter = {
  htmlParser: browserHtmlParser,
  checkCapability: checkLocalAiCapability,
  createLanguageDetector,
  detectEligibleLanguage,
  createSummarizer,
  summarizeBlocks,
};

export interface FinalExport {
  readonly result: CompressionResult;
  readonly capability: CapabilityState;
  readonly language: LanguageState;
  readonly browserFailure?: string;
}

export type FinalExportProgress = 'converting' | 'summarizing';

function customFallback(
  captured: CapturedPage,
  conversion: MarkdownConversion,
  mode: ExportMode,
  detail: number,
  language: LanguageState,
  capability: CapabilityState,
  browserFailure: string,
): FinalExport {
  return {
    result: deterministicExtractiveCompression(captured, conversion, mode, detail, language, 'browser'),
    capability,
    language,
    browserFailure,
  };
}

export async function createFinalExport(
  captured: CapturedPage,
  mode: ExportMode,
  detail: number,
  provider: SummarizationProvider,
  adapter: BrowserSummaryAdapter = browserSummaryAdapter,
  onProgress?: (progress: FinalExportProgress) => void,
): Promise<FinalExport> {
  onProgress?.('converting');
  const conversion = convertCapturedPage(captured, mode, adapter.htmlParser);
  const language = unknownLanguageState(captured.metadata.pageLanguage);
  const unchecked: CapabilityState = { detector: 'unchecked', summarizer: 'unchecked' };
  if (provider === 'none') return { result: completeCompression(captured, conversion, mode, language), capability: unchecked, language };
  if (detailPolicy(detail).detail === 100) {
    return {
      result: deterministicCompression(captured, conversion, mode, detail, language, provider),
      capability: unchecked,
      language,
    };
  }
  if (provider === 'custom') {
    return {
      result: deterministicExtractiveCompression(captured, conversion, mode, detail, language, 'custom'),
      capability: unchecked,
      language,
    };
  }

  let capability: CapabilityState;
  try {
    capability = await adapter.checkCapability();
  } catch (error) {
    const browserFailure = error instanceof Error ? error.message : 'Chrome local summarization could not be checked.';
    return customFallback(captured, conversion, mode, detail, language, { detector: 'failed', summarizer: 'failed', summarizerError: browserFailure }, browserFailure);
  }
  if (capability.detector === 'unavailable' || capability.detector === 'cancelled' || capability.detector === 'failed' || capability.summarizer === 'unavailable' || capability.summarizer === 'cancelled' || capability.summarizer === 'failed') {
    const browserFailure = capability.detectorError ?? capability.summarizerError ?? 'Chrome local summarization is unavailable on this device.';
    return customFallback(captured, conversion, mode, detail, language, capability, browserFailure);
  }

  let session: SummarizerSession | undefined;
  try {
    const detector = await adapter.createLanguageDetector();
    const baseline = deterministicCompression(captured, conversion, mode, detail, language, 'browser');
    const prose = baseline.summarizableBlocks.map((block) => block.markdown).join('\n\n');
    const detectedLanguage = await adapter.detectEligibleLanguage(prose, captured.metadata.pageLanguage, detector);
    if (!detectedLanguage.supported) {
      return customFallback(captured, conversion, mode, detail, detectedLanguage, capability, detectedLanguage.warning ?? 'Chrome local summarization does not support this page language.');
    }
    session = await adapter.createSummarizer(detailPolicy(detail), detectedLanguage);
    onProgress?.('summarizing');
    const summary = await adapter.summarizeBlocks(session, baseline.summarizableBlocks);
    return {
      result: withGeneratedSummaries(baseline, summary.summaries, summary.chunkCount),
      capability,
      language: detectedLanguage,
    };
  } catch (error) {
    const browserFailure = error instanceof Error ? error.message : 'Chrome local summarization failed.';
    return customFallback(captured, conversion, mode, detail, language, { ...capability, summarizer: 'failed', summarizerError: browserFailure }, browserFailure);
  } finally {
    session?.destroy?.();
  }
}
