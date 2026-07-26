import type { StoredExport } from './export-domain';

const PREFIX = 'export:';

function key(id: string): string {
  return `${PREFIX}${id}`;
}

export function newExportId(): string {
  return crypto.randomUUID();
}

export async function saveExport(record: StoredExport): Promise<void> {
  await chrome.storage.session.set({ [key(record.id)]: record });
}

export async function loadExport(id: string): Promise<StoredExport | undefined> {
  const stored = await chrome.storage.session.get(key(id));
  return stored[key(id)] as StoredExport | undefined;
}

export async function removeExport(id: string): Promise<void> {
  await chrome.storage.session.remove(key(id));
}
