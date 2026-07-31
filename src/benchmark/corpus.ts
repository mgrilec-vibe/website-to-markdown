import type { CapturedPage, ExportMode } from '../export-domain';
import { assertValidFixtureManifest } from '../evaluation/dataset';
import type { EvaluationFixtureManifest } from '../evaluation/domain';

import apiReferenceManifest from '../../tests/fixtures/evaluation/api-reference-mdn-fetch/manifest.json';
import apiReferenceCompleteHtml from '../../tests/fixtures/evaluation/api-reference-mdn-fetch/complete.html?raw';
import apiReferenceFocusedHtml from '../../tests/fixtures/evaluation/api-reference-mdn-fetch/focused.html?raw';
import apiReferenceCompleteMarkdown from '../../tests/fixtures/evaluation/api-reference-mdn-fetch/expected-complete.md?raw';
import apiReferenceFocusedMarkdown from '../../tests/fixtures/evaluation/api-reference-mdn-fetch/expected-focused.md?raw';
import boundaryManifest from '../../tests/fixtures/evaluation/boundary-threejs-webgl/manifest.json';
import boundaryCompleteHtml from '../../tests/fixtures/evaluation/boundary-threejs-webgl/complete.html?raw';
import boundaryFocusedHtml from '../../tests/fixtures/evaluation/boundary-threejs-webgl/focused.html?raw';
import boundaryCompleteMarkdown from '../../tests/fixtures/evaluation/boundary-threejs-webgl/expected-complete.md?raw';
import boundaryFocusedMarkdown from '../../tests/fixtures/evaluation/boundary-threejs-webgl/expected-focused.md?raw';
import developerGuideManifest from '../../tests/fixtures/evaluation/developer-guide-pypa-packaging/manifest.json';
import developerGuideCompleteHtml from '../../tests/fixtures/evaluation/developer-guide-pypa-packaging/complete.html?raw';
import developerGuideFocusedHtml from '../../tests/fixtures/evaluation/developer-guide-pypa-packaging/focused.html?raw';
import developerGuideCompleteMarkdown from '../../tests/fixtures/evaluation/developer-guide-pypa-packaging/expected-complete.md?raw';
import developerGuideFocusedMarkdown from '../../tests/fixtures/evaluation/developer-guide-pypa-packaging/expected-focused.md?raw';
import editorialManifest from '../../tests/fixtures/evaluation/editorial-the-conversation-ai-newsrooms/manifest.json';
import editorialCompleteHtml from '../../tests/fixtures/evaluation/editorial-the-conversation-ai-newsrooms/complete.html?raw';
import editorialFocusedHtml from '../../tests/fixtures/evaluation/editorial-the-conversation-ai-newsrooms/focused.html?raw';
import editorialCompleteMarkdown from '../../tests/fixtures/evaluation/editorial-the-conversation-ai-newsrooms/expected-complete.md?raw';
import editorialFocusedMarkdown from '../../tests/fixtures/evaluation/editorial-the-conversation-ai-newsrooms/expected-focused.md?raw';
import forumManifest from '../../tests/fixtures/evaluation/forum-python-pep-703/manifest.json';
import forumCompleteHtml from '../../tests/fixtures/evaluation/forum-python-pep-703/complete.html?raw';
import forumFocusedHtml from '../../tests/fixtures/evaluation/forum-python-pep-703/focused.html?raw';
import forumCompleteMarkdown from '../../tests/fixtures/evaluation/forum-python-pep-703/expected-complete.md?raw';
import forumFocusedMarkdown from '../../tests/fixtures/evaluation/forum-python-pep-703/expected-focused.md?raw';
import knowledgeManifest from '../../tests/fixtures/evaluation/knowledge-who-climate-health/manifest.json';
import knowledgeCompleteHtml from '../../tests/fixtures/evaluation/knowledge-who-climate-health/complete.html?raw';
import knowledgeFocusedHtml from '../../tests/fixtures/evaluation/knowledge-who-climate-health/focused.html?raw';
import knowledgeCompleteMarkdown from '../../tests/fixtures/evaluation/knowledge-who-climate-health/expected-complete.md?raw';
import knowledgeFocusedMarkdown from '../../tests/fixtures/evaluation/knowledge-who-climate-health/expected-focused.md?raw';
import questionAnswerManifest from '../../tests/fixtures/evaluation/question-answer-docker-compose-version/manifest.json';
import questionAnswerCompleteHtml from '../../tests/fixtures/evaluation/question-answer-docker-compose-version/complete.html?raw';
import questionAnswerFocusedHtml from '../../tests/fixtures/evaluation/question-answer-docker-compose-version/focused.html?raw';
import questionAnswerCompleteMarkdown from '../../tests/fixtures/evaluation/question-answer-docker-compose-version/expected-complete.md?raw';
import questionAnswerFocusedMarkdown from '../../tests/fixtures/evaluation/question-answer-docker-compose-version/expected-focused.md?raw';
import releaseManifest from '../../tests/fixtures/evaluation/release-rust-1-86/manifest.json';
import releaseCompleteHtml from '../../tests/fixtures/evaluation/release-rust-1-86/complete.html?raw';
import releaseFocusedHtml from '../../tests/fixtures/evaluation/release-rust-1-86/focused.html?raw';
import releaseCompleteMarkdown from '../../tests/fixtures/evaluation/release-rust-1-86/expected-complete.md?raw';
import releaseFocusedMarkdown from '../../tests/fixtures/evaluation/release-rust-1-86/expected-focused.md?raw';
import renderedDocumentationManifest from '../../tests/fixtures/evaluation/rendered-documentation-react-learn/manifest.json';
import renderedDocumentationCompleteHtml from '../../tests/fixtures/evaluation/rendered-documentation-react-learn/complete.html?raw';
import renderedDocumentationFocusedHtml from '../../tests/fixtures/evaluation/rendered-documentation-react-learn/focused.html?raw';
import renderedDocumentationCompleteMarkdown from '../../tests/fixtures/evaluation/rendered-documentation-react-learn/expected-complete.md?raw';
import renderedDocumentationFocusedMarkdown from '../../tests/fixtures/evaluation/rendered-documentation-react-learn/expected-focused.md?raw';
import technicalBlogManifest from '../../tests/fixtures/evaluation/technical-blog-cloudflare-pingora/manifest.json';
import technicalBlogCompleteHtml from '../../tests/fixtures/evaluation/technical-blog-cloudflare-pingora/complete.html?raw';
import technicalBlogFocusedHtml from '../../tests/fixtures/evaluation/technical-blog-cloudflare-pingora/focused.html?raw';
import technicalBlogCompleteMarkdown from '../../tests/fixtures/evaluation/technical-blog-cloudflare-pingora/expected-complete.md?raw';
import technicalBlogFocusedMarkdown from '../../tests/fixtures/evaluation/technical-blog-cloudflare-pingora/expected-focused.md?raw';
import apiReferenceScreenshot from '../../tests/fixtures/evaluation/api-reference-mdn-fetch/source.png?url';
import boundaryScreenshot from '../../tests/fixtures/evaluation/boundary-threejs-webgl/source.png?url';
import developerGuideScreenshot from '../../tests/fixtures/evaluation/developer-guide-pypa-packaging/source.png?url';
import editorialScreenshot from '../../tests/fixtures/evaluation/editorial-the-conversation-ai-newsrooms/source.png?url';
import forumScreenshot from '../../tests/fixtures/evaluation/forum-python-pep-703/source.png?url';
import knowledgeScreenshot from '../../tests/fixtures/evaluation/knowledge-who-climate-health/source.png?url';
import questionAnswerScreenshot from '../../tests/fixtures/evaluation/question-answer-docker-compose-version/source.png?url';
import releaseScreenshot from '../../tests/fixtures/evaluation/release-rust-1-86/source.png?url';
import renderedDocumentationScreenshot from '../../tests/fixtures/evaluation/rendered-documentation-react-learn/source.png?url';
import technicalBlogScreenshot from '../../tests/fixtures/evaluation/technical-blog-cloudflare-pingora/source.png?url';

