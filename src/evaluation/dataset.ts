import {
  EVALUATION_CATEGORIES,
  WEBSITE_EVALUATION_DEFAULT_FIXTURE_ID,
  WEBSITE_EVALUATION_SCHEMA_VERSION,
  type EvaluationCategory,
  type EvaluationFixtureManifest,
} from './domain';

const CATEGORY_LOOKUP: Readonly<Record<string, true>> = Object.fromEntries(
  EVALUATION_CATEGORIES.map((category) => [category, true]),
);
const FOCUS_EXPECTATION_LOOKUP: Readonly<Record<string, true>> = {
  article: true,
  thread: true,
  ambiguous: true,
  unavailable: true,
};

export type FixtureQuery =
  | string
  | Readonly<{
      readonly id?: string;
      readonly category?: EvaluationCategory;
      readonly tag?: string;
    }>;

export interface DatasetValidationIssue {
  readonly code: string;
  readonly path: string;
  readonly message: string;
}

export interface DatasetValidationResult {
  readonly valid: boolean;
  readonly issues: readonly DatasetValidationIssue[];
}

export interface CandidateAdmissionOptions {
  readonly newConversionBehavior?: string;
}

export class FixtureManifestValidationError extends Error {
  readonly issues: readonly DatasetValidationIssue[];

  constructor(issues: readonly DatasetValidationIssue[]) {
    const orderedIssues = orderIssues(issues);
    super(orderedIssues.map(formatIssue).join(' '));
    this.name = 'FixtureManifestValidationError';
    this.issues = orderedIssues;
  }
}

export class FixtureResolutionError extends Error {
  readonly code: 'unknown' | 'ambiguous' | 'invalid-query';
  readonly query: FixtureQuery | undefined;
  readonly fixtureIds: readonly string[];

