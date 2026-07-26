import type {
  CapabilityState,
  DetailPolicy,
  LanguageCandidate,
  LanguageState,
  MarkdownBlock,
  ModelAvailability,
} from './export-domain';

export const MAX_SUMMARY_CHARS = 5_000;
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
    monitor: downloadMonitor(options.onProgress),
    ...(options.signal ? { signal: options.signal } : {}),
  });
}

export function chunkSummarizableBlocks(blocks: readonly MarkdownBlock[], maxChars = MAX_SUMMARY_CHARS): readonly MarkdownBlock[][] {
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

export async function summarizeBlocks(session: SummarizerSession, blocks: readonly MarkdownBlock[]): Promise<LocalSummaryOutput> {
  const chunks = chunkSummarizableBlocks(blocks);
  let summaries: GeneratedSummary[] = [];
  for (const chunk of chunks) {
    const anchor = chunk[chunk.length - 1];
    if (!anchor) throw new Error('Summary chunk had no source blocks.');
    summaries.push({ block: anchor, markdown: await session.summarize(chunk.map((block) => block.markdown).join('\n\n')) });
  }
  let reductionStages = 0;
  while (summaries.length > 1) {
    if (reductionStages === 3) throw new Error('Local summary requires more reduction stages than this export permits.');
    const groups: GeneratedSummary[][] = [];
    let group: GeneratedSummary[] = [];
    let groupSize = 0;
    for (const summary of summaries) {
      if (summary.markdown.length > MAX_SUMMARY_CHARS) throw new Error('A local summary exceeds the bounded reduction capacity.');
      if (group.length > 0 && groupSize + summary.markdown.length > MAX_SUMMARY_CHARS) {
        groups.push(group);
        group = [];
        groupSize = 0;
      }
      group.push(summary);
      groupSize += summary.markdown.length;
    }
    if (group.length > 0) groups.push(group);
    summaries = await Promise.all(groups.map(async (current) => {
      const anchor = current[current.length - 1];
      if (!anchor) throw new Error('Summary reduction group had no source block.');
      return { block: anchor.block, markdown: await session.summarize(current.map((summary) => summary.markdown).join('\n\n')) };
    }));
    reductionStages += 1;
  }
  return { summaries, chunkCount: chunks.length, reductionStages };
}
