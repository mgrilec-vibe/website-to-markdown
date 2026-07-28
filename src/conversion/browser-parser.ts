import type { HtmlParser } from './core';

export const browserHtmlParser: HtmlParser = {
  parseHtml(html, baseUrl) {
    const document = new DOMParser().parseFromString(html, 'text/html');
    const base = document.createElement('base');
    base.href = baseUrl;
    document.head.prepend(base);
    return document;
  },
};
