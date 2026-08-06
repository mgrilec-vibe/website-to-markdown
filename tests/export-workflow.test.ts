import { describe, expect, it, vi } from 'vitest';
import { convertCapturedPage } from '../src/conversion';
import { jsdomHtmlParser } from '../src/conversion/jsdom-parser';
import { BENCHMARK_CORPUS } from '../src/benchmark/corpus';
import { linkedomHtmlParser } from '../src/conversion/linkedom-parser';
import { summarizeBlocks, type SummarizerSession } from '../src/export-ai';
import { createFinalExport, createFocusedSummarySource, type BrowserSummaryAdapter } from '../src/export-workflow';
import type { CapturedPage } from '../src/export-domain';

const captured: CapturedPage = {
  metadata: {
    title: 'Provider fixture',
    sourceUrl: 'https://example.com/provider-fixture',
    capturedAt: '2026-07-26T12:34:56.000Z',
    pageLanguage: 'en',
  },
  focusedHtml: '<html><body><main><h1>Provider fixture</h1><p>Safety evidence supports the release decision. Rollback teams verify independent deployment caveat.</p></main></body></html>',
  completeHtml: '<html><body><main><h1>Provider fixture</h1><p>Safety evidence supports the release decision. Rollback teams verify independent deployment caveat.</p></main></body></html>',
  limitations: [],
};

const focusedCaptured: CapturedPage = {
  ...captured,
  focusedHtml: `
    <html><body><article>
      <nav>Navigation chrome</nav>
      <h1>Provider fixture</h1>
      <p>Safety evidence supports the release decision. <a href="/rollback">Rollback teams</a> verify independent deployment caveat.</p>
      <h2>Primary behavior</h2>
      <p>The request returns a response object and callers inspect <code>fetch()</code> status and errors.</p>
      <ul><li>Keep response handling explicit.</li><li>Check important cautions.</li></ul>
      <pre><code>fetch('/resource')</code></pre>
      <table><tr><th>Input</th><th>Output</th></tr><tr><td>URL</td><td>Response</td></tr></table>
      <blockquote>Navigation and footer text are not primary content.</blockquote>
      <h2>See also</h2><ul><li>Related links</li></ul>
      <h2>Specifications</h2><p>Specification index.</p>
      <aside>Sidebar index</aside>
      <footer>Footer links and newsletter</footer>
    </article></body></html>
  `,
};

const unavailableAdapter: BrowserSummaryAdapter = {
  htmlParser: linkedomHtmlParser,
  checkCapability: async () => ({ detector: 'unavailable', summarizer: 'unavailable', summarizerError: 'Chrome Summarizer is unavailable.' }),
  createLanguageDetector: async () => { throw new Error('must not create detector'); },
  detectEligibleLanguage: async () => { throw new Error('must not detect language'); },
  createSummarizer: async () => { throw new Error('must not create summarizer'); },
  summarizeBlocks: async () => { throw new Error('must not summarize'); },
};

