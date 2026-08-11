import { describe, expect, it } from 'vitest';
import {
  createGroundingEvidence,
  createStructureAwareExtractiveSummaries,
  extractiveSummaries,
} from '../src/extractive-summarizer';
import { deterministicExtractiveCompression } from '../src/export-compression';
import type { MarkdownConversion } from '../src/conversion';
import type { CapturedPage, MarkdownBlock } from '../src/export-domain';

function prose(id: string, sourceOrder: number, markdown: string): MarkdownBlock {
  return { id, sourceOrder, markdown, kind: 'summarizable' };
}

function heading(id: string, sourceOrder: number, markdown: string): MarkdownBlock {
  return { id, sourceOrder, markdown, kind: 'protected' };
}

const generic = 'This section provides information about the product and how it works.';

describe('structure-aware extractive relevance', () => {
  it('downweights repeated glue sentences in favor of block-specific information', () => {
    const blocks = [
      prose('one', 0, `${generic} The renderer preserves semantic headings while stripping navigation chrome from exported Markdown.`),
      prose('two', 1, `${generic} The summarizer keeps source sentences locally and never sends captured page content to a server.`),
      prose('three', 2, `${generic} The completion receipt reports Markdown bytes, words, and an estimated token count.`),
    ] as const;

    expect(extractiveSummaries(blocks, 0).map(({ markdown }) => markdown)).toEqual([
      'The renderer preserves semantic headings while stripping navigation chrome from exported Markdown.',
      'The summarizer keeps source sentences locally and never sends captured page content to a server.',
      'The completion receipt reports Markdown bytes, words, and an estimated token count.',
    ]);
  });

  it('uses a document-wide budget instead of emitting one summary for every omitted paragraph', () => {
    const blocks = [
      heading('rendering-heading', 0, '## Rendering'),
      prose('rendering', 1, `${generic} The renderer preserves semantic headings while stripping navigation chrome from exported Markdown.`),
      heading('privacy-heading', 2, '## Privacy'),
      prose('privacy', 3, `${generic} The summarizer keeps source sentences locally and never sends captured page content to a server.`),
      heading('receipt-heading', 4, '## Receipt'),
      prose('receipt', 5, `${generic} The completion receipt reports Markdown bytes, words, and an estimated token count.`),
    ] as const;
    const targetIds = new Set(['rendering', 'privacy', 'receipt']);

    const summaries = createStructureAwareExtractiveSummaries(blocks, targetIds, 65, 'Website to Markdown');
    const text = summaries.map(({ markdown }) => markdown).join(' ');
    const uniqueFacts = [
      'preserves semantic headings',
      'never sends captured page content',
      'reports Markdown bytes',
    ].filter((fact) => text.includes(fact));

    expect(summaries.length).toBeLessThan(targetIds.size);
    expect(uniqueFacts.length).toBeGreaterThanOrEqual(2);
    expect(text).not.toContain(generic);
  });

  it('never selects retained or protected blocks as Custom replacement summaries', () => {
    const blocks = [
      heading('heading', 0, '## Reliability'),
      prose('retained', 1, 'The retained source contains a highly distinctive titanium checksum protocol.'),
      prose('omitted', 2, 'Retries stop after two attempts to prevent overload amplification.'),
      { id: 'code', sourceOrder: 3, markdown: '```ts\nretry(2)\n```', kind: 'protected' as const },
    ] as const;

    const summaries = createStructureAwareExtractiveSummaries(blocks, new Set(['omitted']), 0, 'Reliability');

    expect(summaries).toHaveLength(1);
    expect(summaries[0]!.block.id).toBe('omitted');
    expect(summaries[0]!.markdown).toContain('Retries stop after two attempts');
    expect(summaries[0]!.markdown).not.toContain('titanium checksum');
    expect(summaries[0]!.markdown).not.toContain('retry(2)');
  });

  it('builds compact source evidence that preserves salient exact facts', () => {
    const blocks = [
      heading('latency-heading', 0, '## Latency'),
      prose('latency', 1, `${generic} Compaction pauses when p99 latency exceeds 40 milliseconds.`),
      heading('security-heading', 2, '## Security'),
      prose('security', 3, `${generic} Encryption keys rotate every 30 days without taking shards offline.`),
      heading('availability-heading', 4, '## Availability'),
      prose('availability', 5, `${generic} The service targets 99.95 percent monthly availability.`),
    ] as const;

    const evidence = createGroundingEvidence(blocks, 28, 'Distributed cache');

    expect(evidence.split('\n').length).toBeLessThanOrEqual(3);
    expect(evidence).toMatch(/40 milliseconds|30 days|99\.95 percent/);
    expect(evidence).not.toContain(generic);
  });

  it('is deterministic, extractive, and monotonic across Detail levels', () => {
    const captured: CapturedPage = {
      metadata: {
        title: 'Distributed cache architecture',
        sourceUrl: 'https://example.com/cache',
        capturedAt: '2026-08-10T00:00:00.000Z',
        pageLanguage: 'en',
      },
      completeHtml: '',
      limitations: [],
    };
    const paragraphs = [
      'The service accepts cache reads from regional clients. It routes each key through rendezvous hashing to a stable shard. This avoids remapping most keys when capacity changes.',
      'Writers attach a monotonic version to every mutation. Replicas reject stale updates and preserve the newest acknowledged value. A quorum of three replicas tolerates one unavailable node.',
      'The retry budget is limited to 250 milliseconds. Requests fail closed after two attempts so overload does not amplify across regions. Operators can inspect retry saturation in the dashboard.',
      'Encryption uses AES-256-GCM for persisted values. Keys rotate every 30 days without taking shards offline. The control plane records each rotation in an immutable audit log.',
      'A background compactor reclaims expired entries. Compaction pauses when p99 latency exceeds 40 milliseconds. This protects interactive reads during peak demand.',
      'Disaster recovery snapshots are copied to two regions. Recovery point objective is 15 minutes and recovery time objective is 45 minutes. Quarterly drills verify the documented procedure.',
    ];
    const conversion: MarkdownConversion = {
      blocks: [
        { id: 'provenance', kind: 'provenance', sourceOrder: -1, markdown: '' },
        ...paragraphs.flatMap((paragraph, index) => [
          heading(`heading-${index}`, index * 2, `## Section ${index + 1}`),
          prose(`paragraph-${index}`, index * 2 + 1, paragraph),
        ]),
      ],
      limitations: [],
    };
    const source = paragraphs.join(' ');
    const details = [0, 15, 40, 65, 85, 100] as const;
    const results = details.map((detail) => deterministicExtractiveCompression(captured, conversion, 'focused', detail));

    expect(deterministicExtractiveCompression(captured, conversion, 'focused', 40)).toEqual(results[2]);
    for (const result of results.slice(0, -1)) {
      const summaryLines = result.markdown.split('\n').filter((line) => /^> (?!Conversion limitation:)/u.test(line));
      for (const line of summaryLines) {
        for (const sentence of line.replace(/^>\s*/u, '').split(/(?<=[.!?])\s+/u)) expect(source).toContain(sentence);
      }
    }
    expect(results.map(({ metadata }) => metadata.words)).toEqual(
      [...results].map(({ metadata }) => metadata.words).sort((left, right) => left - right),
    );
  });
});
