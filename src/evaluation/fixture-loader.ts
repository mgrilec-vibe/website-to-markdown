import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { CapturedPage } from '../export-domain';
import type { EvaluationFixtureEvidence, EvaluationFixtureManifest } from './domain';
import { assertValidFixtureManifest, resolveFixture, type FixtureQuery } from './dataset';

const MANIFEST_FILE = 'manifest.json';
const COMPLETE_HTML_FILE = 'complete.html';
const FOCUSED_HTML_FILE = 'focused.html';
const COMPLETE_MARKDOWN_FILE = 'expected-complete.md';
const FOCUSED_MARKDOWN_FILE = 'expected-focused.md';
const SCREENSHOT_FILE = 'source.png';

export const DEFAULT_EVALUATION_FIXTURE_ROOT = 'tests/fixtures/evaluation';

async function readOptionalText(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return undefined;
    throw error;
  }
}

async function loadFixtureManifest(path: string): Promise<EvaluationFixtureManifest> {
  const parsed = JSON.parse(await readFile(path, 'utf8')) as unknown;
  assertValidFixtureManifest(parsed);
  return parsed;
}

function capturedPage(
  manifest: EvaluationFixtureManifest,
  completeHtml: string,
  focusedHtml: string | undefined,
): CapturedPage {
  return {
    metadata: {
      title: manifest.focusEvidence.readabilityTitle ?? manifest.focusEvidence.pageTitle,
      sourceUrl: manifest.provenance.finalUrl,
      capturedAt: manifest.provenance.capturedAt,
    },
    completeHtml,
    ...(focusedHtml === undefined ? {} : { focusedHtml }),
    limitations: [...manifest.limitations],
  };
}

async function fixtureDirectories(root: string): Promise<readonly string[]> {
  return (await readdir(root, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

export async function loadEvaluationFixtureManifests(root = DEFAULT_EVALUATION_FIXTURE_ROOT): Promise<readonly EvaluationFixtureManifest[]> {
  const directories = await fixtureDirectories(root);
  return Promise.all(directories.map((directory) => loadFixtureManifest(join(root, directory, MANIFEST_FILE))));
}

export async function loadEvaluationFixture(
  root: string,
  query?: FixtureQuery,
): Promise<EvaluationFixtureEvidence> {
  const manifests = await loadEvaluationFixtureManifests(root);
  const manifest = resolveFixture(manifests, query);
  const directory = join(root, manifest.id);
  const [completeHtml, focusedHtml, completeMarkdown, focusedMarkdown, screenshot] = await Promise.all([
    readFile(join(directory, COMPLETE_HTML_FILE), 'utf8'),
    readOptionalText(join(directory, FOCUSED_HTML_FILE)),
    readFile(join(directory, COMPLETE_MARKDOWN_FILE), 'utf8'),
    readFile(join(directory, FOCUSED_MARKDOWN_FILE), 'utf8'),
    readFile(join(directory, SCREENSHOT_FILE)),
  ]);
  return {
    manifest,
    captured: capturedPage(manifest, completeHtml, focusedHtml),
    expectedMarkdown: {
      complete: completeMarkdown,
      focused: focusedMarkdown,
    },
    screenshot,
  };
}
