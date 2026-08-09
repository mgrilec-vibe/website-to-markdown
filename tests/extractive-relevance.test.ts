import { describe, expect, it } from 'vitest';
import { extractiveSummaries } from '../src/export-compression';
import type { MarkdownBlock } from '../src/export-domain';

function prose(id: string, sourceOrder: number, markdown: string): MarkdownBlock {
  return { id, sourceOrder, markdown, kind: 'summarizable' };
}

describe('extractive relevance', () => {
  it('downweights repeated glue sentences in favor of block-specific information', () => {
    const blocks = [
      prose(
        'one',
        0,
        'This section provides information about the product and how it works. The renderer preserves semantic headings while stripping navigation chrome from exported Markdown.',
      ),
      prose(
        'two',
        1,
        'This section provides information about the product and how it works. The summarizer keeps source sentences locally and never sends captured page content to a server.',
      ),
      prose(
        'three',
        2,
        'This section provides information about the product and how it works. The completion receipt reports Markdown bytes, words, and an estimated token count.',
      ),
    ] as const;

    const summaries = extractiveSummaries(blocks, 0);

    expect(summaries).toHaveLength(3);
    expect(summaries.map(({ markdown }) => markdown)).toEqual([
      'The renderer preserves semantic headings while stripping navigation chrome from exported Markdown.',
      'The summarizer keeps source sentences locally and never sends captured page content to a server.',
      'The completion receipt reports Markdown bytes, words, and an estimated token count.',
    ]);
  });

  it('still favors complementary sentences when more than one sentence is selected', () => {
    const block = prose(
      'diverse',
      0,
      [
        'Conversion quality depends on preserving the article structure.',
        'Conversion quality depends on preserving the article structure.',
        'Readability isolates the focused article before Markdown conversion.',
        'Protected code and table blocks remain verbatim in the export.',
      ].join(' '),
    );

    const summary = extractiveSummaries([block], 50)[0]!.markdown;

    expect((summary.match(/Conversion quality depends on preserving the article structure\./g) ?? [])).toHaveLength(1);
    expect(summary).toMatch(/Readability isolates|Protected code and table/);
  });
});