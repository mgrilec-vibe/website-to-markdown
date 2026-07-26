import type {
  CapturedPage,
  CompressionResult,
  DetailPolicy,
  ExportMetadata,
  ExportMode,
  LanguageState,
  MarkdownBlock,
} from './export-domain';
import { convertCapturedPage } from './export-markdown';

const encoder = new TextEncoder();

export function detailPolicy(detail: number): DetailPolicy {
  const normalized = Math.max(0, Math.min(100, Math.round(detail)));
  const extractiveSentenceRatio = normalized === 100 ? 0 : Math.max(0.1, normalized / 100);
  if (normalized === 100) {
    return { version: 1, detail: normalized, retainRatio: 1, extractiveSentenceRatio, summaryEnabled: false, description: 'Full source detail; no prose is replaced by a summary.' };
  }
  if (normalized >= 85) return { version: 1, detail: normalized, retainRatio: normalized / 100, extractiveSentenceRatio, summaryEnabled: true, summaryLength: 'long', summaryType: 'key-points', description: 'Near source detail with long local key-point summaries.' };
  if (normalized >= 65) return { version: 1, detail: normalized, retainRatio: normalized / 100, extractiveSentenceRatio, summaryEnabled: true, summaryLength: 'long', summaryType: 'tldr', description: 'Detailed sections with long local summaries.' };
  if (normalized >= 40) return { version: 1, detail: normalized, retainRatio: normalized / 100, extractiveSentenceRatio, summaryEnabled: true, summaryLength: 'medium', summaryType: 'key-points', description: 'Balanced detail with medium local key-point summaries.' };
  if (normalized >= 15) return { version: 1, detail: normalized, retainRatio: normalized / 100, extractiveSentenceRatio, summaryEnabled: true, summaryLength: 'short', summaryType: 'key-points', description: 'Brief detail with short local key-point summaries.' };
  return { version: 1, detail: normalized, retainRatio: normalized / 100, extractiveSentenceRatio, summaryEnabled: true, summaryLength: 'short', summaryType: 'headline', description: 'Outline detail with headline-oriented local summaries.' };
}

