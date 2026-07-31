import {
  checkLocalAiCapability,
  createLanguageDetector,
  createSummarizer,
} from '../export-ai';
import { detailPolicy } from '../export-compression';
import type { CapabilityState, LanguageState, ModelAvailability } from '../export-domain';

export interface BenchmarkProvisioningEvent {
  readonly component: 'detector' | 'summarizer';
  readonly state: ModelAvailability;
  readonly progress?: number;
  readonly error?: string;
}

export interface BenchmarkProvisioningResult {
  readonly before: CapabilityState;
  readonly after: CapabilityState;
  readonly events: readonly BenchmarkProvisioningEvent[];
}

export interface BenchmarkProvisioningAdapter {
  readonly checkCapability: () => Promise<CapabilityState>;
  readonly createLanguageDetector: typeof createLanguageDetector;
  readonly createSummarizer: typeof createSummarizer;
}

const browserProvisioningAdapter: BenchmarkProvisioningAdapter = {
  checkCapability: checkLocalAiCapability,
  createLanguageDetector,
  createSummarizer,
};

const ENGLISH_LANGUAGE: LanguageState = {
  origin: 'declared',
  declaredLanguage: 'en',
  primaryLanguage: 'en',
  confidence: 1,
  alternatives: [{ language: 'en', confidence: 1 }],
  supported: true,
};

function errorState(error: unknown, signal?: AbortSignal): { state: 'cancelled' | 'failed'; error: string } {
  if (signal?.aborted || (error instanceof DOMException && error.name === 'AbortError')) {
    return { state: 'cancelled', error: 'Local model provisioning was cancelled.' };
  }
  return { state: 'failed', error: error instanceof Error ? error.message : 'Local model provisioning failed.' };
}

function canProvision(state: ModelAvailability): boolean {
  return state === 'downloadable' || state === 'downloading';
}

/**
 * Provision only downloadable Chrome local models. The caller must invoke this
 * from an explicit extension-page user action so Chrome can honour activation.
 */
export async function provisionBenchmarkLocalAi(
  onEvent: (event: BenchmarkProvisioningEvent) => void,
  signal?: AbortSignal,
  adapter: BenchmarkProvisioningAdapter = browserProvisioningAdapter,
): Promise<BenchmarkProvisioningResult> {
  const events: BenchmarkProvisioningEvent[] = [];
  const record = (event: BenchmarkProvisioningEvent): void => {
    events.push(event);
    onEvent(event);
  };
  const before = await adapter.checkCapability();

  if (canProvision(before.detector)) {
    record({ component: 'detector', state: 'downloading' });
    try {
      await adapter.createLanguageDetector({
        onProgress: (progress) => record({ component: 'detector', state: 'downloading', progress }),
        ...(signal ? { signal } : {}),
      });
      record({ component: 'detector', state: 'available' });
    } catch (error) {
      const outcome = errorState(error, signal);
      record({ component: 'detector', ...outcome });
    }
  } else {
    record({ component: 'detector', state: before.detector, ...(before.detectorError ? { error: before.detectorError } : {}) });
  }

  if (canProvision(before.summarizer)) {
    record({ component: 'summarizer', state: 'downloading' });
    try {
      const session = await adapter.createSummarizer(detailPolicy(40), ENGLISH_LANGUAGE, {
        onProgress: (progress) => record({ component: 'summarizer', state: 'downloading', progress }),
        ...(signal ? { signal } : {}),
      });
      session.destroy?.();
      record({ component: 'summarizer', state: 'available' });
    } catch (error) {
      const outcome = errorState(error, signal);
      record({ component: 'summarizer', ...outcome });
    }
  } else {
    record({ component: 'summarizer', state: before.summarizer, ...(before.summarizerError ? { error: before.summarizerError } : {}) });
  }

  return { before, after: await adapter.checkCapability(), events };
}
