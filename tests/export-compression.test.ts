import { describe, expect, it } from 'vitest';
import {
  completeCompression,
  detailPolicy,
  deterministicCompression,
  deterministicExtractiveCompression,
  extractiveSummaries,
  sentenceSimilarity,
  unknownLanguageState,
  withGeneratedSummaries,
} from '../src/export-compression';
import type { MarkdownConversion } from '../src/conversion';
import type { CapturedPage, MarkdownBlock } from '../src/export-domain';

const captured: CapturedPage = {
  metadata: {
    title: 'Signal Reference',
    sourceUrl: 'https://example.com/articles/signals',
    canonicalUrl: 'https://example.com/reference/signals',
    capturedAt: '2026-07-26T12:34:56.000Z',
    pageLanguage: 'en',
  },
  completeHtml: '',
  limitations: [],
};

const conversion: MarkdownConversion = {
  blocks: [
    { id: 'provenance', markdown: '', kind: 'provenance', sourceOrder: -1 },
    { id: 'block-1', markdown: 'Home / Topics / Synthetic Systems\n', kind: 'removable', sourceOrder: 0 },
    { id: 'block-2', markdown: '# Signal Reference\n', kind: 'protected', sourceOrder: 1 },
    { id: 'block-3', markdown: 'Signals help operators choose the next useful action without hiding important context.\n', kind: 'summarizable', sourceOrder: 2 },
    { id: 'block-4', markdown: '[Inline guide](https://example.com/guide) explains how to interpret each signal before changing a system.\n', kind: 'protected', sourceOrder: 3 },
    { id: 'block-5', markdown: '```ts\nconst signal = readSignal();\nreturn signal.state;\n```\n', kind: 'protected', sourceOrder: 4 },
    { id: 'block-6', markdown: '**Signal states**\n\n| State | Meaning |\n| --- | --- |\n| ready | Work may begin |\n', kind: 'protected', sourceOrder: 5 },
    { id: 'block-7', markdown: 'Keep the original observation available so later diagnosis can compare it with the result.\n', kind: 'summarizable', sourceOrder: 6 },
    { id: 'block-8', markdown: 'Cookie settings\n', kind: 'removable', sourceOrder: 7 },
  ],
  limitations: [],
};

const declaredLanguage = unknownLanguageState(captured.metadata.pageLanguage);