export const BENCHMARK_FIXTURE_IDS = [
  'api-reference-mdn-fetch',
  'boundary-threejs-webgl',
  'developer-guide-pypa-packaging',
  'editorial-the-conversation-ai-newsrooms',
  'forum-python-pep-703',
  'knowledge-who-climate-health',
  'question-answer-docker-compose-version',
  'release-rust-1-86',
  'rendered-documentation-react-learn',
  'technical-blog-cloudflare-pingora',
] as const;

export type BenchmarkFixtureId = (typeof BENCHMARK_FIXTURE_IDS)[number];

export interface BenchmarkSourceScreenshot {
  readonly fileName: 'source.png';
  readonly url: string;
}

export interface BenchmarkCorpusFixture {
  readonly id: BenchmarkFixtureId;
  readonly manifest: EvaluationFixtureManifest;
  readonly captured: CapturedPage;
  readonly expectedMarkdown: Readonly<Record<ExportMode, string>>;
  readonly sourceScreenshot: BenchmarkSourceScreenshot;
}

export interface BenchmarkCorpusValidationIssue {
  readonly fixtureId: string;
  readonly message: string;
}

function freezeManifest(value: unknown): EvaluationFixtureManifest {
  assertValidFixtureManifest(value);
  const manifest = value as EvaluationFixtureManifest;
  return Object.freeze({
    ...manifest,
    tags: Object.freeze([...manifest.tags]),
    provenance: Object.freeze({
      ...manifest.provenance,
      profile: Object.freeze({
        ...manifest.provenance.profile,
        viewport: Object.freeze({ ...manifest.provenance.profile.viewport }),
      }),
    }),
    focusEvidence: Object.freeze({ ...manifest.focusEvidence }),
    limitations: Object.freeze([...manifest.limitations]),
    sourceReview: Object.freeze({ ...manifest.sourceReview }),
  });
}

