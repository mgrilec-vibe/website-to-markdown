import {
  loadExportPreferences,
  saveExportPreferences,
  type ExportPreferences,
} from './export-preferences';
import type { SummarizationProvider } from './export-domain';

export interface SettingsDependencies {
  readonly load: () => Promise<ExportPreferences>;
  readonly save: (preferences: ExportPreferences) => Promise<void>;
}

const defaultDependencies: SettingsDependencies = {
  load: loadExportPreferences,
  save: saveExportPreferences,
};

export function mountSettingsApp(root: HTMLElement, dependencies: SettingsDependencies = defaultDependencies): void {
  const render = (preferences: ExportPreferences, message = ''): void => {
    root.innerHTML = `
      <main class="settings-app">
        <header>
          <p class="eyebrow">Website to Markdown</p>
          <h1>Export settings</h1>
          <p>Quick export uses these local defaults. Browser summarization uses Chrome local AI when available and otherwise falls back to deterministic extraction.</p>
        </header>
        <form id="settings-form" class="card settings-form">
          <label class="field">Summarization
            <select id="provider" name="provider">
              <option value="none" ${preferences.provider === 'none' ? 'selected' : ''}>None</option>
              <option value="browser" ${preferences.provider === 'browser' ? 'selected' : ''}>Browser local AI</option>
              <option value="custom" ${preferences.provider === 'custom' ? 'selected' : ''}>Custom extractive</option>
            </select>
          </label>
          <label class="field" for="detail">Detail <output id="detail-value">${preferences.detail}</output>/100
            <input id="detail" name="detail" type="range" min="0" max="100" value="${preferences.detail}">
          </label>
          <label class="field checkbox"><input id="auto-copy" name="autoCopy" type="checkbox" ${preferences.autoCopy ? 'checked' : ''}> Copy Markdown automatically after quick export</label>
          <button type="submit">Save settings</button>
          <p id="status" role="status" aria-live="polite">${message}</p>
        </form>
      </main>
    `;
    const detail = root.querySelector<HTMLInputElement>('#detail')!;
    const detailValue = root.querySelector<HTMLOutputElement>('#detail-value')!;
    detail.addEventListener('input', () => { detailValue.value = detail.value; });
    root.querySelector<HTMLFormElement>('#settings-form')!.addEventListener('submit', async (event) => {
      event.preventDefault();
      const updated: ExportPreferences = {
        provider: root.querySelector<HTMLSelectElement>('#provider')!.value as SummarizationProvider,
        detail: Number(detail.value),
        autoCopy: root.querySelector<HTMLInputElement>('#auto-copy')!.checked,
      };
      try {
        await dependencies.save(updated);
        render(updated, 'Settings saved.');
      } catch (error) {
        root.querySelector<HTMLElement>('#status')!.textContent = error instanceof Error ? error.message : 'Unable to save settings.';
      }
    });
  };

  void dependencies.load().then(
    (preferences) => render(preferences),
    (error: unknown) => {
      root.innerHTML = `<p role="alert">${error instanceof Error ? error.message : 'Unable to load settings.'}</p>`;
    },
  );
}
