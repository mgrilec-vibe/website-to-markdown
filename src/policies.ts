import type { CompressionPolicy, CompressionProfileId } from './domain';

const ENGLISH_LANGUAGE_OPTIONS = {
  expectedInputLanguages: ['en'],
  expectedContextLanguages: ['en'],
  outputLanguage: 'en',
} as const;

export const POLICIES: readonly CompressionPolicy[] = [
  {
    id: 'full-source',
    label: 'Full source',
    description: 'Remove designated chrome while retaining every eligible prose block verbatim; no model summary is requested.',
    includeSummarizableSource: true,
    summarize: null,
  },
  {
    id: 'compact',
    label: 'Compact',
    description: 'Keep protected structure and replace eligible prose with a medium key-points summary.',
    includeSummarizableSource: true,
    summarize: { type: 'key-points', length: 'medium', format: 'markdown', preference: 'auto', ...ENGLISH_LANGUAGE_OPTIONS },
  },
  {
    id: 'brief',
    label: 'Brief',
    description: 'Keep protected structure and replace eligible prose with a short TL;DR summary.',
    includeSummarizableSource: true,
    summarize: { type: 'tldr', length: 'short', format: 'markdown', preference: 'speed', ...ENGLISH_LANGUAGE_OPTIONS },
  },
  {
    id: 'outline',
    label: 'Outline',
    description: 'Keep protected structure and replace eligible prose with short headline-style points.',
    includeSummarizableSource: true,
    summarize: { type: 'headline', length: 'short', format: 'markdown', preference: 'speed', ...ENGLISH_LANGUAGE_OPTIONS },
  },
];

export const compressionPolicies = POLICIES;

export function getCompressionPolicy(id: CompressionProfileId): CompressionPolicy {
  const policy = POLICIES.find((candidate) => candidate.id === id);
  if (!policy) throw new Error(`Unknown compression policy: ${id}`);
  return policy;
}
