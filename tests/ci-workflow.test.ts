import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('CI workflow', () => {
  it('runs the full test suite and publishes the isolated benchmark artifact', async () => {
    const workflow = await readFile('.github/workflows/ci.yml', 'utf8');

    expect(workflow).toContain('- name: Run full test suite\n        run: npm test\n');
    expect(workflow).not.toContain('npm test -- tests/conversion.test.ts tests/export-workflow.test.ts');
    expect(workflow).toContain('npm run build:benchmark');
    expect(workflow).toContain('name: extension-benchmark-mv3-${{ github.sha }}');
    expect(workflow).toContain('path: .output/benchmark-mv3/**');
    expect(workflow).toContain('if-no-files-found: error');
    expect(workflow).toContain('retention-days: 14');
  });
});
