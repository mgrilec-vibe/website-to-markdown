import { join } from 'node:path';
import { capturePublicPage } from './capture-runner';
import type { EvaluationCategory } from './domain';
import type { FixtureQuery } from './dataset';
import { evaluateApprovedFixture, evaluateCandidateCapture } from './evaluate';
import { DEFAULT_EVALUATION_FIXTURE_ROOT, loadEvaluationFixture } from './fixture-loader';
import { writeEvaluationOutput } from './output';

interface CommandInput {
  readonly url?: string;
  readonly query?: FixtureQuery;
}

function parseCommandInput(arguments_: readonly string[]): CommandInput {
  if (arguments_.length === 0) return {};
  if (arguments_.length === 1 && !arguments_[0]!.startsWith('--')) return { url: arguments_[0]! };
  if (arguments_.length !== 2) {
    throw new Error('Usage: npm run evaluate:website -- [URL | --fixture ID | --category CATEGORY | --tag TAG]');
  }

  const [flag, value] = arguments_;
  if (!value || !value.trim()) throw new Error(`A value is required for ${flag}.`);
  if (flag === '--fixture') return { query: { id: value } };
  if (flag === '--category') return { query: { category: value as EvaluationCategory } };
  if (flag === '--tag') return { query: { tag: value } };
  throw new Error('Usage: npm run evaluate:website -- [URL | --fixture ID | --category CATEGORY | --tag TAG]');
}

async function run(): Promise<void> {
  const input = parseCommandInput(process.argv.slice(2));
  if (input.url) {
    const capture = await capturePublicPage(input.url);
    const report = await evaluateCandidateCapture(capture);
    const outputDirectory = join('.output', 'website-evaluation', 'candidates', report.provenance.documentSha256);
    const paths = await writeEvaluationOutput(outputDirectory, report, {
      sourceHtml: capture.sourceHtml,
      screenshot: capture.screenshot,
    });
    console.log(`Candidate capture written to ${paths.directory}`);
    return;
  }

  const fixture = await loadEvaluationFixture(DEFAULT_EVALUATION_FIXTURE_ROOT, input.query);
  const report = await evaluateApprovedFixture(fixture);
  const outputDirectory = join('.output', 'website-evaluation', 'fixtures', fixture.manifest.id);
  const paths = await writeEvaluationOutput(outputDirectory, report, {
    sourceHtml: fixture.captured.completeHtml,
    screenshot: fixture.screenshot,
  });
  console.log(`Approved fixture evaluation written to ${paths.directory}`);
}

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Website evaluation failed: ${message}`);
  process.exitCode = 1;
});
