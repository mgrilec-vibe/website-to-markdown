import type { SummarizationProvider } from './export-domain';

export function updateDetailControl(
  provider: SummarizationProvider,
  input: HTMLInputElement,
  description: HTMLElement,
): void {
  const inactive = provider === 'none';
  input.disabled = inactive;
  description.textContent = inactive
    ? 'Detail is inactive when no summary is requested.'
    : 'Detail controls the amount of prose retained before summarization.';
}
