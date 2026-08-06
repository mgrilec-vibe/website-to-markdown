## 1. Source change: framing

- [x] 1.1 In `src/export-compression.ts`, modify `withSummaries` so the Custom (`origin !== 'local-ai'`) branch emits each per-block summary as a single bare `>` line holding the selected sentence(s), removing the `**Custom extractive summary**` label and the blank `>` separator line. The `local-ai` branch and its `## Summary` heading must remain unchanged.
- [x] 1.2 Verify the exported Markdown contains zero occurrences of the literal phrase `Custom extractive summary` for any Custom provider export, across Detail values 0, 15, 40, 50, 65, 85, and 100.

## 2. Source change: Detail curve

- [x] 2.1 In `src/export-compression.ts`, update `detailPolicy` to compute `extractiveSentenceRatio = max(0, min(1, normalized / 100))` (dropping the `Math.max(0.1, …)` floor) and keep the existing `selectionCount = max(1, ceil(candidates.length * ratio))` guarantee (src/export-compression.ts:247). Bump `DetailPolicy.version` from `1` to `2` in the same change.
- [x] 2.2 In `src/export-domain.ts`, widen the `DetailPolicy.version` literal type to `1 | 2` and the `ExportMetadata.policyVersion` literal type to `1 | 2`. Update the initialiser at `src/export-compression.ts:118` to `policyVersion: 2`. `EXPORT_FORMAT_VERSION` (src/export-domain.ts:1) is unchanged.
- [ ] 2.3 Verify, against the `technical-blog-cloudflare-pingora` fixture, that measured **words** are monotonic non-increasing as Detail decreases from 100 through 0. Confirm that **bytes** are NOT asserted monotonic; record the largest byte increase observed at a single-block transition as evidence (expected to be small, ≤ the `> ` marker overhead plus the retained sentence length).

## 3. Test updates

- [ ] 3.1 In `tests/export-compression.test.ts`, replace the two `expect(result.markdown).toContain('Custom extractive summary')` assertions (around lines 164 and 174) with assertions on the bare `>` blockquote shape and on the unchanged `compression_mode: custom-extractive`, `summary_origin: deterministic-diverse-extractive`, `generated_summary_count`, and `policyVersion: 2` metadata.
- [ ] 3.2 In `tests/preview-output.test.ts`, replace the literal `'> **Custom extractive summary**\n>\n> Selected source sentence.'` input (around line 21) and the `'Custom extractive summary'` strong-text assertion (around line 23) with inputs and assertions matching the bare `>` shape.
- [ ] 3.3 In `tests/popup-app.test.ts:40`, update the `ExportMetadata` literal's `policyVersion: 1` to `policyVersion: 2` so the test fixture matches the widened type and the new runtime value.
- [ ] 3.4 In `tests/export-ai.test.ts:35`, update the `DetailPolicy` literal's `version: 1` to `version: 2` so the test fixture matches the widened type and the new runtime value.
- [ ] 3.5 Confirm `tests/export-workflow.test.ts`, `tests/export-ai.test.ts`, and `tests/markdown-export.test.ts` still pass without modification beyond 3.4; if any assertion there asserts on the literal `Custom extractive summary` marker or on `policyVersion: 1`, update it to match the new framing and version.

## 4. Verification

- [ ] 4.1 Run the existing benchmark build (`tests/benchmark-build.test.ts`, `tests/benchmark-app.test.ts`, `tests/benchmark-runner.test.ts`) against `tests/fixtures/evaluation/`. If any fixture's expected Markdown references the custom-extractive output with the old `**Custom extractive summary**` marker, regenerate the fixture's expected Markdown as part of Apply and confirm the benchmark passes; otherwise confirm no fixture changes.
- [ ] 4.2 Run `tests/export-compression.test.ts`, `tests/export-workflow.test.ts`, `tests/export-ai.test.ts`, `tests/preview-output.test.ts`, `tests/settings-app.test.ts`, `tests/popup-app.test.ts`, and `tests/markdown-export.test.ts` to confirm the green-build contract holds.
- [ ] 4.3 Run `openspec validate improve-custom-extractive-summary-targeting --type change --strict` and require zero errors.
