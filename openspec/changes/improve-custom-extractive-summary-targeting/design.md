## Context

The Custom extractive summarizer (provider `custom`, `summary_origin: deterministic-diverse-extractive`) is the deterministic fallback for the Browser local-AI path and is also a user-selectable provider in its own right. It is implemented in `src/export-compression.ts` (`extractiveSummaries`, `detailPolicy`, `withSummaries`) and routed through `src/export-workflow.ts:159-165`. The popup UI, the `extension-export-preferences` spec, and the README bind this provider as a user-visible choice.

Three observable defects have been reproduced on the Cloudflare Pingora evaluation fixture (`tests/fixtures/evaluation/technical-blog-cloudflare-pingora/`):

1. **Per-block framing redundancy.** `withSummaries` wraps each Custom summary in `> **Custom extractive summary**\n>\n> <sentence>` (src/export-compression.ts:292), repeating the literal application label once per non-retained prose block. On the Pingora article at Detail 50 this contributed 13 occurrences of the phrase `Custom extractive summary` and three Markdown lines per summarized block (heading, blank `>`, body).
2. **Relevance weakness.** `extractiveSummaries` selects sentences using `relevanceScores`, which is a token-frequency sum plus fixed positional bonuses (`+0.25` for first sentence, `+1/(1+sourceOrder)` for early blocks) (src/export-compression.ts:225-234). On the Pingora article it picked four transitional sentences with no informational value beyond surrounding context and selected a single one-line teaser as the Conclusion section's only representative.
3. **Detail curve.** `detailPolicy` clamps `extractiveSentenceRatio` at `Math.max(0.1, normalized / 100)` (src/export-compression.ts:18) and sets `retainRatio = normalized / 100`. Combined, lowering Detail from 100 produces modest retention reductions but a flat per-block summary of at least 10% of each block's sentences. The Pingora article at Detail 50 yielded only −208 words / −1265 bytes versus the un-summarized baseline — not the compression the user expects.

## Goals / Non-Goals

**Goals**
- Eliminate repeated Custom application labels from the Custom extractive output.
- Keep a visible, noticeable summarization cue (the bare `>` blockquote, plus the unchanged `compression_mode: custom-extractive` and `summary_origin: deterministic-diverse-extractive` YAML metadata, plus the unchanged popup metadata).
- Improve sentence selection so Custom extraction prefers signal-rich candidates over transitional glue, especially the first-sentence and early-block bias.
- Make the Custom export's measured bytes/words a monotonic non-increasing function of `detail` for `detail ∈ [0, 100]` and always summarise at least one block below Detail 100.
- Preserve the existing MMR contract at version 2 (the same `0.7 × relevance − 0.3 × max lexical similarity` form), the existing `requested_provider` / `summary_origin` metadata, and the existing `## Summary` heading used by the `local-ai` branch (which is unchanged).
- Use `tests/fixtures/evaluation/technical-blog-cloudflare-pingora/` as the regression anchor and keep the existing benchmark-evaluation harness green.

**Non-Goals**
- No new dependencies. No remote services. No public extension API change. No popup UX change.
- No change to the `local-ai` (Browser) branch of `withSummaries`, to `createFinalExport`'s Browser path, or to the `local-ai` neutral `## Summary` heading already in place.
- No change to the focus extraction in `createFocusedSummarySource`, the language-detection contract, or the local-AI capability state machine.
- No TF-IDF, no language-model fallback, no per-page summarization model.

## Decisions

### Decision 1: Bare `>` blockquote replaces the per-block bold label
**Choice.** Each Custom per-block summary in `withSummaries` (src/export-compression.ts:292) is emitted as a single bare `>` line holding the selected sentence(s), without the `**Custom extractive summary**` label. The blockquote marker itself, plus the unchanged YAML `compression_mode` / `summary_origin` fields, plus the unchanged popup metadata, convey "this is summarised".
**Alternatives considered.** A single top-of-document `## Summary` heading (mirroring the `local-ai` branch at src/export-compression.ts:282) was rejected because the user wants the summary inline at the summarisable blocks, not lifted out. A smaller inline cue (HTML comment, italicised label) was rejected because the bare `>` already matches the existing `> Conversion limitation:` style and costs only the marker plus one sentence.
**Why.** This is the form the user offered ("would it be better if we have just a `>`") and it is consistent with the spec's existing prohibition on repeated application labels for the `local-ai` path (canonical `local-ai-markdown-compression` requirement: "without the repeated application label `Locally generated summary`"). Extending the same prohibition to Custom is consistent.

### Decision 2: Position-aware decay in `relevanceScores`
**Choice.** Add a per-block position-aware decay to the relevance score: after the first sentence in a block is selected, subsequent candidates pay a sentence-index penalty so that the second and later sentences have to outrank the first sentence's residual relevance, scaled by `detail`. Concretely, the bonus currently given to the first sentence (`+0.25`) is reduced by a factor tied to whether another sentence in the same block has already been selected, so a later candidate with equal raw relevance can outrank the first sentence when the first sentence is already chosen.
**Alternatives considered.** A heading-aware boost (raise relevance for sentences in primary headings and the Conclusion section) was considered but rejected — it requires a new classifier for "primary heading" / "Conclusion" and risks regression on pages without those headings. TF-IDF was rejected as out of scope: it adds a new dependency surface and test matrix for a single defect class. Pure first-sentence penalty without `detail`-scaling was rejected because the user's `detail` value should still modulate the strength of the position bias.
**Why.** Position-decay directly addresses the four transitional glue picks on the Pingora article (first-sentence bias) and the Conclusion miss (early-block bias) without changing the MMR contract's `0.7 × relevance − 0.3 × max lexical similarity` form. The MMR body remains identical; only the relevance input changes.

