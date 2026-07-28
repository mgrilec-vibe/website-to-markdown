import { DOMParser as LinkedomDOMParser } from 'linkedom';
import { beforeAll, describe, expect, it } from 'vitest';
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
import { convertCapturedPage } from '../src/export-markdown';
import type { CapturedPage, MarkdownBlock } from '../src/export-domain';

let tableCollectionsPatched = false;

class TestDOMParser {
  parseFromString(html: string, _mimeType: 'image/svg+xml' | 'text/html' | 'text/xml'): Document {
    const document = new LinkedomDOMParser().parseFromString(html, 'text/html') as unknown as Document;
    const table = document.querySelector('table');
    const row = document.querySelector('tr');
    const cell = document.querySelector('th, td');
    if (!tableCollectionsPatched && table && row && cell) {
      Object.defineProperty(Object.getPrototypeOf(table), 'rows', {
        configurable: true,
        get() {
          return [...this.querySelectorAll('tr')];
        },
      });
      Object.defineProperty(Object.getPrototypeOf(row), 'cells', {
        configurable: true,
        get() {
          return [...this.children].filter((child) => ['TH', 'TD'].includes(child.tagName));
        },
      });
      Object.defineProperty(Object.getPrototypeOf(cell), 'colSpan', {
        configurable: true,
        get() {
          return Number(this.getAttribute('colspan') ?? 1);
        },
      });
      Object.defineProperty(Object.getPrototypeOf(cell), 'rowSpan', {
        configurable: true,
        get() {
          return Number(this.getAttribute('rowspan') ?? 1);
        },
      });
      tableCollectionsPatched = true;
    }
    return document;
  }
}

beforeAll(() => {
  Object.defineProperty(globalThis, 'DOMParser', { configurable: true, writable: true, value: TestDOMParser });
});

const captured: CapturedPage = {
  metadata: {
    title: 'Signal Reference',
    sourceUrl: 'https://example.com/articles/signals',
    canonicalUrl: 'https://example.com/reference/signals',
    capturedAt: '2026-07-26T12:34:56.000Z',
    pageLanguage: 'en',
  },
  focusedHtml: `
    <html><body>
      <h1>Signal Reference</h1>
      <p>Signals help operators choose the next useful action without hiding important context.</p>
      <p><a href="/guide">Inline guide</a> explains how to interpret each signal before changing a system.</p>
      <pre><code class="language-ts">const signal = readSignal();\nreturn signal.state;</code></pre>
      <table>
        <caption>Signal states</caption>
        <tr><th>State</th><th>Meaning</th></tr>
        <tr><td>ready</td><td>Work may begin</td></tr>
      </table>
      <p>Keep the original observation available so later diagnosis can compare it with the result.</p>
    </body></html>
  `,
  completeHtml: `
    <html lang="en">
      <body>
        <nav>Home / Topics / Synthetic Systems</nav>
        <main>
          <h1>Signal Reference</h1>
          <p>Signals help operators choose the next useful action without hiding important context.</p>
          <p><a href="/guide">Inline guide</a> explains how to interpret each signal before changing a system.</p>
          <pre><code class="language-ts">const signal = readSignal();\nreturn signal.state;</code></pre>
          <table>
            <caption>Signal states</caption>
            <tr><th>State</th><th>Meaning</th></tr>
            <tr><td>ready</td><td>Work may begin</td></tr>
          </table>
          <p>Keep the original observation available so later diagnosis can compare it with the result.</p>
          <p>Cookie settings</p>
        </main>
      </body>
    </html>
  `,
  limitations: [],
};

const declaredLanguage = unknownLanguageState(captured.metadata.pageLanguage);

function markdownOf(blocks: readonly MarkdownBlock[]): string {
  return blocks.map((block) => block.markdown).join('\n');
}

