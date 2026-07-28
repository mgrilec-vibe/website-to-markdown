import { renderMarkdown } from './markdown-render';

export interface PreviewOutput {
  readonly element: HTMLElement;
  readonly metadata: HTMLParagraphElement;
  readonly view: HTMLElement;
}

export function createPreviewOutput(document: Document): PreviewOutput {
  const element = document.createElement('section');
  element.className = 'final-output';
  element.innerHTML = `
    <article>
      <h2>Final Markdown</h2>
      <p id="final-metadata" class="muted"></p>
      <div id="final-markdown" class="markdown-result" aria-label="Final Markdown result"></div>
    </article>
  `;
  return {
    element,
    metadata: element.querySelector<HTMLParagraphElement>('#final-metadata')!,
    view: element.querySelector<HTMLElement>('#final-markdown')!,
  };
}

export function renderPreviewMarkdown(container: HTMLElement, markdown: string): void {
  container.replaceChildren(renderMarkdown(markdown, container.ownerDocument));
}
