import { compressDeterministic, compressFixture } from './compression';
import type {
  AssessmentFixture,
  CompressionPolicy,
  FixtureBlock,
  PairedResult,
  ProvisionEvent,
  SummaryStage,
} from './domain';
import { createLocalSession, summarizeChunk, type LocalSummarizerSession } from './summarizer';

export const MAX_PROSE_CHARS_PER_STAGE = 5_000;
const MAX_REDUCTION_PASSES = 4;

export interface PairedRunOptions {
  readonly enableLocalAi: boolean;
  readonly onProvisioningUpdate: (event: ProvisionEvent) => void;
}

interface ProseChunk {
  readonly input: string;
  readonly blockIds: readonly string[];
}

function splitOversizedText(text: string): readonly string[] {
  const chunks: string[] = [];
  let remaining = text.trim();

  while (remaining.length > MAX_PROSE_CHARS_PER_STAGE) {
    const candidate = remaining.slice(0, MAX_PROSE_CHARS_PER_STAGE);
    const sentenceBreak = Math.max(
      candidate.lastIndexOf('. '),
      candidate.lastIndexOf('! '),
      candidate.lastIndexOf('? '),
      candidate.lastIndexOf('\n'),
    );
    const wordBreak = candidate.lastIndexOf(' ');
    const breakAt = Math.max(sentenceBreak > MAX_PROSE_CHARS_PER_STAGE / 2 ? sentenceBreak + 1 : 0, wordBreak);
    const safeBreakAt = breakAt > 0 ? breakAt : MAX_PROSE_CHARS_PER_STAGE;
    chunks.push(remaining.slice(0, safeBreakAt).trimEnd());
    remaining = remaining.slice(safeBreakAt).trimStart();
  }

  if (remaining) {
    chunks.push(remaining);
  }
  return chunks;
}

function combineBoundedParts(parts: readonly ProseChunk[]): readonly ProseChunk[] {
  const chunks: ProseChunk[] = [];
  let currentText = '';
  const currentIds = new Set<string>();

  const flush = (): void => {
    if (currentText) {
      chunks.push({ input: currentText, blockIds: [...currentIds] });
      currentText = '';
      currentIds.clear();
    }
  };

  for (const part of parts) {
    for (const fragment of splitOversizedText(part.input)) {
      const separator = currentText ? '\n\n' : '';
      if (currentText && currentText.length + separator.length + fragment.length > MAX_PROSE_CHARS_PER_STAGE) {
        flush();
      }
      currentText += `${currentText ? '\n\n' : ''}${fragment}`;
      for (const id of part.blockIds) {
        currentIds.add(id);
      }
    }
  }
  flush();
  return chunks;
}


async function summarizeChunks(
  session: LocalSummarizerSession,
  chunks: readonly ProseChunk[],
  stages: SummaryStage[],
): Promise<readonly string[]> {
  const outputs: string[] = [];
  for (const chunk of chunks) {
    const stage = await summarizeChunk(session, chunk.blockIds, chunk.input);
    stages.push(stage);
    if (stage.status === 'failed') {
      throw new Error(stage.error ?? 'Local summarization failed.');
    }
    outputs.push(stage.output);
  }
  return outputs;
}

export async function runPairedAssessment(
  fixture: AssessmentFixture,
  policy: CompressionPolicy,
  options: PairedRunOptions,
): Promise<PairedResult> {
  const deterministic = compressDeterministic(fixture, policy);
  if (!options.enableLocalAi || !policy.summarize || deterministic.summaryInputBlockIds.length === 0) {
    return { fixture, profile: policy, deterministic, localAi: null };
  }

  const summaryStages: SummaryStage[] = [];
  const localAi = await compressFixture(fixture, policy, {
    summarize: async ({ settings }) => {
      const session = await createLocalSession(settings, options.onProvisioningUpdate);
      try {
        const sourceParts = fixture.blocks
          .filter((block) => block.classification === 'summarizable')
          .map((block) => ({ input: block.markdown, blockIds: [block.id] }));
        let outputs = await summarizeChunks(session, combineBoundedParts(sourceParts), summaryStages);
        let reductionPass = 0;

        while (outputs.length > 1) {
          if (reductionPass >= MAX_REDUCTION_PASSES) {
            throw new Error('Local summary reduction did not converge within the bounded pass limit.');
          }
          const reductionParts = outputs.flatMap((output) =>
            splitOversizedText(output).map((input) => ({
              input,
              blockIds: deterministic.summaryInputBlockIds,
            })),
          );
          outputs = await summarizeChunks(session, combineBoundedParts(reductionParts), summaryStages);
          reductionPass += 1;
        }

        const [output] = outputs;
        if (!output) {
          throw new Error('Local summarization produced no output.');
        }
        return output;
      } finally {
        session.destroy?.();
      }
    },
  });

  return {
    fixture,
    profile: policy,
    deterministic,
    localAi: {
      ...localAi,
      summaryStages: summaryStages.length ? summaryStages : localAi.summaryStages,
    },
  };
}


export async function runAssessmentSuite(
  fixtures: readonly AssessmentFixture[],
  policies: readonly CompressionPolicy[],
  options: PairedRunOptions,
): Promise<readonly PairedResult[]> {
  const results: PairedResult[] = [];
  for (const policy of policies) {
    for (const fixture of fixtures) {
      results.push(await runPairedAssessment(fixture, policy, options));
    }
  }
  return results;
}