function createCapturedPage(
  manifest: EvaluationFixtureManifest,
  completeHtml: string,
  focusedHtml: string | undefined,
): CapturedPage {
  return Object.freeze({
    metadata: Object.freeze({
      title: manifest.focusEvidence.readabilityTitle ?? manifest.focusEvidence.pageTitle,
      sourceUrl: manifest.provenance.finalUrl,
      capturedAt: manifest.provenance.capturedAt,
    }),
    completeHtml,
    ...(focusedHtml === undefined ? {} : { focusedHtml }),
    limitations: manifest.limitations,
  });
}

const SCREENSHOT_URLS: Readonly<Record<BenchmarkFixtureId, string>> = {
  'api-reference-mdn-fetch': apiReferenceScreenshot,
  'boundary-threejs-webgl': boundaryScreenshot,
  'developer-guide-pypa-packaging': developerGuideScreenshot,
  'editorial-the-conversation-ai-newsrooms': editorialScreenshot,
  'forum-python-pep-703': forumScreenshot,
  'knowledge-who-climate-health': knowledgeScreenshot,
  'question-answer-docker-compose-version': questionAnswerScreenshot,
  'release-rust-1-86': releaseScreenshot,
  'rendered-documentation-react-learn': renderedDocumentationScreenshot,
  'technical-blog-cloudflare-pingora': technicalBlogScreenshot,
};

function staticScreenshotUrl(fixtureId: BenchmarkFixtureId): string {
  return SCREENSHOT_URLS[fixtureId];
}

function createFixture(
  sourceManifest: unknown,
  completeHtml: string,
  focusedHtml: string | undefined,
  completeMarkdown: string,
  focusedMarkdown: string,
): BenchmarkCorpusFixture {
  const manifest = freezeManifest(sourceManifest);
  const id = manifest.id as BenchmarkFixtureId;
  return Object.freeze({
    id,
    manifest,
    captured: createCapturedPage(manifest, completeHtml, focusedHtml),
    expectedMarkdown: Object.freeze({ complete: completeMarkdown, focused: focusedMarkdown }),
    sourceScreenshot: Object.freeze({ fileName: 'source.png', url: staticScreenshotUrl(id) }),
  });
}

function issue(fixtureId: string, message: string): BenchmarkCorpusValidationIssue {
  return { fixtureId, message };
}

