import { describe, expect, it } from 'vitest';
import {
  PublicUrlValidationError,
  validatePublicUrl,
  validateResolvedAddresses,
} from '../src/evaluation/public-url';

describe('public URL validation', () => {
  it('accepts public HTTP(S) URLs', () => {
    expect(validatePublicUrl('https://example.com/guide')).toMatchObject({
      protocol: 'https:',
      hostname: 'example.com',
    });
    expect(validatePublicUrl('http://8.8.8.8/')).toMatchObject({ protocol: 'http:' });
  });

  it.each([
    'ftp://example.com/file',
    'https://user:secret@example.com/',
    'http://127.0.0.1/',
    'http://localhost/',
    'http://preview.localhost/',
    'http://169.254.169.254/latest/meta-data/',
    'http://100.64.0.1/',
    'http://[::1]/',
    'http://[fc00::1]/',
  ])('rejects unsafe candidate URL %s', (value) => {
    expect(() => validatePublicUrl(value)).toThrow(PublicUrlValidationError);
  });

  it('rejects a host that resolves to a prohibited address', () => {
    expect(() => validateResolvedAddresses('example.com', ['93.184.216.34', '127.0.0.1']))
      .toThrow('resolved to a prohibited address: 127.0.0.1');
  });

  it('rejects hosts that do not resolve to a public address', () => {
    expect(() => validateResolvedAddresses('missing.example', []))
      .toThrow('did not resolve to a public address');
  });
});
