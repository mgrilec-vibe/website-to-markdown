import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { WebsiteEvaluationReport } from './domain';
import { serializeWebsiteEvaluationReport } from './report';

export interface EvaluationSourceEvidence {
  readonly sourceHtml?: string;
  readonly screenshot?: Uint8Array;
}

export interface EvaluationOutputPaths {
  readonly directory: string;
  readonly completeMarkdown: string;
  readonly focusedMarkdown: string;
  readonly report: string;
  readonly sourceHtml?: string;
  readonly screenshot?: string;
}

export async function writeEvaluationOutput(
  directory: string,
  report: WebsiteEvaluationReport,
  source: EvaluationSourceEvidence = {},
): Promise<EvaluationOutputPaths> {
  await mkdir(directory, { recursive: true });
  const completeMarkdown = join(directory, 'complete.md');
  const focusedMarkdown = join(directory, 'focused.md');
  const reportPath = join(directory, 'evaluation-report.json');
  await Promise.all([
    writeFile(completeMarkdown, report.results.complete.markdown, 'utf8'),
    writeFile(focusedMarkdown, report.results.focused.markdown, 'utf8'),
    writeFile(reportPath, `${serializeWebsiteEvaluationReport(report)}\n`, 'utf8'),
  ]);

  const sourceHtml = source.sourceHtml === undefined ? undefined : join(directory, 'source.html');
  const screenshot = source.screenshot === undefined ? undefined : join(directory, 'source.png');
  await Promise.all([
    sourceHtml === undefined ? undefined : writeFile(sourceHtml, source.sourceHtml!, 'utf8'),
    screenshot === undefined ? undefined : writeFile(screenshot, source.screenshot!),
  ]);

  return {
    directory,
    completeMarkdown,
    focusedMarkdown,
    report: reportPath,
    ...(sourceHtml === undefined ? {} : { sourceHtml }),
    ...(screenshot === undefined ? {} : { screenshot }),
  };
}
