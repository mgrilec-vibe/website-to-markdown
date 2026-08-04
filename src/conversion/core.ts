import TurndownService from 'turndown';

const FOCUS_NOISE = [
  'nav', 'footer', 'aside', 'form', 'dialog', '[role="dialog"]', '[aria-modal="true"]',
  '[data-testid*="cookie" i]', '[class*="cookie" i]', '[id*="cookie" i]',
  '[class*="consent" i]', '[id*="consent" i]', '[class*="related" i]', '[class*="newsletter" i]',
].join(',');

const ALWAYS_REMOVE = 'script,style,noscript,template';

export interface HtmlParser {
  parseHtml(html: string, baseUrl: string): Document;
}
export interface ConversionInput {
  readonly html: string;
  readonly baseUrl: string;
  readonly inheritedLimitations: readonly string[];
  readonly removeFocusNoise: boolean;
}

export interface HtmlConversion {
  readonly markdown: string;
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

function tableCells(row: Element): readonly Element[] {
  return [...row.children].filter((cell) => cell.tagName === 'TH' || cell.tagName === 'TD');
}

function spanValue(cell: Element, attribute: 'colspan' | 'rowspan'): number {
  const value = Number(cell.getAttribute(attribute) ?? '1');
  return Number.isInteger(value) && value > 0 ? value : 1;
}

function tableMarkdown(table: Element): string {
  const rows = [...table.querySelectorAll('tr')];
  if (rows.length === 0) return '';
  const cells = rows.map(tableCells);
  const complex = cells.some((row) => row.some((cell) => spanValue(cell, 'colspan') !== 1 || spanValue(cell, 'rowspan') !== 1));
  const caption = table.querySelector('caption')?.textContent?.trim();
  if (complex) {
    const body = cells.map((row) => row.map((cell) => cell.textContent?.trim() ?? '').join(' | ')).join('\n');
    return `${caption ? `**${caption}**\n\n` : ''}> Conversion limitation: this table has merged cells and is represented as rows.\n> ${body.replace(/\n/g, '\n> ')}`;
  }
  const values = cells.map((row) => row.map((cell) => (cell.textContent ?? '').trim().replace(/\|/g, '\\|')));
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

function prepareDocument(input: ConversionInput, parser: HtmlParser): { document: Document; limitations: string[] } {
  const parsed = parser.parseHtml(input.html, input.baseUrl);
  const limitations = [...input.inheritedLimitations];
  parsed.querySelectorAll(ALWAYS_REMOVE).forEach((node) => node.remove());
  if (input.removeFocusNoise) parsed.querySelectorAll(FOCUS_NOISE).forEach((node) => node.remove());

  parsed.querySelectorAll('*').forEach((node) => {
    for (const attribute of [...node.attributes]) {
      if (attribute.name.startsWith('on')) node.removeAttribute(attribute.name);
    }
  });
  parsed.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((anchor) => {
    const href = safeUrl(anchor.getAttribute('href'), input.baseUrl);
    if (href) anchor.href = href;
    else anchor.removeAttribute('href');
  });
  parsed.querySelectorAll<HTMLImageElement>('img[src]').forEach((image) => {
    const src = safeUrl(image.getAttribute('src'), input.baseUrl);
    if (src) image.src = src;
    else {
      limitations.push(`Image omitted because its source URL is unsupported: ${image.alt || 'unlabelled image'}.`);
      image.remove();
    }
  });
  return { document: parsed, limitations };
}

export function convertHtml(input: ConversionInput, parser: HtmlParser): HtmlConversion {
  const prepared = prepareDocument(input, parser);
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
    replacement: (_content, node) => `\n\n${tableMarkdown(node as Element)}\n\n`,
  });
  service.addRule('taskListItem', {
    filter: (node) => node.nodeName === 'INPUT' && (node as HTMLInputElement).type === 'checkbox',
    replacement: (_content, node) => {
      const input = node as HTMLInputElement;
      return input.checked || input.hasAttribute('checked') ? '[x] ' : '[ ] ';
    },
  });
  const markdown = service.turndown(prepared.document.body).replace(/\r\n?/g, '\n').replace(/[ \t]+\n/g, '\n').trim();
  return { markdown: `${markdown}\n`, limitations: prepared.limitations };
}
