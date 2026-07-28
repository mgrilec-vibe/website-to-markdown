import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { BlockKind, CapturedPage, ExportMode } from '../../../src/export-domain';

interface ModeExpectation {
  readonly blockKinds: readonly BlockKind[];
  readonly removableBlockIds: readonly string[];
  readonly limitations: readonly string[];
}

interface FixtureMetadata {
  readonly metadata: CapturedPage['metadata'];
  readonly limitations: readonly string[];
  readonly expectations: Readonly<Record<ExportMode, ModeExpectation>>;
}

export interface ConversionFixtureCase {
  readonly captured: CapturedPage;
  readonly expectations: Readonly<Record<ExportMode, ModeExpectation>>;
  readonly goldens: Readonly<Record<ExportMode, string>>;
}

const fixtureRoot = fileURLToPath(new URL('./', import.meta.url));

export async function loadConversionCase(fixtureId: string): Promise<ConversionFixtureCase> {
  const fixturePath = join(fixtureRoot, fixtureId);
  const [metadataText, completeHtml, focusedHtml, completeGolden, focusedGolden] = await Promise.all([
    readFile(join(fixturePath, 'captured-page.json'), 'utf8'),
    readFile(join(fixturePath, 'complete.html'), 'utf8'),
    readFile(join(fixturePath, 'focused.html'), 'utf8'),
    readFile(join(fixturePath, 'expected-complete.md'), 'utf8'),
    readFile(join(fixturePath, 'expected-focused.md'), 'utf8'),
  ]);
  const fixture = JSON.parse(metadataText) as FixtureMetadata;
  return {
    captured: {
      metadata: fixture.metadata,
      completeHtml,
      focusedHtml,
      limitations: fixture.limitations,
    },
    expectations: fixture.expectations,
    goldens: { complete: completeGolden, focused: focusedGolden },
  };
}
