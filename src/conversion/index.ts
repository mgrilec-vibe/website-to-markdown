import type { CapturedPage, ExportMode, MarkdownBlock } from '../export-domain';
import { classifyMarkdown } from './classify';
import { convertHtml, type ConversionInput, type HtmlParser } from './core';

export { browserHtmlParser } from './browser-parser';
export { type ConversionInput, type HtmlParser } from './core';

export interface MarkdownConversion {
  readonly blocks: readonly MarkdownBlock[];
  readonly limitations: readonly string[];
}

export function selectConversionInput(captured: CapturedPage, mode: ExportMode): ConversionInput {
  return {
    html: mode === 'focused' && captured.focusedHtml ? captured.focusedHtml : captured.completeHtml,
    baseUrl: captured.metadata.sourceUrl,
    inheritedLimitations: captured.limitations,
    removeFocusNoise: mode === 'focused',
  };
}

export function convertCapturedPage(captured: CapturedPage, mode: ExportMode, parser: HtmlParser): MarkdownConversion {
  const converted = convertHtml(selectConversionInput(captured, mode), parser);
  return {
    blocks: [
      { id: 'provenance', markdown: '', kind: 'provenance', sourceOrder: -1 },
      ...converted.markdown.split(/\n{2,}/).filter(Boolean).map(classifyMarkdown),
    ],
    limitations: converted.limitations,
  };
}
