import { estimateMarkdownTokens } from './export-metrics';
import type { CapturedPage, ExportMode, StoredExport, SummarizationProvider } from './export-domain';
import type { ExportPreferences } from './export-preferences';
import type { FinalExport, FinalExportProgress } from './export-workflow';

/** Export-local selections shown and edited in READY; never persisted. */
export interface PopupExportSelection {
  readonly mode: ExportMode;
  readonly provider: SummarizationProvider;
  readonly detail: number;
}

/** Immutable selections captured when Build Markdown is activated. */
export interface BuildSnapshot extends PopupExportSelection {
  readonly autoCopy: boolean;
}

export interface PopupDependencies {
  readonly captureActiveTab: () => Promise<{ readonly id?: string; readonly error?: string }>;
  readonly loadExport: (id: string) => Promise<StoredExport | undefined>;
  readonly deriveReadabilityFocus: (captured: CapturedPage) => CapturedPage;
  readonly createFinalExport: (
    captured: CapturedPage,
    selection: PopupExportSelection,
    onProgress: (progress: FinalExportProgress) => void,
  ) => Promise<FinalExport>;
  readonly copyFinalMarkdown: (markdown: string) => Promise<void>;
  readonly downloadFinalMarkdown: (markdown: string, title: string) => Promise<void>;
  readonly openSettings: () => Promise<void>;
}

type CopyState = 'ready' | 'copying' | 'copied' | 'copy-failed';

