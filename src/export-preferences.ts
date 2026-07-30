import type { ExportMode, SummarizationProvider } from './export-domain';

export interface ExportPreferences {
  readonly mode: ExportMode;
  readonly provider: SummarizationProvider;
  readonly detail: number;
  readonly autoCopy: boolean;
}

export const DEFAULT_EXPORT_PREFERENCES: ExportPreferences = {
  mode: 'focused',
  provider: 'none',
  detail: 75,
  autoCopy: true,
};

const STORAGE_KEY = 'exportPreferences';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeDetail(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return DEFAULT_EXPORT_PREFERENCES.detail;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function normalizeExportPreferences(value: unknown): ExportPreferences {
  const source = isRecord(value) ? value : {};
  const mode: ExportMode = source.mode === 'complete' || source.mode === 'focused'
    ? source.mode
    : DEFAULT_EXPORT_PREFERENCES.mode;
  const provider: SummarizationProvider = source.provider === 'none' || source.provider === 'browser' || source.provider === 'custom'
    ? source.provider
    : DEFAULT_EXPORT_PREFERENCES.provider;
  const detail = normalizeDetail(source.detail);
  const autoCopy = typeof source.autoCopy === 'boolean' ? source.autoCopy : DEFAULT_EXPORT_PREFERENCES.autoCopy;
  return { mode, provider, detail, autoCopy };
}

export async function loadExportPreferences(): Promise<ExportPreferences> {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  return normalizeExportPreferences(stored[STORAGE_KEY]);
}

export async function saveExportPreferences(preferences: ExportPreferences): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: normalizeExportPreferences(preferences) });
}
