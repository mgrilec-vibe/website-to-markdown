import { BlockList, isIPv4, isIPv6 } from 'node:net';

export class PublicUrlValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PublicUrlValidationError';
  }
}

const PROHIBITED_HOSTNAMES: Record<string, true> = {
  localhost: true,
  metadata: true,
  'metadata.google.internal': true,
  'instance-data': true,
};

const PRIVATE_ADDRESS_BLOCKS = new BlockList();
for (const [network, family, prefix] of [
  ['0.0.0.0', 'ipv4', 8],
  ['10.0.0.0', 'ipv4', 8],
  ['100.64.0.0', 'ipv4', 10],
  ['127.0.0.0', 'ipv4', 8],
  ['169.254.0.0', 'ipv4', 16],
  ['172.16.0.0', 'ipv4', 12],
  ['192.0.0.0', 'ipv4', 24],
  ['192.0.2.0', 'ipv4', 24],
  ['192.168.0.0', 'ipv4', 16],
  ['198.18.0.0', 'ipv4', 15],
  ['198.51.100.0', 'ipv4', 24],
  ['203.0.113.0', 'ipv4', 24],
  ['224.0.0.0', 'ipv4', 4],
  ['::', 'ipv6', 128],
  ['::1', 'ipv6', 128],
  ['fc00::', 'ipv6', 7],
  ['fe80::', 'ipv6', 10],
] as const) {
  PRIVATE_ADDRESS_BLOCKS.addSubnet(network, prefix, family);
}

export function isForbiddenAddress(value: string): boolean {
  const address = value.replace(/^\[|\]$/g, '').toLowerCase();
  if (isIPv4(address)) return PRIVATE_ADDRESS_BLOCKS.check(address, 'ipv4');
  if (isIPv6(address)) return PRIVATE_ADDRESS_BLOCKS.check(address, 'ipv6');
  return false;
}

export function parseHttpUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new PublicUrlValidationError('Candidate URL must be a valid absolute HTTP(S) URL.');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new PublicUrlValidationError('Candidate URL must use HTTP or HTTPS.');
  }
  if (url.username || url.password) {
    throw new PublicUrlValidationError('Candidate URL must not contain credentials.');
  }
  return url;
}

export function validatePublicUrl(value: string): URL {
  const url = parseHttpUrl(value);
  const hostname = url.hostname.toLowerCase();
  if (PROHIBITED_HOSTNAMES[hostname] || hostname.endsWith('.localhost')) {
    throw new PublicUrlValidationError('Candidate URL must not target localhost or a metadata host.');
  }
  if (isForbiddenAddress(hostname)) {
    throw new PublicUrlValidationError('Candidate URL must not target a loopback, private, link-local, or reserved address.');
  }
  return url;
}

export function validateResolvedAddresses(hostname: string, addresses: readonly string[]): void {
  if (addresses.length === 0) {
    throw new PublicUrlValidationError(`Candidate host ${hostname} did not resolve to a public address.`);
  }
  const forbidden = addresses.find(isForbiddenAddress);
  if (forbidden) {
    throw new PublicUrlValidationError(`Candidate host ${hostname} resolved to a prohibited address: ${forbidden}.`);
  }
}
