import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { CandidateCapture } from './capture-runner';
import { assertValidFixtureManifest, validateCandidateAdmission } from './dataset';
import type { EvaluationFixtureManifest, WebsiteEvaluationReport } from './domain';

export interface FixtureWriteOptions {
  readonly replaceExisting?: boolean;
}

export async function writeApprovedEvaluationFixture(
  root: string,
  manifest: EvaluationFixtureManifest,
  capture: CandidateCapture,
  report: WebsiteEvaluationReport,
  approvedManifests: readonly EvaluationFixtureManifest[],
  options: FixtureWriteOptions = {},
): Promise<string> {
  assertValidFixtureManifest(manifest);
  const admissionIssues = validateCandidateAdmission(manifest, approvedManifests);
  if (admissionIssues.length > 0) {
    throw new Error(`Fixture ${manifest.id} cannot be admitted: ${admissionIssues.map((item) => item.message).join(' ')}`);
  }

  const directory = join(root, manifest.id);
  await mkdir(root, { recursive: true });
  if (options.replaceExisting) await rm(directory, { recursive: true, force: true });
  await mkdir(directory);
  try {
    await Promise.all([
      writeFile(join(directory, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8'),
      writeFile(join(directory, 'complete.html'), capture.captured.completeHtml, 'utf8'),
      writeFile(join(directory, 'expected-complete.md'), report.results.complete.markdown, 'utf8'),
      writeFile(join(directory, 'expected-focused.md'), report.results.focused.markdown, 'utf8'),
      writeFile(join(directory, 'source.png'), capture.screenshot),
      ...(capture.captured.focusedHtml === undefined
        ? []
        : [writeFile(join(directory, 'focused.html'), capture.captured.focusedHtml, 'utf8')]),
    ]);
  } catch (error) {
    throw new Error(`Fixture ${manifest.id} write failed after creating ${directory}: ${error instanceof Error ? error.message : String(error)}`);
  }
  return directory;
}
