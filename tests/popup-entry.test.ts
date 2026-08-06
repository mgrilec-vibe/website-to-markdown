import { readFile } from 'node:fs/promises';
import { parseHTML } from 'linkedom';
import { describe, expect, it } from 'vitest';

describe('popup entry document', () => {
  it('pins the action-popup width before JavaScript and bundled CSS load', async () => {
    const html = await readFile(new URL('../entrypoints/popup.html', import.meta.url), 'utf8');
    const { document } = parseHTML(html);
    const bootstrapStyle = document.querySelector<HTMLStyleElement>('style[data-popup-bootstrap-size]');

    expect(bootstrapStyle).not.toBeNull();
    expect(bootstrapStyle!.textContent).toContain('width: 22rem');
    expect(bootstrapStyle!.textContent).toContain('min-width: 22rem');
    expect(bootstrapStyle!.textContent).toContain('max-width: 22rem');
    expect(document.querySelector('#app')).not.toBeNull();
    expect(document.querySelector('script[type="module"]')).not.toBeNull();
  });
});
