import type { AssessmentFixture, CompressionResult, FixtureBlock, StructuralCheck } from './domain';

const encoder = new TextEncoder();

export function countWords(text: string): number {
  return text.trim() === '' ? 0 : (text.match(/\S+/gu) ?? []).length;
}

export function countBytes(text: string): number {
  return encoder.encode(text).byteLength;
}

function blocksOfKind(fixture: AssessmentFixture, kind: FixtureBlock['kind']): readonly FixtureBlock[] {
  return fixture.blocks.filter((block) => block.kind === kind && block.classification === 'protected');
}

function includesAll(output: string, blocks: readonly FixtureBlock[]): boolean {
  return blocks.every((block) => output.includes(block.markdown));
}

function check(name: string, passed: boolean, detail: string): StructuralCheck {
  return { name, passed, detail };
}

/** Validate fixture invariants against a compression result without inspecting model internals. */
export function validateCompressionResult(
  fixture: AssessmentFixture,
  result: Pick<CompressionResult, 'output' | 'removedBlockIds' | 'metrics'>,
): readonly StructuralCheck[] {
  const checks: StructuralCheck[] = [];
  const protectedBlocks = fixture.blocks.filter((block) => block.classification === 'protected');

  for (const id of fixture.expectations.requiredProtectedBlockIds) {
    const block = fixture.blocks.find((candidate) => candidate.id === id);
    checks.push(check(`protected:${id}`, Boolean(block && result.output.includes(block.markdown)), block ? `Protected ${id} is retained verbatim.` : `Unknown protected block ${id}.`));
  }

  for (const id of fixture.expectations.requiredRemovedBlockIds) {
    const block = fixture.blocks.find((candidate) => candidate.id === id);
    checks.push(check(`removed:${id}`, Boolean(block && !result.output.includes(block.markdown) && result.removedBlockIds.includes(id)), block ? `Removable ${id} is absent.` : `Unknown removable block ${id}.`));
  }

  const kindChecks: readonly [string, FixtureBlock['kind'], string][] = [
    ['provenance', 'frontmatter', 'provenance'],
    ['headings', 'heading', 'heading'],
    ['links', 'link-list', 'link'],
    ['code', 'code', 'code'],
    ['tables', 'table', 'table'],
    ['quotes', 'quote', 'quotation'],
  ];
  for (const [name, kind, label] of kindChecks) {
    const blocks = blocksOfKind(fixture, kind);
    checks.push(check(name, includesAll(result.output, blocks), blocks.length ? `All protected ${label} blocks are present.` : `No protected ${label} blocks required.`));
  }

  const expectedRemoved = fixture.expectations.requiredRemovedBlockIds;
  const allRemoved = expectedRemoved.every((id) => result.removedBlockIds.includes(id));
  checks.push(check('removals', allRemoved && result.removedBlockIds.length === expectedRemoved.length, `Expected ${expectedRemoved.length} removals; recorded ${result.removedBlockIds.length}.`));
  checks.push(check('output-words', result.metrics.words === countWords(result.output), `Output contains ${countWords(result.output)} words.`));
  checks.push(check('output-bytes', result.metrics.bytes === countBytes(result.output), `Output contains ${countBytes(result.output)} UTF-8 bytes.`));

  // Keep this check useful even for fixtures whose expectation list is incomplete.
  checks.push(check('protected-content', includesAll(result.output, protectedBlocks), 'Every protected fixture block is retained verbatim.'));
  return checks;
}

export const validateFixtureStructure = validateCompressionResult;

export function resultPassedStructuralChecks(result: CompressionResult): boolean {
  return result.structuralChecks.every((structuralCheck) => structuralCheck.passed);
}
