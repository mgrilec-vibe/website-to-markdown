import {
  extractiveSummariesByBlock,
  rankBlocksForRetention,
  createStructureAwareExtractiveSummaries,
  sentenceSimilarity as graphSentenceSimilarity,
} from './extractive-summarizer';
import type {
  CapturedPage,
  CompressionResult,
  DetailPolicy,
  ExportMetadata,
  ExportMode,
  LanguageState,
  MarkdownBlock,
  SummarizationProvider,
  SummaryOrigin,
} from './export-domain';
import type { MarkdownConversion } from './conversion';

const encoder = new TextEncoder();
const DETAIL_POLICY_VERSION = 2 as const;

export function detailPolicy(detail: number): DetailPolicy {
  const normalized = Math.max(0, Math.min(100, Math.round(detail)));
  const extractiveSentenceRatio = normalized === 100 ? 0 : Math.max(0, Math.min(1, normalized / 100));
  if (normalized === 100) {
    return { version: DETAIL_POLICY_VERSION, detail: normalized, retainRatio: 1, extractiveSentenceRatio, summaryEnabled: false, description: 'Full source detail; no prose is replaced by a summary.' };
  }
  if (normalized >= 85) return { version: DETAIL_POLICY_VERSION, detail: normalized, retainRatio: normalized / 100, extractiveSentenceRatio, summaryEnabled: true, summaryLength: 'long', summaryType: 'key-points', description: 'Near source detail with long local key-point summaries.' };
  if (normalized >= 65) return { version: DETAIL_POLICY_VERSION, detail: normalized, retainRatio: normalized / 100, extractiveSentenceRatio, summaryEnabled: true, summaryLength: 'long', summaryType: 'tldr', description: 'Detailed sections with long local summaries.' };
  if (normalized >= 40) return { version: DETAIL_POLICY_VERSION, detail: normalized, retainRatio: normalized / 100, extractiveSentenceRatio, summaryEnabled: true, summaryLength: 'medium', summaryType: 'key-points', description: 'Balanced detail with medium local key-point summaries.' };
  if (normalized >= 15) return { version: DETAIL_POLICY_VERSION, detail: normalized, retainRatio: normalized / 100, extractiveSentenceRatio, summaryEnabled: true, summaryLength: 'short', summaryType: 'key-points', description: 'Brief detail with short local key-point summaries.' };
  return { version: DETAIL_POLICY_VERSION, detail: normalized, retainRatio: normalized / 100, extractiveSentenceRatio, summaryEnabled: true, summaryLength: 'short', summaryType: 'headline', description: 'Outline detail with headline-oriented local summaries.' };
}

export function countWords(markdown: string): number {
  return markdown.trim() ? markdown.trim().split(/\s+/u).filter((token) => token !== '>').length : 0;
}

export function countBytes(markdown: string): number {
  return encoder.encode(markdown).byteLength;
}

function escapeYaml(value: string): string {
  return JSON.stringify(value);
}

function frontMatter(metadata: ExportMetadata): string {
  const language = metadata.language.primaryLanguage ?? 'unknown';
  return [
    '---',
    `title: ${escapeYaml(metadata.title)}`,
    `source_url: ${escapeYaml(metadata.sourceUrl)}`,
    ...(metadata.canonicalUrl ? [`canonical_url: ${escapeYaml(metadata.canonicalUrl)}`] : []),
    `captured_at: ${escapeYaml(metadata.capturedAt)}`,
    `export_mode: ${metadata.exportMode}`,
    `requested_provider: ${metadata.requestedProvider}`,
    `compression_mode: ${metadata.compressionMode}`,
    `detail: ${metadata.detail}`,
    `words: ${metadata.words}`,
    `bytes: ${metadata.bytes}`,
    `detected_language: ${escapeYaml(language)}`,
    ...(metadata.language.confidence !== undefined ? [`language_confidence: ${metadata.language.confidence}`] : []),
    `generated_summary_count: ${metadata.generatedSummaryCount}`,
    `summary_origin: ${metadata.summaryOrigin}`,
    `summary_chunk_count: ${metadata.summaryChunkCount}`,
    '---',
    '',
  ].join('\n');
}

