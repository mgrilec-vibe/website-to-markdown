import { describe, expect, it } from 'vitest';
import type { CapabilityState } from '../src/export-domain';
import {
  provisionBenchmarkLocalAi,
  type BenchmarkProvisioningAdapter,
  type BenchmarkProvisioningEvent,
} from '../src/benchmark/provisioning';

const downloadable: CapabilityState = { detector: 'downloadable', summarizer: 'downloadable' };
const available: CapabilityState = { detector: 'available', summarizer: 'available' };

describe('benchmark local-AI provisioning', () => {
  it('records explicit provision progress and refreshed availability', async () => {
    let checks = 0;
    const events: BenchmarkProvisioningEvent[] = [];
    const adapter: BenchmarkProvisioningAdapter = {
      checkCapability: async () => checks++ === 0 ? downloadable : available,
      createLanguageDetector: async (options) => {
        options?.onProgress?.(0.5);
        return { detect: async () => [] };
      },
      createSummarizer: async (_policy, _language, options) => {
        options?.onProgress?.(1);
        return {
          inputQuota: 5_000,
          measureInputUsage: async (text: string) => text.length,
          summarize: async () => '',
          destroy: () => undefined,
        };
      },
    };

    const result = await provisionBenchmarkLocalAi((event) => events.push(event), undefined, adapter);

    expect(result.before).toEqual(downloadable);
    expect(result.after).toEqual(available);
    expect(events).toContainEqual({ component: 'detector', state: 'downloading', progress: 0.5 });
    expect(events).toContainEqual({ component: 'summarizer', state: 'downloading', progress: 1 });
    expect(events).toContainEqual({ component: 'detector', state: 'available' });
    expect(events).toContainEqual({ component: 'summarizer', state: 'available' });
  });

  it('records unavailable capabilities without attempting model creation', async () => {
    const unavailable: CapabilityState = { detector: 'unavailable', summarizer: 'unavailable' };
    const adapter: BenchmarkProvisioningAdapter = {
      checkCapability: async () => unavailable,
      createLanguageDetector: async () => { throw new Error('must not create detector'); },
      createSummarizer: async () => { throw new Error('must not create summarizer'); },
    };

    const result = await provisionBenchmarkLocalAi(() => undefined, undefined, adapter);

    expect(result.events).toEqual([
      { component: 'detector', state: 'unavailable' },
      { component: 'summarizer', state: 'unavailable' },
    ]);
  });
});
