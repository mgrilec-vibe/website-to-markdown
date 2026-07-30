import { parseHTML } from 'linkedom';
import { describe, expect, it, vi } from 'vitest';
import { mountSettingsApp } from '../src/settings-app';
import type { ExportPreferences } from '../src/export-preferences';

const preferences: ExportPreferences = {
  mode: 'focused',
  provider: 'none',
  detail: 75,
  autoCopy: true,
};

describe('settings surface', () => {
  it('loads, explains fallback behavior, and saves updated export defaults', async () => {
    const { document, window } = parseHTML('<!doctype html><main id="app"></main>');
    const root = document.querySelector<HTMLElement>('#app')!;
    const save = vi.fn(async () => undefined);
    mountSettingsApp(root, { load: async () => preferences, save });

    await vi.waitFor(() => expect(root.textContent).toContain('falls back to deterministic extraction'));
    Object.defineProperty(root.querySelector<HTMLSelectElement>('#mode')!, 'value', { configurable: true, value: 'complete' });
    Object.defineProperty(root.querySelector<HTMLSelectElement>('#provider')!, 'value', { configurable: true, value: 'browser' });
    Object.defineProperty(root.querySelector<HTMLInputElement>('#detail')!, 'value', { configurable: true, value: '42' });
    Object.defineProperty(root.querySelector<HTMLInputElement>('#auto-copy')!, 'checked', { configurable: true, value: false });
    root.querySelector<HTMLFormElement>('#settings-form')!.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));

    await vi.waitFor(() => expect(save).toHaveBeenCalledWith({
      mode: 'complete',
      provider: 'browser',
      detail: 42,
      autoCopy: false,
    }));
    expect(root.textContent).toContain('Settings saved.');
  });
});
