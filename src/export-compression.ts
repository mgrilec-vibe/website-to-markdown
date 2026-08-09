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

export function detailPolicy(detail: number): DetailPolicy {
  const normalized = Math.max(0, Math.min(100, Math.round(detail)));
  const extractiveSentenceRatio = normalized === 100 ? 0 : Math.max(0, Math.min(1, normalized / 100));
  if (normalized === 100) {
    return { version: 2, detail: normalized, retainRatio: 1, extractiveSentenceRatio, summaryEnabled: false, description: 'Full source detail; no prose is replaced by a summary.' };
  }
  if (normalized >= 85) return { version: 2, detail: normalized, retainRatio: normalized / 100, extractiveSentenceRatio, summaryEnabled: true, summaryLength: 'long', summaryType: 'key-points', description: 'Near source detail with long local key-point summaries.' };
  if (normalized >= 65) return { version: 2, detail: normalized, retainRatio: normalized / 100, extractiveSentenceRatio, summaryEnabled: true, summaryLength: 'long', summaryType: 'tldr', description: 'Detailed sections with long local summaries.' };
  if (normalized >= 40) return { version: 2, detail: normalized, retainRatio: normalized / 100, extractiveSentenceRatio, summaryEnabled: true, summaryLength: 'medium', summaryType: 'key-points', description: 'Balanced detail with medium local key-point summaries.' };
  if (normalized >= 15) return { version: 2, detail: normalized, retainRatio: normalized / 100, extractiveSentenceRatio, summaryEnabled: true, summaryLength: 'short', summaryType: 'key-points', description: 'Brief detail with short local key-point summaries.' };
  return { version: 2, detail: normalized, retainRatio: normalized / 100, extractiveSentenceRatio, summaryEnabled: true, summaryLength: 'short', summaryType: 'headline', description: 'Outline detail with headline-oriented local summaries.' };
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

function retentionPriority(blocks: readonly MarkdownBlock[]): readonly MarkdownBlock[] {
  const midpointKeep = Math.floor(blocks.length / 2);
  const priority: MarkdownBlock[] = [];
  const selected = new Set<string>();
  for (let index = 0; index < midpointKeep; index += 1) {
    const position = midpointKeep <= 1 ? 0 : Math.round((index * (blocks.length - 1)) / (midpointKeep - 1));
    const block = blocks[position];
    if (block && !selected.has(block.id)) {
      priority.push(block);
      selected.add(block.id);
    }
  }
  for (const block of blocks) {
    if (!selected.has(block.id)) priority.push(block);
  }
  return priority;
}

function retainedSummarizable(blocks: readonly MarkdownBlock[], retainRatio: number): ReadonlySet<string> {
  const keep = retainRatio === 1 ? blocks.length : Math.floor(blocks.length * retainRatio);
  if (keep === 0) return new Set();
  if (keep >= blocks.length) return new Set(blocks.map((block) => block.id));
  return new Set(retentionPriority(blocks).slice(0, keep).map((block) => block.id));
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
    policyVersion: 2,
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
  const retained = retainedSummarizable(eligible, policy.retainRatio);
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
  return [...new Set(sentence.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [])];
}

function characterTrigrams(sentence: string): readonly string[] {
  const normalized = sentence.toLocaleLowerCase().replace(/\s+/gu, ' ').trim();
  if (normalized.length < 3) return [];
  const trigrams = new Set<string>();
  for (let index = 0; index <= normalized.length - 3; index += 1) trigrams.add(normalized.slice(index, index + 3));
  return [...trigrams];
}

function jaccard(left: readonly string[], right: readonly string[]): number {
  if (!left.length || !right.length) return 0;
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  let shared = 0;
  for (const token of leftSet) if (rightSet.has(token)) shared += 1;
  return shared / (leftSet.size + rightSet.size - shared);
}

export function sentenceSimilarity(left: string, right: string): number {
  const leftTokens = sentenceTokens(left);
  const rightTokens = sentenceTokens(right);
  if (leftTokens.length >= 2 && rightTokens.length >= 2) return jaccard(leftTokens, rightTokens);
  const leftTrigrams = characterTrigrams(left);
  const rightTrigrams = characterTrigrams(right);
  return leftTrigrams.length >= 3 && rightTrigrams.length >= 3 ? jaccard(leftTrigrams, rightTrigrams) : 0;
}

function lexicalSimilarity(left: SourceSentence, right: SourceSentence): number {
  return sentenceSimilarity(left.sentence, right.sentence);
}

function documentFrequencies(sentences: readonly SourceSentence[]): ReadonlyMap<string, number> {
  const frequency = new Map<string, number>();
  for (const sentence of sentences) {
    for (const token of sentenceTokens(sentence.sentence)) frequency.set(token, (frequency.get(token) ?? 0) + 1);
  }
  return frequency;
}

function idf(token: string, sentenceCount: number, frequency: ReadonlyMap<string, number>): number {
  return Math.log((sentenceCount + 1) / ((frequency.get(token) ?? 0) + 1)) + 1;
}

function weightedVector(sentence: SourceSentence, sentenceCount: number, frequency: ReadonlyMap<string, number>): ReadonlyMap<string, number> {
  return new Map(sentenceTokens(sentence.sentence).map((token) => [token, idf(token, sentenceCount, frequency)]));
}

function centroid(vectors: readonly ReadonlyMap<string, number>[]): ReadonlyMap<string, number> {
  const result = new Map<string, number>();
  for (const vector of vectors) {
    for (const [token, weight] of vector) result.set(token, (result.get(token) ?? 0) + weight / Math.max(vectors.length, 1));
  }
  return result;
}

function cosineSimilarity(left: ReadonlyMap<string, number>, right: ReadonlyMap<string, number>): number {
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (const weight of left.values()) leftNorm += weight * weight;
  for (const weight of right.values()) rightNorm += weight * weight;
  for (const [token, weight] of left) dot += weight * (right.get(token) ?? 0);
  return leftNorm && rightNorm ? dot / Math.sqrt(leftNorm * rightNorm) : 0;
}

function relevanceScores(
  candidates: readonly SourceSentence[],
  sentenceCount: number,
  frequency: ReadonlyMap<string, number>,
): ReadonlyMap<SourceSentence, number> {
  const vectors = new Map(candidates.map((candidate) => [candidate, weightedVector(candidate, sentenceCount, frequency)]));
  const blockCentroid = centroid([...vectors.values()]);
  const blockWeight = [...blockCentroid.values()].reduce((total, weight) => total + weight, 0);
  return new Map(candidates.map((candidate) => {
    const vector = vectors.get(candidate)!;
    const coverage = [...vector.values()].reduce((total, weight) => total + weight, 0) / Math.max(blockWeight, 1);
    const centrality = cosineSimilarity(vector, blockCentroid);
    const leadBonus = candidate.blockSentenceIndex === 0 ? 0.03 : 0;
    return [candidate, 0.72 * centrality + 0.25 * Math.min(1, coverage) + leadBonus] as const;
  }));
}

export function extractiveSummaries(blocks: readonly MarkdownBlock[], detail: number): readonly { readonly block: MarkdownBlock; readonly markdown: string }[] {
  const sentences = blocks.flatMap(sourceSentences);
  const policy = detailPolicy(detail);
  if (!sentences.length || !policy.summaryEnabled) return [];
  const frequency = documentFrequencies(sentences);
  const selectedByBlock = new Map<string, SourceSentence[]>();
  for (const block of blocks) {
    const candidates = sentences.filter((sentence) => sentence.block.id === block.id);
    const selectionCount = Math.max(1, Math.ceil(candidates.length * policy.extractiveSentenceRatio));
    const relevance = relevanceScores(candidates, sentences.length, frequency);
    const selected: SourceSentence[] = [];
    while (selected.length < selectionCount && selected.length < candidates.length) {
      const next = candidates
        .filter((candidate) => !selected.includes(candidate))
        .sort((left, right) => {
          const score = (candidate: SourceSentence): number => 0.75 * (relevance.get(candidate) ?? 0) - 0.25 * Math.max(0, ...selected.map((chosen) => lexicalSimilarity(candidate, chosen)));
          return score(right) - score(left) || left.blockSentenceIndex - right.blockSentenceIndex;
        })[0];
      if (!next) break;
      selected.push(next);
    }
    if (selected.length) selectedByBlock.set(block.id, selected.sort((left, right) => left.blockSentenceIndex - right.blockSentenceIndex));
  }
  return blocks.flatMap((block) => {
    const selected = selectedByBlock.get(block.id);
    return selected?.length ? [{ block, markdown: selected.map((sentence) => sentence.sentence).join(' ') }] : [];
  });
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
  return { ...result, markdown, metadata, limitations: [...result.limitations] };
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
  const eligible = conversion.blocks.filter((block) => block.kind === 'summarizable');
  const summaryIds = new Set(result.summarizableBlocks.map((block) => block.id));
  const summaries = extractiveSummaries(eligible, detail).filter((summary) => summaryIds.has(summary.block.id));
  return withSummaries(result, summaries, 'deterministic-diverse-extractive');
}

export function withGeneratedSummaries(
  result: CompressionResult,
  summaries: readonly { readonly block: MarkdownBlock; readonly markdown: string }[],
  summaryChunkCount: number,
): CompressionResult {
  return withSummaries(result, summaries, 'local-ai', summaryChunkCount);
}