export function countWords(markdown: string): number {
  return markdown.trim() ? markdown.trim().split(/\s+/u).length : 0;
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
  const keep = retainRatio === 1 ? blocks.length : Math.floor(blocks.length * retainRatio);
  if (keep === 0) return new Set();
  if (keep >= blocks.length) return new Set(blocks.map((block) => block.id));
  const selected = new Set<string>();
  for (let index = 0; index < keep; index += 1) {
    const position = Math.round((index * (blocks.length - 1)) / Math.max(keep - 1, 1));
    selected.add(blocks[position]!.id);
  }
  return selected;
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

export function deterministicCompression(captured: CapturedPage, mode: ExportMode, detail: number, language = unknownLanguageState(captured.metadata.pageLanguage)): CompressionResult {
  const policy = detailPolicy(detail);
  const conversion = convertCapturedPage(captured, mode);
  const removable = conversion.blocks.filter((block) => block.kind === 'removable');
  const eligible = conversion.blocks.filter((block) => block.kind === 'summarizable');
  const retained = retainedSummarizable(eligible, policy.retainRatio);
  const visible = conversion.blocks.filter((block) => block.kind === 'provenance' || block.kind === 'protected' || (block.kind === 'summarizable' && retained.has(block.id)));
  const body = [
    conversion.limitations.length
      ? conversion.limitations.map((notice) => `> Conversion limitation: ${notice}`).join('\n>\n')
      : '',
    visible.map((block) => block.markdown.trim()).filter(Boolean).join('\n\n'),
  ].filter(Boolean).join('\n\n');
  let metadata: ExportMetadata = {
    ...captured.metadata,
    exportMode: mode,
    compressionMode: 'deterministic',
    summaryOrigin: 'none',
    detail: policy.detail,
    words: 0,
    bytes: 0,
    language,
    generatedSummaryCount: 0,
    summaryChunkCount: 0,
    policyVersion: 1,
  };
  let markdown = '';
  for (let iteration = 0; iteration < 3; iteration += 1) {
    markdown = `${frontMatter(metadata)}${body}\n`;
    metadata = { ...metadata, words: countWords(markdown), bytes: countBytes(markdown) };
  }
  return {
    markdown,
    metadata,
    removedBlockIds: removable.map((block) => block.id),
    summarizableBlocks: policy.summaryEnabled ? eligible.filter((block) => !retained.has(block.id)) : [],
    blocks: visible,
  };
}

export type SummaryOrigin = 'deterministic-extractive' | 'local-ai';

interface SourceSentence {
  readonly block: MarkdownBlock;
  readonly sentence: string;
  readonly blockSentenceIndex: number;
  readonly sourceOrder: number;
}

function sourceSentences(block: MarkdownBlock): readonly SourceSentence[] {
  const text = block.markdown.trim();
  if (!text) return [];
  const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter(undefined, { granularity: 'sentence' }) : undefined;
  const segments = segmenter
    ? [...segmenter.segment(text)].map(({ segment }) => segment)
    : text.split(/(?<=[.!?])\s+/u);
  return segments
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .map((sentence, blockSentenceIndex) => ({ block, sentence, blockSentenceIndex, sourceOrder: block.sourceOrder }));
}

function sentenceTokens(sentence: string): readonly string[] {
  return sentence.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
}

export function extractiveSummaries(blocks: readonly MarkdownBlock[], detail: number): readonly { readonly block: MarkdownBlock; readonly markdown: string }[] {
  const sentences = blocks.flatMap(sourceSentences);
  if (!sentences.length || detailPolicy(detail).extractiveSentenceRatio === 0) return [];
  const frequency = new Map<string, number>();
  for (const sentence of sentences) {
    for (const token of sentenceTokens(sentence.sentence)) frequency.set(token, (frequency.get(token) ?? 0) + 1);
  }
  const selected = new Set<SourceSentence>();
  for (const block of blocks) {
    const candidates = sentences.filter((sentence) => sentence.block.id === block.id);
    const count = Math.max(1, Math.ceil(candidates.length * detailPolicy(detail).extractiveSentenceRatio));
    const ranked = [...candidates].sort((left, right) => {
      const score = (candidate: SourceSentence): number => {
        const tokens = sentenceTokens(candidate.sentence);
        const frequencyScore = tokens.reduce((total, token) => total + (frequency.get(token) ?? 0), 0) / Math.max(tokens.length, 1);
        const leadScore = candidate.blockSentenceIndex === 0 ? 0.25 : 0;
        const sectionScore = 1 / (1 + candidate.sourceOrder);
        return frequencyScore + leadScore + sectionScore;
      };
      return score(right) - score(left) || left.blockSentenceIndex - right.blockSentenceIndex;
    });
    ranked.slice(0, count).forEach((sentence) => selected.add(sentence));
  }
  const selectedByBlock = new Map<string, SourceSentence[]>();
  for (const sentence of sentences) {
    if (!selected.has(sentence)) continue;
    const group = selectedByBlock.get(sentence.block.id) ?? [];
    group.push(sentence);
    selectedByBlock.set(sentence.block.id, group);
  }
  return blocks.flatMap((block) => {
    const group = selectedByBlock.get(block.id);
    return group?.length ? [{ block, markdown: group.map((sentence) => sentence.sentence).join(' ') }] : [];
  });
}

function summaryLabel(origin: SummaryOrigin): string {
  return origin === 'local-ai' ? 'Locally generated summary' : 'Deterministic extractive summary';
}

export function withSummaries(result: CompressionResult, summaries: readonly { readonly block: MarkdownBlock; readonly markdown: string }[], origin: SummaryOrigin, summaryChunkCount = 0): CompressionResult {
  const generated = summaries.filter((summary) => summary.markdown.trim());
  const ordered = [
    ...result.blocks.filter((block) => block.kind !== 'provenance').map((block) => ({ sourceOrder: block.sourceOrder, markdown: block.markdown.trim() })),
    ...generated.map((summary) => ({
      sourceOrder: summary.block.sourceOrder,
      markdown: `> **${summaryLabel(origin)}**\n>\n> ${summary.markdown.trim().replace(/\n/g, '\n> ')}`,
    })),
  ].sort((left, right) => left.sourceOrder - right.sourceOrder);
  const body = ordered.map((entry) => entry.markdown).filter(Boolean).join('\n\n');
  let metadata: ExportMetadata = {
    ...result.metadata,
    compressionMode: origin === 'local-ai' ? 'local-ai-assisted' : 'deterministic-extractive',
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
  return { ...result, markdown, metadata };
}

export function deterministicExtractiveCompression(captured: CapturedPage, mode: ExportMode, detail: number, language = unknownLanguageState(captured.metadata.pageLanguage)): CompressionResult {
  const result = deterministicCompression(captured, mode, detail, language);
  return result.metadata.detail === 100 ? result : withSummaries(result, extractiveSummaries(result.summarizableBlocks, detail), 'deterministic-extractive');
}

export function withGeneratedSummaries(result: CompressionResult, summaries: readonly { readonly block: MarkdownBlock; readonly markdown: string }[], summaryChunkCount: number): CompressionResult {
  return withSummaries(result, summaries, 'local-ai', summaryChunkCount);
}
