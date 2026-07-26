import TurndownService from 'turndown';
import type { CapturedPage, ExportMode, MarkdownBlock } from './export-domain';

const FOCUS_NOISE = [
  'nav', 'aside', 'form', 'dialog', '[role="dialog"]', '[aria-modal="true"]',
  '[data-testid*="cookie" i]', '[class*="cookie" i]', '[id*="cookie" i]',
  '[class*="consent" i]', '[id*="consent" i]', '[class*="related" i]', '[class*="newsletter" i]',
].join(',');

const ALWAYS_REMOVE = 'script,style,noscript,template';

export interface MarkdownConversion {
  readonly blocks: readonly MarkdownBlock[];
  readonly limitations: readonly string[];
}

function safeUrl(value: string | null, baseUrl: string): string | undefined {
  if (!value) return undefined;
  try {
    const resolved = new URL(value, baseUrl);
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(resolved.protocol) ? resolved.href : undefined;
  } catch {
    return undefined;
  }
}

function codeFence(content: string): string {
  const longest = Math.max(0, ...[...content.matchAll(/`+/g)].map((match) => match[0].length));
  return '`'.repeat(Math.max(3, longest + 1));
}

function tableMarkdown(table: HTMLTableElement): string {
  const rows = [...table.rows];
  if (rows.length === 0) return '';
  const complex = rows.some((row) => [...row.cells].some((cell) => cell.colSpan !== 1 || cell.rowSpan !== 1));
  const caption = table.querySelector('caption')?.textContent?.trim();
  if (complex) {
    const body = rows.map((row) => [...row.cells].map((cell) => cell.textContent?.trim() ?? '').join(' | ')).join('\n');
    return `${caption ? `**${caption}**\n\n` : ''}> Conversion limitation: this table has merged cells and is represented as rows.\n> ${body.replace(/\n/g, '\n> ')}`;
  }
  const values = rows.map((row) => [...row.cells].map((cell) => (cell.textContent ?? '').trim().replace(/\|/g, '\\|')));
  const width = Math.max(...values.map((row) => row.length));
  const header = values[0] ?? [];
  const normalizedHeader = Array.from({ length: width }, (_, index) => header[index] || '');
  const data = values.slice(1).map((row) => Array.from({ length: width }, (_, index) => row[index] || ''));
  const lines = [
    `| ${normalizedHeader.join(' | ')} |`,
    `| ${normalizedHeader.map(() => '---').join(' | ')} |`,
    ...data.map((row) => `| ${row.join(' | ')} |`),
  ];
  return `${caption ? `**${caption}**\n\n` : ''}${lines.join('\n')}`;
}

function prepareDocument(html: string, mode: ExportMode, baseUrl: string): { document: Document; limitations: string[] } {
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  const limitations: string[] = [];
  parsed.querySelectorAll(ALWAYS_REMOVE).forEach((node) => node.remove());
  if (mode === 'focused') parsed.querySelectorAll(FOCUS_NOISE).forEach((node) => node.remove());

  parsed.querySelectorAll('*').forEach((node) => {
    for (const attribute of [...node.attributes]) {
      if (attribute.name.startsWith('on')) node.removeAttribute(attribute.name);
    }
  });
  parsed.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((anchor) => {
    const href = safeUrl(anchor.getAttribute('href'), baseUrl);
    if (href) anchor.href = href;
    else anchor.removeAttribute('href');
  });
  parsed.querySelectorAll<HTMLImageElement>('img[src]').forEach((image) => {
    const src = safeUrl(image.getAttribute('src'), baseUrl);
    if (src) image.src = src;
    else {
      limitations.push(`Image omitted because its source URL is unsupported: ${image.alt || 'unlabelled image'}.`);
      image.remove();
    }
  });
  return { document: parsed, limitations };
}

function convertHtml(html: string, mode: ExportMode, baseUrl: string): { markdown: string; limitations: readonly string[] } {
  const prepared = prepareDocument(html, mode, baseUrl);
  const service = new TurndownService({
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
    headingStyle: 'atx',
    hr: '---',
    linkStyle: 'inlined',
  });
  service.addRule('preserveCode', {
    filter: (node) => node.nodeName === 'PRE',
    replacement: (_content, node) => {
      const code = node.textContent ?? '';
      const language = node.querySelector('code')?.className.match(/language-([\w+-]+)/)?.[1] ?? '';
      const fence = codeFence(code);
      return `\n\n${fence}${language}\n${code.replace(/\n$/, '')}\n${fence}\n\n`;
    },
  });
  service.addRule('gfmTable', {
    filter: (node) => node.nodeName === 'TABLE',
    replacement: (_content, node) => `\n\n${tableMarkdown(node as HTMLTableElement)}\n\n`,
  });
  service.addRule('taskListItem', {
    filter: (node) => node.nodeName === 'INPUT' && (node as HTMLInputElement).type === 'checkbox',
    replacement: (_content, node) => (node as HTMLInputElement).checked ? '[x] ' : '[ ] ',
  });
  const markdown = service.turndown(prepared.document.body).replace(/\r\n?/g, '\n').replace(/[ \t]+\n/g, '\n').trim();
  return { markdown: `${markdown}\n`, limitations: prepared.limitations };
}

function classify(markdown: string, sourceOrder: number): MarkdownBlock {
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

export function convertCapturedPage(captured: CapturedPage, mode: ExportMode): MarkdownConversion {
  const html = mode === 'focused' && captured.focusedHtml ? captured.focusedHtml : captured.completeHtml;
  const converted = convertHtml(html, mode, captured.metadata.sourceUrl);
  const blocks = [
    { id: 'provenance', markdown: '', kind: 'provenance' as const, sourceOrder: -1 },
    ...converted.markdown.split(/\n{2,}/).filter(Boolean).map(classify),
  ];
  return { blocks, limitations: [...captured.limitations, ...converted.limitations] };
}