/** Validate corpus completeness and ordering without mutating its records. */
export function validateBenchmarkCorpus(
  fixtures: readonly BenchmarkCorpusFixture[],
): readonly BenchmarkCorpusValidationIssue[] {
  const issues: BenchmarkCorpusValidationIssue[] = [];
  if (fixtures.length !== BENCHMARK_FIXTURE_IDS.length) {
    issues.push(issue('corpus', `must contain exactly ${BENCHMARK_FIXTURE_IDS.length} fixtures.`));
  }

  for (const [index, expectedId] of BENCHMARK_FIXTURE_IDS.entries()) {
    const fixture = fixtures[index];
    if (!fixture) {
      issues.push(issue(expectedId, `is missing at deterministic position ${index}.`));
      continue;
    }
    if (fixture.id !== expectedId) {
      issues.push(issue(fixture.id, `must be ordered after ${BENCHMARK_FIXTURE_IDS[index - 1] ?? 'the corpus start'}; expected ${expectedId} at position ${index}.`));
    }
    if (fixture.manifest.id !== fixture.id) issues.push(issue(fixture.id, 'manifest ID must match the fixture ID.'));
    if (!fixture.manifest.provenance.finalUrl) issues.push(issue(fixture.id, 'manifest final URL is required.'));
    if (fixture.captured.metadata.sourceUrl !== fixture.manifest.provenance.finalUrl) {
      issues.push(issue(fixture.id, 'captured source URL must derive from the manifest final URL.'));
    }
    if (!fixture.captured.completeHtml.trim()) issues.push(issue(fixture.id, 'complete HTML is required.'));
    if (fixture.captured.focusedHtml !== undefined && !fixture.captured.focusedHtml.trim()) {
      issues.push(issue(fixture.id, 'focused HTML must be non-empty when present.'));
    }
    for (const mode of ['complete', 'focused'] as const) {
      if (!fixture.expectedMarkdown[mode].trim()) issues.push(issue(fixture.id, `expected ${mode} Markdown is required.`));
    }
    if (fixture.sourceScreenshot.fileName !== 'source.png' || !fixture.sourceScreenshot.url) {
      issues.push(issue(fixture.id, 'source screenshot evidence is required.'));
    }
  }

  return Object.freeze(issues);
}

export function assertValidBenchmarkCorpus(fixtures: readonly BenchmarkCorpusFixture[]): void {
  const issues = validateBenchmarkCorpus(fixtures);
  if (issues.length > 0) {
    throw new Error(issues.map((item) => `${item.fixtureId}: ${item.message}`).join(' '));
  }
}

export const BENCHMARK_CORPUS: readonly BenchmarkCorpusFixture[] = Object.freeze([
  createFixture(apiReferenceManifest, apiReferenceCompleteHtml, apiReferenceFocusedHtml, apiReferenceCompleteMarkdown, apiReferenceFocusedMarkdown),
  createFixture(boundaryManifest, boundaryCompleteHtml, boundaryFocusedHtml, boundaryCompleteMarkdown, boundaryFocusedMarkdown),
  createFixture(developerGuideManifest, developerGuideCompleteHtml, developerGuideFocusedHtml, developerGuideCompleteMarkdown, developerGuideFocusedMarkdown),
  createFixture(editorialManifest, editorialCompleteHtml, editorialFocusedHtml, editorialCompleteMarkdown, editorialFocusedMarkdown),
  createFixture(forumManifest, forumCompleteHtml, forumFocusedHtml, forumCompleteMarkdown, forumFocusedMarkdown),
  createFixture(knowledgeManifest, knowledgeCompleteHtml, knowledgeFocusedHtml, knowledgeCompleteMarkdown, knowledgeFocusedMarkdown),
  createFixture(questionAnswerManifest, questionAnswerCompleteHtml, questionAnswerFocusedHtml, questionAnswerCompleteMarkdown, questionAnswerFocusedMarkdown),
  createFixture(releaseManifest, releaseCompleteHtml, releaseFocusedHtml, releaseCompleteMarkdown, releaseFocusedMarkdown),
  createFixture(renderedDocumentationManifest, renderedDocumentationCompleteHtml, renderedDocumentationFocusedHtml, renderedDocumentationCompleteMarkdown, renderedDocumentationFocusedMarkdown),
  createFixture(technicalBlogManifest, technicalBlogCompleteHtml, technicalBlogFocusedHtml, technicalBlogCompleteMarkdown, technicalBlogFocusedMarkdown),
]);

assertValidBenchmarkCorpus(BENCHMARK_CORPUS);
