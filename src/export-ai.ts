import type {
  CapabilityState,
  DetailPolicy,
  LanguageCandidate,
  LanguageState,
  MarkdownBlock,
  ModelAvailability,
} from './export-domain';
import { createGroundingEvidence } from './extractive-summarizer';

const SUPPORTED_LANGUAGES: Readonly<Record<string, true>> = { en: true, es: true, ja: true, de: true, fr: true };

type ChromeAvailability = 'available' | 'downloadable' | 'downloading' | 'unavailable';
type DownloadProgressEvent = Event & { readonly loaded?: number };

type DownloadMonitor = {
  addEventListener(type: 'downloadprogress', listener: (event: DownloadProgressEvent) => void): void;
};

export interface LanguageDetectorSession {
  detect(text: string): Promise<readonly { readonly detectedLanguage: string; readonly confidence: number }[]>;
  destroy?(): void;
}

export interface SummarizerSession {
  readonly inputQuota: number;
  measureInputUsage(text: string, options?: { readonly context?: string }): Promise<number>;
  summarize(text: string, options?: { readonly context?: string }): Promise<string>;
  destroy?(): void;
}

export interface BuiltInAiApi {
  readonly LanguageDetector?: {
    availability(): Promise<ChromeAvailability>;
    create(options?: { readonly monitor?: (monitor: DownloadMonitor) => void; readonly signal?: AbortSignal }): Promise<LanguageDetectorSession>;
  };
  readonly Summarizer?: {
    availability(): Promise<ChromeAvailability>;
    create(options: {
      readonly type: NonNullable<DetailPolicy['summaryType']>;
      readonly length: NonNullable<DetailPolicy['summaryLength']>;
      readonly format: 'markdown';
      readonly preference: 'capability';
      readonly expectedInputLanguages: readonly string[];
      readonly expectedContextLanguages: readonly string[];
      readonly outputLanguage: string;
      readonly sharedContext?: string;
      readonly monitor?: (monitor: DownloadMonitor) => void;
      readonly signal?: AbortSignal;
    }): Promise<SummarizerSession>;
  };
}

const builtInAi = globalThis as typeof globalThis & BuiltInAiApi;

async function capabilityOf(api: { availability(): Promise<ChromeAvailability> } | undefined): Promise<{ state: ModelAvailability; error?: string }> {
  if (!api) return { state: 'unavailable' };
  try {
    return { state: await api.availability() };
  } catch (error) {
    return { state: 'failed', error: error instanceof Error ? error.message : 'Capability check failed.' };
  }
}

export async function checkLocalAiCapability(api: BuiltInAiApi = builtInAi): Promise<CapabilityState> {
  const [detector, summarizer] = await Promise.all([capabilityOf(api.LanguageDetector), capabilityOf(api.Summarizer)]);
  return {
    detector: detector.state,
    summarizer: summarizer.state,
    ...(detector.error ? { detectorError: detector.error } : {}),
    ...(summarizer.error ? { summarizerError: summarizer.error } : {}),
  };
}

function downloadMonitor(onProgress?: (value: number) => void): (monitor: DownloadMonitor) => void {
  return (monitor) => monitor.addEventListener('downloadprogress', (event) => onProgress?.(event.loaded ?? 0));
}

export interface LocalAiCreateOptions {
  readonly api?: BuiltInAiApi;
  readonly signal?: AbortSignal;
  readonly onProgress?: (value: number) => void;
  readonly sharedContext?: string;
}

export async function createLanguageDetector(options: LocalAiCreateOptions = {}): Promise<LanguageDetectorSession> {
  const api = options.api ?? builtInAi;
  if (!api.LanguageDetector) throw new Error('Chrome Language Detector is unavailable.');
  if (!navigator.userActivation.isActive && (await api.LanguageDetector.availability()) !== 'available') {
    throw new Error('Enable the local language model with an explicit user action.');
  }
  return api.LanguageDetector.create({ monitor: downloadMonitor(options.onProgress), ...(options.signal ? { signal: options.signal } : {}) });
}

