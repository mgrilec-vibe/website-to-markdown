import { describe, expect, it } from 'vitest';
import {
  FixtureManifestValidationError,
  admitCandidateFixture,
  resolveFixture,
  validateCandidateAdmission,
  validateFixtureManifest,
} from '../src/evaluation/dataset';
import type { EvaluationFixtureManifest } from '../src/evaluation/domain';

function manifest(overrides: Partial<EvaluationFixtureManifest> = {}): EvaluationFixtureManifest {
  return {
    schemaVersion: 1,
    id: 'fixture-one',
    category: 'api-reference',
    tags: ['javascript', 'reference'],
    publisherDomain: 'docs.example.test',
    markupPlatform: 'custom-docs',
    expectedFocus: 'article',
    provenance: {
      originUrl: 'https://docs.example.test/reference',
      finalUrl: 'https://docs.example.test/reference',
      capturedAt: '2026-07-29T00:00:00.000Z',
      documentSha256: 'document-hash',
      screenshotSha256: 'screenshot-hash',
      profile: {
        viewport: { width: 1280, height: 900 },
        readyState: 'load',
        stabilityMs: 250,
        navigationTimeoutMs: 10_000,
        maxRedirects: 3,
        maxResponseBytes: 2_000_000,
      },
    },
    focusEvidence: {
      pageTitle: 'Reference',
      readabilityTitle: 'Reference',
      selectedHeading: 'Fetch',
    },
    limitations: [],
    sourceReview: {
      reviewedAt: '2026-07-29T01:00:00.000Z',
      reviewer: 'reviewer@example.test',
      sourceUseApproved: true,
    },
    ...overrides,
  };
}

describe('evaluation fixture dataset', () => {
  it('resolves an exact ID, category, and tag without changing the manifest list', () => {
    const second = manifest({ id: 'fixture-two', category: 'technical-blog', tags: ['systems'], publisherDomain: 'blog.example.test', markupPlatform: 'blog-engine' });
    const fixtures = [manifest(), second] as const;
    const before = JSON.stringify(fixtures);

    expect(resolveFixture(fixtures, 'fixture-two')).toBe(second);
    expect(resolveFixture(fixtures, { category: 'technical-blog' })).toBe(second);
    expect(resolveFixture(fixtures, 'technical-blog')).toBe(second);
    expect(resolveFixture(fixtures, 'systems')).toBe(second);
    expect(resolveFixture(fixtures, { tag: 'systems' })).toBe(second);
    expect(JSON.stringify(fixtures)).toBe(before);
  });

  it('reports deterministic unknown and ambiguous query errors', () => {
    const fixtures = [manifest(), manifest({ id: 'fixture-two', publisherDomain: 'other.example.test', markupPlatform: 'other-engine' })];
    expect(() => resolveFixture(fixtures, { tag: 'missing' })).toThrow('Unknown fixture query {"tag":"missing"}.');

    const shared = fixtures.map((fixture) => ({ ...fixture, tags: ['shared'] }));
    expect(() => resolveFixture(shared, { tag: 'shared' })).toThrow('Ambiguous fixture query {"tag":"shared"}; candidates: fixture-one, fixture-two.');
  });

  it('rejects incomplete manifests and unapproved source use', () => {
    const incomplete = { ...manifest(), provenance: undefined, focusEvidence: { pageTitle: '' } };
    expect(validateFixtureManifest(incomplete)).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: 'provenance' }),
      expect.objectContaining({ path: 'focusEvidence.pageTitle' }),
    ]));

    const unapproved = manifest({ sourceReview: { ...manifest().sourceReview, sourceUseApproved: false } });
    expect(() => admitCandidateFixture(unapproved, [])).toThrow(FixtureManifestValidationError);
    expect(validateCandidateAdmission(unapproved, [])).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'source-review-required' }),
    ]));
  });

  it('rejects duplicate IDs, publisher domains, and markup platforms unless behavior is documented', () => {
    const approved = manifest();
    const duplicate = manifest({ id: approved.id });
    expect(validateCandidateAdmission(duplicate, [approved])).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'duplicate-id' }),
      expect.objectContaining({ code: 'duplicate-publisher-domain' }),
      expect.objectContaining({ code: 'duplicate-markup-platform' }),
    ]));

    const documented = validateCandidateAdmission(duplicate, [approved], {
      newConversionBehavior: 'Tests a client-rendered API table absent from the approved fixture.',
    });
    expect(documented).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'duplicate-id' }),
    ]));
    expect(documented).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'duplicate-publisher-domain' }),
    ]));
  });
});
