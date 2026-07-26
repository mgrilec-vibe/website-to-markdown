import { parseHTML } from 'linkedom';
import { describe, expect, it } from 'vitest';
import { previewLinkDestination, renderMarkdown } from '../src/markdown-render';

function render(markdown: string): HTMLElement {
  const { document } = parseHTML('<!doctype html><html><body></body></html>');
  const result = document.createElement('section');
  result.replaceChildren(renderMarkdown(markdown, document as unknown as Document));
  return result as unknown as HTMLElement;
}

describe('Markdown preview rendering', () => {
  it('renders supported exported Markdown structures', () => {
    const result = render('# Title\n\nParagraph with **strong text**.\n\n> Source-preserved quotation\n\n```ts\nconst value = 1;\n```\n\n| Name | Value |\n| --- | --- |\n| detail | 75 |');

    expect(result.querySelector('h1')?.textContent).toBe('Title');
    expect(result.querySelector('strong')?.textContent).toBe('strong text');
    expect(result.querySelector('blockquote')?.textContent).toContain('Source-preserved quotation');
    expect(result.querySelector('pre code')?.textContent).toContain('const value = 1;');
    expect(result.querySelector('table')?.textContent).toContain('detail');
  });

  it('renders export front matter as metadata code rather than a document heading', () => {
    const result = render('---\ntitle: "Rendered export"\nsource_url: "https://example.com/source"\nsummary_origin: deterministic-extractive\n---\n\n# Document body');

    expect(result.querySelector('pre code')?.textContent).toContain('summary_origin: deterministic-extractive');
    expect([...result.querySelectorAll('h1, h2')].map((heading) => heading.textContent)).toEqual(['Document body']);
  });

  it('renders raw HTML as text and removes style and event-handler DOM', () => {
    const result = render('<script>alert(1)</script>\n\n<span style="color:red" onclick="alert(1)">untrusted</span>');

    expect(result.querySelector('script')).toBeNull();
    expect(result.querySelector('[style], [onclick]')).toBeNull();
    expect(result.textContent).toContain('<script>alert(1)</script>');
    expect(result.textContent).toContain('<span style="color:red" onclick="alert(1)">untrusted</span>');
  });

  it('renders only allowlisted absolute links and isolates web links', () => {
    const result = render('[Web](https://example.com/path) [Mail](mailto:hello@example.com) [JavaScript](javascript:alert(1)) [Data](data:text/html,nope) [Telephone](tel:+12025550123) [Relative](/docs)');
    const links = [...result.querySelectorAll('a')];

    expect(links).toHaveLength(2);
    expect(links[0]?.getAttribute('href')).toBe('https://example.com/path');
    expect(links[0]?.getAttribute('target')).toBe('_blank');
    expect(links[0]?.getAttribute('rel')).toBe('noopener noreferrer');
    expect(links[1]?.getAttribute('href')).toBe('mailto:hello@example.com');
    expect(links[1]?.hasAttribute('target')).toBe(false);
    expect(result.textContent).toContain('JavaScript');
    expect(result.textContent).toContain('Data');
    expect(result.textContent).toContain('Telephone');
    expect(result.textContent).toContain('Relative');
  });

  it('suppresses remote resource elements while retaining accessible replacement text', () => {
    const result = render('![Diagram](https://cdn.example.com/diagram.png)\n\n<iframe src="https://example.com/embed"></iframe>\n\n<video src="https://example.com/video.mp4"></video>');

    expect(result.querySelectorAll('img, iframe, video, audio, embed, object, source')).toHaveLength(0);
    expect(result.querySelectorAll('[src]')).toHaveLength(0);
    expect(result.querySelector('.markdown-resource')?.textContent).toContain('Image omitted: Diagram');
    expect(result.textContent).toContain('<iframe src="https://example.com/embed"></iframe>');
  });

  it('accepts only preview-safe absolute destinations', () => {
    expect(previewLinkDestination('https://example.com')?.protocol).toBe('https:');
    expect(previewLinkDestination('mailto:hello@example.com')?.protocol).toBe('mailto:');
    expect(previewLinkDestination('/relative')).toBeUndefined();
    expect(previewLinkDestination('tel:+12025550123')).toBeUndefined();
    expect(previewLinkDestination('javascript:alert(1)')).toBeUndefined();
  });
});
