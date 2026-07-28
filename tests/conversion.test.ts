import { describe, expect, it } from 'vitest';
import { convertCapturedPage } from '../src/conversion';
import { linkedomHtmlParser } from '../src/conversion/linkedom-parser';
import { jsdomHtmlParser } from '../src/conversion/jsdom-parser';
import type { CapturedPage, MarkdownBlock } from '../src/export-domain';
import { loadConversionCase } from './fixtures/conversion/load-case';

function markdownOf(blocks: readonly MarkdownBlock[]): string {
  return `${blocks.filter((block) => block.kind !== 'provenance').map((block) => block.markdown.trim()).filter(Boolean).join('\n\n')}\n`;
}

describe('captured HTML conversion', () => {
  it.each(['complete', 'focused'] as const)('matches the export-page %s golden and structural expectations', async (mode) => {
    const fixture = await loadConversionCase('export-page');
    const conversion = convertCapturedPage(fixture.captured, mode, linkedomHtmlParser);
    const expectation = fixture.expectations[mode];

    expect(markdownOf(conversion.blocks)).toBe(fixture.goldens[mode]);
    expect(conversion.blocks.map((block) => block.kind)).toEqual(expectation.blockKinds);
    expect(conversion.blocks.filter((block) => block.kind === 'removable').map((block) => block.id)).toEqual(expectation.removableBlockIds);
    expect(conversion.limitations).toEqual(expectation.limitations);
  });

  it.each(['complete', 'focused'] as const)('keeps Linkedom and jsdom fixture conversion structurally equivalent in %s mode', async (mode) => {
    const fixture = await loadConversionCase('export-page');
    const linkedom = convertCapturedPage(fixture.captured, mode, linkedomHtmlParser);
    const jsdom = convertCapturedPage(fixture.captured, mode, jsdomHtmlParser);

    expect(jsdom).toEqual(linkedom);
  });

  it('resolves safe URLs and preserves code, checkboxes, and merged-table limitations without browser globals', () => {
    const captured: CapturedPage = {
      metadata: {
        title: 'Structural fixture',
        sourceUrl: 'https://example.com/guide/page',
        capturedAt: '2026-07-28T00:00:00.000Z',
      },
      completeHtml: `
        <!doctype html><html><body>
          <p><a href="/reference">Relative reference</a> <a href="javascript:alert(1)">Unsafe reference</a></p>
          <img src="data:image/png;base64,AAAA" alt="Inline image">
          <ul><li><input type="checkbox" checked>Complete task</li><li><input type="checkbox">Open task</li></ul>
          <pre><code class="language-ts">const tick = \`ok\`;</code></pre>
          <table><tr><th colspan="2">Merged</th></tr><tr><td>left</td><td>right</td></tr></table>
        </body></html>`,
      limitations: [],
    };

    const conversion = convertCapturedPage(captured, 'complete', linkedomHtmlParser);
    const markdown = markdownOf(conversion.blocks);

    expect(markdown).toContain('[Relative reference](https://example.com/reference)');
    expect(markdown).toContain('Unsafe reference');
    expect(markdown).not.toContain('javascript:');
    expect(markdown).toContain('[x] Complete task');
    expect(markdown).toContain('[ ] Open task');
    expect(markdown).toContain('```ts');
    expect(markdown).toContain('Conversion limitation: this table has merged cells');
    expect(conversion.limitations).toEqual(['Image omitted because its source URL is unsupported: Inline image.']);
  });
});