function retainedSummarizable(blocks: readonly MarkdownBlock[], retainRatio: number): ReadonlySet<string> {
  const eligible = blocks.filter((block) => block.kind === 'summarizable');
  const keep = retainRatio === 1 ? eligible.length : Math.floor(eligible.length * retainRatio);
  if (keep === 0) return new Set();
  if (keep >= eligible.length) return new Set(eligible.map((block) => block.id));
  return new Set(rankBlocksForRetention(blocks).slice(0, keep).map((block) => block.id));
}

export function unknownLanguageState(declaredLanguage?: string): LanguageState {
  return {
    origin: declaredLanguage ? 'declared' : 'unknown',
    ...(declaredLanguage ? { declaredLanguage } : {}),
    alternatives: [],
    supported: false,
    warning: declaredLanguage
      ? 'The page declares a language, but local language detection has not run.'
      : 'Language has not been detected locally.',
  };
}

function resultFromBlocks(
  captured: CapturedPage,
  mode: ExportMode,
  limitations: readonly string[],
  detail: number,
  language: LanguageState,
  requestedProvider: SummarizationProvider,
  visible: readonly MarkdownBlock[],
  removable: readonly MarkdownBlock[],
  summarizableBlocks: readonly MarkdownBlock[],
): CompressionResult {
  const body = [
    limitations.length
      ? limitations.map((notice) => `> Conversion limitation: ${notice}`).join('\n>\n')
      : '',
    visible.map((block) => block.markdown.trim()).filter(Boolean).join('\n\n'),
  ].filter(Boolean).join('\n\n');
  let metadata: ExportMetadata = {
    ...captured.metadata,
    exportMode: mode,
    requestedProvider,
    compressionMode: 'complete',
    summaryOrigin: 'none',
    detail,
    words: 0,
    bytes: 0,
    language,
    generatedSummaryCount: 0,
    summaryChunkCount: 0,
    policyVersion: DETAIL_POLICY_VERSION,
  };
  let markdown = '';
  for (let iteration = 0; iteration < 3; iteration += 1) {
    markdown = `${frontMatter(metadata)}${body}\n`;
    metadata = { ...metadata, words: countWords(markdown), bytes: countBytes(markdown) };
  }
  return {
    markdown,
    metadata,
    limitations: [...limitations],
    removedBlockIds: removable.map((block) => block.id),
    summarizableBlocks,
    blocks: visible,
  };
}

export function completeCompression(
  captured: CapturedPage,
  conversion: MarkdownConversion,
  mode: ExportMode,
  language = unknownLanguageState(captured.metadata.pageLanguage),
): CompressionResult {
  const removable = conversion.blocks.filter((block) => block.kind === 'removable');
  const visible = conversion.blocks.filter((block) => block.kind !== 'removable');
  return resultFromBlocks(captured, mode, conversion.limitations, 100, language, 'none', visible, removable, []);
}

export function deterministicCompression(
  captured: CapturedPage,
  conversion: MarkdownConversion,
  mode: ExportMode,
  detail: number,
  language = unknownLanguageState(captured.metadata.pageLanguage),
  requestedProvider: SummarizationProvider = 'custom',
): CompressionResult {
  const policy = detailPolicy(detail);
  const removable = conversion.blocks.filter((block) => block.kind === 'removable');
  const eligible = conversion.blocks.filter((block) => block.kind === 'summarizable');
  const retained = retainedSummarizable(conversion.blocks, policy.retainRatio);
  const visible = conversion.blocks.filter((block) => block.kind === 'provenance' || block.kind === 'protected' || (block.kind === 'summarizable' && retained.has(block.id)));
  return resultFromBlocks(
    captured,
    mode,
    conversion.limitations,
    policy.detail,
    language,
    requestedProvider,
    visible,
    removable,
    policy.summaryEnabled ? eligible.filter((block) => !retained.has(block.id)) : [],
  );
}

