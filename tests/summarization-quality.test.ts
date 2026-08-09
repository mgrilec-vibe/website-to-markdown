import { describe, expect, it, vi } from 'vitest';
import { deterministicExtractiveCompression } from '../src/export-compression';
import { summarizeBlocks, validateSummaryGrounding, type SummarizerSession } from '../src/export-ai';
import { rankBlocksForRetention } from '../src/extractive-summarizer';
import type { MarkdownConversion } from '../src/conversion';
import type { CapturedPage, MarkdownBlock } from '../src/export-domain';

const captured: CapturedPage = {
  metadata: {
    title: 'Structured summary quality',
    sourceUrl: 'https://example.com/structured-summary',
    capturedAt: '2026-08-10T00:00:00.000Z',
    pageLanguage: 'en',
  },
  completeHtml: '',
  limitations: [],
};

function block(id: string, kind: MarkdownBlock['kind'], sourceOrder: number, markdown: string): MarkdownBlock {
  return { id, kind, sourceOrder, markdown };
}

function structuredConversion(): MarkdownConversion {
  const blocks: MarkdownBlock[] = [block('provenance', 'provenance', -1, '')];
  let sourceOrder = 0;
  for (const [heading, fact] of [
    ['Capture', 'The capture pipeline preserves canonical URLs and records a 64-bit timestamp.'],
    ['Conversion', 'The renderer preserves semantic headings while stripping navigation chrome from exported Markdown.'],
    ['Privacy', 'The summarizer keeps source sentences locally and never sends captured page content to a server.'],
    ['Receipt', 'The completion receipt reports Markdown bytes, words, and an estimated token count.'],
  ] as const) {
    blocks.push(block(`heading-${heading}`, 'protected', sourceOrder++, `## ${heading}\n`));
    blocks.push(block(`glue-before-${heading}`, 'summarizable', sourceOrder++, 'This section provides information about the product and how it works.\n'));
    blocks.push(block(`fact-${heading}`, 'summarizable', sourceOrder++, `${fact}\n`));
    blocks.push(block(`glue-after-${heading}`, 'summarizable', sourceOrder++, 'This section provides information about the product and how it works.\n'));
  }
  return { blocks, limitations: [] };
}

function focusedSection(id: string, sourceOrder: number, heading: string, fact: string): MarkdownBlock {
  return block(
    `summary-section-${id}`,
    'summarizable',
    sourceOrder,
    `## ${heading}\n\nThis section provides generic information about the product. ${fact}`,
  );
}

describe('structure-aware Custom summarization quality', () => {
  it('uses a global section budget and suppresses repeated glue in favor of distinct evidence', () => {
    const conversion = structuredConversion();
    const result = deterministicExtractiveCompression(captured, conversion, 'focused', 0);
    const summaryLines = result.markdown.split('\n').filter((line) => /^> (?!Conversion limitation:)/u.test(line));

    expect(result.metadata).toMatchObject({
      policyVersion: 2,
      compressionMode: 'custom-extractive',
      summaryOrigin: 'deterministic-diverse-extractive',
      generatedSummaryCount: 4,
    });
    expect(summaryLines).toHaveLength(4);
    expect(conversion.blocks.filter((candidate) => candidate.kind === 'summarizable')).toHaveLength(12);
    expect(result.markdown).toContain('preserves canonical URLs and records a 64-bit timestamp');
    expect(result.markdown).toContain('preserves semantic headings while stripping navigation chrome');
    expect(result.markdown).toContain('never sends captured page content to a server');
    expect(result.markdown).toContain('reports Markdown bytes, words, and an estimated token count');
    expect(result.markdown).not.toContain('This section provides information about the product and how it works.');
  });

  it('prioritizes informative blocks for source retention before repeated framing', () => {
    const ranked = rankBlocksForRetention(structuredConversion().blocks);

    expect(ranked.slice(0, 4).map(({ id }) => id)).toEqual(expect.arrayContaining([
      'fact-Capture',
      'fact-Conversion',
      'fact-Privacy',
      'fact-Receipt',
    ]));
    expect(ranked.slice(0, 4).every(({ id }) => id.startsWith('fact-'))).toBe(true);
  });

  it('keeps exported word counts monotonic as Detail increases', () => {
    const blocks: MarkdownBlock[] = [
      block('provenance', 'provenance', -1, ''),
      block('heading', 'protected', 0, '# Monotonic detail\n'),
    ];
    for (let index = 0; index < 10; index += 1) {
      blocks.push(block(
        `topic-${index}`,
        'summarizable',
        index + 1,
        [
          `Block ${index} introduces topic ${index}.`,
          `Important result ${index} improves throughput by ${index + 10} percent.`,
          `Caveat ${index} requires rollback validation.`,
          `Supporting detail ${index} records the measurement method.`,
        ].join(' '),
      ));
    }
    const conversion: MarkdownConversion = { blocks, limitations: [] };
    let previousWords = 0;

    for (let detail = 0; detail <= 100; detail += 5) {
      const result = deterministicExtractiveCompression(captured, conversion, 'focused', detail);
      expect(result.metadata.words).toBeGreaterThanOrEqual(previousWords);
      previousWords = result.metadata.words;
    }
  });

  it('is deterministic for identical structured input', () => {
    const conversion = structuredConversion();
    expect(deterministicExtractiveCompression(captured, conversion, 'focused', 20)).toEqual(
      deterministicExtractiveCompression(captured, conversion, 'focused', 20),
    );
  });
});

