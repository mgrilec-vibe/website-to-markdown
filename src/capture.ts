import { Readability } from '@mozilla/readability';
import type { CapturedPage } from './export-domain';

const NON_CONTENT_SELECTORS = [
  'script',
  'style',
  'noscript',
  'template',
  'dialog',
  '[role="dialog"]',
  '[aria-modal="true"]',
  'nav',
  'aside',
  'form',
  '[data-testid*="cookie" i]',
  '[class*="cookie" i]',
  '[id*="cookie" i]',
  '[class*="consent" i]',
  '[id*="consent" i]',
].join(',');

function validHttpUrl(value: string | null): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value, document.baseURI);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : undefined;
  } catch {
    return undefined;
  }
}

function cleanedClone(source: Document, removePageChrome: boolean): Document {
  const clone = source.cloneNode(true) as Document;
  if (removePageChrome) clone.querySelectorAll(NON_CONTENT_SELECTORS).forEach((node) => node.remove());
  clone.querySelectorAll('*').forEach((node) => {
    for (const attribute of [...node.attributes]) {
      if (attribute.name.startsWith('on')) node.removeAttribute(attribute.name);
    }
  });
  return clone;
}

export function captureActiveDocument(source: Document): CapturedPage {
  const capturedAt = new Date().toISOString();
  const originalUrl = validHttpUrl(source.location.href);
  if (!originalUrl) throw new Error('Only HTTP(S) pages can be exported.');

  const completeClone = cleanedClone(source, false);
  const readabilityClone = cleanedClone(source, true);
  const article = new Readability(readabilityClone, { keepClasses: false }).parse();
  const canonicalUrl = validHttpUrl(source.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? null);
  const limitations: string[] = [];

  if (!article?.content) limitations.push('Focused extraction was unavailable; use complete-page export.');
  if (source.querySelector('iframe')) limitations.push('Cross-origin and protected frame content may be unavailable.');
  if (source.querySelector('canvas')) limitations.push('Canvas-only content may not be represented faithfully.');

  return {
    metadata: {
      title: article?.title?.trim() || source.title.trim() || 'Untitled page',
      sourceUrl: originalUrl,
      ...(canonicalUrl ? { canonicalUrl } : {}),
      capturedAt,
      ...(source.documentElement.lang ? { pageLanguage: source.documentElement.lang } : {}),
    },
    ...(article?.content ? { focusedHtml: article.content } : {}),
    completeHtml: completeClone.body.innerHTML,
    limitations,
  };
}

export function deriveReadabilityFocus(captured: CapturedPage): CapturedPage {
  const snapshot = new DOMParser().parseFromString(captured.completeHtml, 'text/html');
  const article = new Readability(cleanedClone(snapshot, true), { keepClasses: false }).parse();
  if (!article?.content) return captured;
  return {
    ...captured,
    metadata: { ...captured.metadata, ...(article.title?.trim() ? { title: article.title.trim() } : {}) },
    focusedHtml: article.content,
  };
}