export function sentenceSimilarity(left: string, right: string): number {
  return graphSentenceSimilarity(left, right);
}

export function extractiveSummaries(
  blocks: readonly MarkdownBlock[],
  detail: number,
): readonly { readonly block: MarkdownBlock; readonly markdown: string }[] {
  return extractiveSummariesByBlock(blocks, detail);
}

export function withSummaries(
  result: CompressionResult,
  summaries: readonly { readonly block: MarkdownBlock; readonly markdown: string }[],
  origin: Exclude<SummaryOrigin, 'none'>,
  summaryChunkCount = 0,
): CompressionResult {
  const generatedCandidates = summaries.filter((summary) => summary.markdown.trim());
  const generated = origin === 'local-ai' ? generatedCandidates.slice(0, 1) : generatedCandidates;
  const bodyBlocks = result.blocks.filter((block) => block.kind !== 'provenance');
  let body: string;
  if (origin === 'local-ai') {
    const entries = bodyBlocks.map((block) => block.markdown.trim()).filter(Boolean);
    if (generated[0]) {
      const summary = `## Summary\n\n${generated[0].markdown.trim()}`;
      const titleIndex = bodyBlocks.findIndex((block) => /^#\s/u.test(block.markdown.trim()));
      entries.splice(titleIndex < 0 ? 0 : titleIndex + 1, 0, summary);
    }
    body = entries.join('\n\n');
  } else {
    const ordered = [
      ...bodyBlocks.map((block) => ({ sourceOrder: block.sourceOrder, markdown: block.markdown.trim() })),
      ...generated.map((summary) => ({
        sourceOrder: summary.block.sourceOrder,
        markdown: `> ${summary.markdown.trim().replace(/\n/g, '\n> ')}`,
      })),
    ].sort((left, right) => left.sourceOrder - right.sourceOrder);
    body = ordered.map((entry) => entry.markdown).filter(Boolean).join('\n\n');
  }
  let metadata: ExportMetadata = {
    ...result.metadata,
    compressionMode: origin === 'local-ai' ? 'local-ai-assisted' : 'custom-extractive',
    summaryOrigin: origin,
    generatedSummaryCount: generated.length,
    summaryChunkCount,
    words: 0,
    bytes: 0,
  };
  let markdown = '';
  for (let iteration = 0; iteration < 3; iteration += 1) {
    markdown = `${frontMatter(metadata)}${body}\n`;
    metadata = { ...metadata, words: countWords(markdown), bytes: countBytes(markdown) };
  }
  return {
    ...result,
    markdown,
    metadata,
    limitations: [...result.limitations],
    summarizableBlocks: origin === 'local-ai' ? result.summarizableBlocks : generated.map((summary) => summary.block),
  };
}

export function deterministicExtractiveCompression(
  captured: CapturedPage,
  conversion: MarkdownConversion,
  mode: ExportMode,
  detail: number,
  language = unknownLanguageState(captured.metadata.pageLanguage),
  requestedProvider: SummarizationProvider = 'custom',
): CompressionResult {
  const result = deterministicCompression(captured, conversion, mode, detail, language, requestedProvider);
  if (result.metadata.detail === 100) return result;
  const summaryIds = new Set(result.summarizableBlocks.map((block) => block.id));
  const summaries = createStructureAwareExtractiveSummaries(
    conversion.blocks,
    summaryIds,
    detail,
    captured.metadata.title,
  );
  return withSummaries(result, summaries, 'deterministic-diverse-extractive');
}

export function withGeneratedSummaries(
  result: CompressionResult,
  summaries: readonly { readonly block: MarkdownBlock; readonly markdown: string }[],
  summaryChunkCount: number,
): CompressionResult {
  return withSummaries(result, summaries, 'local-ai', summaryChunkCount);
}
