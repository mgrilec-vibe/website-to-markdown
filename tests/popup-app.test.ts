import { parseHTML } from 'linkedom';
import { describe, expect, it, vi } from 'vitest';
import { mountExportPopup, type PopupDependencies, type PopupExportSelection } from '../src/popup-app';
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
      policyVersion: 2,
    },
    limitations: ['Focused extraction was unavailable; use complete-page export.'],
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

function build(root: HTMLElement, selection: Partial<PopupExportSelection> = {}): void {
  const provider = root.querySelector<HTMLSelectElement>('#provider')!;
  Object.defineProperty(provider, 'value', { configurable: true, value: selection.provider ?? preferences.provider });
  provider.dispatchEvent(new root.ownerDocument.defaultView!.Event('change', { bubbles: true }));
  if (selection.detail !== undefined) {
    const detail = root.querySelector<HTMLInputElement>('#detail')!;
    Object.defineProperty(detail, 'value', { configurable: true, value: String(selection.detail) });
    detail.dispatchEvent(new root.ownerDocument.defaultView!.Event('input', { bubbles: true }));
  }
  if (selection.mode === 'complete') {
    root.querySelector<HTMLInputElement>('input[name="mode"][value="complete"]')!.setAttribute('checked', '');
    root.querySelector<HTMLInputElement>('input[name="mode"][value="focused"]')!.removeAttribute('checked');
  }
  root.querySelector<HTMLFormElement>('#ready-form')!.dispatchEvent(new root.ownerDocument.defaultView!.Event('submit', { bubbles: true, cancelable: true }));
}

