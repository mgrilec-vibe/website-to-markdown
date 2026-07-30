import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { resolveFixture } from '../src/evaluation/dataset';
import { evaluateApprovedFixture } from '../src/evaluation/evaluate';
import {
  DEFAULT_EVALUATION_FIXTURE_ROOT,
  loadEvaluationFixture,
  loadEvaluationFixtureManifests,
} from '../src/evaluation/fixture-loader';
import { writeEvaluationOutput } from '../src/evaluation/output';

const temporaryDirectories: string[] = [];
afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe('approved fixture evaluation', () => {
  it('loads the default fixture locally and preserves both Markdown goldens', async () => {
    const fixture = await loadEvaluationFixture(DEFAULT_EVALUATION_FIXTURE_ROOT);
    const report = await evaluateApprovedFixture(fixture);

    expect(fixture.manifest.id).toBe('api-reference-mdn-fetch');
    expect(report.target).toEqual({ kind: 'approved-fixture', fixtureId: 'api-reference-mdn-fetch' });
    expect(report.results.complete.goldenCheck).toBe('pass');
    expect(report.results.focused.goldenCheck).toBe('pass');
  });

  it('resolves corpus IDs and rejects ambiguous tags deterministically', async () => {
    const manifests = await loadEvaluationFixtureManifests(DEFAULT_EVALUATION_FIXTURE_ROOT);

    expect(resolveFixture(manifests, { id: 'release-rust-1-86' }).category).toBe('release-notes');
    expect(() => resolveFixture(manifests, { tag: 'v1' })).toThrow('Ambiguous fixture query');
  });

  it('writes isolated local evidence without changing the fixture', async () => {
    const fixture = await loadEvaluationFixture(DEFAULT_EVALUATION_FIXTURE_ROOT);
    const report = await evaluateApprovedFixture(fixture);
    const directory = await mkdtemp(join(tmpdir(), 'website-evaluation-'));
    temporaryDirectories.push(directory);

    const paths = await writeEvaluationOutput(directory, report, {
      sourceHtml: fixture.captured.completeHtml,
      screenshot: fixture.screenshot,
    });

    expect(await readFile(paths.completeMarkdown, 'utf8')).toBe(report.results.complete.markdown);
    expect(JSON.parse(await readFile(paths.report, 'utf8'))).toEqual(report);
    expect(await readFile(paths.sourceHtml!, 'utf8')).toBe(fixture.captured.completeHtml);
    expect((await readFile(paths.screenshot!)).byteLength).toBeGreaterThan(0);
  });
});
