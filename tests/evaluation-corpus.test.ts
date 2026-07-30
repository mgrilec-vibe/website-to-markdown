import { describe, expect, it } from 'vitest';
import { evaluateApprovedFixture } from '../src/evaluation/evaluate';
import {
  DEFAULT_EVALUATION_FIXTURE_ROOT,
  loadEvaluationFixture,
  loadEvaluationFixtureManifests,
} from '../src/evaluation/fixture-loader';

describe('approved website conversion corpus', () => {
  it('converts every approved fixture in both modes with its reviewed goldens and limitations', async () => {
    const manifests = await loadEvaluationFixtureManifests(DEFAULT_EVALUATION_FIXTURE_ROOT);
    const categories = manifests.map((manifest) => manifest.category).sort();

    expect(manifests).toHaveLength(10);
    expect(new Set(categories)).toHaveLength(10);
    expect(new Set(manifests.map((manifest) => manifest.publisherDomain))).toHaveLength(10);
    expect(new Set(manifests.map((manifest) => manifest.markupPlatform))).toHaveLength(10);

    for (const manifest of manifests) {
      const fixture = await loadEvaluationFixture(DEFAULT_EVALUATION_FIXTURE_ROOT, { id: manifest.id });
      const report = await evaluateApprovedFixture(fixture);
      for (const mode of ['complete', 'focused'] as const) {
        expect(report.results[mode].goldenCheck).toBe('pass');
        expect(report.results[mode].structuralChecks.every((check) => check.passed)).toBe(true);
        expect(report.results[mode].outputSha256).toMatch(/^[a-f0-9]{64}$/u);
        expect(report.results[mode].outputBytes).toBeGreaterThanOrEqual(1);
      }
    }
  }, 60_000);
});
