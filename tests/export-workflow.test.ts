import { DOMParser as LinkedomDOMParser } from 'linkedom';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createFinalExport, type BrowserSummaryAdapter } from '../src/export-workflow';
import type { CapturedPage } from '../src/export-domain';

class TestDOMParser {
  parseFromString(html: string, _mimeType: 'image/svg+xml' | 'text/html' | 'text/xml'): Document {
    return new LinkedomDOMParser().parseFromString(html, 'text/html') as unknown as Document;
  }
}

beforeAll(() => {
  Object.defineProperty(globalThis, 'DOMParser', { configurable: true, writable: true, value: TestDOMParser });
});

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
    const result = await createFinalExport(captured, 'complete', 15, 'browser', unavailableAdapter);

    expect(result.result.metadata).toMatchObject({ requestedProvider: 'browser', summaryOrigin: 'deterministic-diverse-extractive' });
    expect(result.browserFailure).toContain('unavailable');
    expect(result.result.markdown).toContain('requested_provider: browser');
    expect(result.result.markdown).toContain('summary_origin: deterministic-diverse-extractive');
  });

  it('preserves Browser as requested and local AI as the successful actual origin', async () => {
    const destroy = vi.fn();
    const adapter: BrowserSummaryAdapter = {
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

    const result = await createFinalExport(captured, 'complete', 15, 'browser', adapter);

    expect(result.result.metadata).toMatchObject({ requestedProvider: 'browser', summaryOrigin: 'local-ai' });
    expect(result.result.markdown).toContain('Locally generated summary');
    expect(destroy).toHaveBeenCalledOnce();
  });

  it('does not check or invoke Browser AI at Detail 100', async () => {
    const checkCapability = vi.fn(unavailableAdapter.checkCapability);
    const result = await createFinalExport(captured, 'complete', 100, 'browser', { ...unavailableAdapter, checkCapability });

    expect(checkCapability).not.toHaveBeenCalled();
    expect(result.result.metadata).toMatchObject({ requestedProvider: 'browser', summaryOrigin: 'none', detail: 100 });
  });
});
