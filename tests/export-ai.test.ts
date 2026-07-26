import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  checkLocalAiCapability,
  chunkSummarizableBlocks,
  createLanguageDetector,
  createSummarizer,
  detectEligibleLanguage,
  summarizeBlocks,
  type BuiltInAiApi,
  type LanguageDetectorSession,
  type SummarizerSession,
} from '../src/export-ai';
import type { DetailPolicy, MarkdownBlock } from '../src/export-domain';

const previousUserActivation = Object.getOwnPropertyDescriptor(globalThis.navigator, 'userActivation');
const mutableNavigator: { userActivation?: UserActivation } = globalThis.navigator;

beforeAll(() => {
  Object.defineProperty(globalThis.navigator, 'userActivation', {
    configurable: true,
    value: { isActive: true },
  });
});

afterAll(() => {
  if (previousUserActivation) {
    Object.defineProperty(globalThis.navigator, 'userActivation', previousUserActivation);
  } else {
    delete mutableNavigator.userActivation;
  }
});

const policy: DetailPolicy = {
  version: 1,
  detail: 2,
  retainRatio: 0.5,
  extractiveSentenceRatio: 0.5,
  summaryEnabled: true,
  summaryLength: 'short',
  summaryType: 'tldr',
  description: 'test policy',
};

function block(id: string, markdown: string): MarkdownBlock {
  return { id, markdown, kind: 'summarizable', sourceOrder: Number(id.replace(/\D/g, '')) || 0 };
}

function detectorSession(results: readonly { detectedLanguage: string; confidence: number }[]): LanguageDetectorSession {
  return { detect: vi.fn(async () => results) };
}

function summarizerSession(result = '- summary'): SummarizerSession {
  return { summarize: vi.fn(async () => result) };
}

describe('local AI capability and adapter contracts', () => {
  it('reports absent APIs as unavailable', async () => {
    await expect(checkLocalAiCapability({})).resolves.toEqual({
      detector: 'unavailable',
      summarizer: 'unavailable',
    });
  });

  it('reports available fake detector and summarizer APIs', async () => {
    const api: BuiltInAiApi = {
      LanguageDetector: {
        availability: vi.fn(async () => 'available' as const),
        create: vi.fn(async () => detectorSession([])),
      },
      Summarizer: {
        availability: vi.fn(async () => 'available' as const),
        create: vi.fn(async () => summarizerSession()),
      },
    };

    await expect(checkLocalAiCapability(api)).resolves.toEqual({
      detector: 'available',
      summarizer: 'available',
    });
  });

  it('converts rejected availability checks into failed capability states', async () => {
    const api: BuiltInAiApi = {
      LanguageDetector: {
        availability: vi.fn(async () => { throw new Error('detector unavailable'); }),
        create: vi.fn(async () => detectorSession([])),
      },
      Summarizer: {
        availability: vi.fn(async () => { throw 'summarizer unavailable'; }),
        create: vi.fn(async () => summarizerSession()),
      },
    };

    await expect(checkLocalAiCapability(api)).resolves.toEqual({
      detector: 'failed',
      summarizer: 'failed',
      detectorError: 'detector unavailable',
      summarizerError: 'Capability check failed.',
    });
  });

  it('creates controlled detector and summarizer sessions without a browser model', async () => {
    const detector = detectorSession([]);
    const summarizer = summarizerSession();
    const detectorCreate = vi.fn(async () => detector);
    const summarizerCreate = vi.fn(async () => summarizer);
    const api: BuiltInAiApi = {
      LanguageDetector: {
        availability: vi.fn(async () => 'available' as const),
        create: detectorCreate,
      },
      Summarizer: {
        availability: vi.fn(async () => 'available' as const),
        create: summarizerCreate,
      },
    };
    const signal = new AbortController().signal;
    const language = { origin: 'detected' as const, primaryLanguage: 'en', confidence: 0.99, alternatives: [{ language: 'en', confidence: 0.99 }], supported: true };

    await expect(createLanguageDetector({ api, signal })).resolves.toBe(detector);
    await expect(createSummarizer(policy, language, { api, signal })).resolves.toBe(summarizer);
    expect(detectorCreate).toHaveBeenCalledWith(expect.objectContaining({ signal, monitor: expect.any(Function) }));
    expect(summarizerCreate).toHaveBeenCalledWith(expect.objectContaining({
      type: 'tldr',
      length: 'short',
      format: 'markdown',
      preference: 'capability',
      expectedInputLanguages: ['en'],
      expectedContextLanguages: ['en'],
      outputLanguage: 'en',
      signal,
      monitor: expect.any(Function),
    }));
  });
});