describe('export markdown conversion and deterministic compression', () => {
  it('converts both focused and complete captures while protecting link prose', () => {
    const focused = convertCapturedPage(captured, 'focused');
    const complete = convertCapturedPage(captured, 'complete');

    expect(markdownOf(focused.blocks)).toContain('# Signal Reference');
    expect(markdownOf(complete.blocks)).toContain('# Signal Reference');
    expect(markdownOf(focused.blocks)).toContain('| State | Meaning |');
    expect(markdownOf(focused.blocks)).toContain('```ts');
    expect(markdownOf(focused.blocks)).toContain('https://example.com/guide');
    expect(markdownOf(focused.blocks)).not.toContain('Home / Topics / Synthetic Systems');
    expect(markdownOf(complete.blocks)).toContain('Home / Topics / Synthetic Systems');

    const linked = focused.blocks.find((block) => block.markdown.includes('https://example.com/guide'));
    expect(linked?.kind).toBe('protected');
    expect(focused.blocks.filter((block) => block.kind === 'summarizable').map((block) => block.markdown)).not.toEqual(
      expect.arrayContaining([expect.stringContaining('https://example.com/guide')]),
    );
  });

  it('retains all eligible prose at Detail 100 and records removable chrome', () => {
    const result = deterministicCompression(captured, 'complete', 100, declaredLanguage);

    expect(result.removedBlockIds).toEqual(expect.arrayContaining(['block-9']));
    expect(result.summarizableBlocks).toHaveLength(0);
    expect(result.markdown).toContain('Signals help operators choose the next useful action');
    expect(result.markdown).toContain('Keep the original observation available');
    expect(result.markdown).toContain('https://example.com/guide');
    expect(result.markdown).not.toContain('Cookie settings');
  });

  it('applies a distinct lower-Detail retention policy without exposing protected blocks', () => {
    const policy = detailPolicy(15);
    const result = deterministicCompression(captured, 'complete', 15, declaredLanguage);

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
    const result = deterministicCompression(captured, 'focused', 100, declaredLanguage);

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

  it('tags generated summaries and places their boundaries in source order', () => {
    const baseline = deterministicCompression(captured, 'complete', 15, declaredLanguage);
    const summaries = baseline.summarizableBlocks.map((block, index) => ({
      block,
      markdown: `Generated replacement ${index + 1} for source block ${block.sourceOrder}.`,
    }));
    const assisted = withGeneratedSummaries(baseline, summaries, summaries.length);

    expect(summaries.length).toBeGreaterThan(1);
    expect(assisted.metadata.compressionMode).toBe('local-ai-assisted');
    expect(assisted.metadata.generatedSummaryCount).toBe(summaries.length);
    expect(assisted.metadata.summaryChunkCount).toBe(summaries.length);
    expect((assisted.markdown.match(/Locally generated summary/g) ?? []).length).toBe(summaries.length);

    const expectedEntries = [
      ...baseline.blocks.map((block) => ({ sourceOrder: block.sourceOrder, markdown: block.markdown.trim() })),
      ...summaries.map((summary) => ({
        sourceOrder: summary.block.sourceOrder,
        markdown: `> **Locally generated summary**\n>\n> ${summary.markdown}`,
      })),
    ].sort((left, right) => left.sourceOrder - right.sourceOrder);
    const positions = expectedEntries.map((entry) => assisted.markdown.indexOf(entry.markdown));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((left, right) => left - right));
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
    const result = deterministicExtractiveCompression(captured, 'complete', 15, declaredLanguage);

    expect(result.metadata).toMatchObject({
      requestedProvider: 'custom',
      compressionMode: 'custom-extractive',
      summaryOrigin: 'deterministic-diverse-extractive',
    });
    expect(result.markdown).toContain('requested_provider: custom');
    expect(result.markdown).toContain('summary_origin: deterministic-diverse-extractive');
    expect(result.markdown).toContain('Custom extractive summary');
    expect(result.markdown).toContain('https://example.com/guide');
    expect(result.markdown).toContain('```ts');
    expect(result.markdown).not.toContain('Cookie settings');
  });

  it('uses an extractive summary below Detail 100 even for a short prose fixture', () => {
    const result = deterministicExtractiveCompression(captured, 'complete', 75, declaredLanguage);

    expect(result.metadata.generatedSummaryCount).toBeGreaterThan(0);
    expect(result.markdown).toContain('Custom extractive summary');
  });

  it('keeps Detail 100 as the source-preserved deterministic result', () => {
    const baseline = deterministicCompression(captured, 'complete', 100, declaredLanguage);
    const extractive = deterministicExtractiveCompression(captured, 'complete', 100, declaredLanguage);

    expect(extractive).toEqual(baseline);
    expect(extractive.metadata).toMatchObject({ summaryOrigin: 'none', generatedSummaryCount: 0 });
  });

  it('produces the same Custom derivative on repeated runs', () => {
    expect(deterministicExtractiveCompression(captured, 'complete', 15, declaredLanguage)).toEqual(
      deterministicExtractiveCompression(captured, 'complete', 15, declaredLanguage),
    );
  });
  it('keeps None as complete source regardless of the inactive Detail value', () => {
    const result = completeCompression(captured, 'complete', declaredLanguage);

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
