import { parseHTML } from 'linkedom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mountBenchmarkApp } from '../src/benchmark/app';

const roots: HTMLElement[] = [];

afterEach(() => {
  roots.length = 0;
  vi.unstubAllGlobals();
});

function mount(): HTMLElement {
  const { document } = parseHTML('<html><body><div id="app"></div></body></html>');
  vi.stubGlobal('document', document);
  const root = document.querySelector<HTMLElement>('#app')!;
  roots.push(root);
  mountBenchmarkApp(root);
  return root;
}

describe('benchmark application', () => {
  it('renders explicit static-corpus and matrix controls', () => {
    const root = mount();

    expect(root.textContent).toContain('does not visit or recapture source URLs');
    expect(root.textContent).toContain('260 runs');
    expect(root.querySelector('#run-full')?.textContent).toBe('Run full benchmark');
    expect(root.querySelector('#run-diagnostic')?.textContent).toBe('Run quick benchmark');
    expect(root.querySelector('#download')?.hasAttribute('disabled')).toBe(true);
    expect(root.querySelector('#run-progress')?.getAttribute('max')).toBe('1');
    expect(root.querySelector('#run-progress')?.getAttribute('aria-label')).toBe('Benchmark progress');
    expect(root.querySelector('#progress-summary')?.textContent).toBe('No benchmark run in progress.');
    expect(root.querySelector('#error')?.hasAttribute('hidden')).toBe(true);
  });
});