export async function detectEligibleLanguage(
  prose: string,
  declaredLanguage: string | undefined,
  detector: LanguageDetectorSession | undefined,
): Promise<LanguageState> {
  if (!prose.trim()) {
    return { origin: 'unknown', ...(declaredLanguage ? { declaredLanguage } : {}), alternatives: [], supported: false, warning: 'There is no eligible prose to summarize.' };
  }
  if (!detector) {
    return {
      origin: declaredLanguage ? 'declared' : 'unknown',
      ...(declaredLanguage ? { declaredLanguage } : {}),
      alternatives: [],
      supported: false,
      warning: 'Language detection is unavailable; local summarization stays off.',
    };
  }
  const alternatives: LanguageCandidate[] = (await detector.detect(prose)).map((candidate) => ({
    language: candidate.detectedLanguage.toLowerCase(),
    confidence: candidate.confidence,
  }));
  const primary = alternatives[0];
  if (!primary) return { origin: 'unknown', ...(declaredLanguage ? { declaredLanguage } : {}), alternatives, supported: false, warning: 'Language could not be detected.' };
  const secondary = alternatives[1];
  const mixed = primary.confidence < 0.8 || (secondary !== undefined && primary.confidence - secondary.confidence < 0.2);
  const supported = !mixed && primary.language in SUPPORTED_LANGUAGES;
  const warning = supported
    ? undefined
    : mixed
      ? 'Language is mixed or uncertain; automatic local summaries are disabled.'
      : `Chrome local summaries do not support ${primary.language} yet.`;
  return {
    origin: mixed ? 'mixed' : 'detected',
    ...(declaredLanguage ? { declaredLanguage } : {}),
    primaryLanguage: primary.language,
    confidence: primary.confidence,
    alternatives,
    supported,
    ...(warning ? { warning } : {}),
  };
}

export async function createSummarizer(policy: DetailPolicy, language: LanguageState, options: LocalAiCreateOptions = {}): Promise<SummarizerSession> {
  const api = options.api ?? builtInAi;
  if (!policy.summaryEnabled || !policy.summaryType || !policy.summaryLength) throw new Error('This Detail level does not use local summaries.');
  if (!language.supported || !language.primaryLanguage) throw new Error(language.warning || 'Local summaries are unavailable for this language.');
  if (!api.Summarizer) throw new Error('Chrome Summarizer is unavailable.');
  if (!navigator.userActivation.isActive && (await api.Summarizer.availability()) !== 'available') {
    throw new Error('Enable the local summary model with an explicit user action.');
  }
  return api.Summarizer.create({
    type: policy.summaryType,
    length: policy.summaryLength,
    format: 'markdown',
    preference: 'capability',
    expectedInputLanguages: [language.primaryLanguage],
    expectedContextLanguages: [language.primaryLanguage],
    outputLanguage: language.primaryLanguage,
    ...(options.sharedContext ? { sharedContext: options.sharedContext } : {}),
    monitor: downloadMonitor(options.onProgress),
    ...(options.signal ? { signal: options.signal } : {}),
  });
}

