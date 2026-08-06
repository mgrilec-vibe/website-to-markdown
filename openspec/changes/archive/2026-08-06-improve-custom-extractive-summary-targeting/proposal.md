## Why

The Custom extractive summarizer wastes tokens by repeating the literal phrase `Custom extractive summary` once per summarizable block (13 repetitions on the Cloudflare Pingora article at Detail 50), and the current `Math.max(0.1, normalized / 100)` per-block ratio floor keeps Detail behavior flat at the low end, so users see little benefit from lowering Detail.

## What Changes

- Drop the per-block bold `**Custom extractive summary**` label inside `withSummaries` (src/export-compression.ts:292). Replace it with a single bare `>` blockquote per summarized block. The marker remains visible (the blockquote itself, plus the YAML frontmatter `compression_mode: custom-extractive` and `summary_origin: deterministic-diverse-extractive`) without paying for the literal phrase on every block.
- Replace the per-block `extractiveSentenceRatio` floor (`Math.max(0.1, normalized / 100)`) with a linear curve `max(0, min(1, normalized / 100))` that scales smoothly with `detail` from 0 through 100, reaching 0 only at Detail 100. The existing `selectionCount = max(1, ceil(candidates.length * ratio))` guarantee ensures at least one sentence per non-retained summarizable block for any `detail < 100`.
- Bump the literal version markers: `DetailPolicy.version` from `1` to `2` and `ExportMetadata.policyVersion` from `1` to `2` in `src/export-domain.ts` (literal types widened to `1 | 2`). The initialiser at `src/export-compression.ts:118` is bumped to `policyVersion: 2`. `EXPORT_FORMAT_VERSION` is unchanged.
- Update tests that assert on the literal `Custom extractive summary` label (`tests/export-compression.test.ts:164,174` and `tests/preview-output.test.ts:21,23`) and on `policyVersion: 1` (`tests/popup-app.test.ts:40`) to match the new bare `>` framing and version-2 metadata.
- Update the canonical capability `local-ai-markdown-compression` to forbid repeated application labels in the Custom extractive output, require the linear Detail curve, and require the word-count monotonicity property.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `local-ai-markdown-compression`: requirement changes for the Custom extractive summary fallback — the per-block repeated-label prohibition, the Detail-curve change (linear `max(0, min(1, normalized/100))` replacing the `0.1` floor), and the word-count monotonicity requirement. The targeting/relevance scoring change (document-frequency damping) is OUT OF SCOPE for this increment; it will be addressed in a separate future change.

## Impact

- `src/export-compression.ts` — `detailPolicy` (curve + version bump), `retentionPriority` / `retainedSummarizable` (stable nested retention), `extractiveSummaries` usage (stable all-eligible scoring input and Detail-0 guard), `withSummaries` (Custom branch only; bare `>` framing), and `countWords` (standalone `>` markers excluded from word counts). The `local-ai` branch and its `## Summary` heading are untouched. `relevanceScores` and its formula are NOT changed in this increment.
- `src/export-domain.ts` — widen the `DetailPolicy.version` and `ExportMetadata.policyVersion` literal types from `1` to `1 | 2`. `EXPORT_FORMAT_VERSION` is unchanged.
- `tests/export-compression.test.ts`, `tests/preview-output.test.ts`, `tests/popup-app.test.ts:40` — assertion updates for the new framing and `policyVersion: 2`.
- `openspec/specs/local-ai-markdown-compression/spec.md` — delta requirement modified for the Custom repeated-label prohibition, Detail curve, and word-count monotonicity.
- No targeting change. No `relevanceScores` change. No new dependencies. No remote services. No public extension API change. `src/export-workflow.ts` is not modified.