import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { classifyMarkdown } from '../src/conversion/classify';
import { convertHtml } from '../src/conversion/core';
import { linkedomHtmlParser } from '../src/conversion/linkedom-parser';
import { createConversionReport, serializeConversionReport, sha256Hex } from '../src/conversion/report';
import { selectConversionInput } from '../src/conversion';
import { loadConversionCase } from './fixtures/conversion/load-case';

const benchmarkDescribe = process.env.CONVERSION_BENCHMARK === '1' ? describe : describe.skip;

benchmarkDescribe('conversion benchmark', () => {
  it('writes local per-fixture conversion evidence', async () => {
    const fixture = await loadConversionCase('export-page');
    const results = [];

    for (const mode of ['complete', 'focused'] as const) {
      const input = selectConversionInput(fixture.captured, mode);
      const parseStartedAt = performance.now();
      linkedomHtmlParser.parseHtml(input.html, input.baseUrl);
      const parseMs = performance.now() - parseStartedAt;

      const conversionStartedAt = performance.now();
      const converted = convertHtml(input, linkedomHtmlParser);
      const conversionMs = performance.now() - conversionStartedAt;

      const classificationStartedAt = performance.now();
      const blocks = [
        { id: 'provenance', markdown: '', kind: 'provenance' as const, sourceOrder: -1 },
        ...converted.markdown.split(/\n{2,}/).filter(Boolean).map(classifyMarkdown),
      ];
      const classificationMs = performance.now() - classificationStartedAt;
      const markdown = `${blocks.filter((block) => block.kind !== 'provenance').map((block) => block.markdown.trim()).filter(Boolean).join('\n\n')}\n`;
      const expectation = fixture.expectations[mode];
      const structuralCheck = JSON.stringify(blocks.map((block) => block.kind)) === JSON.stringify(expectation.blockKinds)
        && JSON.stringify(blocks.filter((block) => block.kind === 'removable').map((block) => block.id)) === JSON.stringify(expectation.removableBlockIds)
        && JSON.stringify(converted.limitations) === JSON.stringify(expectation.limitations)
        ? 'pass' as const
        : 'fail' as const;
      const goldenCheck = markdown === fixture.goldens[mode] ? 'pass' as const : 'fail' as const;

      results.push({
        fixtureId: 'export-page',
        mode,
        parseMs,
        conversionMs,
        classificationMs,
        outputBytes: new TextEncoder().encode(markdown).byteLength,
        outputSha256: await sha256Hex(markdown),
        goldenSha256: await sha256Hex(fixture.goldens[mode]),
        blockCount: blocks.length,
        limitations: converted.limitations,
        structuralCheck,
        goldenCheck,
        ...(goldenCheck === 'fail' ? { diffSummary: 'Markdown differs from fixture golden.' } : {}),
      });
    }

    const report = createConversionReport({
      environment: {
        nodeVersion: process.version,
        parser: 'linkedom@0.18.13',
        turndownVersion: '7.2.4',
        readabilityVersion: '0.6.0',
      },
      results,
    });
    const outputPath = fileURLToPath(new URL('../.output/conversion-report.json', import.meta.url));
    await mkdir(fileURLToPath(new URL('../.output/', import.meta.url)), { recursive: true });
    await writeFile(outputPath, `${serializeConversionReport(report)}\n`, 'utf8');

    expect(report.outcomes).toEqual({ results: 2, failedStructuralChecks: 0, failedGoldenDiffs: 0 });
  });
});