export function normalizeSummaryText(markdown: string): string {
  return markdown
    .split('\n')
    .filter((line) => !/^\s*\|.+\|\s*$/u.test(line))
    .map((line) => line
      .replace(/^\s*#{1,6}\s+/u, '')
      .replace(/^\s*(?:[-*+]|\d+\.)\s+/u, '')
      .replace(/^\s*>\s?/u, '')
      .replace(/!\[([^\]]*)\]\([^)]*\)/gu, '$1')
      .replace(/\[([^\]]+)\]\([^)]*\)/gu, '$1')
      .replace(/`([^`]+)`/gu, '$1')
      .replace(/\*\*([^*]+)\*\*/gu, '$1')
      .replace(/__([^_]+)__/gu, '$1')
      .replace(/~~([^~]+)~~/gu, '$1')
      .replace(/(?<!\w)\*([^*\n]+)\*(?!\w)/gu, '$1')
      .replace(/(?<!\w)_([^_\n]+)_(?!\w)/gu, '$1')
      .trim())
    .filter(Boolean)
    .join('\n')
    .replace(/[ \t]+/gu, ' ')
    .replace(/\n{3,}/gu, '\n\n')
    .trim();
}

export interface SummaryGroundingResult {
  readonly supported: boolean;
  readonly reason?: string;
}

function factTokens(text: string): readonly string[] {
  return text.toLocaleLowerCase().match(/(?<![\p{L}\p{N}_-])(?:v)?\d+(?:[.,]\d+)*(?:%|[\p{L}]+)?(?![\p{L}\p{N}_-])/gu) ?? [];
}

function urls(text: string): readonly string[] {
  return text.match(/https?:\/\/[^\s)>\]]+/gu) ?? [];
}

function contentTokens(text: string): readonly string[] {
  const segmenter = typeof Intl.Segmenter === 'function'
    ? new Intl.Segmenter(undefined, { granularity: 'word' })
    : undefined;
  const segmented = segmenter
    ? [...segmenter.segment(text.toLocaleLowerCase())]
      .filter((part) => part.isWordLike)
      .map((part) => part.segment)
    : text.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  return [...new Set(segmented.filter((token) => token.length >= 3 || /\d/u.test(token)))];
}

function characterTrigrams(text: string): readonly string[] {
  const normalized = text.toLocaleLowerCase().replace(/\s+/gu, ' ').trim();
  if (normalized.length < 3) return [];
  const result = new Set<string>();
  for (let index = 0; index <= normalized.length - 3; index += 1) result.add(normalized.slice(index, index + 3));
  return [...result];
}

function groundingOverlap(summary: string, source: string): number {
  const summaryTokens = contentTokens(summary);
  const sourceTokenSet = new Set(contentTokens(source));
  const tokenOverlap = summaryTokens.length
    ? summaryTokens.filter((token) => sourceTokenSet.has(token)).length / summaryTokens.length
    : 1;
  const summaryTrigrams = characterTrigrams(summary);
  const sourceTrigramSet = new Set(characterTrigrams(source));
  const trigramOverlap = summaryTrigrams.length
    ? summaryTrigrams.filter((trigram) => sourceTrigramSet.has(trigram)).length / summaryTrigrams.length
    : 1;
  return Math.max(tokenOverlap, trigramOverlap);
}

function inlineCode(text: string): readonly string[] {
  return [...text.matchAll(/`([^`\n]+)`/gu)].map((match) => match[1]!.trim()).filter(Boolean);
}

export function validateSummaryGrounding(summaryMarkdown: string, sourceText: string): SummaryGroundingResult {
  const summary = normalizeSummaryText(summaryMarkdown);
  const source = normalizeSummaryText(sourceText);
  if (!summary) return { supported: false, reason: 'The local model returned an empty summary.' };
  const summaryWords = summary.match(/[\p{L}\p{N}]+/gu)?.length ?? 0;
  const sourceWords = source.match(/[\p{L}\p{N}]+/gu)?.length ?? 0;
  if (summaryWords > Math.max(1, sourceWords)) {
    return { supported: false, reason: 'The local summary is longer than its source evidence.' };
  }
  const sourceFacts = new Set(factTokens(source));
  const unsupportedFact = factTokens(summary).find((fact) => !sourceFacts.has(fact));
  if (unsupportedFact) {
    return { supported: false, reason: `The local summary introduced unsupported numeric fact ${unsupportedFact}.` };
  }
  const sourceUrls = new Set(urls(sourceText));
  const unsupportedUrl = urls(summaryMarkdown).find((url) => !sourceUrls.has(url));
  if (unsupportedUrl) {
    return { supported: false, reason: 'The local summary introduced an unsupported link.' };
  }
  const normalizedSource = source.toLocaleLowerCase();
  const unsupportedCode = inlineCode(summaryMarkdown).find((identifier) =>
    !normalizedSource.includes(normalizeSummaryText(identifier).toLocaleLowerCase()));
  if (unsupportedCode) {
    return { supported: false, reason: `The local summary introduced unsupported code identifier ${unsupportedCode}.` };
  }
  if (contentTokens(summary).length >= 5 && groundingOverlap(summary, source) < 0.12) {
    return { supported: false, reason: 'The local summary is not sufficiently grounded in source vocabulary.' };
  }
  return { supported: true };
}

