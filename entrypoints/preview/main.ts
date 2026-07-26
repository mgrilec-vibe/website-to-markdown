import {
  checkLocalAiCapability,
  createLanguageDetector,
  createSummarizer,
  detectEligibleLanguage,
  summarizeBlocks,
  type LanguageDetectorSession,
} from '../../src/export-ai';
import { deriveReadabilityFocus } from '../../src/capture';
import { detailPolicy, deterministicCompression, deterministicExtractiveCompression, unknownLanguageState, withGeneratedSummaries } from '../../src/export-compression';
import type { CapabilityState, CompressionResult, ExportMode, LanguageState } from '../../src/export-domain';
import { loadExport } from '../../src/storage';
import '../../src/export-styles.css';

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('Export preview root is missing.');

const exportId = new URLSearchParams(location.search).get('export');
if (!exportId) throw new Error('The preview is missing an export identifier.');
const stored = await loadExport(exportId);
if (!stored) throw new Error('This temporary export is no longer available. Capture the page again.');
const captured = deriveReadabilityFocus(stored.captured);

let mode: ExportMode = captured.focusedHtml ? 'focused' : 'complete';
let detail = 75;
let capability: CapabilityState = { detector: 'unchecked', summarizer: 'unchecked' };
let language: LanguageState = unknownLanguageState(captured.metadata.pageLanguage);
let baseline: CompressionResult = deterministicCompression(captured, mode, detail, language);
let derived: CompressionResult = deterministicExtractiveCompression(captured, mode, detail, language);
let detector: LanguageDetectorSession | undefined;

root.innerHTML = `
  <section class="export-preview">
    <header><p class="eyebrow">Local export</p><h1 id="title"></h1><p id="source" class="muted"></p></header>
    <section id="error" class="notice error" hidden></section>
    <section class="controls" aria-label="Export controls">
      <fieldset><legend>Export mode</legend>
        <label><input type="radio" name="mode" value="focused"> Focused content</label>
        <label><input type="radio" name="mode" value="complete"> Complete page</label>
      </fieldset>
      <label for="detail">Detail <output id="detail-value"></output>/100</label>
      <input id="detail" type="range" min="0" max="100">
      <p id="detail-description" class="muted"></p>
      <section id="language" class="notice"></section>
      <section id="model" class="notice"></section>
      <div class="actions">
        <button id="enable-ai" type="button">Enable local AI</button>
        <button id="generate" type="button">Generate compressed preview</button>
        <button id="copy" type="button">Copy selected Markdown</button>
        <button id="download" type="button">Download .md</button>
      </div>
    </section>
    <section class="output-grid">
      <article><h2>Deterministic result</h2><p id="baseline-metrics" class="muted"></p><textarea id="baseline" readonly spellcheck="false"></textarea></article>
      <article><h2>Compressed derivative</h2><p id="derived-metrics" class="muted"></p><textarea id="derived" readonly spellcheck="false" placeholder="Deterministic extractive compression is always available."></textarea></article>
    </section>
  </section>
`;

const title = root.querySelector<HTMLHeadingElement>('#title')!;
const source = root.querySelector<HTMLParagraphElement>('#source')!;
const error = root.querySelector<HTMLElement>('#error')!;
const modeInputs = [...root.querySelectorAll<HTMLInputElement>('input[name="mode"]')];
const detailInput = root.querySelector<HTMLInputElement>('#detail')!;
const detailValue = root.querySelector<HTMLOutputElement>('#detail-value')!;
const detailDescription = root.querySelector<HTMLParagraphElement>('#detail-description')!;
const languageNotice = root.querySelector<HTMLElement>('#language')!;
const modelNotice = root.querySelector<HTMLElement>('#model')!;
const baselineMetrics = root.querySelector<HTMLParagraphElement>('#baseline-metrics')!;
const derivedMetrics = root.querySelector<HTMLParagraphElement>('#derived-metrics')!;
const baselineView = root.querySelector<HTMLTextAreaElement>('#baseline')!;
const derivedView = root.querySelector<HTMLTextAreaElement>('#derived')!;
const enableAi = root.querySelector<HTMLButtonElement>('#enable-ai')!;
const generate = root.querySelector<HTMLButtonElement>('#generate')!;
const copy = root.querySelector<HTMLButtonElement>('#copy')!;
const download = root.querySelector<HTMLButtonElement>('#download')!;

title.textContent = captured.metadata.title;
source.textContent = captured.metadata.sourceUrl;
detailInput.value = String(detail);
modeInputs.find((input) => input.value === mode)!.checked = true;
modeInputs.find((input) => input.value === 'focused')!.disabled = !captured.focusedHtml;

