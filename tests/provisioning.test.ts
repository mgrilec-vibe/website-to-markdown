import { describe, expect, it } from 'vitest';
import { getProvisioningAction } from '../src/provisioning';

describe('local model provisioning action', () => {
  it('keeps provisioning actionable while Chrome is downloading the model', () => {
    expect(getProvisioningAction('downloading')).toEqual({
      actionable: true,
      label: 'Finish download and enable',
    });
  });

  it('only permits session creation for downloadable model states', () => {
    expect(getProvisioningAction('downloadable').actionable).toBe(true);
    expect(getProvisioningAction('available').actionable).toBe(false);
    expect(getProvisioningAction('unavailable').actionable).toBe(false);
  });
});
