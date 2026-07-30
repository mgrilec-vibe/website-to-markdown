import { describe, expect, it, vi } from 'vitest';
import { linkedomHtmlParser } from '../src/conversion/linkedom-parser';
import { createFinalExport, type BrowserSummaryAdapter } from '../src/export-workflow';
import type { CapturedPage } from '../src/export-domain';

const captured: CapturedPage = {
  metadata: {
    title: 'Provider fixture',
    sourceUrl: 'https://example.com/provider-fixture',
    capturedAt: '2026-07-26T12:34:56.000Z',
    pageLanguage: 'en',
  },
  completeHtml: '<html><body><main><h1>Provider fixture</h1><p>Safety evidence supports the release decision. Rollback teams verify independent deployment caveat.</p></main></body></html>',
  limitations: [],
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

  it('preserves Browser as requested and local AI as the successful actual origin', async () => {
    const destroy = vi.fn();
    const adapter: BrowserSummaryAdapter = {
      htmlParser: linkedomHtmlParser,
      checkCapability: async () => ({ detector: 'available', summarizer: 'available' }),
      createLanguageDetector: async () => ({ detect: async () => [] }),
      detectEligibleLanguage: async () => ({ origin: 'detected', primaryLanguage: 'en', confidence: 1, alternatives: [], supported: true }),
      createSummarizer: async () => ({ summarize: async () => 'unused', destroy }),
      summarizeBlocks: async (_session, blocks) => ({
        summaries: blocks.map((block) => ({ block, markdown: 'Safety evidence supports the release decision.' })),
        chunkCount: blocks.length,
        reductionStages: 0,
      }),
    };
    const progress: string[] = [];

    const result = await createFinalExport(captured, 'complete', 15, 'browser', adapter, (phase) => { progress.push(phase); });

    expect(result.result.metadata).toMatchObject({ requestedProvider: 'browser', summaryOrigin: 'local-ai' });
    expect(result.result.markdown).toContain('Locally generated summary');
    expect(destroy).toHaveBeenCalledOnce();
    expect(progress).toEqual(['converting', 'summarizing']);
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
