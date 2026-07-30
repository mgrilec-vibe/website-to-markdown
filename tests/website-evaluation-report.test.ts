import { describe, expect, it } from 'vitest';
import {
  checkExpectedMarkdown,
  checkStructuralChecks,
  createWebsiteEvaluationReport,
  serializeWebsiteEvaluationReport,
} from '../src/evaluation/report';
import type { EvaluationModeResultInput } from '../src/evaluation/report';
import { WEBSITE_EVALUATION_SCHEMA_VERSION } from '../src/evaluation/domain';
import type { CaptureProvenance } from '../src/evaluation/domain';

const provenance: CaptureProvenance = {
  originUrl: 'https://example.test/docs',
  finalUrl: 'https://example.test/docs',
  capturedAt: '2026-07-29T00:00:00.000Z',
  documentSha256: 'document-hash',
  screenshotSha256: 'screenshot-hash',
  profile: {
    viewport: { width: 1280, height: 900 },
    readyState: 'load',
    stabilityMs: 100,
    navigationTimeoutMs: 5_000,
    maxRedirects: 3,
    maxResponseBytes: 1_000_000,
  },
};

function modeInputs(): {
  complete: EvaluationModeResultInput;
  focused: EvaluationModeResultInput;
} {
  return {
    complete: {
      mode: 'complete',
      markdown: '# Hello\n',
      limitations: ['Images omitted'],
      structuralChecks: [{ name: 'headings', passed: true, detail: 'Heading retained.' }],
      expectedMarkdown: '# Hello\n',
    },
    focused: {
      mode: 'focused',
      markdown: '# Fokus\n',
      limitations: [],
      structuralChecks: [{ name: 'content', passed: true, detail: 'Primary content retained.' }],
      expectedMarkdown: '# Expected\n',
    },
  };
}

describe('website evaluation reports', () => {
  it('constructs both modes with stable UTF-8 metrics and fixture golden checks', async () => {
    const report = await createWebsiteEvaluationReport({
      target: { kind: 'approved-fixture', fixtureId: 'fixture-1' },
      fixtureId: 'fixture-1',
      provenance,
      generatedAt: '2026-07-29T01:00:00.000Z',
      results: modeInputs(),
    });

    expect(report.schemaVersion).toBe(WEBSITE_EVALUATION_SCHEMA_VERSION);
    expect(Object.keys(report.results)).toEqual(['complete', 'focused']);
    expect(report.results.complete).toMatchObject({
      mode: 'complete',
      outputBytes: 8,
      outputSha256: '90f8ec5669cd34183b9b0fdf8b94f5efb4c3672876330f4aa76088c2b4ad17be',
      goldenCheck: 'pass',
    });
    expect(report.results.focused).toMatchObject({
      mode: 'focused',
      outputBytes: 8,
      outputSha256: 'e2620d2eb14c6cdee6f8e47afe508c90e93414ab786aedcd502232b718391e62',
      goldenCheck: 'fail',
    });
    expect(checkExpectedMarkdown('# Hello\n', '# Hello\n')).toBe('pass');
    expect(checkExpectedMarkdown('# Hello\n', '# hello\n')).toBe('fail');
    expect(checkStructuralChecks(report.results.complete.structuralChecks)).toBe(true);
  });

  it('clones caller-owned arrays and nested objects before returning the report', async () => {
    const inputs = modeInputs();
    const target = { kind: 'approved-fixture' as const, fixtureId: 'fixture-1' };
    const sourceProvenance = structuredClone(provenance);
    const report = await createWebsiteEvaluationReport({
      target,
      provenance: sourceProvenance,
      results: inputs,
    });

    const mutableLimitations = inputs.complete.limitations as unknown as string[];
    mutableLimitations.push('Caller mutation');
    const mutableChecks = inputs.complete.structuralChecks as unknown as Array<{ passed: boolean }>;
    mutableChecks[0]!.passed = false;
    target.fixtureId = 'changed';
    const mutableViewport = sourceProvenance.profile.viewport as unknown as { width: number };
    mutableViewport.width = 1;

    expect(report.results.complete.limitations).toEqual(['Images omitted']);
    expect(report.results.complete.structuralChecks).toEqual([
      { name: 'headings', passed: true, detail: 'Heading retained.' },
    ]);
    expect(report.target.fixtureId).toBe('fixture-1');
    expect(report.provenance.profile.viewport.width).toBe(1280);
  });

  it('requires complete and focused results', async () => {
    const { complete } = modeInputs();
    await expect(createWebsiteEvaluationReport({
      target: { kind: 'candidate-capture', url: 'https://example.test/docs' },
      provenance,
      results: { complete },
    })).rejects.toThrow('both complete and focused');
  });

  it('serializes deterministically as JSON', async () => {
    const report = await createWebsiteEvaluationReport({
      target: { kind: 'approved-fixture', fixtureId: 'fixture-1' },
      provenance,
      generatedAt: '2026-07-29T01:00:00.000Z',
      results: modeInputs(),
    });

    expect(JSON.parse(serializeWebsiteEvaluationReport(report, false))).toEqual(report);
    expect(serializeWebsiteEvaluationReport(report, false)).toBe(JSON.stringify(report));
  });
});
