import type {
  AssessmentFixture,
  CompressionPolicy,
  CompressionResult,
  SummaryStage,
} from './domain';
import { validateCompressionResult, countBytes, countWords } from './validation';

export interface SummaryRequest {
  readonly input: string;
  readonly inputBlockIds: readonly string[];
  readonly settings: NonNullable<CompressionPolicy['summarize']>;
}

export type SummaryProvider = (request: SummaryRequest) => string | Promise<string>;

export interface CompressionOptions {
  readonly summarize?: SummaryProvider;
}

const GENERATED_BOUNDARY = '<!-- generated summary: eligible prose only -->';

function outputForBlocks(blocks: readonly { markdown: string }[]): string {
  return blocks.map((block) => block.markdown).join('\n\n');
}

function baseResult(
  fixture: AssessmentFixture,
  policy: CompressionPolicy,
  output: string,
  removedBlockIds: readonly string[],
  summaryInputBlockIds: readonly string[],
  summaryStages: readonly SummaryStage[],
  mode: CompressionResult['mode'],
  error: string | null,
): CompressionResult {
  const resultWithoutChecks = {
    mode,
    fixtureId: fixture.id,
    profileId: policy.id,
    output,
    removedBlockIds,
    summaryInputBlockIds,
    summaryStages,
    structuralChecks: [] as readonly never[],
    metrics: { words: countWords(output), bytes: countBytes(output), durationMs: 0 },
    error,
  };
  const structuralChecks = validateCompressionResult(fixture, resultWithoutChecks);
  return { ...resultWithoutChecks, structuralChecks };
}

function selectedBlocks(fixture: AssessmentFixture, policy: CompressionPolicy) {
  return fixture.blocks.filter((block) => block.classification === 'protected' || (block.classification === 'summarizable' && policy.includeSummarizableSource));
}

/** Produce the controlled baseline: only explicitly removable blocks are omitted. */
export function compressDeterministic(
  fixture: AssessmentFixture,
  policy: CompressionPolicy,
): CompressionResult {
  const removedBlockIds = fixture.blocks.filter((block) => block.classification === 'removable').map((block) => block.id);
  const summaryInputBlockIds = fixture.blocks.filter((block) => block.classification === 'summarizable').map((block) => block.id);
  const output = outputForBlocks(selectedBlocks(fixture, policy));
  return baseResult(fixture, policy, output, removedBlockIds, summaryInputBlockIds, [], 'deterministic', null);
}

/**
 * Run the same deterministic selection with an injectable prose-only summarizer.
 * The provider receives no protected or removable markdown. A provider failure
 * returns the deterministic output and records the failed summary stage.
 */
export async function compressFixture(
  fixture: AssessmentFixture,
  policy: CompressionPolicy,
  options: CompressionOptions = {},
): Promise<CompressionResult> {
  const deterministic = compressDeterministic(fixture, policy);
  if (!policy.summarize || !options.summarize || deterministic.summaryInputBlockIds.length === 0) {
    return baseResult(fixture, policy, deterministic.output, deterministic.removedBlockIds, deterministic.summaryInputBlockIds, [], 'local-ai', null);
  }

  const proseBlocks = fixture.blocks.filter((block) => block.classification === 'summarizable');
  const input = outputForBlocks(proseBlocks);
  let stage: SummaryStage;
  try {
    const summary = (await options.summarize({ input, inputBlockIds: deterministic.summaryInputBlockIds, settings: policy.summarize })).trim();
    if (summary.length === 0) throw new Error('Local summarizer returned an empty summary.');
    stage = { inputBlockIds: deterministic.summaryInputBlockIds, output: summary, status: 'completed', error: null };
    const protectedBlocks = fixture.blocks.filter((block) => block.classification === 'protected');
    const output = `${outputForBlocks(protectedBlocks)}\n\n${GENERATED_BOUNDARY}\n${summary}`;
    return baseResult(fixture, policy, output, deterministic.removedBlockIds, deterministic.summaryInputBlockIds, [stage], 'local-ai', null);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    stage = { inputBlockIds: deterministic.summaryInputBlockIds, output: '', status: 'failed', error: message };
    return baseResult(fixture, policy, deterministic.output, deterministic.removedBlockIds, deterministic.summaryInputBlockIds, [stage], 'local-ai', message);
  }
}

export const compress = compressFixture;
export { GENERATED_BOUNDARY };