### Decision 3: Smoothed per-block ratio curve replaces the `Math.max(0.1, …)` floor
**Choice.** Replace `extractiveSentenceRatio = Math.max(0.1, normalized / 100)` in `detailPolicy` (src/export-compression.ts:18) with a curve that is a monotonic non-increasing function of `detail` for `detail ∈ [0, 100]`, reaches 0 only at `detail = 100`, and never falls below a small content-aware floor (≥ 1 sentence per block) when `detail < 100`. The exact curve is `extractiveSentenceRatio = max(0, min(1, normalized / 100))` for the per-block ratio, with a separate hard guarantee that `selectionCount >= 1` when `policy.summaryEnabled` is true.
**Alternatives considered.** Keeping the `0.1` floor (predictable per-block coverage, low risk) was rejected because it produced a flat per-block summary at low Detail, which is the user's complaint. Dropping the floor entirely (relying on `retainRatio` alone) was rejected because it can leave summarizable blocks with zero selected sentences, violating the spec requirement "Custom extraction SHALL … retain a source-anchored representation for each non-retained prose block" without an explicit per-block summary marker. A stepped curve was rejected because the user asked for "smooth" scaling.
**Why.** Linear `detail / 100` makes the per-block ratio scale smoothly with Detail, the existing `selectionCount = max(1, ceil(candidates.length * ratio))` guarantee ensures at least one sentence is summarised per non-retained block, and the spec's monotonic non-increasing bytes/words requirement is now true by construction.

### Decision 4: MMR contract version bump to version-2
**Choice.** The Custom extraction contract is bumped from version 1 to version 2 because both the relevance input (position-decay) and the per-block ratio curve change. `DetailPolicy.version` is updated to 2 (src/export-compression.ts:19-26).
**Alternatives considered.** Keeping version 1 and silently changing the relevance input was rejected because the existing export consumers (popup, copy/download, preview) may rely on stable per-Detail behavior. A new `policyVersion` field on `ExportMetadata` (already present, currently `1`) is bumped alongside the `DetailPolicy.version`.
**Why.** Versioning makes the breaking change observable and lets any downstream fixture or benchmark pin to the previous version if needed.

### Decision 5: Test updates are part of the change
**Choice.** `tests/export-compression.test.ts:164,174` and `tests/preview-output.test.ts:21,23` are updated to assert on the bare `>` blockquote shape, on `compression_mode: custom-extractive`, on `summary_origin: deterministic-diverse-extractive`, and on `generated_summary_count` — not on the literal `Custom extractive summary` string.
**Alternatives considered.** Leaving the assertions as-is was rejected because they would fail on the new framing, blocking the build. Removing the assertions was rejected because they protect the public Markdown contract.
**Why.** They must be updated in the same PR to keep CI green; they belong to Apply, not Propose, but Propose records them so Apply cannot miss them.

## Risks / Trade-offs

- **[Risk] Position-decay may over-correct and skip first-sentence leads entirely on pages where the first sentence IS the strongest signal.** → Mitigation: decay is scaled by `detail`; at high Detail the first-sentence penalty is smaller, so the original bias dominates. The benchmark archive (`tests/benchmark-build.test.ts`, `tests/benchmark-app.test.ts`, `tests/benchmark-runner.test.ts`) runs against the fixture set and will catch systematic regressions.
- **[Risk] Linear `detail / 100` curve may produce too few sentences at very low Detail on long blocks.** → Mitigation: the `selectionCount = max(1, …)` guarantee keeps at least one sentence per block, satisfying the spec scenario "Detail always summarises something".
- **[Risk] Bare `>` blockquote may be visually confusable with the existing `> Conversion limitation:` blockquote in the popup preview.** → Mitigation: the preview renderer already disambiguates by surrounding context (heading lines, content); the spec scenario "Custom extraction never repeats the application label" keeps the user's "noticeable" requirement satisfied without introducing a new visual cue.
- **[Risk] Version bump (v1 → v2) may break a downstream consumer pinning to v1.** → Mitigation: the only known consumers are inside this repo (popup, preview, copy, download); none pin to v1 explicitly. The fixture archive's expected Markdown files do not pin to a `policyVersion` field.

## Migration Plan

1. Land the source change behind the existing `provider === 'custom'` path. No data migration. No settings migration.
2. Apply carries the test updates in the same commit chain so CI does not see the failing assertions mid-stream.
3. Archive the change after implementation, sync the modified `local-ai-markdown-compression` delta spec to the canonical spec, and bump the policy version recorded in `ExportMetadata`.

## Open Questions

- Should `policyVersion` on `ExportMetadata` also be bumped from 1 to 2, or stay at 1 because it tracks the export artifact format and not the policy itself? Propose's answer: bump it, because the user-visible artifact format changes (bare `>` instead of bold label).
- Should the position-decay factor be a function of `detail` directly, or of `Math.max(1, candidates.length)` (block length)? Propose's answer: function of `detail` directly, because the user's complaint is about Detail behaviour across blocks, not within a single block.