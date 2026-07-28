import { JSDOM } from 'jsdom';
import type { HtmlParser } from './core';

export const jsdomHtmlParser: HtmlParser = {
  parseHtml(html, baseUrl) {
    return new JSDOM(html, { url: baseUrl }).window.document as unknown as Document;
  },
};
