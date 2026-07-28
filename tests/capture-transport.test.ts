import { describe, expect, it, vi } from 'vitest';
import { captureAndStore } from '../src/capture-transport';
import type { CapturedPage } from '../src/export-domain';

const captured: CapturedPage = {
  metadata: { title: 'Captured', sourceUrl: 'https://example.com/captured', capturedAt: '2026-07-26T12:34:56.000Z' },
  completeHtml: '<p>Captured page.</p>',
  limitations: [],
};

describe('popup capture transport', () => {
  it('stores a capture and returns only its transient identifier', async () => {
    const save = vi.fn(async () => undefined);
    const result = await captureAndStore({
      activeTab: async () => ({ id: 7, url: 'https://example.com/captured' }),
      capture: async () => captured,
      newId: () => 'export-1',
      save,
    });

    expect(result).toEqual({ id: 'export-1' });
    expect(save).toHaveBeenCalledWith('export-1', captured);
  });

  it('rejects non-exportable tabs without attempting a capture', async () => {
    const capture = vi.fn(async () => captured);
    await expect(captureAndStore({ activeTab: async () => ({ id: 7, url: 'chrome://settings' }), capture, newId: () => 'unused', save: async () => undefined }))
      .rejects.toThrow('regular HTTP(S) page');
    expect(capture).not.toHaveBeenCalled();
  });
});
