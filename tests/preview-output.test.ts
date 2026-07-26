import { parseHTML } from 'linkedom';
import { describe, expect, it } from 'vitest';
import { createPreviewOutput, renderPreviewMarkdown } from '../src/preview-output';

describe('Preview output', () => {
  it('creates rendered baseline and derivative containers without textareas', () => {
    const { document } = parseHTML('<!doctype html><html><body></body></html>');
    const output = createPreviewOutput(document as unknown as Document);

    expect(output.element.querySelectorAll('textarea')).toHaveLength(0);
    expect(output.baselineView.tagName).toBe('DIV');
    expect(output.derivedView.tagName).toBe('DIV');
    expect(output.baselineView.classList.contains('markdown-result')).toBe(true);
    expect(output.derivedView.classList.contains('markdown-result')).toBe(true);
  });

  it('renders source-preserved and extractive Markdown into their respective containers', () => {
    const { document } = parseHTML('<!doctype html><html><body></body></html>');
    const output = createPreviewOutput(document as unknown as Document);

    renderPreviewMarkdown(output.baselineView, '# Source-preserved\n\nOriginal text.');
    renderPreviewMarkdown(output.derivedView, '> **Deterministic extractive summary**\n>\n> Selected source sentence.');

    expect(output.baselineView.querySelector('h1')?.textContent).toBe('Source-preserved');
    expect(output.derivedView.querySelector('blockquote strong')?.textContent).toBe('Deterministic extractive summary');
    expect(output.derivedView.textContent).toContain('Selected source sentence.');
  });
});