describe('provider result workflow', () => {
  it('builds a normalized coherent source from focused primary sections', () => {
    const conversion = convertCapturedPage(focusedCaptured, 'focused', linkedomHtmlParser);
    const source = createFocusedSummarySource(conversion);

    expect(source.sections).toHaveLength(2);
    expect(source.text).toContain('Provider fixture');
    expect(source.text).toContain('Rollback teams');
    expect(source.text).toContain('Keep response handling explicit.');
    expect(source.text).toContain('fetch');
    expect(source.text).not.toContain('Navigation chrome');
    expect(source.text).not.toContain('Footer links');
    expect(source.text).not.toContain('Related links');
    expect(source.text).not.toContain('Specification index.');
    expect(source.text).not.toContain('https://example.com/rollback');
    expect(source.text).not.toContain('| Input |');
    expect(source.sections.map((section) => section.blockIds.length)).toEqual([2, 3]);
  });

  it('summarizes the approved MDN focused fixture with excluded secondary sections', async () => {
    const fixture = BENCHMARK_CORPUS.find((candidate) => candidate.id === 'api-reference-mdn-fetch');
    if (!fixture) throw new Error('Approved MDN fixture is missing.');
    const source = createFocusedSummarySource(convertCapturedPage(fixture.captured, 'focused', jsdomHtmlParser));
    const measuredInputs: string[] = [];
    const adapter: BrowserSummaryAdapter = {
      htmlParser: jsdomHtmlParser,
      checkCapability: async () => ({ detector: 'available', summarizer: 'available' }),
      createLanguageDetector: async () => ({ detect: async () => [] }),
      detectEligibleLanguage: async () => ({ origin: 'detected', primaryLanguage: 'en', confidence: 1, alternatives: [], supported: true }),
      createSummarizer: async () => ({
        inputQuota: 100_000,
        measureInputUsage: async (text: string) => {
          measuredInputs.push(text);
          return text.length;
        },
        summarize: async () => 'The fetch method returns a response and reports request failures.',
      }),
      summarizeBlocks,
    };

    const result = await createFinalExport(fixture.captured, 'focused', 40, 'browser', adapter);

    expect(source.text).toContain('fetch');
    expect(source.text).not.toContain('See also');
    expect(source.text).not.toContain('Browser compatibility');
    expect(source.text).not.toContain('Specifications');
    expect(measuredInputs[0]).toBe(source.text);
    expect(result.result.metadata).toMatchObject({
      exportMode: 'focused',
      detail: 40,
      summaryOrigin: 'local-ai',
      generatedSummaryCount: 1,
      language: expect.objectContaining({ primaryLanguage: 'en', supported: true }),
    });
    expect(result.result.markdown).toContain('## Summary');
    expect(result.result.markdown).toContain('summary_origin: local-ai');
  });

  it('returns complete converted Markdown for None without invoking Browser AI', async () => {
    const result = await createFinalExport(captured, 'complete', 15, 'none', unavailableAdapter);

    expect(result.result.metadata).toMatchObject({ requestedProvider: 'none', summaryOrigin: 'none', detail: 100 });
    expect(result.result.markdown).toContain('Safety evidence supports the release decision.');
  });

  it('labels an unavailable Browser request as a Custom actual result', async () => {
    const progress: string[] = [];
    const result = await createFinalExport(captured, 'complete', 15, 'browser', unavailableAdapter, (phase) => { progress.push(phase); });

    expect(result.result.metadata).toMatchObject({ requestedProvider: 'browser', summaryOrigin: 'deterministic-diverse-extractive' });
    expect(result.browserFailure).toContain('unavailable');
    expect(result.result.markdown).toContain('requested_provider: browser');
    expect(result.result.markdown).toContain('summary_origin: deterministic-diverse-extractive');
    expect(progress).toEqual(['converting']);
  });

  it('preserves Browser as requested and inserts one coherent local summary independently of Detail', async () => {
    const destroy = vi.fn();
    const sourceInputs: string[][] = [];
    let createOptions: Record<string, unknown> | undefined;
    let requestContext = '';
    const adapter: BrowserSummaryAdapter = {
      htmlParser: linkedomHtmlParser,
      checkCapability: async () => ({ detector: 'available', summarizer: 'available' }),
      createLanguageDetector: async () => ({ detect: async () => [] }),
      detectEligibleLanguage: async () => ({ origin: 'detected', primaryLanguage: 'en', confidence: 1, alternatives: [], supported: true }),
      createSummarizer: async (_policy, _language, options) => {
        createOptions = options as Record<string, unknown>;
        const session: SummarizerSession = {
          inputQuota: 180,
          measureInputUsage: async (text: string) => text.length,
          summarize: async () => 'Safety evidence supports the release decision.',
          destroy,
        };
        return session;
      },
      summarizeBlocks: async (session, blocks, context) => {
        sourceInputs.push(blocks.map((block) => block.markdown));
        requestContext = context ?? '';
        return summarizeBlocks(session, blocks, context);
      },
    };

    const first = await createFinalExport(focusedCaptured, 'focused', 15, 'browser', adapter);
    const second = await createFinalExport(focusedCaptured, 'focused', 85, 'browser', adapter);

    expect(first.result.metadata).toMatchObject({
      exportMode: 'focused',
      requestedProvider: 'browser',
      summaryOrigin: 'local-ai',
      detail: 15,
      language: expect.objectContaining({ primaryLanguage: 'en', supported: true }),
      generatedSummaryCount: 1,
      summaryChunkCount: 2,
    });
    expect(second.result.metadata.detail).toBe(85);
    expect(sourceInputs[0]).toEqual(sourceInputs[1]);
    expect(first.result.markdown.match(/^## Summary$/gmu)).toHaveLength(1);
    expect(first.result.markdown.indexOf('## Summary')).toBeGreaterThan(first.result.markdown.indexOf('# Provider fixture'));
    expect(first.result.markdown).not.toContain('Navigation chrome');
    expect(first.result.markdown).not.toContain('Locally generated summary');
    expect(createOptions?.sharedContext).toContain('Provider fixture');
    expect(requestContext).toContain('Ignore navigation');
    expect(destroy).toHaveBeenCalledTimes(2);
  });

  it('produces Complete output while limiting Browser summary input to the focused content unit', async () => {
    const measuredInputs: string[] = [];
    const adapter: BrowserSummaryAdapter = {
      htmlParser: linkedomHtmlParser,
      checkCapability: async () => ({ detector: 'available', summarizer: 'available' }),
      createLanguageDetector: async () => ({ detect: async () => [] }),
      detectEligibleLanguage: async () => ({ origin: 'detected', primaryLanguage: 'en', confidence: 1, alternatives: [], supported: true }),
      createSummarizer: async () => ({
        inputQuota: 100_000,
        measureInputUsage: async (text: string) => { measuredInputs.push(text); return text.length; },
        summarize: async () => 'Safety evidence supports the release decision.',
      }),
      summarizeBlocks,
    };

    const result = await createFinalExport(focusedCaptured, 'complete', 40, 'browser', adapter);

    expect(result.result.metadata).toMatchObject({ exportMode: 'complete', summaryOrigin: 'local-ai', generatedSummaryCount: 1 });
    expect(result.result.markdown).toContain('export_mode: complete');
    expect(result.result.markdown).toContain('## Summary');
    expect(result.result.markdown).toContain('Safety evidence supports the release decision.');
    expect(measuredInputs[0]).toContain('Safety evidence supports the release decision.');
    expect(measuredInputs[0]).not.toContain('Navigation chrome');
    expect(measuredInputs[0]).not.toContain('Footer links');
    expect(measuredInputs[0]).not.toContain('Related links');
  });

  it('returns deterministic focused Custom output when quota measurement or generation fails', async () => {
    for (const failure of ['quota', 'generation'] as const) {
      const adapter: BrowserSummaryAdapter = {
        htmlParser: linkedomHtmlParser,
        checkCapability: async () => ({ detector: 'available', summarizer: 'available' }),
        createLanguageDetector: async () => ({ detect: async () => [] }),
        detectEligibleLanguage: async () => ({ origin: 'detected', primaryLanguage: 'en', confidence: 1, alternatives: [], supported: true }),
        createSummarizer: async () => ({
          inputQuota: failure === 'quota' ? 100 : 5_000,
          measureInputUsage: async (text: string) => failure === 'quota' ? 101 : text.length,
          summarize: async () => {
            if (failure === 'generation') throw new Error('generation failed');
            return 'unused';
          },
        }),
        summarizeBlocks: (session, blocks, context) => summarizeBlocks(session, blocks, context),
      };

      const result = await createFinalExport(focusedCaptured, 'focused', 40, 'browser', adapter);

      expect(result.result.metadata.summaryOrigin).toBe('deterministic-diverse-extractive');
      expect(result.result.markdown).not.toContain('## Summary');
      expect(result.browserFailure).toContain(failure === 'quota' ? 'capacity' : 'generation failed');
    }
  });

  it('returns deterministic focused Custom output for cancelled capability and unsupported language', async () => {
    const cancelledAdapter: BrowserSummaryAdapter = {
      ...unavailableAdapter,
      checkCapability: async () => ({ detector: 'cancelled', summarizer: 'cancelled' }),
    };
    const cancelled = await createFinalExport(focusedCaptured, 'focused', 40, 'browser', cancelledAdapter);
    expect(cancelled.result.metadata.summaryOrigin).toBe('deterministic-diverse-extractive');
    expect(cancelled.result.markdown).not.toContain('## Summary');

    const unsupportedAdapter: BrowserSummaryAdapter = {
      ...cancelledAdapter,
      checkCapability: async () => ({ detector: 'available', summarizer: 'available' }),
      createLanguageDetector: async () => ({ detect: async () => [] }),
      detectEligibleLanguage: async () => ({ origin: 'mixed', confidence: 0.2, alternatives: [], supported: false, warning: 'unsupported language' }),
    };
    const unsupported = await createFinalExport(focusedCaptured, 'focused', 40, 'browser', unsupportedAdapter);
    expect(unsupported.result.metadata.summaryOrigin).toBe('deterministic-diverse-extractive');
    expect(unsupported.browserFailure).toBe('unsupported language');
    expect(unsupported.result.markdown).not.toContain('## Summary');
  });

  it('does not check or invoke Browser AI at Detail 100', async () => {
    const checkCapability = vi.fn(unavailableAdapter.checkCapability);
    const progress: string[] = [];
    const result = await createFinalExport(captured, 'complete', 100, 'browser', { ...unavailableAdapter, checkCapability }, (phase) => { progress.push(phase); });

    expect(checkCapability).not.toHaveBeenCalled();
    expect(result.result.metadata).toMatchObject({ requestedProvider: 'browser', summaryOrigin: 'none', detail: 100 });
    expect(progress).toEqual(['converting']);
  });
});
