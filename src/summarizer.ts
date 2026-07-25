import type {
  AvailabilityState,
  CapabilityDiagnostic,
  ProvisionEvent,
  ProvisionEventKind,
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

export type SummarizerLanguageOptions = Pick<
  SummarizerSettings,
  'expectedInputLanguages' | 'expectedContextLanguages' | 'outputLanguage'
>;

export interface ChromeSummarizerApi {
  availability(options: SummarizerLanguageOptions): Promise<string>;
  create(options: SummarizerSettings & {
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
const diagnosticStartedAtMs = performance.now();
let provisionEventSequence = 0;
let testApiOverride: ChromeSummarizerApi | null | undefined;

function now(): string {
  return new Date().toISOString();
}

function toAvailabilityState(value: string): AvailabilityState {
  return Object.hasOwn(AVAILABILITY_STATES, value)
    ? (value as Exclude<AvailabilityState, 'unknown'>)
    : 'unknown';
}

export function createProvisionEvent(
  kind: ProvisionEventKind,
  detail: string,
  progress: number | null = null,
  context: ProvisionEvent['context'] = {},
): ProvisionEvent {
  provisionEventSequence += 1;
  const diagnostic = {
    id: `provision-${provisionEventSequence}`,
    at: now(),
    elapsedMs: Math.round(performance.now() - diagnosticStartedAtMs),
    kind,
    detail,
    progress,
    context,
  };
  console.info('[Chrome Local AI Assessment] provisioning event', diagnostic);
  return diagnostic;
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

export async function checkCapability(settings: SummarizerLanguageOptions): Promise<CapabilityDiagnostic> {
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
      events: [createProvisionEvent('availability', 'Chrome Summarizer API is not exposed in this context.', null, {
        expectedInputLanguages: settings.expectedInputLanguages.join(','),
        expectedContextLanguages: settings.expectedContextLanguages.join(','),
        outputLanguage: settings.outputLanguage,
      })],
      error: null,
    };
  }

  try {
    const availability = toAvailabilityState(await api.availability({
      expectedInputLanguages: settings.expectedInputLanguages,
      expectedContextLanguages: settings.expectedContextLanguages,
      outputLanguage: settings.outputLanguage,
    }));
    return {
      apiPresent: true,
      availability,
      browserUserAgent,
      checkedAt,
      sessionOutcome: 'not-attempted',
      events: [createProvisionEvent('availability', `Chrome reported ${availability}.`, null, {
        expectedInputLanguages: settings.expectedInputLanguages.join(','),
        expectedContextLanguages: settings.expectedContextLanguages.join(','),
        outputLanguage: settings.outputLanguage,
      })],
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
      events: [createProvisionEvent('error', message, null, {
        phase: 'availability',
        errorName: error instanceof Error ? error.name : 'non-error',
      })],
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

  const hasUserActivation = typeof navigator !== 'undefined' && 'userActivation' in navigator
    ? navigator.userActivation.isActive
    : false;
  const visibilityState = typeof document === 'undefined' ? 'unavailable' : document.visibilityState;
  const startedAtMs = performance.now();
  let monitorCount = 0;
  const options: Parameters<ChromeSummarizerApi['create']>[0] = {
    ...settings,
    monitor(monitor) {
      monitorCount += 1;
      onUpdate(createProvisionEvent('monitor-attached', 'Chrome attached a local-model download monitor.', null, {
        monitorCount,
      }));
      monitor.addEventListener('downloadprogress', ({ loaded }) => {
        const normalizedProgress = Number.isFinite(loaded) ? Math.min(Math.max(loaded, 0), 1) : null;
        onUpdate(createProvisionEvent(
          'download-progress',
          `Chrome download progress event: raw loaded=${loaded}; normalized=${normalizedProgress ?? 'invalid'}.`,
          normalizedProgress,
          {
            rawLoaded: loaded,
            normalizedProgress,
            monitorCount,
          },
        ));
      });
      onUpdate(createProvisionEvent('monitor-listener-registered', 'Registered the Chrome download-progress listener.', null, {
        monitorCount,
      }));
    },
  };
  if (signal) {
    options.signal = signal;
  }

  onUpdate(createProvisionEvent('session-create-start', 'Calling Chrome Summarizer.create().', null, {
    type: settings.type,
    length: settings.length,
    format: settings.format,
    preference: settings.preference,
    expectedInputLanguages: settings.expectedInputLanguages.join(','),
    expectedContextLanguages: settings.expectedContextLanguages.join(','),
    outputLanguage: settings.outputLanguage,
    hasUserActivation,
    visibilityState,
  }));

  try {
    const session = await api.create(options);
    onUpdate(createProvisionEvent('session-created', 'Chrome Summarizer.create() resolved.', null, {
      createDurationMs: Math.round(performance.now() - startedAtMs),
      monitorCount,
    }));
    return session;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (signal?.aborted) {
      onUpdate(createProvisionEvent('cancelled', 'Local model provisioning was cancelled.', null, {
        createDurationMs: Math.round(performance.now() - startedAtMs),
        monitorCount,
      }));
    } else {
      onUpdate(createProvisionEvent('error', message, null, {
        phase: 'session-create',
        errorName: error instanceof Error ? error.name : 'non-error',
        createDurationMs: Math.round(performance.now() - startedAtMs),
        monitorCount,
      }));
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
