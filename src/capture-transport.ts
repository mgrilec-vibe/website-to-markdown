import type { CapturedPage } from './export-domain';

export interface CaptureTransport {
  readonly activeTab: () => Promise<{ readonly id?: number | undefined; readonly url?: string | undefined } | undefined>;
  readonly capture: (tabId: number) => Promise<CapturedPage | undefined>;
  readonly newId: () => string;
  readonly save: (id: string, captured: CapturedPage) => Promise<void>;
}

export async function captureAndStore(transport: CaptureTransport): Promise<{ id: string }> {
  const tab = await transport.activeTab();
  if (!tab?.id || !tab.url?.startsWith('http')) throw new Error('This page cannot be exported. Open a regular HTTP(S) page and try again.');
  const captured = await transport.capture(tab.id);
  if (!captured) throw new Error('Chrome did not return page content for this tab.');
  const id = transport.newId();
  await transport.save(id, captured);
  return { id };
}
