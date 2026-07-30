import { captureAndStore } from '../src/capture-transport';
import { newExportId, saveExport } from '../src/storage';
import type { CapturedPage } from '../src/export-domain';

export const SETTINGS_MENU_ID = 'open-settings';

function capturePageInTab(): CapturedPage {
  const removeAlways = (root: ParentNode): void => {
    root.querySelectorAll('script,style,noscript,template').forEach((node) => node.remove());
    root.querySelectorAll('*').forEach((node) => {
      for (const attribute of [...node.attributes]) {
        if (attribute.name.startsWith('on')) node.removeAttribute(attribute.name);
      }
    });
  };
  const validHttpUrl = (value: string | null): string | undefined => {
    if (!value) return undefined;
    try {
      const url = new URL(value, document.baseURI);
      return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : undefined;
    } catch {
      return undefined;
    }
  };
  const complete = document.cloneNode(true) as Document;
  removeAlways(complete);
  const focused = document.cloneNode(true) as Document;
  removeAlways(focused);
  focused.querySelectorAll('nav,aside,form,dialog,[role="dialog"],[aria-modal="true"],[data-testid*="cookie" i],[class*="cookie" i],[id*="cookie" i],[class*="consent" i],[id*="consent" i],[class*="related" i],[class*="newsletter" i]').forEach((node) => node.remove());
  const focusedRoot = focused.querySelector('article, main, [role="main"]') ?? focused.body;
  const canonicalUrl = validHttpUrl(document.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? null);
  const limitations: string[] = [];
  if (!focusedRoot?.textContent?.trim()) limitations.push('Focused extraction was unavailable; use complete-page export.');
  if (document.querySelector('iframe')) limitations.push('Cross-origin and protected frame content may be unavailable.');
  if (document.querySelector('canvas')) limitations.push('Canvas-only content may not be represented faithfully.');
  return {
    metadata: {
      title: document.title.trim() || 'Untitled page',
      sourceUrl: location.href,
      ...(canonicalUrl ? { canonicalUrl } : {}),
      capturedAt: new Date().toISOString(),
      ...(document.documentElement.lang ? { pageLanguage: document.documentElement.lang } : {}),
    },
    ...(focusedRoot?.innerHTML ? { focusedHtml: focusedRoot.innerHTML } : {}),
    completeHtml: complete.body.innerHTML,
    limitations,
  };
}

async function exportActiveTab(): Promise<{ id: string }> {
  return captureAndStore({
    activeTab: async () => (await chrome.tabs.query({ active: true, currentWindow: true }))[0],
    capture: async (tabId) => (await chrome.scripting.executeScript({
      target: { tabId },
      func: capturePageInTab,
    }))[0]?.result,
    newId: newExportId,
    save: async (id, captured) => saveExport({ id, captured }),
  });
}

export default defineBackground(() => {
  chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
    if (!message || typeof message !== 'object' || !('type' in message) || message.type !== 'export-active-tab') return;
    void exportActiveTab().then(
      (result) => sendResponse(result),
      (error: unknown) => sendResponse({ error: error instanceof Error ? error.message : 'Unable to export this page.' }),
    );
    return true;
  });
  chrome.contextMenus.create({
    id: SETTINGS_MENU_ID,
    title: 'Settings',
    contexts: ['action'],
  });
  chrome.contextMenus.onClicked.addListener((info) => {
    if (info.menuItemId !== SETTINGS_MENU_ID) return;
    void chrome.runtime.openOptionsPage();
  });
});
