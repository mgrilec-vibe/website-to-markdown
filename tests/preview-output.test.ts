import { parseHTML } from 'linkedom';
import { describe, expect, it } from 'vitest';
import { createPreviewOutput, renderPreviewMarkdown } from '../src/preview-output';

describe('Preview output', () => {
  it('creates one rendered final-result container without a textarea', () => {
    const { document } = parseHTML('<!doctype html><html><body></body></html>');
    const output = createPreviewOutput(document as unknown as Document);

    expect(output.element.querySelectorAll('textarea')).toHaveLength(0);
    expect(output.element.querySelectorAll('.markdown-result')).toHaveLength(1);
    expect(output.view.tagName).toBe('DIV');
    expect(output.view.classList.contains('markdown-result')).toBe(true);
    expect(output.element.querySelector('.output-grid')).toBeNull();
  });

  it('renders only final Markdown into the safe result container', () => {
    const { document } = parseHTML('<!doctype html><html><body></body></html>');
    const output = createPreviewOutput(document as unknown as Document);

    renderPreviewMarkdown(output.view, '> **Custom extractive summary**\n>\n> Selected source sentence.');

    expect(output.view.querySelector('blockquote strong')?.textContent).toBe('Custom extractive summary');
    expect(output.view.textContent).toContain('Selected source sentence.');
  });
});
