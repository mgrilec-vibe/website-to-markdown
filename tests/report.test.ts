import { describe, expect, it } from 'vitest';

import { REPORT_SCHEMA_VERSION, SUITE_VERSION, type AssessmentReport } from '../src/domain';
import { POLICIES } from '../src/policies';
import {
  createAssessmentReport,
  createReportBlob,
  serializeAssessmentReport,
} from '../src/report';

function reportInput(): Omit<AssessmentReport, 'schemaVersion' | 'suiteVersion' | 'startedAt' | 'generatedAt'> {
  return {
    capability: {
      apiPresent: true,
      availability: 'available',
      browserUserAgent: 'test-browser',
      checkedAt: '2026-07-25T00:00:00.000Z',
      sessionOutcome: 'created',
      events: [
        {
          at: '2026-07-25T00:00:01.000Z',
          kind: 'session-created',
          detail: 'Session created for fixture assessment.',
          progress: null,
        },
      ],
      error: null,
    },
    policies: POLICIES,
    results: [
      {
        fixtureId: 'fixture-article',
        profileId: 'compact',
        deterministic: {
          mode: 'deterministic',
          fixtureId: 'fixture-article',
          profileId: 'compact',
          output: '# Article\n\nPreserved source.',
          removedBlockIds: ['chrome-nav'],
          summaryInputBlockIds: ['prose'],
          summaryStages: [],
          structuralChecks: [
            { name: 'protected-content', passed: true, detail: 'Protected blocks survived.' },
          ],
          metrics: { words: 3, bytes: 31, durationMs: 1 },
          error: null,
        },
        localAi: {
          mode: 'local-ai',
          fixtureId: 'fixture-article',
          profileId: 'compact',
          output: '# Article\n\n[Generated summary]\nKey article point.',
          removedBlockIds: ['chrome-nav'],
          summaryInputBlockIds: ['prose'],
          summaryStages: [
            {
              inputBlockIds: ['prose'],
              output: 'Key article point.',
              status: 'completed',
              error: null,
            },
          ],
          structuralChecks: [
            { name: 'generated-boundary', passed: true, detail: 'Summary boundary is visible.' },
          ],
          metrics: { words: 6, bytes: 52, durationMs: 8 },
          error: null,
        },
        reviewer: {
          centralClaimPreserved: true,
          materialOmissionFound: false,
          protectedStructuresSurvived: true,
          relativeUsefulness: 'better',
          notes: 'The generated output is easier to scan.',
        },
      },
    ],
  };
}

describe('assessment report export', () => {
  it('constructs and serializes generated outputs, diagnostics, and reviewer input', () => {
    const report = createAssessmentReport(reportInput(), () => '2026-07-25T00:00:00.000Z');
    const parsed: AssessmentReport = JSON.parse(serializeAssessmentReport(report)) as AssessmentReport;

    expect(parsed.schemaVersion).toBe(REPORT_SCHEMA_VERSION);
    expect(parsed.suiteVersion).toBe(SUITE_VERSION);
    expect(parsed.capability.availability).toBe('available');
    expect(parsed.policies).toEqual(POLICIES);
    expect(parsed.results[0]?.localAi?.output).toContain('Generated summary');
    expect(parsed.results[0]?.reviewer).toEqual({
      centralClaimPreserved: true,
      materialOmissionFound: false,
      protectedStructuresSurvived: true,
      relativeUsefulness: 'better',
      notes: 'The generated output is easier to scan.',
    });
  });

  it('preserves a caller-provided schema version and produces a JSON Blob without network APIs', async () => {
    const report = createAssessmentReport({ ...reportInput(), schemaVersion: 42 });
    const blob = createReportBlob(report, false);

    expect(report.schemaVersion).toBe(42);
    expect(blob.type).toBe('application/json');
    expect(JSON.parse(await blob.text()).schemaVersion).toBe(42);
  });
});
