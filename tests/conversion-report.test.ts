import { describe, expect, it } from 'vitest';
import {
  CONVERSION_REPORT_SCHEMA_VERSION,
  CONVERSION_SUITE_VERSION,
  createConversionReport,
  createConversionReportBlob,
  downloadConversionReport,
  serializeConversionReport,
  sha256Hex,
} from '../src/conversion/report';

describe('conversion benchmark report', () => {
  it('defaults version metadata and counts fixture failures without mutating input', () => {
    const results = [{
      fixtureId: 'export-page',
      mode: 'complete' as const,
      parseMs: 1,
      conversionMs: 2,
      classificationMs: 3,
      outputBytes: 4,
      outputSha256: 'output',
      goldenSha256: 'golden',
      blockCount: 5,
      limitations: ['Image omitted'],
      structuralCheck: 'pass' as const,
      goldenCheck: 'fail' as const,
      diffSummary: 'Markdown differs',
    }];
    const report = createConversionReport({
      environment: { nodeVersion: 'v24', parser: 'linkedom', turndownVersion: '7.2.4', readabilityVersion: '0.6.0' },
      results,
    }, () => '2026-07-28T00:00:00.000Z');

    results[0]!.limitations.push('late mutation');
    expect(report).toMatchObject({
      schemaVersion: CONVERSION_REPORT_SCHEMA_VERSION,
      suiteVersion: CONVERSION_SUITE_VERSION,
      startedAt: '2026-07-28T00:00:00.000Z',
      generatedAt: '2026-07-28T00:00:00.000Z',
      outcomes: { results: 1, failedStructuralChecks: 0, failedGoldenDiffs: 1 },
    });
    expect(report.results[0]!.limitations).toEqual(['Image omitted']);
    expect(JSON.parse(serializeConversionReport(report))).toEqual(report);
  });

  it('creates a local JSON Blob without requiring a document and computes stable hashes', async () => {
    const report = createConversionReport({
      environment: { parser: 'linkedom', turndownVersion: '7.2.4', readabilityVersion: '0.6.0' },
      results: [],
    }, () => '2026-07-28T00:00:00.000Z');

    const blob = createConversionReportBlob(report, false);
    expect(blob.type).toBe('application/json');
    expect(JSON.parse(await blob.text())).toEqual(report);
    expect(await downloadConversionReport(report, { pretty: false }).text()).toBe(JSON.stringify(report));
    expect(await sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
});
