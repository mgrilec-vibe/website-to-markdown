import { afterEach, describe, expect, it } from 'vitest';
import {
  checkCapability,
  createLocalSession,
  setSummarizerApiForTesting,
  type ChromeSummarizerApi,
  type LocalSummarizerSession,
} from '../src/summarizer';
import type { SummarizerSettings } from '../src/domain';

const settings: SummarizerSettings = {
  type: 'key-points',
  length: 'medium',
  format: 'markdown',
  preference: 'auto',
};

const session: LocalSummarizerSession = {
  async summarize(): Promise<string> {
    return '- local summary';
  },
};

afterEach(() => setSummarizerApiForTesting(undefined));

describe('Chrome Summarizer capability adapter', () => {
  it('reports unavailable when no local API is exposed', async () => {
    setSummarizerApiForTesting(null);

    const capability = await checkCapability();

    expect(capability.apiPresent).toBe(false);
    expect(capability.availability).toBe('unavailable');
  });

  it.each(['downloadable', 'downloading', 'available'] as const)(
    'records Chrome availability state %s',
    async (availability) => {
      const api: ChromeSummarizerApi = {
        availability: async () => availability,
        create: async () => session,
      };
      setSummarizerApiForTesting(api);

      expect((await checkCapability()).availability).toBe(availability);
    },
  );

  it('creates a session and records download progress', async () => {
    const api: ChromeSummarizerApi = {
      availability: async () => 'downloadable',
      create: async (options) => {
        options.monitor({
          addEventListener: (_type, listener) => listener({ loaded: 0.5 }),
        });
        return session;
      },
    };
    setSummarizerApiForTesting(api);
    const updates: string[] = [];

    const created = await createLocalSession(settings, (entry) => updates.push(entry.kind));

    expect(created).toBe(session);
    expect(updates).toEqual(['download-progress', 'session-created']);
  });

  it('records cancellation when session creation observes an aborted signal', async () => {
    const controller = new AbortController();
    controller.abort();
    const api: ChromeSummarizerApi = {
      availability: async () => 'downloadable',
      create: async () => {
        throw new Error('cancelled by browser');
      },
    };
    setSummarizerApiForTesting(api);
    const updates: string[] = [];

    await expect(createLocalSession(settings, (entry) => updates.push(entry.kind), controller.signal)).rejects.toThrow('cancelled by browser');

    expect(updates).toEqual(['cancelled']);
  });

  it('records failed session creation without converting it to generated output', async () => {
    const api: ChromeSummarizerApi = {
      availability: async () => 'available',
      create: async () => {
        throw new Error('model provisioning failed');
      },
    };
    setSummarizerApiForTesting(api);
    const updates: string[] = [];

    await expect(createLocalSession(settings, (entry) => updates.push(entry.kind))).rejects.toThrow('model provisioning failed');

    expect(updates).toEqual(['error']);
  });
});