describe('grounded Browser local-AI summarization', () => {
  it('accepts normalized source facts while rejecting fabricated numbers, links, and code identifiers', () => {
    const source = [
      'The proxy reduced median latency by 5 ms, CPU by 70 percent, and memory by 67 percent.',
      'Call `fetch()` and read https://example.com/evidence for the documented result.',
    ].join(' ');

    expect(validateSummaryGrounding(
      'Median latency fell by 5 milliseconds, CPU by 70%, and memory by 67%; call `fetch()`.',
      source,
    )).toEqual({ supported: true });
    expect(validateSummaryGrounding('Median latency fell by 9 ms.', source)).toMatchObject({ supported: false });
    expect(validateSummaryGrounding('Read https://fabricated.example/result.', source)).toMatchObject({ supported: false });
    expect(validateSummaryGrounding('Call `axios()` to reproduce the result.', source)).toMatchObject({ supported: false });
  });

  it('uses graph-guided source compaction before Browser AI when the full source exceeds quota', async () => {
    const sections = [
      focusedSection('introduction', 0, 'Introduction', 'Pingora serves over one trillion requests per day using a third of the prior CPU and memory.'),
      focusedSection('performance', 1, 'Performance', 'Median TTFB fell by 5 ms and p95 fell by 80 ms.'),
      focusedSection('efficiency', 2, 'Efficiency', 'Production CPU dropped 70 percent and memory dropped 67 percent.'),
      focusedSection('safety', 3, 'Safety', 'Rust memory safety eliminated service-code crashes across hundreds of trillions of requests.'),
    ];
    const summaryInputs: string[] = [];
    const session: SummarizerSession = {
      inputQuota: 420,
      measureInputUsage: vi.fn(async (text: string) => text.length),
      summarize: vi.fn(async (text: string) => {
        summaryInputs.push(text);
        return 'Pingora serves over one trillion requests per day using a third of the prior CPU and memory.';
      }),
    };

    const result = await summarizeBlocks(session, sections, 'Use source facts only.');

    expect(result).toMatchObject({ chunkCount: 1, reductionStages: 0 });
    expect(summaryInputs).toHaveLength(1);
    expect(summaryInputs[0]).toContain('## Introduction');
    expect(summaryInputs[0]).toContain('Median TTFB fell by 5 ms');
    expect(summaryInputs[0]).toContain('Production CPU dropped 70 percent');
    expect(summaryInputs[0]).toContain('Rust memory safety eliminated service-code crashes');
    expect(summaryInputs[0]).not.toContain('generic information about the product');
  });

  it('grounds every map and reduction stage against its source evidence', async () => {
    const summarize = vi.fn(async () => 'The source reports an unsupported 999 ms result.');
    const session: SummarizerSession = {
      inputQuota: 180,
      measureInputUsage: vi.fn(async (text: string) => text.length),
      summarize,
    };
    const sections = [
      focusedSection('one', 0, 'One', 'The first measured latency was 5 ms and the rollout retained rollback support.'),
      focusedSection('two', 1, 'Two', 'The second measured latency was 8 ms and operators retained audit evidence.'),
    ];

    await expect(summarizeBlocks(session, sections, 'Use source facts only.')).rejects.toThrow('unsupported numeric fact 999ms');
  });
});
