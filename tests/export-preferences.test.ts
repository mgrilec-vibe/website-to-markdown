import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_EXPORT_PREFERENCES,
  loadExportPreferences,
  normalizeExportPreferences,
  saveExportPreferences,
  type ExportPreferences,
} from '../src/export-preferences';

const storage = new Map<string, unknown>();
const local = {
  get: vi.fn(async (key: string) => ({ [key]: storage.get(key) })),
  set: vi.fn(async (values: Record<string, unknown>) => {
    for (const [key, value] of Object.entries(values)) storage.set(key, value);
  }),
};

vi.stubGlobal('chrome', { storage: { local } });

afterEach(() => {
  storage.clear();
  local.get.mockClear();
  local.set.mockClear();
});

describe('export preferences', () => {
  it('normalizes missing and invalid values to safe defaults', () => {
    expect(normalizeExportPreferences({ mode: 'invalid', provider: 'remote', detail: 999, autoCopy: 'yes' })).toEqual({
      ...DEFAULT_EXPORT_PREFERENCES,
      detail: 100,
    });
    expect(normalizeExportPreferences(null)).toEqual(DEFAULT_EXPORT_PREFERENCES);
    expect(normalizeExportPreferences({ mode: 'complete', provider: 'browser', detail: 74.6, autoCopy: false })).toEqual({
      provider: 'browser',
      detail: 75,
      autoCopy: false,
    });
    expect(normalizeExportPreferences({ mode: 'focused', provider: 'none', detail: 75, autoCopy: true })).toEqual(DEFAULT_EXPORT_PREFERENCES);
  });
  it('normalizes legacy mode values when loading and saving', async () => {
    storage.set('exportPreferences', { mode: 'complete', provider: 'custom', detail: 42, autoCopy: false });
    await expect(loadExportPreferences()).resolves.toEqual({ provider: 'custom', detail: 42, autoCopy: false });

    await saveExportPreferences({ mode: 'complete', provider: 'custom', detail: 42, autoCopy: false } as unknown as ExportPreferences);
    expect(local.set).toHaveBeenCalledWith({
      exportPreferences: { provider: 'custom', detail: 42, autoCopy: false },
    });
    await expect(loadExportPreferences()).resolves.toEqual({ provider: 'custom', detail: 42, autoCopy: false });
    expect(local.get).toHaveBeenCalledWith('exportPreferences');
  });
});
