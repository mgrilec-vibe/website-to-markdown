import { parseHTML } from 'linkedom';
import { describe, expect, it } from 'vitest';
import { updateDetailControl } from '../src/popup-controls';

describe('popup summarization controls', () => {
  it('marks Detail inactive for None and restores it for Browser or Custom', () => {
    const { document } = parseHTML('<!doctype html><input id="detail" type="range"><p id="description"></p>');
    const input = document.querySelector<HTMLInputElement>('#detail')!;
    const description = document.querySelector<HTMLElement>('#description')!;

    updateDetailControl('none', input, description);
    expect(input.disabled).toBe(true);
    expect(description.textContent).toContain('inactive');

    updateDetailControl('custom', input, description);
    expect(input.disabled).toBe(false);
    expect(description.textContent).toContain('retained');
  });
});