function document(): { document: Document; window: Window } {
  return parseHTML('<!doctype html><main id="app"></main>');
}
describe('ready export popup workflow', () => {
  it('opens READY without capturing and seeds Focused plus saved provider and Detail', () => {
    const { document: doc } = document();
    const root = doc.querySelector<HTMLElement>('#app')!;
    const captureActiveTab = vi.fn();
    popup(root, { captureActiveTab });

    expect(captureActiveTab).not.toHaveBeenCalled();
    expect(root.textContent).toContain('Capture any article. Export clean Markdown.');
    expect(root.textContent).toContain('Focused article');
    expect(root.textContent).toContain('Complete page');
    expect(root.textContent).toContain('Runs locally in your browser');
    expect((root.querySelector<HTMLInputElement>('input[name="mode"][value="focused"]')!).hasAttribute('checked')).toBe(true);
    expect((root.querySelector<HTMLSelectElement>('#provider')!).value).toBe('browser');
    expect(root.textContent).toContain('Markdown will be copied automatically when ready.');
  });

  it('does not persist READY overrides and reinitializes Focused with saved defaults', async () => {
    const { document: doc } = document();
    const root = doc.querySelector<HTMLElement>('#app')!;
    const createFinalExport = vi.fn(async () => browserFallback);
    const dependencies = popup(root, { createFinalExport });
    build(root, { mode: 'complete', provider: 'custom', detail: 40 });

    await vi.waitFor(() => expect(createFinalExport).toHaveBeenCalled());

    const secondRoot = doc.createElement('main');
    secondRoot.id = 'app-2';
    doc.body.appendChild(secondRoot);
    popup(secondRoot);
    expect((secondRoot.querySelector<HTMLInputElement>('input[name="mode"][value="focused"]')!).hasAttribute('checked')).toBe(true);
  });

  it('passes an immutable snapshot including selected mode and applies automatic copy', async () => {
    const { document: doc } = document();
    const root = doc.querySelector<HTMLElement>('#app')!;
    const createFinalExport = vi.fn(async () => browserFallback);
    const copyFinalMarkdown = vi.fn(async () => undefined);
    popup(root, { createFinalExport, copyFinalMarkdown });
    build(root, { mode: 'complete', provider: 'custom', detail: 40 });

    await vi.waitFor(() => expect(copyFinalMarkdown).toHaveBeenCalledWith(markdown));
    expect(createFinalExport).toHaveBeenCalledWith(captured, { mode: 'complete', provider: 'custom', detail: 40, autoCopy: true }, expect.any(Function));
    expect(root.textContent).toContain('Copied to clipboard.');
    expect(root.querySelector('#source-title')!.textContent).toBe('Popup fixture');
    expect(root.querySelector('#source-host')!.textContent).toBe('example.com');
  });

  it('disables and labels Detail inactive for None', () => {
    const { document: doc } = document();
    const root = doc.querySelector<HTMLElement>('#app')!;
    popup(root);
    const detail = root.querySelector<HTMLInputElement>('#detail')!;
    Object.defineProperty(root.querySelector<HTMLSelectElement>('#provider')!, 'value', { configurable: true, value: 'none' });
    root.querySelector<HTMLSelectElement>('#provider')!.dispatchEvent(new doc.defaultView!.Event('change', { bubbles: true }));

    expect(detail.disabled).toBe(true);
    expect(root.querySelector<HTMLElement>('#detail-value')!.textContent).toBe('inactive');
  });

  it('shows READY without copying when automatic copy is disabled', async () => {
    const { document: doc } = document();
    const root = doc.querySelector<HTMLElement>('#app')!;
    const copyFinalMarkdown = vi.fn(async () => undefined);
    popup(root, { copyFinalMarkdown }, { ...preferences, autoCopy: false });

    expect(root.textContent).toContain('You can copy or download the result when ready.');
    build(root);

    await vi.waitFor(() => expect(root.textContent).toContain('Markdown is ready.'));
    expect(copyFinalMarkdown).not.toHaveBeenCalled();
    expect(root.querySelector('#stat-tokens')!.textContent).toContain('~');
  });

  it('reports capture failure, retries with the same snapshot, and edits choices', async () => {
    const { document: doc } = document();
    const root = doc.querySelector<HTMLElement>('#app')!;
    const captureActiveTab = vi.fn()
      .mockResolvedValueOnce({ error: 'This page cannot be exported.' })
      .mockResolvedValueOnce({ id: 'export-1' });
    const createFinalExport = vi.fn(async () => browserFallback);
    popup(root, { captureActiveTab, createFinalExport });
    build(root, { mode: 'complete' });

    await vi.waitFor(() => expect(root.textContent).toContain('Export failed'));
    expect(root.textContent).toContain('No Markdown was copied.');
    root.querySelector<HTMLButtonElement>('#edit')!.click();
    expect((root.querySelector<HTMLInputElement>('input[name="mode"][value="complete"]')!).hasAttribute('checked')).toBe(true);
    build(root, {});

    await vi.waitFor(() => expect(createFinalExport).toHaveBeenCalledTimes(1));
  });

  it('progresses through local summarization and presents receipt metrics without rendered Markdown', async () => {
    const { document: doc } = document();
    const root = doc.querySelector<HTMLElement>('#app')!;
    let resolveExport: (result: FinalExport) => void = () => undefined;
    let reportProgress: (progress: 'converting' | 'summarizing') => void = () => undefined;
    const createFinalExport = vi.fn((
      _captured: CapturedPage,
      _selection: PopupExportSelection,
      onProgress: (progress: 'converting' | 'summarizing') => void,
    ) => {
      reportProgress = onProgress;
      return new Promise<FinalExport>((resolve) => { resolveExport = resolve; });
    });
    const copyFinalMarkdown = vi.fn(async () => undefined);
    popup(root, { createFinalExport, copyFinalMarkdown });
    build(root, {});

    await vi.waitFor(() => expect(root.textContent).toContain('Converting to Markdown'));
    reportProgress('summarizing');
    await vi.waitFor(() => expect(root.textContent).toContain('Summarizing locally'));
    resolveExport(browserFallback);

    await vi.waitFor(() => expect(copyFinalMarkdown).toHaveBeenCalledWith(markdown));
    expect(root.textContent).toContain('Copied to clipboard.');
    expect(root.textContent).toContain('~');
    expect(root.textContent).toContain('Estimated tokens');
    expect(root.textContent).toContain('Requested: Browser');
    expect(root.textContent).toContain('Actual: Custom extractive');
    expect(root.textContent).toContain('Chrome Summarizer is unavailable.');
    expect(root.textContent).toContain('Conversion limitation: Focused extraction was unavailable');
    expect(root.querySelectorAll('.markdown-result')).toHaveLength(0);
    expect(root.querySelectorAll('.final-output')).toHaveLength(0);
    expect(root.querySelector('textarea, .output-grid, #baseline, #derived')).toBeNull();
  });

  it('transitions to a non-empty Building Markdown surface while capture is pending', async () => {
    const { document: doc } = document();
    const root = doc.querySelector<HTMLElement>('#app')!;
    let resolveCapture: (value: { id?: string; error?: string }) => void = () => undefined;
    const captureActiveTab = vi.fn(() => new Promise<{ id?: string; error?: string }>((resolve) => {
      resolveCapture = resolve;
    }));
    const copyFinalMarkdown = vi.fn(async () => undefined);
    popup(root, { captureActiveTab, copyFinalMarkdown });

    expect(doc.documentElement.style.width).toBe('22rem');
    expect(root.style.width).toBe('22rem');
    expect(captureActiveTab).not.toHaveBeenCalled();
    build(root, { mode: 'complete', provider: 'custom', detail: 40 });

    await vi.waitFor(() => expect(captureActiveTab).toHaveBeenCalledTimes(1));
    expect(root.textContent).toContain('Building Markdown');
    expect(root.textContent).toContain('Capturing the active page locally');
    expect(root.style.width).toBe('22rem');
    expect(root.textContent).not.toContain('Copied to clipboard.');
    expect(root.querySelector('#ready-form')).toBeNull();
    resolveCapture({ id: 'export-1' });

    await vi.waitFor(() => expect(copyFinalMarkdown).toHaveBeenCalledWith(markdown));
    expect(root.textContent).toContain('Copied to clipboard.');
  });

  it('keeps page-derived image alt text out of receipt limitations', async () => {
    const { document: doc } = document();
    const root = doc.querySelector<HTMLElement>('#app')!;
    const privateLimitationExport: FinalExport = {
      ...browserFallback,
      result: {
        ...browserFallback.result,
        limitations: ['Image omitted because its source URL is unsupported: Private customer invoice.'],
      },
    };
    popup(root, { createFinalExport: async () => privateLimitationExport });
    build(root, {});

    await vi.waitFor(() => expect(root.textContent).toContain('An image was omitted because its source URL is unsupported.'));
    expect(root.textContent).not.toContain('Private customer invoice');
  });

  it('retains the exact result and permits retry when automatic copying fails', async () => {
    const { document: doc } = document();
    const root = doc.querySelector<HTMLElement>('#app')!;
    const copyFinalMarkdown = vi.fn()
      .mockRejectedValueOnce(new Error('Clipboard denied'))
      .mockResolvedValueOnce(undefined);
    popup(root, { copyFinalMarkdown });
    build(root, {});

    await vi.waitFor(() => expect(root.textContent).toContain('Copy failed.'));
    expect(root.textContent).toContain('Clipboard denied');
    expect(root.querySelectorAll('.markdown-result')).toHaveLength(0);
    root.querySelector<HTMLButtonElement>('#copy')!.click();

    await vi.waitFor(() => expect(copyFinalMarkdown).toHaveBeenCalledTimes(2));
    expect(root.textContent).toContain('Copied to clipboard.');
  });

  it('preserves the result when downloading fails', async () => {
    const { document: doc } = document();
    const root = doc.querySelector<HTMLElement>('#app')!;
    popup(root, { downloadFinalMarkdown: async () => { throw new Error('Download denied'); } });
    build(root, {});

    await vi.waitFor(() => expect(root.querySelector<HTMLButtonElement>('#download')).not.toBeNull());
    root.querySelector<HTMLButtonElement>('#download')!.click();

    await vi.waitFor(() => expect(root.textContent).toContain('Download denied'));
    expect(root.querySelector('#source-title')!.textContent).toBe('Popup fixture');
    expect(root.querySelectorAll('.markdown-result')).toHaveLength(0);
  });
});
