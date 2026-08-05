## Why

The Custom extractive summarizer wastes tokens by repeating the literal phrase `Custom extractive summary` once per summarizable block (13 repetitions on the Cloudflare Pingora article at Detail 50), and its frequency-only relevance scoring selects transitional glue over signal-rich sentences — on the same article it picked a single one-line teaser as the Conclusion's lone representative, producing a net result of only −208 words / −1265 bytes versus the un-summarized baseline. The current `Math.max(0.1, normalized / 100)` per-block ratio floor also keeps Detail behavior flat at the low end, so users see little benefit from lowering Detail.

## What Changes

- Drop the per-block bold `**Custom extractive summary**` label inside `withSummaries` (src/export-compression.ts:292). Replace it with a single bare `>` blockquote per summarized block, keeping the existing `> Conversion limitation:` style consistent. The marker remains visible (the blockquote itself, plus the YAML frontmatter `compression_mode: custom-extractive` and `summary_origin: deterministic-diverse-extractive`) without paying for the literal phrase on every block.
- Rework `extractiveSummaries` targeting so the Custom derivative does not repeatedly select first-sentence and early-block glue. Add a small position-aware decay: after a block's first sentence is selected, subsequent candidates in the same block pay a sentence-index penalty scaled to `detail`. This addresses the four transitional glue picks on the Pingora article and the Conclusion miss without introducing TF-IDF or new dependencies.
- Replace the per-block `extractiveSentenceRatio` floor (`Math.max(0.1, normalized / 100)`) with a curve that scales smoothly with `detail` from 0 through 100. Detail 0 produces a small, content-aware per-block summary; Detail 100 keeps the existing no-summary path. The user-visible contract: lowering Detail always reduces output, and Detail still produces a real per-block summary at every value below 100.
- Update tests that assert on the literal `Custom extractive summary` label (tests/export-compression.test.ts:164,174 and tests/preview-output.test.ts:21,23) to assert on the bare `>` blockquote shape and on the unchanged `compression_mode` / `summary_origin` / `generated_summary_count` metadata.
- Update the canonical capability `local-ai-markdown-compression` to forbid repeated application labels and to require a documented, monotonically non-increasing relationship between Detail and output size for the Custom provider.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `local-ai-markdown-compression`: requirement changes for the Custom extractive summary fallback — the per-block repeated-label prohibition, the targeting change to position-decay, and the Detail-curve change.

## Impact

- `src/export-compression.ts` — `extractiveSummaries`, `detailPolicy`, `withSummaries` (the custom-extractive branch only; the `local-ai` branch and its `## Summary` heading are untouched).
- `src/export-workflow.ts` — `createFinalExport` and the `provider === 'custom'` path that delegates to `deterministicExtractiveCompression`; no public-API change.
- `tests/export-compression.test.ts`, `tests/preview-output.test.ts` — assertion updates for the new framing and for the per-Detail byte/word deltas.
- `openspec/specs/local-ai-markdown-compression/spec.md` — delta requirement added for the repeated-label prohibition; delta requirement modified for the Custom targeting and Detail curve.
- `tests/fixtures/evaluation/technical-blog-cloudflare-pingora/` — no fixture change; the change uses this fixture as the regression anchor.
- No new dependencies. No remote services. No public extension API change. The popup UX is unchanged; the exported Markdown shape changes only in the bare-`>` framing and per-block sentence selection.