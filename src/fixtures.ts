import type { AssessmentFixture, FixtureBlock } from './domain';

function block(
  id: string,
  classification: FixtureBlock['classification'],
  kind: FixtureBlock['kind'],
  label: string,
  markdown: string,
): FixtureBlock {
  return { id, classification, kind, label, markdown };
}

/**
 * Small, synthetic documents used by the assessment. They intentionally avoid
 * user content and recognizable third-party prose while exercising the source
 * classifications used by the compressor.
 */
export const FIXTURES: readonly AssessmentFixture[] = [
  {
    id: 'article-chrome',
    title: 'A synthetic article with publishing chrome',
    category: 'article',
    blocks: [
      block('article-frontmatter', 'protected', 'frontmatter', 'Provenance', 'source: bundled-assessment\nfixture: article-chrome'),
      block('article-breadcrumb', 'removable', 'chrome', 'Breadcrumb', 'Home / Topics / Synthetic Systems'),
      block('article-heading', 'protected', 'heading', 'Heading', '# Designing Calm Interfaces'),
      block('article-intro', 'summarizable', 'paragraph', 'Introduction', 'A calm interface makes the next useful action obvious without hiding the choices that matter.'),
      block('article-body', 'summarizable', 'paragraph', 'Body', 'It uses steady hierarchy, short feedback loops, and deliberate pauses so people can inspect a result before committing to it.'),
      block('article-links', 'protected', 'link-list', 'References', '[Interface checklist](https://example.invalid/interface-checklist)\n[Contrast notes](https://example.invalid/contrast-notes)'),
      block('article-quote', 'protected', 'quote', 'Design principle', '> A quiet surface can still make important state visible.'),
      block('article-share', 'removable', 'chrome', 'Share controls', 'Share · Save · Print'),
    ],
    expectations: {
      version: '1.0.0',
      requiredProtectedBlockIds: ['article-frontmatter', 'article-heading', 'article-links', 'article-quote'],
      requiredRemovedBlockIds: ['article-breadcrumb', 'article-share'],
      expectedSummaryInputBlockIds: ['article-intro', 'article-body'],
    },
  },
  {
    id: 'documentation-prose',
    title: 'Synthetic documentation with explanatory prose',
    category: 'documentation',
    blocks: [
      block('docs-frontmatter', 'protected', 'frontmatter', 'Provenance', 'source: bundled-assessment\nfixture: documentation-prose'),
      block('docs-heading', 'protected', 'heading', 'Heading', '# Queue worker guide'),
      block('docs-overview', 'summarizable', 'paragraph', 'Overview', 'A queue worker accepts small jobs, acknowledges them once, and retries transient failures with a visible delay.'),
      block('docs-note', 'protected', 'callout', 'Note', '> [!NOTE]\n> The example worker keeps state in memory so the behavior is easy to inspect.'),
      block('docs-install', 'summarizable', 'paragraph', 'Setup', 'Start with one worker, observe the queue depth, and add concurrency only after the retry behavior is understood.'),
      block('docs-code', 'protected', 'code', 'Example', '```ts\nconst job = queue.take();\nif (job) await worker.run(job);\n```'),
      block('docs-link', 'protected', 'link-list', 'Related', '[Retry policy](https://example.invalid/retry-policy)'),
    ],
    expectations: {
      version: '1.0.0',
      requiredProtectedBlockIds: ['docs-frontmatter', 'docs-heading', 'docs-note', 'docs-code', 'docs-link'],
      requiredRemovedBlockIds: [],
      expectedSummaryInputBlockIds: ['docs-overview', 'docs-install'],
    },
  },
  {
    id: 'code-reference',
    title: 'Synthetic code reference',
    category: 'code',
    blocks: [
      block('code-frontmatter', 'protected', 'frontmatter', 'Provenance', 'source: bundled-assessment\nfixture: code-reference'),
      block('code-heading', 'protected', 'heading', 'Heading', '# Retryable operation'),
      block('code-context', 'summarizable', 'paragraph', 'Context', 'The operation reports a stable result for success and a typed failure for a retryable condition.'),
      block('code-sample', 'protected', 'code', 'Implementation', '```ts\nexport function retryable(status: number): boolean {\n  return status === 408 || status === 503;\n}\n```'),
      block('code-warning', 'protected', 'callout', 'Warning', '> Do not retry a request after the caller has cancelled it.'),
      block('code-api', 'protected', 'link-list', 'API', '[Status codes](https://example.invalid/status-codes)'),
    ],
    expectations: {
      version: '1.0.0',
      requiredProtectedBlockIds: ['code-frontmatter', 'code-heading', 'code-sample', 'code-warning', 'code-api'],
      requiredRemovedBlockIds: [],
      expectedSummaryInputBlockIds: ['code-context'],
    },
  },
  {
    id: 'table-reference',
    title: 'Synthetic table reference',
    category: 'table',
    blocks: [
      block('table-frontmatter', 'protected', 'frontmatter', 'Provenance', 'source: bundled-assessment\nfixture: table-reference'),
      block('table-heading', 'protected', 'heading', 'Heading', '# Signal reference'),
      block('table-intro', 'summarizable', 'paragraph', 'Introduction', 'Signals are grouped by the action they suggest, not by the subsystem that emitted them.'),
      block('table-data', 'protected', 'table', 'Signal table', '| Signal | Meaning |\n| --- | --- |\n| ready | Work may begin |\n| waiting | Observe before acting |\n| blocked | Request intervention |'),
      block('table-guidance', 'summarizable', 'paragraph', 'Guidance', 'Read the signal with its timestamp and keep the original value available for later diagnosis.'),
      block('table-link', 'protected', 'link-list', 'Schema', '[Signal schema](https://example.invalid/signal-schema)'),
    ],
    expectations: {
      version: '1.0.0',
      requiredProtectedBlockIds: ['table-frontmatter', 'table-heading', 'table-data', 'table-link'],
      requiredRemovedBlockIds: [],
      expectedSummaryInputBlockIds: ['table-intro', 'table-guidance'],
    },
  },
  {
    id: 'long-prose',
    title: 'Synthetic long-form planning note',
    category: 'long-prose',
    blocks: [
      block('long-frontmatter', 'protected', 'frontmatter', 'Provenance', 'source: bundled-assessment\nfixture: long-prose'),
      block('long-heading', 'protected', 'heading', 'Heading', '# Planning a reversible change'),
      block('long-1', 'summarizable', 'paragraph', 'Context', 'A reversible change starts with a narrow boundary and a clear observation point. The team should know what can be measured before changing the system.'),
      block('long-2', 'summarizable', 'paragraph', 'Sequence', 'The first pass records the current behavior, the second changes one assumption, and the third compares the result with the recorded baseline.'),
      block('long-3', 'summarizable', 'paragraph', 'Review', 'When evidence disagrees, pause and preserve the smallest failing example. This keeps the next experiment focused instead of turning uncertainty into a broad rewrite.'),
      block('long-link', 'protected', 'link-list', 'Checklist', '[Change checklist](https://example.invalid/change-checklist)'),
      block('long-quote', 'protected', 'quote', 'Review rule', '> Prefer an experiment that can be undone to a conclusion that cannot be checked.'),
    ],
    expectations: {
      version: '1.0.0',
      requiredProtectedBlockIds: ['long-frontmatter', 'long-heading', 'long-link', 'long-quote'],
      requiredRemovedBlockIds: [],
      expectedSummaryInputBlockIds: ['long-1', 'long-2', 'long-3'],
    },
  },
  {
    id: 'fallback',
    title: 'Synthetic fallback document',
    category: 'fallback',
    blocks: [
      block('fallback-frontmatter', 'protected', 'frontmatter', 'Provenance', 'source: bundled-assessment\nfixture: fallback'),
      block('fallback-heading', 'protected', 'heading', 'Heading', '# Offline fallback'),
      block('fallback-chrome', 'removable', 'chrome', 'Navigation', 'Previous · Next · Subscribe'),
      block('fallback-prose', 'summarizable', 'paragraph', 'Main text', 'If the local model is unavailable, the selected source remains readable and the reviewer can still inspect every protected structure.'),
      block('fallback-link', 'protected', 'link-list', 'Diagnostics', '[Capability notes](https://example.invalid/capability-notes)'),
    ],
    expectations: {
      version: '1.0.0',
      requiredProtectedBlockIds: ['fallback-frontmatter', 'fallback-heading', 'fallback-link'],
      requiredRemovedBlockIds: ['fallback-chrome'],
      expectedSummaryInputBlockIds: ['fallback-prose'],
    },
  },
];

export const fixtures = FIXTURES;

export function getFixture(id: string): AssessmentFixture | undefined {
  return FIXTURES.find((fixture) => fixture.id === id);
}
