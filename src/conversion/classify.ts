import type { MarkdownBlock } from '../export-domain';

export function classifyMarkdown(markdown: string, sourceOrder: number): MarkdownBlock {
  const trimmed = markdown.trim();
  const protectedBlock = /^#{1,6}\s|^```|^\|.+\|\n\|[-:| ]+\||^>|!?\[[^\]]*\]\([^)]*\)/m.test(trimmed);
  const removable = /^(?:cookie settings|accept cookies|manage consent|subscribe(?: to our newsletter)?|share this article)$/iu.test(trimmed);
  return {
    id: `block-${sourceOrder + 1}`,
    markdown: `${trimmed}\n`,
    kind: removable ? 'removable' : protectedBlock ? 'protected' : 'summarizable',
    sourceOrder,
  };
}
