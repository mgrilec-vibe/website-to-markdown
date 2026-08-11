import { describe, expect, it, vi } from 'vitest';
import {
  summarizeBlocks,
  validateSummaryGrounding,
  type SummarizerSession,
} from '../src/export-ai';
import { linkedomHtmlParser } from '../src/conversion/linkedom-parser';
import { createFinalExport, type BrowserSummaryAdapter } from '../src/export-workflow';
import type { CapturedPage, MarkdownBlock } from '../src/export-domain';

function block(id: string, markdown: string, sourceOrder: number): MarkdownBlock {
  return { id, markdown, sourceOrder, kind: 'summarizable' };
}

describe('source-grounded Browser summaries', () => {
  it('rejects unsupported numbers, links, and inline-code identifiers', () => {
    const source = 'Latency stays below 40 milliseconds. Use `fetch()` and see https://example.com/guide.';

    expect(validateSummaryGrounding('Latency stays below 41 milliseconds.', source)).toMatchObject({ supported: false });
    expect(validateSummaryGrounding('See https://example.com/other.', source)).toMatchObject({ supported: false });
    expect(validateSummaryGrounding('Call `axios()` for the request.', source)).toMatchObject({ supported: false });
    expect(validateSummaryGrounding('Use `fetch()` while latency stays below 40 milliseconds.', source)).toEqual({ supported: true });
  });

  it('keeps source evidence beside draft summaries during hierarchical reduction', async () => {
    const calls: string[] = [];
    const first = block('section-1', 'Alpha requests use rendezvous hashing to select a stable shard.', 1);
    const second = block('section-2', 'Beta retries stop after two attempts to avoid overload amplification.', 2);
    const session: SummarizerSession = {
      inputQuota: 120,
      measureInputUsage: vi.fn(async (text: string) => text.startsWith('## Draft summaries') ? 100 : text.length),
      summarize: vi.fn(async (text: string) => {
        calls.push(text);
        if (text === first.markdown) return first.markdown;
        if (text === second.markdown) return second.markdown;
        return 'Alpha requests use rendezvous hashing. Beta retries stop after two attempts.';
      }),
    };

    const result = await summarizeBlocks(session, [first, second], 'Use the supplied source as the only authority.');

    expect(result).toMatchObject({ chunkCount: 2, reductionStages: 1 });
    expect(calls.at(-1)).toContain('## Draft summaries');
    expect(calls.at(-1)).toContain('## Source evidence');
    expect(calls.at(-1)).toContain('rendezvous hashing');
    expect(calls.at(-1)).toContain('two attempts');
  });

  it('rejects an unsupported fact introduced during summary reduction', async () => {
    let call = 0;
    const session: SummarizerSession = {
      inputQuota: 50,
      measureInputUsage: vi.fn(async (text: string) => text.startsWith('## Draft summaries') ? 40 : text.length),
      summarize: vi.fn(async (_text: string) => {
        call += 1;
        if (call === 1) return 'The latency budget is 40 milliseconds.';
        if (call === 2) return 'Retries stop after two attempts.';
        return 'The latency budget is 41 milliseconds.';
      }),
    };

    await expect(summarizeBlocks(session, [
      block('latency', 'The latency budget is 40 milliseconds.', 1),
      block('retries', 'Retries stop after two attempts.', 2),
    ], 'Use the supplied source as the only authority.')).rejects.toThrow('unsupported numeric fact 41');
  });

  it('falls back to the deterministic extractor when Chrome returns an ungrounded final summary', async () => {
    const captured: CapturedPage = {
      metadata: {
        title: 'Reliability guide',
        sourceUrl: 'https://example.com/reliability',
        capturedAt: '2026-08-10T00:00:00.000Z',
        pageLanguage: 'en',
      },
      focusedHtml: '<html><body><article><h1>Reliability guide</h1><p>The service targets 99.9 percent monthly availability. Retries stop after two attempts.</p></article></body></html>',
      completeHtml: '<html><body><article><h1>Reliability guide</h1><p>The service targets 99.9 percent monthly availability. Retries stop after two attempts.</p></article></body></html>',
      limitations: [],
    };
    const adapter: BrowserSummaryAdapter = {
      htmlParser: linkedomHtmlParser,
      checkCapability: async () => ({ detector: 'available', summarizer: 'available' }),
      createLanguageDetector: async () => ({ detect: async () => [] }),
      detectEligibleLanguage: async () => ({ origin: 'detected', primaryLanguage: 'en', confidence: 1, alternatives: [], supported: true }),
      createSummarizer: async () => ({
        inputQuota: 10_000,
        measureInputUsage: async (text: string) => text.length,
        summarize: async () => 'The service guarantees 99.999 percent monthly availability.',
      }),
      summarizeBlocks,
    };

    const result = await createFinalExport(captured, 'focused', 40, 'browser', adapter);

    expect(result.result.metadata.summaryOrigin).toBe('deterministic-diverse-extractive');
    expect(result.browserFailure).toContain('unsupported numeric fact 99.999');
    expect(result.result.markdown).not.toContain('99.999');
  });
});
