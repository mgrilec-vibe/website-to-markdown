import type {
  AvailabilityState,
  CapabilityDiagnostic,
  ProvisionEvent,
  SummarizerSettings,
  SummaryStage,
} from './domain';

export interface LocalSummarizerSession {
  summarize(input: string, options?: { context?: string }): Promise<string>;
  destroy?(): void;
}

export interface DownloadMonitor {
  addEventListener(type: 'downloadprogress', listener: (event: { loaded: number }) => void): void;
}

export interface ChromeSummarizerApi {
  availability(): Promise<string>;
  create(options: {
    type: SummarizerSettings['type'];
    length: SummarizerSettings['length'];
    format: SummarizerSettings['format'];
    preference: SummarizerSettings['preference'];
    monitor: (monitor: DownloadMonitor) => void;
    signal?: AbortSignal;
  }): Promise<LocalSummarizerSession>;
}

type ChromeAiGlobal = typeof globalThis & { Summarizer?: ChromeSummarizerApi };

export type ProvisioningUpdate = (event: ProvisionEvent) => void;

const AVAILABILITY_STATES: Record<Exclude<AvailabilityState, 'unknown'>, true> = {
  unavailable: true,
  downloadable: true,
  downloading: true,
  available: true,
};
let testApiOverride: ChromeSummarizerApi | null | undefined;

function now(): string {
  return new Date().toISOString();
}

function toAvailabilityState(value: string): AvailabilityState {
  return Object.hasOwn(AVAILABILITY_STATES, value)
    ? (value as Exclude<AvailabilityState, 'unknown'>)
    : 'unknown';
}

function event(
  kind: ProvisionEvent['kind'],
  detail: string,
  progress: number | null = null,
): ProvisionEvent {
  return { at: now(), kind, detail, progress };
}

export function setSummarizerApiForTesting(api: ChromeSummarizerApi | null | undefined): void {
  testApiOverride = api;
}

export function getSummarizerApi(): ChromeSummarizerApi | null {
  if (testApiOverride !== undefined) {
    return testApiOverride;
  }
  return (globalThis as ChromeAiGlobal).Summarizer ?? null;
}

export async function checkCapability(): Promise<CapabilityDiagnostic> {
  const api = getSummarizerApi();
  const checkedAt = now();
  const browserUserAgent = navigator.userAgent;

  if (!api) {
    return {
      apiPresent: false,
      availability: 'unavailable',
      browserUserAgent,
      checkedAt,
      sessionOutcome: 'not-attempted',
      events: [event('availability', 'Chrome Summarizer API is not exposed in this context.')],
      error: null,
    };
  }

  try {
    const availability = toAvailabilityState(await api.availability());
    return {
      apiPresent: true,
      availability,
      browserUserAgent,
      checkedAt,
      sessionOutcome: 'not-attempted',
      events: [event('availability', `Chrome reported ${availability}.`)],
      error: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      apiPresent: true,
      availability: 'unknown',
      browserUserAgent,
      checkedAt,
      sessionOutcome: 'failed',
      events: [event('error', message)],
      error: message,
    };
  }
}

export async function createLocalSession(
  settings: SummarizerSettings,
  onUpdate: ProvisioningUpdate,
  signal?: AbortSignal,
): Promise<LocalSummarizerSession> {
  const api = getSummarizerApi();
  if (!api) {
    throw new Error('Chrome Summarizer API is unavailable.');
  }

  const options: Parameters<ChromeSummarizerApi['create']>[0] = {
    ...settings,
    monitor(monitor) {
      monitor.addEventListener('downloadprogress', ({ loaded }) => {
        onUpdate(event('download-progress', 'Downloading local summarization model.', loaded));
      });
    },
  };
  if (signal) {
    options.signal = signal;
  }

  try {
    const session = await api.create(options);
    onUpdate(event('session-created', 'Created local summarization session.'));
    return session;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (signal?.aborted) {
      onUpdate(event('cancelled', 'Local model provisioning was cancelled.'));
    } else {
      onUpdate(event('error', message));
    }
    throw error;
  }
}

export async function summarizeChunk(
  session: LocalSummarizerSession,
  inputBlockIds: readonly string[],
  input: string,
): Promise<SummaryStage> {
  try {
    const output = await session.summarize(input, {
      context: 'Summarize only the supplied prose. Do not add links, code, citations, or unsupported claims.',
    });
    return { inputBlockIds, output, status: 'completed', error: null };
  } catch (error) {
    return {
      inputBlockIds,
      output: '',
      status: 'failed',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
