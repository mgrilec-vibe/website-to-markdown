import { renderMarkdown } from './markdown-render';

export interface PreviewOutput {
  readonly element: HTMLElement;
  readonly baselineMetrics: HTMLParagraphElement;
  readonly derivedMetrics: HTMLParagraphElement;
  readonly baselineView: HTMLElement;
  readonly derivedView: HTMLElement;
}

export function createPreviewOutput(document: Document): PreviewOutput {
  const element = document.createElement('section');
  element.className = 'output-grid';
  element.innerHTML = `
    <article><h2>Deterministic result</h2><p id="baseline-metrics" class="muted"></p><div id="baseline" class="markdown-result" aria-label="Deterministic Markdown result"></div></article>
    <article><h2>Compressed derivative</h2><p id="derived-metrics" class="muted"></p><div id="derived" class="markdown-result" aria-label="Compressed Markdown derivative"></div></article>
  `;
  return {
    element,
    baselineMetrics: element.querySelector<HTMLParagraphElement>('#baseline-metrics')!,
    derivedMetrics: element.querySelector<HTMLParagraphElement>('#derived-metrics')!,
    baselineView: element.querySelector<HTMLElement>('#baseline')!,
    derivedView: element.querySelector<HTMLElement>('#derived')!,
  };
}

export function renderPreviewMarkdown(container: HTMLElement, markdown: string): void {
  container.replaceChildren(renderMarkdown(markdown, container.ownerDocument));
}
