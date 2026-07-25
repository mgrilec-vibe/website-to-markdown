import type { AvailabilityState } from './domain';

export interface ProvisioningAction {
  readonly actionable: boolean;
  readonly label: string;
}

export function getProvisioningAction(availability: AvailabilityState | 'not checked'): ProvisioningAction {
  switch (availability) {
    case 'downloadable':
      return { actionable: true, label: 'Download and enable' };
    case 'downloading':
      return { actionable: true, label: 'Finish download and enable' };
    case 'available':
      return { actionable: false, label: 'Local model ready' };
    case 'unavailable':
      return { actionable: false, label: 'Local model unavailable' };
    default:
      return { actionable: false, label: 'Check local AI first' };
  }
}
