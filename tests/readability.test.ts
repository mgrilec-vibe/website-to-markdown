import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { jsdomHtmlParser } from '../src/conversion/jsdom-parser';
import { deriveReadabilityFocus } from '../src/capture';
import type { CapturedPage } from '../src/export-domain';

async function capturedFixture(name: string): Promise<CapturedPage> {
  return {
    metadata: {
      title: `${name} fixture`,
      sourceUrl: `https://example.com/readability/${name}`,
      capturedAt: '2026-07-28T00:00:00.000Z',
    },
    completeHtml: await readFile(new URL(`./fixtures/conversion/readability/${name}.html`, import.meta.url), 'utf8'),
    limitations: [],
  };
}

describe('stored-capture Readability focus extraction', () => {
  it('extracts a focused article through the Node parser adapter', async () => {
    const captured = await capturedFixture('article');
    const focused = deriveReadabilityFocus(captured, jsdomHtmlParser);

    expect(focused).not.toBe(captured);
    expect(focused.metadata.title).toBe('Focused extraction fixture');
    expect(focused.focusedHtml).toContain('Fixture-driven validation records the smallest example');
    expect(focused.focusedHtml).not.toContain('Subscribe to our newsletter');
  });

  it('returns the captured page unchanged when Readability cannot extract an article', async () => {
    const captured = await capturedFixture('fallback');

    expect(deriveReadabilityFocus(captured, jsdomHtmlParser)).toBe(captured);
  });
});
