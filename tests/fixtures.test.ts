import { describe, expect, it } from 'vitest';
import { FIXTURES, getFixture } from '../src/fixtures';

 describe('bundled fixtures', () => {
  it('covers each assessment category with versioned expectations', () => {
    expect(FIXTURES.map((fixture) => fixture.category)).toEqual([
      'article', 'documentation', 'code', 'table', 'long-prose', 'fallback',
    ]);
    for (const fixture of FIXTURES) {
      expect(fixture.expectations.version).toBe('1.0.0');
      expect(fixture.blocks.some((block) => block.classification === 'protected')).toBe(true);
      expect(fixture.blocks.some((block) => block.classification === 'summarizable')).toBe(true);
      expect(fixture.blocks.map((block) => block.id)).toEqual(expect.arrayContaining([...fixture.expectations.expectedSummaryInputBlockIds]));
    }
  });

  it('looks up fixtures without exposing mutable registry state', () => {
    expect(getFixture('fallback')?.title).toContain('fallback');
    expect(getFixture('missing')).toBeUndefined();
  });
});
