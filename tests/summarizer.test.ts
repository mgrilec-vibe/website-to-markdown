import { afterEach, describe, expect, it } from 'vitest';
import {
  checkCapability,
  createLocalSession,
  setSummarizerApiForTesting,
  type ChromeSummarizerApi,
  type LocalSummarizerSession,
} from '../src/summarizer';
import type { ProvisionEvent, SummarizerSettings } from '../src/domain';

const settings: SummarizerSettings = {
  type: 'key-points',
  length: 'medium',
  format: 'markdown',
  preference: 'auto',
  expectedInputLanguages: ['en'],
  expectedContextLanguages: ['en'],
  outputLanguage: 'en',
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

    const capability = await checkCapability(settings);

    expect(capability.apiPresent).toBe(false);
    expect(capability.availability).toBe('unavailable');
  });

  it.each(['downloadable', 'downloading', 'available'] as const)(
    'records Chrome availability state %s',
    async (availability) => {
      const api: ChromeSummarizerApi = {
        availability: async (options) => {
          expect(options).toEqual({
            expectedInputLanguages: ['en'],
            expectedContextLanguages: ['en'],
            outputLanguage: 'en',
          });
          return availability;
        },
        create: async () => session,
      };
      setSummarizerApiForTesting(api);

      expect((await checkCapability(settings)).availability).toBe(availability);
    },
  );

  it('creates a session and records download progress', async () => {
    const api: ChromeSummarizerApi = {
      availability: async () => 'downloadable',
      create: async (options) => {
        expect(options.outputLanguage).toBe('en');
        expect(options.expectedInputLanguages).toEqual(['en']);
        expect(options.expectedContextLanguages).toEqual(['en']);
        options.monitor({
          addEventListener: (_type, listener) => listener({ loaded: 0.5 }),
        });
        return session;
      },
    };
    setSummarizerApiForTesting(api);
    const updates: ProvisionEvent[] = [];

    const created = await createLocalSession(settings, (entry) => updates.push(entry));

    expect(created).toBe(session);
    expect(updates.map((entry) => entry.kind)).toEqual([
      'session-create-start',
      'monitor-attached',
      'download-progress',
      'monitor-listener-registered',
      'session-created',
    ]);
    expect(updates.map((entry) => entry.id)).toHaveLength(new Set(updates.map((entry) => entry.id)).size);
    expect(updates.map((entry) => entry.elapsedMs)).toEqual([...updates.map((entry) => entry.elapsedMs)].sort((left, right) => left - right));
    expect(updates.find((entry) => entry.kind === 'download-progress')?.context).toMatchObject({
      rawLoaded: 0.5,
      normalizedProgress: 0.5,
    });
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
    const updates: ProvisionEvent[] = [];

    await expect(createLocalSession(settings, (entry) => updates.push(entry), controller.signal)).rejects.toThrow('cancelled by browser');

    expect(updates.map((entry) => entry.kind)).toEqual(['session-create-start', 'cancelled']);
  });

  it('records failed session creation without converting it to generated output', async () => {
    const api: ChromeSummarizerApi = {
      availability: async () => 'available',
      create: async () => {
        throw new Error('model provisioning failed');
      },
    };
    setSummarizerApiForTesting(api);
    const updates: ProvisionEvent[] = [];

    await expect(createLocalSession(settings, (entry) => updates.push(entry))).rejects.toThrow('model provisioning failed');

    expect(updates.map((entry) => entry.kind)).toEqual(['session-create-start', 'error']);
  });
});
