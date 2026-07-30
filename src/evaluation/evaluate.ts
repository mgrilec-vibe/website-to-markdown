import { convertCapturedPage } from '../conversion';
import { jsdomHtmlParser } from '../conversion/jsdom-parser';
import type { CapturedPage, MarkdownBlock } from '../export-domain';
import type { CandidateCapture } from './capture-runner';
import type { EvaluationFixtureEvidence, EvaluationStructuralCheck, WebsiteEvaluationReport } from './domain';
import { createWebsiteEvaluationReport } from './report';
import type { EvaluationModeResultInput } from './report';

function markdownFromBlocks(blocks: readonly MarkdownBlock[]): string {
  return `${blocks
    .filter((block) => block.kind !== 'provenance')
    .map((block) => block.markdown.trim())
    .filter(Boolean)
    .join('\n\n')}\n`;
}

function limitationCheck(actual: readonly string[], expected: readonly string[]): EvaluationStructuralCheck {
  const actualKinds = [...new Set(actual)].sort();
  const expectedKinds = [...new Set(expected)].sort();
  return {
    name: 'limitations',
    passed: JSON.stringify(actualKinds) === JSON.stringify(expectedKinds),
    detail: actualKinds.length === expectedKinds.length
      ? 'Conversion limitation kinds match fixture evidence.'
      : `Expected ${expectedKinds.length} conversion limitation kinds; observed ${actualKinds.length}.`,
  };
}

async function evaluateCapturedPage(
  captured: CapturedPage,
  provenance: WebsiteEvaluationReport['provenance'],
  target: WebsiteEvaluationReport['target'],
  expectedMarkdown?: EvaluationFixtureEvidence['expectedMarkdown'],
  expectedLimitations?: readonly string[],
): Promise<WebsiteEvaluationReport> {
  const results = (['complete', 'focused'] as const).reduce((result, mode) => {
    const conversion = convertCapturedPage(captured, mode, jsdomHtmlParser);
    const markdown = markdownFromBlocks(conversion.blocks);
    const structuralChecks = expectedLimitations === undefined
      ? []
      : [limitationCheck(conversion.limitations, expectedLimitations)];
    const modeResult: EvaluationModeResultInput = {
      mode,
      markdown,
      limitations: conversion.limitations,
      structuralChecks,
      ...(expectedMarkdown === undefined ? {} : { expectedMarkdown: expectedMarkdown[mode] }),
    };
    return { ...result, [mode]: modeResult };
  }, {} as Record<'complete' | 'focused', EvaluationModeResultInput>);

  return createWebsiteEvaluationReport({
    target,
    provenance,
    ...(target.fixtureId === undefined ? {} : { fixtureId: target.fixtureId }),
    results,
  });
}

export async function evaluateApprovedFixture(fixture: EvaluationFixtureEvidence): Promise<WebsiteEvaluationReport> {
  return evaluateCapturedPage(
    fixture.captured,
    fixture.manifest.provenance,
    { kind: 'approved-fixture', fixtureId: fixture.manifest.id },
    fixture.expectedMarkdown,
    fixture.manifest.limitations,
  );
}

export async function evaluateCandidateCapture(capture: CandidateCapture): Promise<WebsiteEvaluationReport> {
  return evaluateCapturedPage(
    capture.captured,
    capture.provenance,
    { kind: 'candidate-capture', url: capture.provenance.originUrl },
  );
}
