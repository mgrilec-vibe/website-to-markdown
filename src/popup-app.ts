import { estimateMarkdownTokens } from './export-metrics';
import type { ExportPreferences } from './export-preferences';
import { createPreviewOutput, renderPreviewMarkdown } from './preview-output';
import type { CapturedPage, StoredExport } from './export-domain';
import type { FinalExport, FinalExportProgress } from './export-workflow';

export interface PopupDependencies {
  readonly captureActiveTab: () => Promise<{ readonly id?: string; readonly error?: string }>;
  readonly loadExport: (id: string) => Promise<StoredExport | undefined>;
  readonly deriveReadabilityFocus: (captured: CapturedPage) => CapturedPage;
  readonly createFinalExport: (
    captured: CapturedPage,
    preferences: ExportPreferences,
    onProgress: (progress: FinalExportProgress) => void,
  ) => Promise<FinalExport>;
  readonly copyFinalMarkdown: (markdown: string) => Promise<void>;
  readonly downloadFinalMarkdown: (markdown: string, title: string) => Promise<void>;
  readonly openSettings: () => Promise<void>;
}

type ResultState = 'ready' | 'copying' | 'copied' | 'copy-failed';


function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function mountExportPopup(
  root: HTMLElement,
  preferences: ExportPreferences,
  dependencies: PopupDependencies,
): void {
  const renderProgress = (message: string): void => {
    root.innerHTML = `
      <section class="export-popup export-progress">
        <p class="eyebrow">Website to Markdown</p>
        <h1>Exporting this page</h1>
        <p id="status" role="status" aria-live="polite">${message}</p>
        <button id="settings" class="link-button" type="button">Settings</button>
      </section>
    `;
    root.querySelector<HTMLButtonElement>('#settings')!.addEventListener('click', () => {
      void dependencies.openSettings();
    });
  };

  const renderFailure = (message: string): void => {
    root.innerHTML = `
      <section class="export-popup export-failure">
        <p class="eyebrow">Website to Markdown</p>
        <h1>Export failed</h1>
        <p class="notice error" role="alert">${message}</p>
        <p>No Markdown was copied.</p>
        <div class="actions">
          <button id="retry" type="button">Try again</button>
          <button id="settings" class="link-button" type="button">Settings</button>
        </div>
      </section>
    `;
    root.querySelector<HTMLButtonElement>('#retry')!.addEventListener('click', () => { void runExport(); });
    root.querySelector<HTMLButtonElement>('#settings')!.addEventListener('click', () => {
      void dependencies.openSettings();
    });
  };

  const renderResult = (title: string, finalExport: FinalExport, state: ResultState, actionError?: string): void => {
    const { result, capability, language, browserFailure } = finalExport;
    const copied = state === 'copied';
    const copyFailed = state === 'copy-failed';
    root.innerHTML = `
      <section class="export-popup export-result">
        <p class="eyebrow">Website to Markdown</p>
        <h1 id="title"></h1>
        <p id="completion" class="${copied ? 'success' : copyFailed ? 'notice error' : 'muted'}" role="status" aria-live="polite"></p>
        <p id="provider-origin" class="muted"></p>
        <section id="model" class="notice" ${browserFailure ? '' : 'hidden'}></section>
        <section id="action-error" class="notice error" ${actionError ? '' : 'hidden'}></section>
        <div class="actions">
          <button id="copy" type="button" ${state === 'copying' ? 'disabled' : ''}></button>
          <button id="download" type="button">Download .md</button>
          <button id="settings" class="link-button" type="button">Settings</button>
        </div>
      </section>
    `;
    root.querySelector<HTMLHeadingElement>('#title')!.textContent = title;
    root.querySelector<HTMLElement>('#completion')!.textContent = copied
      ? 'Copied to clipboard.'
      : copyFailed
        ? 'Copy failed. Your Markdown is ready to copy again.'
        : state === 'copying'
          ? 'Copying Markdown…'
          : 'Markdown is ready.';
    root.querySelector<HTMLButtonElement>('#copy')!.textContent = state === 'copying' ? 'Copying Markdown…' : 'Copy Markdown';
    const output = createPreviewOutput(root.ownerDocument);
    root.querySelector<HTMLElement>('.export-result')!.append(output.element);
    root.querySelector<HTMLParagraphElement>('#provider-origin')!.textContent = [
      `Requested: ${preferences.provider === 'none' ? 'None' : preferences.provider === 'browser' ? 'Browser' : 'Custom'}`,
      `Actual: ${result.metadata.summaryOrigin === 'none' ? 'None' : result.metadata.summaryOrigin === 'local-ai' ? 'Local AI' : 'Custom extractive'}`,
      result.metadata.requestedProvider === 'none' ? 'Detail: inactive' : `Detail: ${result.metadata.detail}/100`,
      `${result.metadata.words} words`,
      `${result.metadata.bytes} bytes`,
      `~${estimateMarkdownTokens(result.markdown)} tokens estimated`,
      `Language: ${language.primaryLanguage ?? 'unknown'}`,
      `Model: ${capability.summarizer}`,
    ].join(' · ');
    root.querySelector<HTMLElement>('#model')!.textContent = browserFailure ?? '';
    root.querySelector<HTMLElement>('#action-error')!.textContent = actionError ?? '';
    output.metadata.textContent = `Source: ${result.metadata.sourceUrl} · Captured: ${result.metadata.capturedAt} · Export: ${result.metadata.exportMode}`;
    renderPreviewMarkdown(output.view, result.markdown);
    root.querySelector<HTMLButtonElement>('#copy')!.addEventListener('click', () => { void copyFinal(title, finalExport); });
    root.querySelector<HTMLButtonElement>('#download')!.addEventListener('click', async () => {
      try {
        await dependencies.downloadFinalMarkdown(result.markdown, result.metadata.title);
      } catch (error) {
        renderResult(title, finalExport, state, errorMessage(error, 'Unable to download Markdown. Try again.'));
      }
    });
    root.querySelector<HTMLButtonElement>('#settings')!.addEventListener('click', () => {
      void dependencies.openSettings();
    });
  };

  const copyFinal = async (title: string, finalExport: FinalExport): Promise<void> => {
    renderResult(title, finalExport, 'copying');
    try {
      await dependencies.copyFinalMarkdown(finalExport.result.markdown);
      renderResult(title, finalExport, 'copied');
    } catch (error) {
      renderResult(title, finalExport, 'copy-failed', errorMessage(error, 'Unable to copy Markdown. Try again.'));
    }
  };

  const runExport = async (): Promise<void> => {
    renderProgress('Capturing the active page locally…');
    try {
      const response = await dependencies.captureActiveTab();
      if (response.error || !response.id) throw new Error(response.error || 'Capture did not return an export.');
      const stored = await dependencies.loadExport(response.id);
      if (!stored) throw new Error('This temporary export is no longer available. Capture the page again.');
      renderProgress('Converting to Markdown…');
      const captured = dependencies.deriveReadabilityFocus(stored.captured);
      const finalExport = await dependencies.createFinalExport(captured, preferences, (progress) => {
        renderProgress(progress === 'summarizing' ? 'Summarizing locally…' : 'Converting to Markdown…');
      });
      if (preferences.autoCopy) {
        await copyFinal(captured.metadata.title, finalExport);
      } else {
        renderResult(captured.metadata.title, finalExport, 'ready');
      }
    } catch (error) {
      renderFailure(errorMessage(error, 'Unable to export this page.'));
    }
  };

  void runExport();
}