describe('local language detection', () => {
  it('accepts a supported language from the detector', async () => {
    const state = await detectEligibleLanguage('A calm interface helps people act.', undefined, detectorSession([
      { detectedLanguage: 'EN', confidence: 0.98 },
    ]));

    expect(state).toEqual({
      origin: 'detected',
      primaryLanguage: 'en',
      confidence: 0.98,
      alternatives: [{ language: 'en', confidence: 0.98 }],
      supported: true,
    });
  });

  it('warns when the detected language is unsupported', async () => {
    const state = await detectEligibleLanguage('これは日本語ではないテストです。', undefined, detectorSession([
      { detectedLanguage: 'zh', confidence: 0.99 },
    ]));

    expect(state).toMatchObject({
      origin: 'detected',
      primaryLanguage: 'zh',
      supported: false,
      warning: 'Chrome local summaries do not support zh yet.',
    });
  });

  it('warns and disables summaries for ambiguous or mixed detection', async () => {
    const state = await detectEligibleLanguage('A mixed language passage.', 'en-US', detectorSession([
      { detectedLanguage: 'en', confidence: 0.84 },
      { detectedLanguage: 'es', confidence: 0.73 },
    ]));

    expect(state).toMatchObject({
      origin: 'mixed',
      declaredLanguage: 'en-US',
      primaryLanguage: 'en',
      confidence: 0.84,
      supported: false,
      warning: 'Language is mixed or uncertain; automatic local summaries are disabled.',
    });
  });
});

describe('local summary chunking and sessions', () => {
  it('creates chunks only at markdown block boundaries', () => {
    const blocks = [block('block-1', '12345'), block('block-2', '67890'), block('block-3', 'x')];

    expect(chunkSummarizableBlocks(blocks, 10).map((chunk) => chunk.map(({ id }) => id))).toEqual([
      ['block-1', 'block-2'],
      ['block-3'],
    ]);
  });

  it('reduces multiple chunk summaries into one summary of summaries', async () => {
    const calls: string[] = [];
    const session: SummarizerSession = {
      summarize: vi.fn(async (text: string) => {
        calls.push(text);
        return `summary-${calls.length}`;
      }),
    };
    const blocks = [block('block-1', 'a'.repeat(3000)), block('block-2', 'b'.repeat(3000)), block('block-3', 'c'.repeat(3000))];

    const result = await summarizeBlocks(session, blocks);

    expect(result).toEqual({
      summaries: [{ block: blocks[2], markdown: 'summary-4' }],
      chunkCount: 3,
      reductionStages: 1,
    });
    expect(calls).toHaveLength(4);
    expect(calls[0]!).toBe(blocks[0]!.markdown);
    expect(calls[1]!).toBe(blocks[1]!.markdown);
    expect(calls[2]!).toBe(blocks[2]!.markdown);
    expect(calls[3]!).toBe('summary-1\n\nsummary-2\n\nsummary-3');
  });

  it('rejects a block that exceeds local summary capacity', () => {
    expect(() => chunkSummarizableBlocks([block('oversized', 'x'.repeat(5001))])).toThrow('Block oversized exceeds local summary capacity.');
  });

  it('propagates a session failure so deterministic fallback remains available to the caller', async () => {
    const deterministicFallback = '# Deterministic export';
    const session: SummarizerSession = {
      summarize: vi.fn(async () => { throw new Error('local model failed'); }),
    };
    let output = deterministicFallback;

    try {
      const result = await summarizeBlocks(session, [block('block-1', 'source')]);
      output = result.summaries[0]?.markdown ?? deterministicFallback;
    } catch (error) {
      expect(error).toEqual(new Error('local model failed'));
    }

    expect(output).toBe(deterministicFallback);
  });
});
