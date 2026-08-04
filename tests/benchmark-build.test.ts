import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('benchmark build isolation', () => {
  it('uses an isolated config and benchmark-only entrypoints', async () => {
    const [packageJson, productionConfig, benchmarkConfig, popup, options, instructions] = await Promise.all([
      readFile('package.json', 'utf8'),
      readFile('wxt.config.ts', 'utf8'),
      readFile('wxt.config.benchmark.ts', 'utf8'),
      readFile('benchmark-entrypoints/popup.html', 'utf8'),
      readFile('benchmark-entrypoints/options.html', 'utf8'),
      readFile('benchmark-public/TESTER-INSTRUCTIONS.md', 'utf8'),
    ]);

    expect(JSON.parse(packageJson).scripts['build:benchmark']).toBe('wxt build --config wxt.config.benchmark.ts --browser chrome');
    expect(benchmarkConfig).toContain("entrypointsDir: 'benchmark-entrypoints'");
    expect(benchmarkConfig).toContain("outDirTemplate: 'benchmark-mv{{manifestVersion}}'");
    expect(benchmarkConfig).toContain("publicDir: 'benchmark-public'");
    expect(productionConfig).not.toContain('benchmark-entrypoints');
    expect(popup).toContain('Open benchmark');
    expect(options).toContain('wxt.openInTab');
    expect(instructions).toContain('does not visit or recapture');
  });
});
