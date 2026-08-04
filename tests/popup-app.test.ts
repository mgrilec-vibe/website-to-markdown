import { parseHTML } from 'linkedom';
import { describe, expect, it, vi } from 'vitest';
import { mountExportPopup, type PopupDependencies } from '../src/popup-app';
import type { ExportPreferences } from '../src/export-preferences';
import type { CapturedPage } from '../src/export-domain';
import type { FinalExport } from '../src/export-workflow';

const preferences: ExportPreferences = {
  provider: 'browser',
  detail: 75,
  autoCopy: true,
};

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
      exportMode: 'focused',
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

function popup(root: HTMLElement, overrides: Partial<PopupDependencies> = {}, options = preferences): PopupDependencies {
  const dependencies: PopupDependencies = {
    captureActiveTab: async () => ({ id: 'export-1' }),
    loadExport: async () => ({ id: 'export-1', captured }),
    deriveReadabilityFocus: (value) => value,
    createFinalExport: async () => browserFallback,
    copyFinalMarkdown: async () => undefined,
    downloadFinalMarkdown: async () => undefined,
    openSettings: async () => undefined,
    ...overrides,
  };
  mountExportPopup(root, options, dependencies);
  return dependencies;
}

describe('quick export popup workflow', () => {
  it('progresses through local summarization, copies the fallback Markdown, and presents result metrics', async () => {
    const { document } = parseHTML('<!doctype html><main id="app"></main>');
    const root = document.querySelector<HTMLElement>('#app')!;
    let resolveExport: (result: FinalExport) => void = () => undefined;
    let reportProgress: (progress: 'converting' | 'summarizing') => void = () => undefined;
    const createFinalExport = vi.fn((
      _captured: CapturedPage,
      _preferences: ExportPreferences,
      onProgress: (progress: 'converting' | 'summarizing') => void,
    ) => {
      reportProgress = onProgress;
      return new Promise<FinalExport>((resolve) => { resolveExport = resolve; });
    });
    const copyFinalMarkdown = vi.fn(async () => undefined);
    popup(root, { createFinalExport, copyFinalMarkdown });

    await vi.waitFor(() => expect(root.textContent).toContain('Converting to Markdown'));
    reportProgress('summarizing');
    await vi.waitFor(() => expect(root.textContent).toContain('Summarizing locally'));
    resolveExport(browserFallback);

    await vi.waitFor(() => expect(copyFinalMarkdown).toHaveBeenCalledWith(markdown));
    expect(createFinalExport).toHaveBeenCalledWith(captured, preferences, expect.any(Function));
    expect(root.querySelectorAll('.markdown-result')).toHaveLength(1);
    expect(root.querySelector('textarea, .output-grid, #baseline, #derived')).toBeNull();
    expect(root.textContent).toContain('Copied to clipboard.');
    expect(root.textContent).toContain('~');
    expect(root.textContent).toContain('tokens estimated');
    expect(root.textContent).toContain('Requested: Browser');
    expect(root.textContent).toContain('Actual: Custom extractive');
    expect(root.textContent).toContain('Chrome Summarizer is unavailable.');
  });

  it('retains the exact result and permits retry when automatic copying fails', async () => {
    const { document } = parseHTML('<!doctype html><main id="app"></main>');
    const root = document.querySelector<HTMLElement>('#app')!;
    const copyFinalMarkdown = vi.fn()
      .mockRejectedValueOnce(new Error('Clipboard denied'))
      .mockResolvedValueOnce(undefined);
    popup(root, { copyFinalMarkdown });

    await vi.waitFor(() => expect(root.textContent).toContain('Copy failed.'));
    expect(root.textContent).toContain('Clipboard denied');
    expect(root.querySelectorAll('.markdown-result')).toHaveLength(1);
    root.querySelector<HTMLButtonElement>('#copy')!.click();

    await vi.waitFor(() => expect(copyFinalMarkdown).toHaveBeenCalledTimes(2));
    expect(root.textContent).toContain('Copied to clipboard.');
  });

  it('offers an export retry after capture failure without claiming copy succeeded', async () => {
    const { document } = parseHTML('<!doctype html><main id="app"></main>');
    const root = document.querySelector<HTMLElement>('#app')!;
    const captureActiveTab = vi.fn()
      .mockResolvedValueOnce({ error: 'This page cannot be exported.' })
      .mockResolvedValueOnce({ id: 'export-1' });
    popup(root, { captureActiveTab });

    await vi.waitFor(() => expect(root.textContent).toContain('Export failed'));
    expect(root.textContent).toContain('No Markdown was copied.');
    root.querySelector<HTMLButtonElement>('#retry')!.click();

    await vi.waitFor(() => expect(captureActiveTab).toHaveBeenCalledTimes(2));
  });

  it('preserves the result when downloading fails', async () => {
    const { document } = parseHTML('<!doctype html><main id="app"></main>');
    const root = document.querySelector<HTMLElement>('#app')!;
    popup(root, { downloadFinalMarkdown: async () => { throw new Error('Download denied'); } });

    await vi.waitFor(() => expect(root.querySelector<HTMLButtonElement>('#download')).not.toBeNull());
    root.querySelector<HTMLButtonElement>('#download')!.click();

    await vi.waitFor(() => expect(root.textContent).toContain('Download denied'));
    expect(root.querySelectorAll('.markdown-result')).toHaveLength(1);
  });
});