function showError(message?: string): void {
  error.hidden = !message;
  error.textContent = message ?? '';
}

function render(): void {
  const policy = detailPolicy(detail);
  detailValue.value = String(detail);
  detailDescription.textContent = `${policy.description} Output size is measured after generation, not promised in advance.`;
  baselineView.value = baseline.markdown;
  baselineMetrics.textContent = `${baseline.metadata.words} words · ${baseline.metadata.bytes} bytes · ${baseline.removedBlockIds.length} deterministic removals`;
  derivedView.value = derived.markdown;
  derivedMetrics.textContent = `${derived.metadata.words} words · ${derived.metadata.bytes} bytes · ${derived.metadata.generatedSummaryCount} ${derived.metadata.summaryOrigin === 'local-ai' ? 'local-AI' : 'deterministic extractive'} summaries`;
  const confidence = language.confidence === undefined ? '' : ` (${Math.round(language.confidence * 100)}% confidence)`;
  languageNotice.textContent = language.warning ?? `Language: ${language.primaryLanguage ?? 'unknown'}${confidence}; supported for local summaries.`;
  modelNotice.textContent = `Language model: ${capability.detector}; Summarizer: ${capability.summarizer}. All processing remains on-device.`;
  generate.disabled = !policy.summaryEnabled || !language.supported || capability.summarizer === 'unavailable' || capability.summarizer === 'failed';
}

function refreshBaseline(): void {
  baseline = deterministicCompression(captured, mode, detail, language);
  derived = deterministicExtractiveCompression(captured, mode, detail, language);
  render();
}

modeInputs.forEach((input) => input.addEventListener('change', () => {
  const selectedMode = input.value;
  if (selectedMode !== 'focused' && selectedMode !== 'complete') return;
  mode = selectedMode;
  refreshBaseline();
}));
detailInput.addEventListener('input', () => {
  detail = Number(detailInput.value);
  refreshBaseline();
});

enableAi.addEventListener('click', async () => {
  enableAi.disabled = true;
  showError();
  try {
    capability = await checkLocalAiCapability();
    if (capability.detector === 'unavailable' || capability.detector === 'failed') {
      language = { ...unknownLanguageState(captured.metadata.pageLanguage), warning: 'Chrome local language detection is unavailable on this device.' };
      render();
      return;
    }
    detector = await createLanguageDetector({ onProgress: (value) => { modelNotice.textContent = `Downloading local language model: ${Math.round(value * 100)}%`; } });
    const prose = baseline.summarizableBlocks.map((block) => block.markdown).join('\n\n');
    language = await detectEligibleLanguage(prose, captured.metadata.pageLanguage, detector);
    capability = await checkLocalAiCapability();
    refreshBaseline();
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : 'Unable to enable local AI.';
    showError(message);
    capability = { ...capability, detector: 'failed', detectorError: message };
    render();
  } finally {
    enableAi.disabled = false;
  }
});

generate.addEventListener('click', async () => {
  generate.disabled = true;
  showError();
  try {
    const session = await createSummarizer(detailPolicy(detail), language, { onProgress: (value) => { modelNotice.textContent = `Downloading local summary model: ${Math.round(value * 100)}%`; } });
    const summaryOutput = await summarizeBlocks(session, baseline.summarizableBlocks);
    derived = withGeneratedSummaries(baseline, summaryOutput.summaries, summaryOutput.chunkCount);
    session.destroy?.();
    render();
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : 'Local summary generation failed.';
    showError(message);
    derived = deterministicExtractiveCompression(captured, mode, detail, language);
    render();
  } finally {
    generate.disabled = false;
  }
});

copy.addEventListener('click', async () => {
  await navigator.clipboard.writeText(derived.markdown);
  copy.textContent = 'Copied';
  window.setTimeout(() => { copy.textContent = 'Copy selected Markdown'; }, 1_500);
});

download.addEventListener('click', async () => {
  const markdown = derived.markdown;
  const safeTitle = captured.metadata.title.normalize('NFKD').replace(/[^\w.-]+/gu, '-').replace(/^-+|-+$/gu, '').slice(0, 80) || 'page';
  const url = URL.createObjectURL(new Blob([markdown], { type: 'text/markdown;charset=utf-8' }));
  try {
    await chrome.downloads.download({ url, filename: `${safeTitle}.md`, conflictAction: 'uniquify', saveAs: true });
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
  }
});

render();
