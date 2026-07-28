import { deriveReadabilityFocus } from '../../src/capture';
import { browserHtmlParser } from '../../src/conversion';
import { copyMarkdown, downloadMarkdown } from '../../src/markdown-export';
import { mountExportPopup } from '../../src/popup-app';
import { loadExport } from '../../src/storage';
import { createFinalExport } from '../../src/export-workflow';
import '../../src/export-styles.css';

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('Export popup root is missing.');

mountExportPopup(root, {
  captureActiveTab: async () => chrome.runtime.sendMessage({ type: 'export-active-tab' }) as Promise<{ id?: string; error?: string }>,
  loadExport,
  deriveReadabilityFocus: (captured) => deriveReadabilityFocus(captured, browserHtmlParser),
  createFinalExport,
  copyFinalMarkdown: async (markdown) => copyMarkdown(markdown, navigator.clipboard),
  downloadFinalMarkdown: async (markdown, title) => downloadMarkdown(
    markdown,
    title,
    chrome.downloads,
    URL,
    (callback, delay) => window.setTimeout(callback, delay),
  ),
});
