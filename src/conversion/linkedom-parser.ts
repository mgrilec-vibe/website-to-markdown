import { DOMParser as LinkedomDOMParser } from 'linkedom';
import type { HtmlParser } from './core';

export const linkedomHtmlParser: HtmlParser = {
  parseHtml(html, baseUrl) {
    const document = new LinkedomDOMParser().parseFromString(html, 'text/html') as unknown as Document;
    const base = document.createElement('base');
    base.href = baseUrl;
    document.head.prepend(base);
    return document;
  },
};
