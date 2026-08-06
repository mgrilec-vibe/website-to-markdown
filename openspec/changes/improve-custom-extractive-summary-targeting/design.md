## Context

The Custom extractive summarizer (provider `custom`, `summary_origin: deterministic-diverse-extractive`) is the deterministic fallback for the Browser local-AI path and is also a user-selectable provider in its own right. It is implemented in `src/export-compression.ts` (`extractiveSummaries`, `detailPolicy`, `withSummaries`) and routed through `src/export-workflow.ts:159-165`, which calls `deterministicExtractiveCompression` unchanged. The popup UI, the `extension-export-preferences` spec, and the README bind this provider as a user-visible choice.

Two observable defects are in scope for this increment:

1. **Per-block framing redundancy.** `withSummaries` wraps each Custom summary in `> **Custom extractive summary**\n>\n> <sentence>` (src/export-compression.ts:292), repeating the literal application label once per non-retained prose block. On the Pingora article at Detail 50 this produced 13 occurrences of the phrase `Custom extractive summary` and three Markdown lines per summarized block (heading, blank `>`, body).
2. **Detail curve.** `detailPolicy` clamps `extractiveSentenceRatio` at `Math.max(0.1, normalized / 100)` (src/export-compression.ts:18) and sets `retainRatio = normalized / 100`. The 0.1 floor keeps per-block summary length flat at the low end regardless of Detail, so users see little benefit from lowering Detail.

