import { createPreviewOutput, renderPreviewMarkdown } from './preview-output';
import { updateDetailControl } from './popup-controls';
import type { CapturedPage, ExportMode, StoredExport, SummarizationProvider } from './export-domain';
import type { FinalExport } from './export-workflow';

export interface PopupDependencies {
  readonly captureActiveTab: () => Promise<{ readonly id?: string; readonly error?: string }>;
  readonly loadExport: (id: string) => Promise<StoredExport | undefined>;
  readonly deriveReadabilityFocus: (captured: CapturedPage) => CapturedPage;
  readonly createFinalExport: (captured: CapturedPage, mode: ExportMode, detail: number, provider: SummarizationProvider) => Promise<FinalExport>;
  readonly copyFinalMarkdown: (markdown: string) => Promise<void>;
  readonly downloadFinalMarkdown: (markdown: string, title: string) => Promise<void>;
}

function providerLabel(provider: SummarizationProvider): string {
  return provider === 'none' ? 'None' : provider === 'browser' ? 'Browser' : 'Custom';
}

function originLabel(origin: 'none' | 'deterministic-diverse-extractive' | 'local-ai'): string {
  return origin === 'none' ? 'None' : origin === 'local-ai' ? 'Local AI' : 'Custom extractive';
}

export function mountExportPopup(root: HTMLElement, dependencies: PopupDependencies): void {
  const renderResult = (title: string, finalExport: FinalExport): void => {
    const { result, capability, language, browserFailure } = finalExport;
    root.innerHTML = `
      <section class="export-popup export-result">
        <p class="eyebrow">Website to Markdown</p>
        <h1 id="title"></h1>
        <p id="provider-origin" class="muted"></p>
        <section id="model" class="notice" ${browserFailure ? '' : 'hidden'}></section>
        <div class="actions">
          <button id="copy" type="button">Copy Markdown</button>
          <button id="download" type="button">Download .md</button>
        </div>
      </section>
    `;
    root.querySelector<HTMLHeadingElement>('#title')!.textContent = title;
    const output = createPreviewOutput(root.ownerDocument);
    root.querySelector<HTMLElement>('.export-result')!.append(output.element);
    root.querySelector<HTMLParagraphElement>('#provider-origin')!.textContent = [
      `Requested: ${providerLabel(result.metadata.requestedProvider)}`,
      `Actual: ${originLabel(result.metadata.summaryOrigin)}`,
      result.metadata.requestedProvider === 'none' ? 'Detail: inactive' : `Detail: ${result.metadata.detail}/100`,
      `${result.metadata.words} words`,
      `${result.metadata.bytes} bytes`,
      `Language: ${language.primaryLanguage ?? 'unknown'}`,
      `Model: ${capability.summarizer}`,
    ].join(' · ');
    root.querySelector<HTMLElement>('#model')!.textContent = browserFailure ?? '';
    output.metadata.textContent = `Source: ${result.metadata.sourceUrl} · Captured: ${result.metadata.capturedAt} · Export: ${result.metadata.exportMode}`;
    renderPreviewMarkdown(output.view, result.markdown);
    const copy = root.querySelector<HTMLButtonElement>('#copy')!;
    copy.addEventListener('click', async () => {
      await dependencies.copyFinalMarkdown(result.markdown);
      copy.textContent = 'Copied';
      root.ownerDocument.defaultView?.setTimeout(() => { copy.textContent = 'Copy Markdown'; }, 1_500);
    });
    root.querySelector<HTMLButtonElement>('#download')!.addEventListener('click', async () => {
      await dependencies.downloadFinalMarkdown(result.markdown, result.metadata.title);
    });
  };

  root.innerHTML = `
    <section class="export-popup">
      <p class="eyebrow">Website to Markdown</p>
      <h1>Capture this page</h1>
      <p>Convert the active page locally, then review the final Markdown before it leaves Chrome.</p>
      <section class="controls" aria-label="Export controls">
        <fieldset><legend>Summarization</legend>
          <label><input type="radio" name="provider" value="none" checked> None</label>
          <label><input type="radio" name="provider" value="browser"> Browser</label>
          <label><input type="radio" name="provider" value="custom"> Custom</label>
        </fieldset>
        <fieldset><legend>Export mode</legend>
          <label><input type="radio" name="mode" value="focused" checked> Focused content</label>
          <label><input type="radio" name="mode" value="complete"> Complete page</label>
        </fieldset>
        <label for="detail">Detail <output id="detail-value">75</output>/100</label>
        <input id="detail" type="range" min="0" max="100" value="75">
        <p id="detail-description" class="muted">Detail applies to Browser and Custom summarization.</p>
        <button id="export" type="button">Convert to Markdown</button>
        <output id="status" aria-live="polite"></output>
      </section>
    </section>
  `;
  const providerInputs = [...root.querySelectorAll<HTMLInputElement>('input[name="provider"]')];
  const modeInputs = [...root.querySelectorAll<HTMLInputElement>('input[name="mode"]')];
  const detailInput = root.querySelector<HTMLInputElement>('#detail')!;
  const detailValue = root.querySelector<HTMLOutputElement>('#detail-value')!;
  const detailDescription = root.querySelector<HTMLParagraphElement>('#detail-description')!;
  const button = root.querySelector<HTMLButtonElement>('#export')!;
  const status = root.querySelector<HTMLOutputElement>('#status')!;
  const selectedProvider = (): SummarizationProvider => (providerInputs.find((input) => input.checked)?.value as SummarizationProvider | undefined) ?? 'none';
  const updateDetail = (): void => { updateDetailControl(selectedProvider(), detailInput, detailDescription); };
  providerInputs.forEach((input) => input.addEventListener('change', updateDetail));
  detailInput.addEventListener('input', () => { detailValue.value = detailInput.value; });
  updateDetail();

  button.addEventListener('click', async () => {
    button.disabled = true;
    status.textContent = 'Capturing the active page locally…';
    try {
      const response = await dependencies.captureActiveTab();
      if (response.error || !response.id) throw new Error(response.error || 'Capture did not return an export.');
      const stored = await dependencies.loadExport(response.id);
      if (!stored) throw new Error('This temporary export is no longer available. Capture the page again.');
      status.textContent = selectedProvider() === 'browser' ? 'Preparing Chrome local summarization…' : 'Preparing final Markdown…';
      const captured = dependencies.deriveReadabilityFocus(stored.captured);
      const mode = (modeInputs.find((input) => input.checked)?.value as ExportMode | undefined) ?? 'focused';
      renderResult(captured.metadata.title, await dependencies.createFinalExport(captured, mode, Number(detailInput.value), selectedProvider()));
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : 'Unable to capture this page.';
      button.disabled = false;
    }
  });
}
