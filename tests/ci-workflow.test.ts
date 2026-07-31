import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('CI workflow', () => {
  it('builds and publishes the isolated benchmark artifact without expanding the smoke gate', async () => {
    const workflow = await readFile('.github/workflows/ci.yml', 'utf8');

    expect(workflow).toContain('npm test -- tests/conversion.test.ts tests/export-workflow.test.ts');
    expect(workflow).not.toContain('tests/validation.test.ts');
    expect(workflow).not.toContain('tests/benchmark-runner.test.ts');
    expect(workflow).toContain('npm run build:benchmark');
    expect(workflow).toContain('name: extension-benchmark-mv3-${{ github.sha }}');
    expect(workflow).toContain('path: .output/benchmark-mv3/**');
    expect(workflow).toContain('if-no-files-found: error');
    expect(workflow).toContain('retention-days: 14');
  });
});