async function groundedSummarize(
  session: SummarizerSession,
  input: string,
  sourceText: string,
  context?: string,
): Promise<string> {
  const markdown = await summarizeInput(session, input, context);
  const grounding = validateSummaryGrounding(markdown, sourceText);
  if (!grounding.supported) {
    throw new Error(`Chrome local summary failed grounding checks: ${grounding.reason ?? 'unsupported output'}`);
  }
  return markdown;
}

export function chunkSummarizableBlocks(blocks: readonly MarkdownBlock[], maxChars = Number.MAX_SAFE_INTEGER): readonly MarkdownBlock[][] {
  const chunks: MarkdownBlock[][] = [];
  let current: MarkdownBlock[] = [];
  let size = 0;
  for (const block of blocks) {
    if (block.markdown.length > maxChars) throw new Error(`Block ${block.id} exceeds local summary capacity.`);
    if (current.length > 0 && size + block.markdown.length > maxChars) {
      chunks.push(current);
      current = [];
      size = 0;
    }
    current.push(block);
    size += block.markdown.length;
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}

export interface GeneratedSummary {
  readonly block: MarkdownBlock;
  readonly markdown: string;
}

export interface LocalSummaryOutput {
  readonly summaries: readonly GeneratedSummary[];
  readonly chunkCount: number;
  readonly reductionStages: number;
}

interface GroundedSummary extends GeneratedSummary {
  readonly sourceBlocks: readonly MarkdownBlock[];
}

interface PreparedSummaryGroup {
  readonly summaries: readonly GroundedSummary[];
  readonly input: string;
}

function measureInputUsage(session: SummarizerSession, text: string, context?: string): Promise<number> {
  return context === undefined ? session.measureInputUsage(text) : session.measureInputUsage(text, { context });
}

function summarizeInput(session: SummarizerSession, text: string, context?: string): Promise<string> {
  return context === undefined ? session.summarize(text) : session.summarize(text, { context });
}

async function measuredChunks(
  session: SummarizerSession,
  blocks: readonly MarkdownBlock[],
  context?: string,
): Promise<readonly MarkdownBlock[][]> {
  if (!Number.isFinite(session.inputQuota) || session.inputQuota <= 0) throw new Error('Chrome Summarizer reported no usable input quota.');
  if (blocks.length === 0) return [];
  const fullInput = blocks.map((block) => block.markdown).join('\n\n');
  const fullUsage = await measureInputUsage(session, fullInput, context);
  if (fullUsage <= session.inputQuota) return [blocks.slice() as MarkdownBlock[]];
  const chunks: MarkdownBlock[][] = [];
  let current: MarkdownBlock[] = [];
  for (const block of blocks) {
    const candidate = [...current, block];
    const input = candidate.map((item) => item.markdown).join('\n\n');
    const usage = await measureInputUsage(session, input, context);
    if (usage > session.inputQuota) {
      if (current.length === 0) throw new Error(`Block ${block.id} exceeds local summary capacity.`);
      chunks.push(current);
      current = [block];
      const singleUsage = await measureInputUsage(session, block.markdown, context);
      if (singleUsage > session.inputQuota) throw new Error(`Block ${block.id} exceeds local summary capacity.`);
    } else {
      current = candidate;
    }
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}

function uniqueSourceBlocks(summaries: readonly GroundedSummary[]): readonly MarkdownBlock[] {
  const byId = new Map<string, MarkdownBlock>();
  for (const summary of summaries) {
    for (const block of summary.sourceBlocks) if (!byId.has(block.id)) byId.set(block.id, block);
  }
  return [...byId.values()].sort((left, right) => left.sourceOrder - right.sourceOrder);
}

function reductionInput(
  summaries: readonly GroundedSummary[],
  evidenceWordBudget: number,
  includeEvidence: boolean,
): string {
  if (!includeEvidence) return summaries.map((summary) => summary.markdown.trim()).filter(Boolean).join('\n\n');
  const drafts = summaries
    .map((summary, index) => `### Draft ${index + 1}\n${summary.markdown.trim()}`)
    .join('\n\n');
  const evidence = evidenceWordBudget > 0
    ? createGroundingEvidence(uniqueSourceBlocks(summaries), evidenceWordBudget)
    : '';
  return [
    '## Draft summaries',
    drafts,
    evidence ? `## Source evidence\n${evidence}` : '',
  ].filter(Boolean).join('\n\n');
}

async function fitReductionInput(
  session: SummarizerSession,
  summaries: readonly GroundedSummary[],
  context?: string,
): Promise<string | undefined> {
  const evidenceBudgets = context === undefined ? [0] : [180, 120, 80, 40, 0];
  for (const evidenceWordBudget of evidenceBudgets) {
    const input = reductionInput(summaries, evidenceWordBudget, context !== undefined);
    if (await measureInputUsage(session, input, context) <= session.inputQuota) return input;
  }
  return undefined;
}

async function measuredSummaryGroups(
  session: SummarizerSession,
  summaries: readonly GroundedSummary[],
  context?: string,
): Promise<readonly PreparedSummaryGroup[]> {
  if (!Number.isFinite(session.inputQuota) || session.inputQuota <= 0) throw new Error('Chrome Summarizer reported no usable input quota.');
  const groups: PreparedSummaryGroup[] = [];
  let current: GroundedSummary[] = [];
  let currentInput = '';
  for (const summary of summaries) {
    const candidate = [...current, summary];
    const candidateInput = await fitReductionInput(session, candidate, context);
    if (!candidateInput) {
      if (current.length === 0) throw new Error('A local summary exceeds the bounded reduction capacity.');
      groups.push({ summaries: current, input: currentInput });
      current = [summary];
      const singleInput = await fitReductionInput(session, current, context);
      if (!singleInput) throw new Error('A local summary exceeds the bounded reduction capacity.');
      currentInput = singleInput;
    } else {
      current = candidate;
      currentInput = candidateInput;
    }
  }
  if (current.length > 0) groups.push({ summaries: current, input: currentInput });
  return groups;
}

export async function summarizeBlocks(
  session: SummarizerSession,
  blocks: readonly MarkdownBlock[],
  context?: string,
): Promise<LocalSummaryOutput> {
  const chunks = await measuredChunks(session, blocks, context);
  let summaries: GroundedSummary[] = [];
  for (const chunk of chunks) {
    const anchor = chunk[chunk.length - 1];
    if (!anchor) throw new Error('Summary chunk had no source blocks.');
    const text = chunk.map((block) => block.markdown).join('\n\n');
    summaries.push({ block: anchor, markdown: await summarizeInput(session, text, context), sourceBlocks: chunk });
  }
  let reductionStages = 0;
  while (summaries.length > 1) {
    if (reductionStages === 3) throw new Error('Local summary requires more reduction stages than this export permits.');
    const groups = await measuredSummaryGroups(session, summaries, context);
    summaries = await Promise.all(groups.map(async (group) => {
      const anchor = group.summaries[group.summaries.length - 1];
      if (!anchor) throw new Error('Summary reduction group had no source block.');
      const sourceBlocks = uniqueSourceBlocks(group.summaries);
      const sourceText = sourceBlocks.map((block) => block.markdown).join('\n\n');
      return {
        block: anchor.block,
        markdown: await groundedSummarize(session, group.input, sourceText, context),
        sourceBlocks,
      };
    }));
    reductionStages += 1;
  }
  return {
    summaries: summaries.map(({ block, markdown }) => ({ block, markdown })),
    chunkCount: chunks.length,
    reductionStages,
  };
}
