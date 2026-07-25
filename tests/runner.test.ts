import { afterEach, describe, expect, it } from 'vitest';
import { getCompressionPolicy } from '../src/policies';
import { MAX_PROSE_CHARS_PER_STAGE, runPairedAssessment } from '../src/runner';
import {
  setSummarizerApiForTesting,
  type ChromeSummarizerApi,
  type LocalSummarizerSession,
} from '../src/summarizer';
import type { AssessmentFixture } from '../src/domain';

afterEach(() => setSummarizerApiForTesting(undefined));

describe('paired assessment runner', () => {
  it('keeps deterministic source as the fallback when local AI is disabled', async () => {
    const fixture: AssessmentFixture = {
      id: 'fallback-test',
      title: 'Fallback test',
      category: 'fallback',
      blocks: [
        { id: 'meta', classification: 'protected', kind: 'frontmatter', label: 'meta', markdown: 'source: fixture' },
        { id: 'heading', classification: 'protected', kind: 'heading', label: 'heading', markdown: '# Heading' },
        { id: 'prose', classification: 'summarizable', kind: 'paragraph', label: 'prose', markdown: 'Retain useful detail.' },
      ],
      expectations: {
        version: '1.0.0',
        requiredProtectedBlockIds: ['meta', 'heading'],
        requiredRemovedBlockIds: [],
        expectedSummaryInputBlockIds: ['prose'],
      },
    };

    const result = await runPairedAssessment(fixture, getCompressionPolicy('compact'), {
      enableLocalAi: false,
      onProvisioningUpdate: () => undefined,
    });

    expect(result.localAi).toBeNull();
    expect(result.deterministic.output).toContain('Retain useful detail.');
  });

  it('records bounded chunk stages while only summarizing eligible prose', async () => {
    const longParagraph = 'synthetic prose '.repeat(400);
    const fixture: AssessmentFixture = {
      id: 'chunked-test',
      title: 'Chunked test',
      category: 'long-prose',
      blocks: [
        { id: 'meta', classification: 'protected', kind: 'frontmatter', label: 'meta', markdown: 'source: fixture' },
        { id: 'heading', classification: 'protected', kind: 'heading', label: 'heading', markdown: '# Heading' },
        { id: 'prose-a', classification: 'summarizable', kind: 'paragraph', label: 'prose A', markdown: longParagraph },
        { id: 'prose-b', classification: 'summarizable', kind: 'paragraph', label: 'prose B', markdown: longParagraph },
      ],
      expectations: {
        version: '1.0.0',
        requiredProtectedBlockIds: ['meta', 'heading'],
        requiredRemovedBlockIds: [],
        expectedSummaryInputBlockIds: ['prose-a', 'prose-b'],
      },
    };
    let calls = 0;
    const observedInputs: string[] = [];
    const session: LocalSummarizerSession = {
      async summarize(input): Promise<string> {
        calls += 1;
        observedInputs.push(input);
        expect(input.length).toBeLessThanOrEqual(MAX_PROSE_CHARS_PER_STAGE);
        expect(input).not.toContain('source: fixture');
        expect(input).not.toContain('# Heading');
        return `summary ${calls}`;
      },
    };
    const api: ChromeSummarizerApi = {
      availability: async () => 'available',
      create: async () => session,
    };
    setSummarizerApiForTesting(api);

    const result = await runPairedAssessment(fixture, getCompressionPolicy('compact'), {
      enableLocalAi: true,
      onProvisioningUpdate: () => undefined,
    });

    expect(observedInputs.length).toBeGreaterThanOrEqual(3);
    expect(observedInputs.every((input) => input.length <= MAX_PROSE_CHARS_PER_STAGE)).toBe(true);
    expect(result.localAi?.summaryStages.length).toBeGreaterThanOrEqual(3);
    expect(result.localAi?.output).toContain('generated summary');
    expect(result.localAi?.output).toContain('summary');
  });
});