describe('deterministic compression', () => {

  it('retains all eligible prose at Detail 100 and records removable chrome', () => {
    const result = deterministicCompression(captured, conversion, 'complete', 100, declaredLanguage);

    expect(result.removedBlockIds).toEqual(expect.arrayContaining(['block-8']));
    expect(result.summarizableBlocks).toHaveLength(0);
    expect(result.markdown).toContain('Signals help operators choose the next useful action');
    expect(result.markdown).toContain('Keep the original observation available');
    expect(result.markdown).toContain('https://example.com/guide');
    expect(result.markdown).not.toContain('Cookie settings');
  });

  it('applies a distinct lower-Detail retention policy without exposing protected blocks', () => {
    const policy = detailPolicy(15);
    const result = deterministicCompression(captured, conversion, 'complete', 15, declaredLanguage);

    expect(policy).toMatchObject({
      detail: 15,
      retainRatio: 0.15,
      summaryEnabled: true,
      summaryLength: 'short',
      summaryType: 'key-points',
    });
    expect(result.summarizableBlocks.length).toBeGreaterThan(0);
    expect(result.summarizableBlocks.every((block) => block.kind === 'summarizable')).toBe(true);
    expect(result.summarizableBlocks.map((block) => block.markdown)).not.toEqual(
      expect.arrayContaining([expect.stringContaining('https://example.com/guide')]),
    );
    expect(result.markdown).toContain('# Signal Reference');
    expect(result.markdown).toContain('https://example.com/guide');
    expect(result.markdown).toContain('```ts');
    expect(result.markdown).toContain('| State | Meaning |');
    expect(result.markdown).not.toContain('Cookie settings');
  });

  it('keeps provenance and measured deterministic metadata in front matter', () => {
    const result = deterministicCompression(captured, conversion, 'focused', 100, declaredLanguage);

    expect(result.metadata).toMatchObject({
      title: captured.metadata.title,
      sourceUrl: captured.metadata.sourceUrl,
      canonicalUrl: captured.metadata.canonicalUrl,
      capturedAt: captured.metadata.capturedAt,
      pageLanguage: 'en',
      exportMode: 'focused',
      compressionMode: 'complete',
      detail: 100,
      words: expect.any(Number),
      bytes: expect.any(Number),
      generatedSummaryCount: 0,
      summaryChunkCount: 0,
    });
    expect(result.metadata.words).toBeGreaterThan(0);
    expect(result.metadata.bytes).toBeGreaterThan(result.metadata.words);
    expect(result.markdown).toContain('source_url: "https://example.com/articles/signals"');
    expect(result.markdown).toContain('canonical_url: "https://example.com/reference/signals"');
    expect(result.markdown).toContain('export_mode: focused');
    expect(result.markdown).toContain('compression_mode: complete');
    expect(result.markdown).toContain(`words: ${result.metadata.words}`);
    expect(result.markdown).toContain(`bytes: ${result.metadata.bytes}`);
    expect(result.markdown).toContain('detected_language: "unknown"');
  });

  it('inserts one neutral generated Summary section after the source title', () => {
    const baseline = deterministicCompression(captured, conversion, 'complete', 15, declaredLanguage);
    const summaries = baseline.summarizableBlocks.map((block, index) => ({
      block,
      markdown: `Generated replacement ${index + 1} for source block ${block.sourceOrder}.`,
    }));
    const assisted = withGeneratedSummaries(baseline, summaries, summaries.length);

    expect(summaries.length).toBeGreaterThan(1);
    expect(assisted.metadata.compressionMode).toBe('local-ai-assisted');
    expect(assisted.metadata.generatedSummaryCount).toBe(1);
    expect(assisted.metadata.summaryChunkCount).toBe(summaries.length);
    expect((assisted.markdown.match(/^## Summary$/gmu) ?? []).length).toBe(1);
    expect(assisted.markdown).not.toContain('Locally generated summary');
    expect(assisted.markdown).toContain('Generated replacement 1');
    expect(assisted.markdown).not.toContain('Generated replacement 2');
    expect(assisted.markdown).toContain('compression_mode: local-ai-assisted');
  });

  it('creates a language-independent extractive derivative from source sentences only', () => {
    const sourceBlocks: readonly MarkdownBlock[] = [
      {
        id: 'prose-1',
        kind: 'summarizable',
        sourceOrder: 20,
        markdown: 'Opening source sentence introduces the topic. Frequent signal evidence supports the claim. Closing source sentence records the outcome.',
      },
      {
        id: 'prose-2',
        kind: 'summarizable',
        sourceOrder: 21,
        markdown: 'Second block starts after the first. Evidence remains available for review.',
      },
    ];
    const summaries = extractiveSummaries(sourceBlocks, 50);
    const sourceText = sourceBlocks.map((block) => block.markdown).join(' ');

    expect(summaries).toHaveLength(2);
    for (const summary of summaries) {
      for (const sentence of summary.markdown.split(/(?<=[.!?])\s+/u)) {
        expect(sourceText).toContain(sentence);
      }
    }
    expect(summaries.map((summary) => summary.block.id)).toEqual(['prose-1', 'prose-2']);
  });

  it('labels low-detail Custom output with requested-provider and actual-origin metadata without including protected blocks', () => {
    const result = deterministicExtractiveCompression(captured, conversion, 'complete', 15, declaredLanguage);

    expect(result.metadata).toMatchObject({
      requestedProvider: 'custom',
      compressionMode: 'custom-extractive',
      summaryOrigin: 'deterministic-diverse-extractive',
      generatedSummaryCount: expect.any(Number),
      summaryChunkCount: 0,
      policyVersion: 2,
    });
    expect(result.metadata.generatedSummaryCount).toBeGreaterThan(0);
    expect(result.markdown).toContain('requested_provider: custom');
    expect(result.markdown).toContain('compression_mode: custom-extractive');
    expect(result.markdown).toContain('summary_origin: deterministic-diverse-extractive');
    expect(result.markdown).toContain(`generated_summary_count: ${result.metadata.generatedSummaryCount}`);
    expect(result.markdown).toMatch(/^> .+$/mu);
    const summaryLines = result.markdown.split('\n').filter((line) => /^> (?!Conversion limitation:)/u.test(line));
    expect(summaryLines).toHaveLength(result.summarizableBlocks.length);
    const zeroDetail = deterministicExtractiveCompression(captured, conversion, 'complete', 0, declaredLanguage);
    const zeroDetailSummaryLines = zeroDetail.markdown.split('\n').filter((line) => /^> (?!Conversion limitation:)/u.test(line));
    expect(zeroDetail.metadata.generatedSummaryCount).toBeGreaterThan(0);
    expect(zeroDetailSummaryLines).toHaveLength(zeroDetail.summarizableBlocks.length);
    expect(result.markdown).not.toContain('Custom extractive summary');
    expect(result.markdown).toContain('https://example.com/guide');
    expect(result.markdown).toContain('```ts');
    expect(result.markdown).not.toContain('Cookie settings');
  });

  it('uses an extractive summary below Detail 100 even for a short prose fixture', () => {
    const result = deterministicExtractiveCompression(captured, conversion, 'complete', 75, declaredLanguage);

    expect(result.metadata).toMatchObject({
      generatedSummaryCount: expect.any(Number),
      policyVersion: 2,
    });
    expect(result.metadata.generatedSummaryCount).toBeGreaterThan(0);
    expect(result.markdown).toMatch(/^> .+$/mu);
    expect(result.markdown).not.toContain('Custom extractive summary');
  });

  it('keeps Detail 100 as the source-preserved deterministic result', () => {
    const baseline = deterministicCompression(captured, conversion, 'complete', 100, declaredLanguage);
    const extractive = deterministicExtractiveCompression(captured, conversion, 'complete', 100, declaredLanguage);

    expect(extractive).toEqual(baseline);
    expect(extractive.metadata).toMatchObject({ summaryOrigin: 'none', generatedSummaryCount: 0 });
  });

  it('produces the same Custom derivative on repeated runs', () => {
    expect(deterministicExtractiveCompression(captured, conversion, 'complete', 15, declaredLanguage)).toEqual(
      deterministicExtractiveCompression(captured, conversion, 'complete', 15, declaredLanguage),
    );
  });
  it('keeps None as complete source regardless of the inactive Detail value', () => {
    const result = completeCompression(captured, conversion, 'complete', declaredLanguage);

    expect(result.metadata).toMatchObject({ requestedProvider: 'none', summaryOrigin: 'none', detail: 100, generatedSummaryCount: 0 });
    expect(result.markdown).toContain('Signals help operators choose the next useful action');
    expect(result.markdown).toContain('Keep the original observation available');
    expect(result.markdown).not.toContain('Cookie settings');
  });

  it('selects an orthogonal sentence over an exact duplicate with greedy MMR', () => {
    const block: MarkdownBlock = {
      id: 'mmr',
      kind: 'summarizable',
      sourceOrder: 0,
      markdown: [
        'Safety evidence supports the release decision.',
        'Safety evidence supports the release decision.',
        'Rollback teams verify independent deployment caveat.',
        'Rollback.',
        'Teams.',
        'Verify.',
        'Independent.',
        'Deployment.',
        'Caveat.',
      ].join(' '),
    };

    const summary = extractiveSummaries([block], 15)[0]!.markdown;
    expect((summary.match(/Safety evidence supports the release decision\./g) ?? [])).toHaveLength(1);
    expect(summary).toContain('Rollback teams verify independent deployment caveat.');
  });

  it('uses bounded character-trigram similarity when word tokens are too coarse', () => {
    expect(sentenceSimilarity('你好世界呀', '你好世界呢')).toBeGreaterThan(0);
    expect(sentenceSimilarity('ab', 'ac')).toBe(0);
  });
});