A third defect, **relevance/targeting weakness** (the user's reported four glue sentences), is OUT OF SCOPE for this increment and will be addressed in a separate future change. Prototyping during Apply found that four targeting mechanisms (document-frequency damping, candidate-level TF×IDF, TextRank, LexRank) did not drop all four reported glue sentences on the actual Pingora fixture, and the targeting decision requires a separate prototype-driven planning effort before implementation.

## Goals / Non-Goals

**Goals**
- Eliminate repeated Custom application labels from the Custom extractive output.
- Keep a visible, noticeable summarization cue (the bare `>` blockquote, plus the unchanged `compression_mode: custom-extractive` and `summary_origin: deterministic-diverse-extractive` YAML metadata, plus the unchanged popup metadata).
- Replace the `Math.max(0.1, …)` per-block ratio floor with a linear `max(0, min(1, …))` curve so the per-block summary scales smoothly with Detail.
- Make the Custom export's measured **word count** a monotonic non-increasing function of `detail` for `detail ∈ [0, 100]` and always summarise at least one block below Detail 100. Byte count is best-effort.
- Preserve the existing MMR contract form (`0.7 × relevance − 0.3 × max lexical similarity`), the existing `requested_provider` / `summary_origin` metadata, and the existing `## Summary` heading used by the `local-ai` branch (which is unchanged).
- Bump `DetailPolicy.version` 1→2 and `ExportMetadata.policyVersion` 1→2 (literal types widened) so the breaking change is observable.
- Keep the existing benchmark-evaluation harness green.

**Non-Goals**
- No change to `relevanceScores` or the targeting/relevance scoring mechanism. The targeting defect is deferred to a future change.
- No new dependencies. No remote services. No public extension API change. No popup UX change.
- No change to the `local-ai` (Browser) branch of `withSummaries`, to `createFinalExport`'s Browser path, or to the `local-ai` neutral `## Summary` heading already in place.
- No change to focus extraction in `createFocusedSummarySource`, the language-detection contract, or the local-AI capability state machine.
- No language-model fallback, no per-page summarization model, no new classifier.

## Decisions

### Decision 1: Bare `>` blockquote replaces the per-block bold label
**Choice.** Each Custom per-block summary in `withSummaries` (src/export-compression.ts:292) is emitted as a single bare `>` line holding the selected sentence(s), without the `**Custom extractive summary**` label. The blockquote marker itself, plus the unchanged YAML `compression_mode` / `summary_origin` fields, plus the unchanged popup metadata, convey "this is summarised".
**Alternatives considered.** A single top-of-document `## Summary` heading (mirroring the `local-ai` branch at src/export-compression.ts:282) was rejected because the user wants the summary inline at the summarisable blocks, not lifted out. A smaller inline cue (HTML comment, italicised label) was rejected because the bare `>` already matches the existing `> Conversion limitation:` style and costs only the marker plus the selected sentence.
**Why.** This is the form the user offered ("would it be better if we have just a `>`") and it is consistent with the canonical spec's existing prohibition on repeated application labels for the `local-ai` path ("without the repeated application label `Locally generated summary`"). Extending the same prohibition to Custom is consistent.

### Decision 2: Linear per-block ratio curve replaces the `Math.max(0.1, …)` floor
**Choice.** Replace `extractiveSentenceRatio = Math.max(0.1, normalized / 100)` in `detailPolicy` (src/export-compression.ts:18) with `extractiveSentenceRatio = max(0, min(1, normalized / 100))`, reaching 0 only at `detail = 100`. The existing `selectionCount = max(1, ceil(candidates.length * ratio))` guarantee (src/export-compression.ts:247) ensures at least one sentence per non-retained summarizable block when `policy.summaryEnabled` is true, so something is always summarised below Detail 100.
**Alternatives considered.** Keeping the `0.1` floor (predictable per-block coverage, low risk) was rejected because it produced a flat per-block summary at low Detail, which is the user's complaint. Dropping the floor and the `selectionCount` guarantee together was rejected because it can leave summarizable blocks with zero selected sentences, violating the spec requirement to retain a source-anchored representation for each non-retained prose block. A stepped curve was rejected because the user asked for "smooth" scaling.
**Why.** Linear `detail / 100` makes the per-block ratio scale smoothly with Detail, the `max(1, …)` guarantee keeps at least one sentence per non-retained block, and the word-count monotonicity requirement holds by construction: lowering Detail reduces retained blocks (fewer full blocks → fewer words) and shortens per-block summaries (fewer sentences → fewer words), while the per-block summary never exceeds the retained text it replaces.
**Implementation detail.** Retained prose uses a stable, nested priority order (midpoint-spread priorities followed by the remaining source order), so lowering Detail can only replace retained blocks rather than selecting a disjoint set. `deterministicExtractiveCompression` computes extractive candidates from all eligible prose and filters the non-retained blocks afterward, keeping relevance inputs stable across Detail transitions without changing the relevance formula.

### Decision 3: Word-count monotonicity, not byte-count monotonicity
**Choice.** The Custom export's measured **word count** for a fixed focused input SHALL be a monotonic non-increasing function of `detail` over `[0, 100]`. The byte count is best-effort: the spec does NOT require byte monotonicity, because a block transitioning from retained to summarised adds the `> ` blockquote marker overhead and the per-block summary may equal the retained sentence's length plus that overhead, producing a small byte increase at the transition.
**Alternatives considered.** Requiring both bytes and words to be monotonic was the original proposal but was rejected on audit: it cannot be satisfied at single-sentence block transitions where the retained text and the summary text are the same sentence and the `> ` marker adds bytes without adding words. Requiring only bytes was rejected because words is the user-visible compression signal and the safe invariant.
**Why.** Words is the meaningful compression metric and is provably monotonic by construction under Decision 2; bytes is approximate and is already reported as a measured value, not a guarantee.
**Implementation detail.** `countWords` excludes standalone Markdown blockquote markers, so the bare `>` framing contributes to measured bytes but not to measured words. This preserves the word-count invariant while allowing the explicitly best-effort byte metric to vary at block transitions.

### Decision 4: Version bump v1 → v2 (literal types widened)
**Choice.** Bump `DetailPolicy.version` from `1` to `2` and `ExportMetadata.policyVersion` from `1` to `2` in `src/export-domain.ts`. Both are TypeScript literal types (`version: 1`, `policyVersion: 1`), so the type definitions must be widened alongside the runtime values: `version: 1 | 2` and `policyVersion: 1 | 2`. Every call site that constructs a `DetailPolicy` or `ExportMetadata` literal (src/export-compression.ts:19-26, src/export-compression.ts:118, tests/popup-app.test.ts:40, tests/export-ai.test.ts:35) must be updated in the same change.
**Alternatives considered.** Keeping version 1 and silently changing behaviour was rejected because export consumers (popup, copy/download, preview, fixture archive) may rely on stable per-Detail behavior; a version bump makes the change observable. Bumping `EXPORT_FORMAT_VERSION` (src/export-domain.ts:1) was rejected: that const tracks the on-disk export format, which this change does not alter.
**Why.** Versioning makes the breaking change observable to any downstream consumer and to the fixture archive, without conflating it with the on-disk export format version.

### Decision 5: Targeting change is OUT OF SCOPE for this increment
**Choice.** The `relevanceScores` function and the targeting/relevance scoring mechanism are NOT changed in this increment. The targeting defect (the user's four reported glue sentences) is deferred to a separate future change.
**Alternatives considered.** The original proposal included a document-frequency-damping targeting change. Apply prototyping found that document-frequency damping is a no-op under `sentenceTokens()` Set-dedup (`frequency === documentCount`), and four alternative mechanisms (document-frequency damping, candidate-level TF×IDF, TextRank/PageRank, LexRank) prototyped against the actual Pingora fixture at Detail 50 did not drop all four reported glue sentences. The targeting decision requires a separate prototype-driven planning effort.
**Why.** Chunk-1 (framing + Detail curve + version bump) is a net-positive, user-requested improvement on its own. Blocking the entire increment on an unresolved targeting decision would delay shipping the framing and Detail-curve fixes. The targeting defect is real but does not regress under this increment; it remains as-is.

### Decision 6: Test updates are part of the change
**Choice.** `tests/export-compression.test.ts:164,174` and `tests/preview-output.test.ts:21,23` are updated to assert on the bare `>` blockquote shape, on `compression_mode: custom-extractive`, on `summary_origin: deterministic-diverse-extractive`, on `generated_summary_count`, and on `policyVersion: 2`. `tests/popup-app.test.ts:40`, which constructs an `ExportMetadata` literal including `policyVersion: 1`, is updated to `policyVersion: 2`.
**Alternatives considered.** Leaving the literal-label assertions as-is was rejected because they would fail on the new framing, blocking the build. Removing them was rejected because they protect the public Markdown contract.
**Why.** They must be updated in the same PR to keep CI green; Propose records them so Apply cannot miss them.

## Risks / Trade-offs

- **[Risk] Linear `detail / 100` curve produces one sentence per non-retained block at very low Detail, which may be too sparse on long blocks.** → Mitigation: the `selectionCount = max(1, …)` guarantee keeps at least one sentence per block, satisfying the spec scenario "Detail always summarises something".
- **[Risk] Bare `>` blockquote may be visually confusable with the existing `> Conversion limitation:` blockquote in the popup preview.** → Mitigation: the preview renderer disambiguates by surrounding context (heading lines, content); the spec scenario "Custom extraction never repeats the application label" keeps the user's "noticeable" requirement satisfied without a new visual cue.
- **[Risk] Byte count is not monotonic, which may surprise consumers reading the YAML frontmatter.** → Mitigation: the spec only requires word-count monotonicity; byte count is reported as a measured value and the design records the non-monotonicity explicitly so consumers do not assert on it.
- **[Risk] Version bump (v1 → v2) may break a downstream consumer or fixture pinning to v1.** → Mitigation: the only known consumers are inside this repo (popup, preview, copy, download, benchmark); none pin to the literal value `1`. The fixture archive's expected Markdown files do not pin to a `policyVersion` field — they pin to the rendered Markdown text, which this change DOES alter, so the fixture archive's expected Markdown for custom-extractive fixtures must be regenerated as part of Apply; that is recorded in tasks.
- **[Risk] Deferring the targeting defect leaves glue sentences in the output.** → Mitigation: the framing and Detail-curve improvements are net-positive on their own; the targeting defect is recorded for a future change and does not regress under this increment.

## Migration Plan

1. Land the source change behind the existing `provider === 'custom'` path. No data migration. No settings migration.
2. Apply carries the test updates, the `popup-app.test.ts:40` literal update, and any fixture-archive expected-Markdown regeneration in the same commit chain so CI does not see failing assertions mid-stream.
3. Archive the change after implementation, sync the modified `local-ai-markdown-compression` delta spec to the canonical spec, and record the version bump in `ExportMetadata.policyVersion`.

## Open Questions

- Should `DetailPolicy.version` become `version: 2` (narrow) or `version: 1 | 2` (union)? Answer: union, so older fixture code that constructs a v1 policy for comparison remains type-valid; the runtime value is `2` for new exports.

## Future: targeting improvement (out of scope, recorded for a separate change)

The targeting defect — the user's four reported glue sentences being preferentially selected — requires a prototype-driven planning effort. Four mechanisms were prototyped against the actual Pingora fixture at Detail 50: document-frequency damping (no-op under Set-dedup), candidate-level TF×IDF (demotes 3/4), TextRank/PageRank (demotes a different 2/4), and LexRank (same as TextRank). None dropped all four. A future change should prototype a mechanism (or hybrid) against the fixture BEFORE proposing, and tighten or revise the "de-prioritises high-frequency-token glue" spec scenario to match the demonstrable result.