import createDOMPurify, { type WindowLike } from 'dompurify';
import { Marked, Renderer, type Tokens } from 'marked';

const ALLOWED_PROTOCOLS: Record<string, true> = { 'http:': true, 'https:': true, 'mailto:': true };
const ALLOWED_TAGS = [
  'a', 'blockquote', 'br', 'code', 'del', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'hr', 'li', 'ol', 'p', 'pre', 'span', 'strong', 'table', 'tbody', 'td', 'th', 'thead', 'tr', 'ul',
];
const ALLOWED_ATTRIBUTES = ['class', 'href', 'rel', 'role', 'target', 'title'];
const ALLOWED_URI_REGEXP = /^(?:https?|mailto):/iu;

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/gu, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  })[character]!);
}

export function previewLinkDestination(value: string): URL | undefined {
  try {
    const url = new URL(value);
    return ALLOWED_PROTOCOLS[url.protocol] ? url : undefined;
  } catch {
    return undefined;
  }
}

function renderedLink(this: Renderer, { href, title, tokens }: Tokens.Link): string {
  const content = this.parser.parseInline(tokens);
  const destination = previewLinkDestination(href);
  if (!destination) return content;

  const titleAttribute = title ? ` title="${escapeHtml(title)}"` : '';
  const openerAttributes = destination.protocol === 'http:' || destination.protocol === 'https:'
    ? ' target="_blank" rel="noopener noreferrer"'
    : '';
  return `<a href="${escapeHtml(destination.href)}"${titleAttribute}${openerAttributes}>${content}</a>`;
}

function renderedImage({ text }: Tokens.Image): string {
  const label = text.trim() || 'Unlabelled image';
  return `<span class="markdown-resource" role="note">[Image omitted: ${escapeHtml(label)}]</span>`;
}

function renderedCheckbox({ checked }: Tokens.Checkbox): string {
  return checked ? '☑ ' : '☐ ';
}

function createParser(): Marked {
  const renderer = new Renderer();
  renderer.html = ({ text }) => escapeHtml(text);
  renderer.link = renderedLink;
  renderer.image = renderedImage;
  renderer.checkbox = renderedCheckbox;
  return new Marked({ gfm: true, renderer });
}


function markdownWithProtectedFrontMatter(markdown: string): string {
  const match = markdown.match(/^(---\n[\s\S]*?\n---)(?:\n|$)/u);
  if (!match) return markdown;
  return `\`\`\`yaml\n${match[1]}\n\`\`\`\n\n${markdown.slice(match[0].length)}`;
}

export function renderMarkdown(markdown: string, document: Document): DocumentFragment {
  const html = createParser().parse(markdownWithProtectedFrontMatter(markdown)) as string;
  const view = document.defaultView;
  if (!view) throw new Error('Markdown rendering requires a document with a window.');
  const sanitized = createDOMPurify(view as unknown as WindowLike).sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ALLOWED_ATTRIBUTES,
    ALLOW_ARIA_ATTR: false,
    ALLOW_DATA_ATTR: false,
    ALLOWED_URI_REGEXP,
  });
  const template = document.createElement('template');
  template.innerHTML = sanitized;
  return template.content.cloneNode(true) as DocumentFragment;
}
