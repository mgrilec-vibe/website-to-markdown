import {
  checkLocalAiCapability,
  createLanguageDetector,
  createSummarizer,
  detectEligibleLanguage,
  normalizeSummaryText,
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
  readonly summarizeBlocks: (session: SummarizerSession, blocks: readonly MarkdownBlock[], context?: string) => Promise<LocalSummaryOutput>;
}

export interface FocusedSummarySection {
  readonly id: string;
  readonly blockIds: readonly string[];
  readonly sourceOrder: number;
  readonly markdown: string;
}

export interface FocusedSummarySource {
  readonly sections: readonly FocusedSummarySection[];
  readonly blocks: readonly MarkdownBlock[];
  readonly blockIds: readonly string[];
  readonly text: string;
}

const SECONDARY_SECTION_HEADINGS = /^(?:specifications?|browser compatibility|see also|related(?: pages| links)?|navigation|sidebar|footer|table of contents)$/iu;

export function createFocusedSummarySource(conversion: MarkdownConversion): FocusedSummarySource {
  const selectedBlocks = conversion.blocks
    .filter((block) => block.kind !== 'provenance' && block.kind !== 'removable')
    .filter((block) => {
      const markdown = block.markdown.trim();
      if (/^```/mu.test(markdown) || /^\|.+\|\n\|[-:| ]+\|/u.test(markdown) || /^>/mu.test(markdown)) return false;
      return Boolean(normalizeSummaryText(markdown));
    });
  const grouped: MarkdownBlock[][] = [];
  let current: MarkdownBlock[] = [];
  for (const block of selectedBlocks) {
    if (current.length > 0 && /^#{1,6}\s/u.test(block.markdown.trim())) {
      grouped.push(current);
      current = [];
    }
    current.push(block);
  }
  if (current.length > 0) grouped.push(current);
  const sectionRecords = grouped.map((section) => {
    const markdown = section.map((block) => normalizeSummaryText(block.markdown)).filter(Boolean).join('\n\n');
    const lines = markdown.split('\n').map((line) => line.trim()).filter(Boolean);
    const heading = lines[0] ?? '';
    return { section, markdown, heading, hasSubstantiveText: lines.length > 1 || !/^#{1,6}\s/u.test(section[0]?.markdown.trim() ?? '') };
  });
  const sections = sectionRecords
    .filter((record) => !SECONDARY_SECTION_HEADINGS.test(record.heading) && record.hasSubstantiveText)
    .map((record, index) => ({
      id: `summary-section-${index + 1}`,
      blockIds: record.section.map((block) => block.id),
      sourceOrder: record.section[0]!.sourceOrder,
      markdown: record.markdown,
    }));
  const blocks = sections.map((section) => ({
    id: section.id,
    markdown: section.markdown,
    kind: 'summarizable' as const,
    sourceOrder: section.sourceOrder,
  }));
  return {
    sections,
    blocks,
    blockIds: sections.flatMap((section) => section.blockIds),
    text: sections.map((section) => section.markdown).join('\n\n'),
  };
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
  if (!captured.focusedHtml) {
    return customFallback(
      captured,
      conversion,
      mode,
      detail,
      language,
      unchecked,
      'Focused content is unavailable; Browser summarization was skipped.',
    );
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
  let currentLanguage = language;
  try {
    const detector = await adapter.createLanguageDetector();
    const summaryConversion = convertCapturedPage(captured, 'focused', adapter.htmlParser);
    const source = createFocusedSummarySource(summaryConversion);
    if (!source.blocks.length) {
      return customFallback(captured, conversion, mode, detail, language, capability, 'Focused content contains no eligible prose for local summarization.');
    }
    const detectedLanguage = await adapter.detectEligibleLanguage(source.text, captured.metadata.pageLanguage, detector);
    currentLanguage = detectedLanguage;
    if (!detectedLanguage.supported) {
      return customFallback(captured, conversion, mode, detail, detectedLanguage, capability, detectedLanguage.warning ?? 'Chrome local summarization does not support this page language.');
    }
    const baseline = deterministicCompression(captured, conversion, mode, detail, detectedLanguage, 'browser');
    const sharedContext = `This is focused primary content from the page titled "${captured.metadata.title}". The audience is a reader who wants a clear summary of the page's subject.`;
    const requestContext = 'Summarize the primary content. Emphasize the main behavior, important concepts, parameters, results, errors, and cautions. Ignore navigation, footer links, related-page indexes, and implementation metadata.';
    session = await adapter.createSummarizer(detailPolicy(detail), detectedLanguage, { sharedContext });
    onProgress?.('summarizing');
    const summary = await adapter.summarizeBlocks(session, source.blocks, requestContext);
    return {
      result: withGeneratedSummaries(
        { ...baseline, metadata: { ...baseline.metadata, language: detectedLanguage } },
        summary.summaries,
        summary.chunkCount,
      ),
      capability,
      language: detectedLanguage,
    };
  } catch (error) {
    const browserFailure = error instanceof Error ? error.message : 'Chrome local summarization failed.';
    return customFallback(captured, conversion, mode, detail, currentLanguage, { ...capability, summarizer: 'failed', summarizerError: browserFailure }, browserFailure);
  } finally {
    session?.destroy?.();
  }
}
