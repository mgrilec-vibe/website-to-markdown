## Why

The Custom extractive summarizer wastes tokens by repeating the literal phrase `Custom extractive summary` once per summarizable block (13 repetitions on the Cloudflare Pingora article at Detail 50), and its relevance scoring selects transitional glue over signal-rich sentences — on the same article it picked four high-frequency transitional sentences as the lone representative of their sections and picked a single one-line teaser as the Conclusion's lone representative, producing a net result of only −208 words / −1265 bytes versus the un-summarized baseline. The current `Math.max(0.1, normalized / 100)` per-block ratio floor also keeps Detail behavior flat at the low end, so users see little benefit from lowering Detail.

## What Changes

- Drop the per-block bold `**Custom extractive summary**` label inside `withSummaries` (src/export-compression.ts:292). Replace it with a single bare `>` blockquote per summarized block, keeping the existing `> Conversion limitation:` style consistent. The marker remains visible (the blockquote itself, plus the YAML frontmatter `compression_mode: custom-extractive` and `summary_origin: deterministic-diverse-extractive`) without paying for the literal phrase on every block.
- Rework `extractiveSummaries` targeting so the Custom derivative does not repeatedly select high-frequency-token glue. Replace the raw per-sentence token-frequency sum in `relevanceScores` (src/export-compression.ts:228) with a document-frequency-damped score — divide each token's frequency by `1 + log(documentCount)` where `documentCount` is the number of distinct source sentences on the page that contain the token. This downweights tokens common across many sentences (e.g., "today", "we", "the") and upweights signal-bearing tokens, addressing the four glue picks on the Pingora article and the Conclusion miss without introducing new dependencies, a model, or a classifier. The MMR body (`0.7 × normalized relevance − 0.3 × maximum lexical similarity`) remains unchanged; only the relevance input changes.
- Replace the per-block `extractiveSentenceRatio` floor (`Math.max(0.1, normalized / 100)`) with a linear curve `max(0, min(1, normalized / 100))` that scales smoothly with `detail` from 0 through 100, reaching 0 only at Detail 100. The existing `selectionCount = max(1, ceil(candidates.length * ratio))` guarantee ensures at least one sentence per non-retained summarizable block for any `detail < 100`. Detail 100 keeps the existing no-summary path.
- Require the Custom export's measured **word count** for a fixed focused input to be a monotonic non-increasing function of `detail` over `[0, 100]`. Byte count is best-effort: it may increase by a small amount at a block transition where a retained block becomes summarised (the per-block summary costs a `> ` marker plus the retained sentence's length), so the spec does NOT require byte monotonicity.
- Update tests that assert on the literal `Custom extractive summary` label (tests/export-compression.test.ts:164,174 and tests/preview-output.test.ts:21,23) to assert on the bare `>` blockquote shape and on the unchanged `compression_mode` / `summary_origin` / `generated_summary_count` metadata.
- Bump the literal version markers: `DetailPolicy.version` from `1` to `2` and `ExportMetadata.policyVersion` from `1` to `2` in `src/export-domain.ts` (these are TypeScript literal types, so the type definitions must be widened alongside the value bumps). `EXPORT_FORMAT_VERSION` (src/export-domain.ts:1) is unchanged.
- Update the canonical capability `local-ai-markdown-compression` to forbid repeated application labels in the Custom extractive output and to require the word-count, Detail-linear curve, and document-frequency-damping targeting described above.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `local-ai-markdown-compression`: requirement changes for the Custom extractive summary fallback — the per-block repeated-label prohibition, the targeting change to document-frequency damping, the Detail-curve change, and the word-count monotonicity requirement.

## Impact

- `src/export-compression.ts` — `detailPolicy`, `relevanceScores` (double the work: also compute a per-token document-count map from the existing `sentences` list), `withSummaries` (Custom branch only; the `local-ai` branch and its `## Summary` heading are untouched). No new file, no new dependency.
- `src/export-domain.ts` — widen the `DetailPolicy.version` literal type from `1` to `2` and the `ExportMetadata.policyVersion` literal type from `1` to `2`. `EXPORT_FORMAT_VERSION` is unchanged.
- `tests/export-compression.test.ts`, `tests/preview-output.test.ts`, `tests/popup-app.test.ts:40` — assertion updates for the new framing, the new `policyVersion: 2` value, and the word-count delta scenario. `tests/popup-app.test.ts:40` constructs an `ExportMetadata` literal that includes `policyVersion: 1` and must be updated.
- `openspec/specs/local-ai-markdown-compression/spec.md` — delta requirement added for the repeated-label prohibition and word-monotonicity; delta requirement modified for the Custom targeting and Detail curve.
- `tests/fixtures/evaluation/technical-blog-cloudflare-pingora/` — no fixture change; the change uses this fixture as the regression anchor.
- No new dependencies. No remote services. No public extension API change. The popup UX is unchanged; the exported Markdown shape changes only in the bare-`>` framing and per-block sentence selection. `src/export-workflow.ts` is not modified (it calls `deterministicExtractiveCompression` unchanged).