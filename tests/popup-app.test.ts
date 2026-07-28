import { parseHTML } from 'linkedom';
import { describe, expect, it, vi } from 'vitest';
import { mountExportPopup } from '../src/popup-app';
import type { CapturedPage } from '../src/export-domain';
import type { FinalExport } from '../src/export-workflow';

const captured: CapturedPage = {
  metadata: {
    title: 'Popup fixture',
    sourceUrl: 'https://example.com/popup-fixture',
    capturedAt: '2026-07-26T12:34:56.000Z',
  },
  completeHtml: '<main><p>Captured source.</p></main>',
  limitations: [],
};

const markdown = '---\nrequested_provider: browser\nsummary_origin: deterministic-diverse-extractive\n---\n\n# Final result\n\nCaptured source.\n';
const browserFallback: FinalExport = {
  result: {
    markdown,
    metadata: {
      ...captured.metadata,
      exportMode: 'complete',
      requestedProvider: 'browser',
      compressionMode: 'custom-extractive',
      summaryOrigin: 'deterministic-diverse-extractive',
      detail: 75,
      words: 9,
      bytes: 128,
      language: { origin: 'unknown', alternatives: [], supported: false },
      generatedSummaryCount: 1,
      summaryChunkCount: 0,
      policyVersion: 1,
    },
    removedBlockIds: [],
    summarizableBlocks: [],
    blocks: [],
  },
  capability: { detector: 'unavailable', summarizer: 'unavailable' },
  language: { origin: 'unknown', alternatives: [], supported: false },
  browserFailure: 'Chrome Summarizer is unavailable.',
};

describe('popup result workflow', () => {
  it('transitions an explicit Browser request to one final fallback result and exports its exact Markdown', async () => {
    const { document, window } = parseHTML('<!doctype html><main id="app"></main>');
    const root = document.querySelector<HTMLElement>('#app')!;
    const createFinalExport = vi.fn(async () => browserFallback);
    const copyFinalMarkdown = vi.fn(async () => undefined);
    const downloadFinalMarkdown = vi.fn(async () => undefined);
    mountExportPopup(root, {
      captureActiveTab: async () => ({ id: 'export-1' }),
      loadExport: async () => ({ id: 'export-1', captured }),
      deriveReadabilityFocus: (value) => value,
      createFinalExport,
      copyFinalMarkdown,
      downloadFinalMarkdown,
    });

    expect(root.querySelectorAll('input[name="provider"]')).toHaveLength(3);
    expect(root.querySelector<HTMLInputElement>('#detail')!.disabled).toBe(true);
    const none = root.querySelector<HTMLInputElement>('input[value="none"]')!;
    const browser = root.querySelector<HTMLInputElement>('input[value="browser"]')!;
    none.checked = false;
    browser.checked = true;
    browser.dispatchEvent(new window.Event('change', { bubbles: true }));
    expect(root.querySelector<HTMLInputElement>('#detail')!.disabled).toBe(false);

    root.querySelector<HTMLButtonElement>('#export')!.click();
    await vi.waitFor(() => expect(createFinalExport).toHaveBeenCalledWith(captured, 'focused', 75, 'browser'));

    expect(root.querySelectorAll('.markdown-result')).toHaveLength(1);
    expect(root.querySelector('textarea, .output-grid, #baseline, #derived')).toBeNull();
    expect(root.textContent).toContain('Requested: Browser');
    expect(root.textContent).toContain('Actual: Custom extractive');
    expect(root.textContent).toContain('Chrome Summarizer is unavailable.');

    root.querySelector<HTMLButtonElement>('#copy')!.click();
    root.querySelector<HTMLButtonElement>('#download')!.click();
    await vi.waitFor(() => expect(copyFinalMarkdown).toHaveBeenCalledWith(markdown));
    await vi.waitFor(() => expect(downloadFinalMarkdown).toHaveBeenCalledWith(markdown, 'Popup fixture'));
  });
});