type PopupState =
  | { readonly kind: 'ready'; readonly draft: PopupExportSelection }
  | { readonly kind: 'processing'; readonly snapshot: BuildSnapshot; readonly message: string; readonly currentStep: WorkflowStep }
  | { readonly kind: 'copying'; readonly snapshot: BuildSnapshot; readonly finalExport: FinalExport; readonly currentStep: WorkflowStep }
  | { readonly kind: 'done'; readonly snapshot: BuildSnapshot; readonly finalExport: FinalExport; readonly copyState: CopyState; readonly actionError?: string }
  | { readonly kind: 'failed'; readonly snapshot: BuildSnapshot; readonly message: string };

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function formatBytes(bytes: number): string {
  return bytes >= 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${bytes} B`;
}

const SHIELD = '<svg class="shield" viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="M8 1.2 12.8 3v4.2c0 3.3-2 5.7-4.8 6.8C5.2 12.9 3.2 10.5 3.2 7.2V3L8 1.2z"/></svg>';

const TRUST_FOOTER = `<footer class="trust-footer">${SHIELD} Runs locally in your browser</footer>`;

type WorkflowStep = 'capturing' | 'converting' | 'summarizing' | 'copying';

const STEP_LABELS: Readonly<Record<WorkflowStep, string>> = {
  capturing: 'Capture',
  converting: 'Convert',
  summarizing: 'Summarize',
  copying: 'Copy',
};

const STEP_MESSAGES: Readonly<Record<WorkflowStep, string>> = {
  capturing: 'Capturing the active page locally…',
  converting: 'Converting to Markdown…',
  summarizing: 'Summarizing locally…',
  copying: 'Copying Markdown…',
};

function stepTrail(currentStep: WorkflowStep, summarizing: boolean): string {
  const steps: readonly WorkflowStep[] = summarizing
    ? ['capturing', 'converting', 'summarizing', 'copying']
    : ['capturing', 'converting', 'copying'];
  const currentIndex = steps.indexOf(currentStep);
  return `
    <ol class="step-trail" aria-label="Conversion steps">
      ${steps.map((step, index) => {
        const stateClass = index < currentIndex ? 'done' : index === currentIndex ? 'active' : 'pending';
        const current = index === currentIndex ? ' aria-current="step"' : '';
        return `<li class="step ${stateClass}"${current}>${STEP_LABELS[step]}</li>`;
      }).join('')}
    </ol>
  `;
}


function requireSnapshot(state: PopupState): BuildSnapshot {
  if (state.kind === 'ready') throw new Error('Cannot copy or retry before an export snapshot exists.');
  return state.snapshot;
}

export function mountExportPopup(
  root: HTMLElement,
  preferences: ExportPreferences,
  dependencies: PopupDependencies,
): void {
  const popupWidth = '22rem';
  root.ownerDocument.documentElement.style.width = popupWidth;
  root.ownerDocument.documentElement.style.minWidth = popupWidth;
  root.ownerDocument.body.style.width = popupWidth;
  root.ownerDocument.body.style.minWidth = popupWidth;
  root.style.width = popupWidth;
  root.style.minWidth = popupWidth;

  let state: PopupState = {
    kind: 'ready',
    draft: { mode: 'focused', provider: preferences.provider, detail: preferences.detail },
  };

  const renderReady = (draft: PopupExportSelection): void => {
    const detailInactive = draft.provider === 'none';
    root.innerHTML = `
      <section class="export-popup export-ready">
        <header class="popup-header">
          <p class="eyebrow">Website to Markdown</p>
          <h1>Export this page</h1>
          <p class="tagline">Capture any article. Export clean Markdown.</p>
        </header>
        <form id="ready-form" class="ready-form">
          <fieldset class="field mode-field">
            <legend>Export mode</legend>
            <label class="segmented-option">
              <input type="radio" name="mode" value="focused" ${draft.mode === 'focused' ? 'checked' : ''}>
              <span class="segmented-label"><strong>Focused article</strong><small>Best for reading and review.</small></span>
            </label>
            <label class="segmented-option">
              <input type="radio" name="mode" value="complete" ${draft.mode === 'complete' ? 'checked' : ''}>
              <span class="segmented-label"><strong>Complete page</strong><small>Keep the full page content.</small></span>
            </label>
          </fieldset>
          <label class="field">Summarization
            <select id="provider" name="provider">
              <option value="none" ${draft.provider === 'none' ? 'selected' : ''}>None</option>
              <option value="browser" ${draft.provider === 'browser' ? 'selected' : ''}>Browser local AI</option>
              <option value="custom" ${draft.provider === 'custom' ? 'selected' : ''}>Custom extractive</option>
            </select>
          </label>
          <label class="field" for="detail">Detail <output id="detail-value">${detailInactive ? 'inactive' : draft.detail}</output><span id="detail-suffix">${detailInactive ? '' : '/100'}</span>
            <input id="detail" name="detail" type="range" min="0" max="100" value="${draft.detail}" ${detailInactive ? 'disabled' : ''}>
          </label>
          <p id="copy-note" class="muted"></p>
          <div class="actions">
            <button id="build" class="primary" type="submit">Build Markdown</button>
            <button id="settings" class="link-button" type="button">Settings</button>
          </div>
        </form>
        ${TRUST_FOOTER}
      </section>
    `;
    const copyNote = root.querySelector<HTMLElement>('#copy-note')!;
    copyNote.textContent = preferences.autoCopy
      ? 'Markdown will be copied automatically when ready.'
      : 'You can copy or download the result when ready.';
    const provider = root.querySelector<HTMLSelectElement>('#provider')!;
    const detail = root.querySelector<HTMLInputElement>('#detail')!;
    const detailValue = root.querySelector<HTMLOutputElement>('#detail-value')!;
    const syncDetail = (): void => {
      const inactive = provider.value === 'none';
      detail.disabled = inactive;
      detailValue.textContent = inactive ? 'inactive' : detail.value;
      root.querySelector<HTMLElement>('#detail-suffix')!.textContent = inactive ? '' : '/100';
    };
    provider.addEventListener('change', () => {
      draft = { ...draft, provider: provider.value as SummarizationProvider };
      syncDetail();
    });
    detail.addEventListener('input', () => {
      draft = { ...draft, detail: Number(detail.value) };
      detailValue.textContent = detail.value;
    });
    root.querySelector<HTMLFormElement>('#ready-form')!.addEventListener('submit', (event) => {
      event.preventDefault();
      const mode = root.querySelector<HTMLInputElement>('input[name="mode"]:checked')!.value as ExportMode;
      state = {
        kind: 'processing',
        snapshot: { mode, provider: provider.value as SummarizationProvider, detail: Number(detail.value), autoCopy: preferences.autoCopy },
        message: STEP_MESSAGES.capturing,
        currentStep: 'capturing',
      };
      render();
      void runExport(state.snapshot);
    });
    root.querySelector<HTMLButtonElement>('#settings')!.addEventListener('click', () => {
      void dependencies.openSettings();
    });
  };

  const renderProcessing = (message: string, currentStep: WorkflowStep, summarizing: boolean): void => {
    root.innerHTML = `
      <section class="export-popup export-progress">
        <header class="popup-header">
          <p class="eyebrow">Website to Markdown</p>
          <h1>Building Markdown</h1>
        </header>
        ${stepTrail(currentStep, summarizing)}
        <p id="status" class="progress-status" role="status" aria-live="polite">${message}</p>
        <button id="settings" class="link-button" type="button">Settings</button>
        ${TRUST_FOOTER}
      </section>
    `;
    root.querySelector<HTMLButtonElement>('#settings')!.addEventListener('click', () => {
      void dependencies.openSettings();
    });
  };

  const renderFailure = (message: string): void => {
    root.innerHTML = `
      <section class="export-popup export-failure">
        <header class="popup-header">
          <p class="eyebrow">Website to Markdown</p>
          <h1>Export failed</h1>
        </header>
        <p class="notice error" role="alert">${message}</p>
        <p>No Markdown was copied.</p>
        <div class="actions">
          <button id="retry" type="button">Try again</button>
          <button id="edit" type="button">Edit choices</button>
          <button id="settings" class="link-button" type="button">Settings</button>
        </div>
        ${TRUST_FOOTER}
      </section>
    `;
    const snapshot = state.kind === 'failed' ? state.snapshot : null;
    root.querySelector<HTMLButtonElement>('#retry')!.addEventListener('click', () => {
      if (!snapshot) return;
      state = { kind: 'processing', snapshot, message: STEP_MESSAGES.capturing, currentStep: 'capturing' };
      render();
      void runExport(snapshot);
    });
    root.querySelector<HTMLButtonElement>('#edit')!.addEventListener('click', () => {
      if (!snapshot) return;
      state = { kind: 'ready', draft: { mode: snapshot.mode, provider: snapshot.provider, detail: snapshot.detail } };
      render();
    });
    root.querySelector<HTMLButtonElement>('#settings')!.addEventListener('click', () => {
      void dependencies.openSettings();
    });
  };

  const renderResult = (finalExport: FinalExport, copyState: CopyState, actionError?: string, currentStep?: WorkflowStep): void => {
    const { result, capability, language, browserFailure } = finalExport;
    const metadata = result.metadata;
    const copied = copyState === 'copied';
    const copyFailed = copyState === 'copy-failed';
    const detailActive = metadata.requestedProvider !== 'none';
    root.innerHTML = `
      <section class="export-popup export-result">
        <header class="popup-header">
          <p class="eyebrow">Website to Markdown</p>
          <h1>Markdown ready</h1>
        </header>
        ${currentStep ? stepTrail(currentStep, metadata.summaryOrigin === 'local-ai') : ''}
        <section class="source-card">
          <h2 id="source-title"></h2>
          <p id="source-host" class="muted"></p>
        </section>
        <p id="completion" class="${copied ? 'success' : copyFailed ? 'notice error' : 'muted'}" role="status" aria-live="polite"></p>
        <section class="stats" aria-label="Export metrics">
          <div class="stat"><span id="stat-words" class="stat-value"></span><span class="stat-label">Words</span></div>
          <div class="stat"><span id="stat-bytes" class="stat-value"></span><span class="stat-label">Markdown size</span></div>
          <div class="stat"><span id="stat-tokens" class="stat-value"></span><span class="stat-label">Estimated tokens</span></div>
        </section>
        <section class="receipt-details">
          <p id="source-url" class="muted"></p>
          <p id="receipt-meta" class="muted"></p>
        </section>
        <section id="model" class="notice" ${browserFailure ? '' : 'hidden'}></section>
        <section id="limitations" class="notice" ${result.limitations.length ? '' : 'hidden'}></section>
        <section id="action-error" class="notice error" ${actionError ? '' : 'hidden'}></section>
        <div class="actions">
          <button id="copy" class="primary" type="button" ${copyState === 'copying' ? 'disabled' : ''}></button>
          <button id="download" type="button">Download .md</button>
          <button id="settings" class="link-button" type="button">Settings</button>
        </div>
        ${TRUST_FOOTER}
      </section>
    `;
    root.querySelector<HTMLElement>('#source-title')!.textContent = metadata.title;
    root.querySelector<HTMLElement>('#source-host')!.textContent = hostnameOf(metadata.sourceUrl);
    root.querySelector<HTMLElement>('#source-url')!.textContent = metadata.sourceUrl;
    root.querySelector<HTMLElement>('#completion')!.textContent = copied
      ? 'Copied to clipboard.'
      : copyFailed
        ? 'Copy failed. Your Markdown is ready to copy again.'
        : copyState === 'copying'
          ? 'Copying Markdown…'
          : 'Markdown is ready.';
    root.querySelector<HTMLElement>('#stat-words')!.textContent = String(metadata.words);
    root.querySelector<HTMLElement>('#stat-bytes')!.textContent = formatBytes(metadata.bytes);
    root.querySelector<HTMLElement>('#stat-tokens')!.textContent = `~${estimateMarkdownTokens(result.markdown)}`;
    root.querySelector<HTMLElement>('#receipt-meta')!.textContent = [
      `Captured: ${metadata.capturedAt}`,
      `Mode: ${metadata.exportMode === 'focused' ? 'Focused' : 'Complete'}`,
      `Requested: ${metadata.requestedProvider === 'none' ? 'None' : metadata.requestedProvider === 'browser' ? 'Browser' : 'Custom'}`,
      `Actual: ${metadata.summaryOrigin === 'none' ? 'None' : metadata.summaryOrigin === 'local-ai' ? 'Local AI' : 'Custom extractive'}`,
      detailActive ? `Detail: ${metadata.detail}/100` : 'Detail: inactive',
      `Language: ${language.primaryLanguage ?? 'unknown'}`,
      `Model: ${capability.summarizer}`,
    ].join(' · ');
    root.querySelector<HTMLElement>('#model')!.textContent = browserFailure ?? '';
    const limitations = root.querySelector<HTMLElement>('#limitations')!;
    limitations.textContent = result.limitations.map((notice) => {
      const receiptNotice = notice.startsWith('Image omitted because its source URL is unsupported:')
        ? 'An image was omitted because its source URL is unsupported.'
        : notice;
      return `Conversion limitation: ${receiptNotice}`;
    }).join('\n');
    root.querySelector<HTMLElement>('#action-error')!.textContent = actionError ?? '';
    root.querySelector<HTMLButtonElement>('#copy')!.textContent = copyState === 'copying' ? STEP_MESSAGES.copying : 'Copy Markdown';
    root.querySelector<HTMLButtonElement>('#copy')!.addEventListener('click', () => { void copyFinal(finalExport); });
    root.querySelector<HTMLButtonElement>('#download')!.addEventListener('click', async () => {
      try {
        await dependencies.downloadFinalMarkdown(result.markdown, metadata.title);
      } catch (error) {
        renderResult(finalExport, copyState, errorMessage(error, 'Unable to download Markdown. Try again.'));
      }
    });
    root.querySelector<HTMLButtonElement>('#settings')!.addEventListener('click', () => {
      void dependencies.openSettings();
    });
  };

  const copyFinal = async (finalExport: FinalExport): Promise<void> => {
    const snapshot = requireSnapshot(state);
    state = { kind: 'copying', snapshot, finalExport, currentStep: 'copying' };
    renderResult(finalExport, 'copying', undefined, 'copying');
    try {
      await dependencies.copyFinalMarkdown(finalExport.result.markdown);
      state = { kind: 'done', snapshot, finalExport, copyState: 'copied' };
      renderResult(finalExport, 'copied');
    } catch (error) {
      state = { kind: 'done', snapshot, finalExport, copyState: 'copy-failed', actionError: errorMessage(error, 'Unable to copy Markdown. Try again.') };
      renderResult(finalExport, 'copy-failed', errorMessage(error, 'Unable to copy Markdown. Try again.'));
    }
  };

  const runExport = async (snapshot: BuildSnapshot): Promise<void> => {
    try {
      const response = await dependencies.captureActiveTab();
      if (response.error || !response.id) throw new Error(response.error || 'Capture did not return an export.');
      const stored = await dependencies.loadExport(response.id);
      if (!stored) throw new Error('This temporary export is no longer available. Capture the page again.');
      state = { kind: 'processing', snapshot, message: STEP_MESSAGES.converting, currentStep: 'converting' };
      render();
      const captured = dependencies.deriveReadabilityFocus(stored.captured);
      const finalExport = await dependencies.createFinalExport(captured, snapshot, (progress) => {
        const step: WorkflowStep = progress === 'summarizing' ? 'summarizing' : 'converting';
        state = { kind: 'processing', snapshot, message: STEP_MESSAGES[step], currentStep: step };
        render();
      });
      if (snapshot.autoCopy) {
        await copyFinal(finalExport);
      } else {
        state = { kind: 'done', snapshot, finalExport, copyState: 'ready' };
        renderResult(finalExport, 'ready');
      }
    } catch (error) {
      state = { kind: 'failed', snapshot, message: errorMessage(error, 'Unable to export this page.') };
      renderFailure(state.message);
    }
  };

  const render = (): void => {
    switch (state.kind) {
      case 'ready':
        renderReady(state.draft);
        break;
      case 'processing':
        renderProcessing(state.message, state.currentStep, state.currentStep === 'summarizing');
        break;
      case 'copying':
        renderResult(state.finalExport, 'copying', undefined, state.currentStep);
        break;
      case 'done':
        renderResult(state.finalExport, state.copyState, state.actionError);
        break;
      case 'failed':
        renderFailure(state.message);
        break;
    }
  };

  render();
}