  constructor(
    code: 'unknown' | 'ambiguous' | 'invalid-query',
    query: FixtureQuery | undefined,
    message: string,
    fixtureIds: readonly string[] = [],
  ) {
    super(message);
    this.name = 'FixtureResolutionError';
    this.code = code;
    this.query = query;
    this.fixtureIds = fixtureIds;
  }
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function issue(code: string, path: string, message: string): DatasetValidationIssue {
  return { code, path, message };
}

function orderIssues(issues: readonly DatasetValidationIssue[]): readonly DatasetValidationIssue[] {
  return [...issues].sort((left, right) => left.path.localeCompare(right.path) || left.code.localeCompare(right.code));
}

function formatIssue(item: DatasetValidationIssue): string {
  return `${item.path}: ${item.message}`;
}

function validateCaptureProfile(value: unknown, path: string): DatasetValidationIssue[] {
  const issues: DatasetValidationIssue[] = [];
  if (!isRecord(value)) return [issue('required', path, 'capture profile is required.')];

  const viewport = value.viewport;
  if (!isRecord(viewport)) {
    issues.push(issue('required', `${path}.viewport`, 'viewport is required.'));
  } else {
    for (const dimension of ['width', 'height'] as const) {
      const dimensionValue = viewport[dimension];
      if (typeof dimensionValue !== 'number' || !Number.isFinite(dimensionValue) || dimensionValue <= 0) {
        issues.push(issue('invalid', `${path}.viewport.${dimension}`, 'must be a positive finite number.'));
      }
    }
  }

  if (value.readyState !== 'domcontentloaded' && value.readyState !== 'load') {
    issues.push(issue('invalid', `${path}.readyState`, 'must be domcontentloaded or load.'));
  }
  if (value.readySelector !== undefined && !isNonEmptyString(value.readySelector)) {
    issues.push(issue('invalid', `${path}.readySelector`, 'must be a non-empty string when provided.'));
  }
  if (value.screenshotMode !== undefined && value.screenshotMode !== 'full-page' && value.screenshotMode !== 'viewport') {
    issues.push(issue('invalid', `${path}.screenshotMode`, 'must be full-page or viewport when provided.'));
  }
  for (const field of ['stabilityMs', 'navigationTimeoutMs', 'maxResponseBytes'] as const) {
    const fieldValue = value[field];
    if (typeof fieldValue !== 'number' || !Number.isFinite(fieldValue) || fieldValue < 0) {
      issues.push(issue('invalid', `${path}.${field}`, 'must be a non-negative finite number.'));
    }
  }
  if (typeof value.maxRedirects !== 'number' || !Number.isInteger(value.maxRedirects) || value.maxRedirects < 0) {
    issues.push(issue('invalid', `${path}.maxRedirects`, 'must be a non-negative integer.'));
  }
  return issues;
}

function validateProvenance(value: unknown, path: string): DatasetValidationIssue[] {
  const issues: DatasetValidationIssue[] = [];
  if (!isRecord(value)) return [issue('required', path, 'capture provenance is required.')];
  for (const field of ['originUrl', 'finalUrl', 'capturedAt', 'documentSha256', 'screenshotSha256'] as const) {
    if (!isNonEmptyString(value[field])) {
      issues.push(issue('required', `${path}.${field}`, 'must be a non-empty string.'));
    }
  }
  issues.push(...validateCaptureProfile(value.profile, `${path}.profile`));
  return issues;
}

function validateFocusEvidence(value: unknown, path: string): DatasetValidationIssue[] {
  const issues: DatasetValidationIssue[] = [];
  if (!isRecord(value)) return [issue('required', path, 'focus evidence is required.')];
  if (!isNonEmptyString(value.pageTitle)) {
    issues.push(issue('required', `${path}.pageTitle`, 'must be a non-empty string.'));
  }
  for (const field of ['readabilityTitle', 'selectedHeading'] as const) {
    if (value[field] !== undefined && !isNonEmptyString(value[field])) {
      issues.push(issue('invalid', `${path}.${field}`, 'must be a non-empty string when provided.'));
    }
  }
  return issues;
}

function validateSourceReview(value: unknown, path: string): DatasetValidationIssue[] {
  const issues: DatasetValidationIssue[] = [];
  if (!isRecord(value)) return [issue('required', path, 'source review is required.')];
  for (const field of ['reviewedAt', 'reviewer'] as const) {
    if (!isNonEmptyString(value[field])) {
      issues.push(issue('required', `${path}.${field}`, 'must be a non-empty string.'));
    }
  }
  if (typeof value.sourceUseApproved !== 'boolean') {
    issues.push(issue('required', `${path}.sourceUseApproved`, 'must be a boolean.'));
  }
  return issues;
}
/** Return every deterministic manifest validation issue without mutating the input. */
export function validateFixtureManifest(manifest: unknown): readonly DatasetValidationIssue[] {
  const issues: DatasetValidationIssue[] = [];
  if (!isRecord(manifest)) return [issue('required', 'manifest', 'fixture manifest must be an object.')];

  if (manifest.schemaVersion !== WEBSITE_EVALUATION_SCHEMA_VERSION) {
    issues.push(issue('invalid', 'schemaVersion', `must equal ${WEBSITE_EVALUATION_SCHEMA_VERSION}.`));
  }
  if (!isNonEmptyString(manifest.id) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(manifest.id)) {
    issues.push(issue('invalid', 'id', 'must be a non-empty kebab-case identifier.'));
  }
  if (!isNonEmptyString(manifest.category) || !CATEGORY_LOOKUP[manifest.category]) {
    issues.push(issue('invalid', 'category', 'must be a supported evaluation category.'));
  }
  if (!Array.isArray(manifest.tags)) {
    issues.push(issue('required', 'tags', 'must be an array of strings.'));
  } else {
    const seenTags: Record<string, true> = {};
    manifest.tags.forEach((tag, index) => {
      if (!isNonEmptyString(tag)) issues.push(issue('invalid', `tags[${index}]`, 'must be a non-empty string.'));
      else if (seenTags[tag]) issues.push(issue('duplicate', `tags[${index}]`, `duplicates tag ${JSON.stringify(tag)}.`));
      else seenTags[tag] = true;
    });
  }
  for (const field of ['publisherDomain', 'markupPlatform'] as const) {
    if (!isNonEmptyString(manifest[field])) issues.push(issue('required', field, 'must be a non-empty string.'));
  }
  if (!isNonEmptyString(manifest.expectedFocus) || !FOCUS_EXPECTATION_LOOKUP[manifest.expectedFocus]) {
    issues.push(issue('invalid', 'expectedFocus', 'must be article, thread, ambiguous, or unavailable.'));
  }
  if (!Array.isArray(manifest.limitations) || manifest.limitations.some((value) => typeof value !== 'string')) {
    issues.push(issue('required', 'limitations', 'must be an array of strings.'));
  }
  issues.push(...validateProvenance(manifest.provenance, 'provenance'));
  issues.push(...validateFocusEvidence(manifest.focusEvidence, 'focusEvidence'));
  issues.push(...validateSourceReview(manifest.sourceReview, 'sourceReview'));
  return orderIssues(issues);
}

export function inspectFixtureManifest(manifest: unknown): DatasetValidationResult {
  const issues = validateFixtureManifest(manifest);
  return { valid: issues.length === 0, issues };
}

export function assertValidFixtureManifest(manifest: unknown): asserts manifest is EvaluationFixtureManifest {
  const issues = validateFixtureManifest(manifest);
  if (issues.length > 0) throw new FixtureManifestValidationError(issues);
}

function queryDescription(query: FixtureQuery | undefined): string {
  if (query === undefined) return `default fixture ${JSON.stringify(WEBSITE_EVALUATION_DEFAULT_FIXTURE_ID)}`;
  if (typeof query === 'string') return JSON.stringify(query);
  return JSON.stringify(query);
}

function querySelector(query: FixtureQuery | undefined):
  | { readonly kind: 'id' | 'category' | 'tag'; readonly value: string }
  | undefined {
  if (query === undefined) return { kind: 'id', value: WEBSITE_EVALUATION_DEFAULT_FIXTURE_ID };
  if (typeof query === 'string') {
    return query.trim().length > 0 ? { kind: 'id', value: query } : undefined;
  }
  if (!isRecord(query)) return undefined;
  const selectors = Object.entries(query).filter(([, value]) => value !== undefined);
  const [kind, value] = selectors[0]!;
  if ((kind !== 'id' && kind !== 'category' && kind !== 'tag') || !isNonEmptyString(value)) return undefined;
  return { kind, value };
}

/** Resolve exactly one local manifest by exact ID, category, or tag. */
export function resolveFixture(
  manifests: readonly EvaluationFixtureManifest[],
  query?: FixtureQuery,
): EvaluationFixtureManifest {
  const manifestIssues = manifests.flatMap((manifest, index) =>
    validateFixtureManifest(manifest).map((item) => ({ ...item, path: `manifests[${index}].${item.path}` })),
  );
  if (manifestIssues.length > 0) throw new FixtureManifestValidationError(manifestIssues);

  const selector = querySelector(query);
  if (!selector) {
    throw new FixtureResolutionError(
      'invalid-query',
      query,
      `Fixture query ${queryDescription(query)} must specify exactly one non-empty id, category, or tag.`,
    );
  }
  const effectiveSelector = typeof query === 'string' && selector.kind === 'id' && !manifests.some((manifest) => manifest.id === selector.value)
    ? CATEGORY_LOOKUP[selector.value]
      ? { kind: 'category' as const, value: selector.value }
      : { kind: 'tag' as const, value: selector.value }
    : selector;
  const candidates = manifests.filter((manifest) => {
    if (effectiveSelector.kind === 'id') return manifest.id === effectiveSelector.value;
    if (effectiveSelector.kind === 'category') return manifest.category === effectiveSelector.value;
    return manifest.tags.includes(effectiveSelector.value);
  });
  const sortedIds = candidates.map((manifest) => manifest.id).sort();
  if (candidates.length === 0) {
    throw new FixtureResolutionError('unknown', query, `Unknown fixture query ${queryDescription(query)}.`, []);
  }
  if (candidates.length > 1) {
    throw new FixtureResolutionError(
      'ambiguous',
      query,
      `Ambiguous fixture query ${queryDescription(query)}; candidates: ${sortedIds.join(', ')}.`,
      sortedIds,
    );
  }
  return candidates[0]!;
}

/** Return corpus-level diversity issues for approved manifests. */
export function validateApprovedFixtureDiversity(
  manifests: readonly EvaluationFixtureManifest[],
): readonly DatasetValidationIssue[] {
  const issues: DatasetValidationIssue[] = [];
  const ids: Record<string, number> = {};
  const domains: Record<string, string> = {};
  const platforms: Record<string, string> = {};
  manifests.forEach((manifest, index) => {
    if (ids[manifest.id] !== undefined) {
      issues.push(issue('duplicate-id', `manifests[${index}].id`, `duplicates fixture ${JSON.stringify(manifest.id)}.`));
    } else ids[manifest.id] = index;
    const previousDomain = domains[manifest.publisherDomain];
    if (previousDomain !== undefined) {
      issues.push(issue('duplicate-publisher-domain', `manifests[${index}].publisherDomain`, `duplicates manifest ${previousDomain}.`));
    } else domains[manifest.publisherDomain] = `manifests[${index}]`;
    const previousPlatform = platforms[manifest.markupPlatform];
    if (previousPlatform !== undefined) {
      issues.push(issue('duplicate-markup-platform', `manifests[${index}].markupPlatform`, `duplicates manifest ${previousPlatform}.`));
    } else platforms[manifest.markupPlatform] = `manifests[${index}]`;
  });
  return orderIssues(issues);
}

export function validateFixtureCorpus(
  manifests: readonly EvaluationFixtureManifest[],
): readonly DatasetValidationIssue[] {
  const issues = manifests.flatMap((manifest, index) =>
    validateFixtureManifest(manifest).map((item) => ({ ...item, path: `manifests[${index}].${item.path}` })),
  );
  return orderIssues([...issues, ...validateApprovedFixtureDiversity(manifests)]);
}

function admissionOptions(value: CandidateAdmissionOptions | string | undefined): CandidateAdmissionOptions {
  return typeof value === 'string' ? { newConversionBehavior: value } : value ?? {};
}

/** Validate a candidate before it can be admitted to the approved corpus. */
export function validateCandidateAdmission(
  candidate: unknown,
  approvedFixtures: readonly EvaluationFixtureManifest[],
  options?: CandidateAdmissionOptions | string,
): readonly DatasetValidationIssue[] {
  const issues = validateFixtureManifest(candidate).map((item) => ({ ...item, path: `candidate.${item.path}` }));
  if (!isRecord(candidate)) return orderIssues(issues);
  const candidateId = isNonEmptyString(candidate.id) ? candidate.id : undefined;
  if (candidateId !== undefined && approvedFixtures.some((manifest) => manifest.id === candidateId)) {
    issues.push(issue('duplicate-id', 'candidate.id', `duplicates fixture ${JSON.stringify(candidateId)}.`));
  }
  const review = candidate.sourceReview;
  if (isRecord(review) && review.sourceUseApproved !== true) {
    issues.push(issue('source-review-required', 'candidate.sourceReview.sourceUseApproved', 'source-use review approval is required.'));
  }
  const opts = admissionOptions(options);
  const behavior = opts.newConversionBehavior;
  const hasDocumentedBehavior = isNonEmptyString(behavior);
  const existingDomains = approvedFixtures.filter((manifest) => manifest.publisherDomain === candidate.publisherDomain);
  const existingPlatforms = approvedFixtures.filter((manifest) => manifest.markupPlatform === candidate.markupPlatform);
  if (existingDomains.length > 0 && !hasDocumentedBehavior) {
    issues.push(issue('duplicate-publisher-domain', 'candidate.publisherDomain', `duplicates approved fixture ${existingDomains.map((manifest) => manifest.id).sort().join(', ')}; document new conversion behavior.`));
  }
  if (existingPlatforms.length > 0 && !hasDocumentedBehavior) {
    issues.push(issue('duplicate-markup-platform', 'candidate.markupPlatform', `duplicates approved fixture ${existingPlatforms.map((manifest) => manifest.id).sort().join(', ')}; document new conversion behavior.`));
  }
  return orderIssues(issues);
}

export function admitCandidateFixture(
  candidate: unknown,
  approvedFixtures: readonly EvaluationFixtureManifest[],
  options?: CandidateAdmissionOptions | string,
): EvaluationFixtureManifest {
  const issues = validateCandidateAdmission(candidate, approvedFixtures, options);
  if (issues.length > 0) throw new FixtureManifestValidationError(issues);
  return candidate as EvaluationFixtureManifest;
}

export const resolveEvaluationFixture = resolveFixture;
export const validateFixtureManifestDiversity = validateApprovedFixtureDiversity;
