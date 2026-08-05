## 1. Source change: framing

- [ ] 1.1 In `src/export-compression.ts`, modify `withSummaries` so the Custom (`origin !== 'local-ai'`) branch emits each per-block summary as a single bare `>` line holding the selected sentence(s), removing the `**Custom extractive summary**` label and the blank `>` separator line. The `local-ai` branch and its `## Summary` heading must remain unchanged.
- [ ] 1.2 Verify the exported Markdown contains zero occurrences of the literal phrase `Custom extractive summary` for any Custom provider export, across Detail values 0, 15, 40, 50, 65, 85, and 100.

## 2. Source change: position-aware decay

- [ ] 2.1 In `src/export-compression.ts`, update `relevanceScores` so that, after a sentence in the same block has already been selected by the greedy loop, subsequent candidates pay a sentence-index penalty scaled to `detail`. The MMR body (`0.7 × relevance − 0.3 × max lexical similarity`) must remain identical.
- [ ] 2.2 Verify, against the `tests/fixtures/evaluation/technical-blog-cloudflare-pingora/` fixture, that the four transitional glue sentences ("Today, we're focusing on a different part of the equation…", "Let's fast-forward to the present.", "As mentioned in past blog posts, we have workarounds for some of these issues.", "We will also be back with our plan to open source it.") are no longer preferentially selected at Detail 50.
- [ ] 2.3 Verify the Conclusion section contributes at least one of its signal-rich sentences (e.g., "To summarize, we have built an in-house proxy…") to the Custom export at Detail 50.

## 3. Source change: Detail curve

- [ ] 3.1 In `src/export-compression.ts`, update `detailPolicy` to compute `extractiveSentenceRatio = max(0, min(1, normalized / 100))` and keep the existing `selectionCount = max(1, ceil(candidates.length * ratio))` guarantee. Bump `DetailPolicy.version` from 1 to 2.
- [ ] 3.2 In `src/export-domain.ts` (or wherever `ExportMetadata.policyVersion` is initialised), bump `policyVersion` from 1 to 2 so the exported artifact records the new policy version.
- [ ] 3.3 Verify, against the `technical-blog-cloudflare-pingora` fixture, that measured bytes and words are monotonic non-increasing as Detail decreases from 100 through 0 (per the spec scenario "Lower Detail never grows the Custom export").

## 4. Test updates

- [ ] 4.1 In `tests/export-compression.test.ts`, replace the two `expect(result.markdown).toContain('Custom extractive summary')` assertions (around lines 164 and 174) with assertions on the bare `>` blockquote shape and on the unchanged `compression_mode: custom-extractive`, `summary_origin: deterministic-diverse-extractive`, and `generated_summary_count` metadata.
- [ ] 4.2 In `tests/preview-output.test.ts`, replace the literal `'> **Custom extractive summary**\n>\n> Selected source sentence.'` input (around line 21) and the `'Custom extractive summary'` strong-text assertion (around line 23) with inputs and assertions matching the bare `>` shape.
- [ ] 4.3 Add a regression test that exports the `technical-blog-cloudflare-pingora` focused fixture with the Custom provider at Detail 50 and asserts: (a) zero occurrences of `Custom extractive summary`, (b) each non-retained summarizable block contributes exactly one bare `>` blockquote summary line, (c) measured bytes ≤ baseline bytes minus the prior Detail-50 byte count's per-block marker overhead.
- [ ] 4.4 Add a regression test that runs the same fixture at Detail 0, 50, 85, and 100 and asserts the monotonic non-increasing bytes/words relationship.
- [ ] 4.5 Confirm `tests/export-workflow.test.ts` and `tests/export-ai.test.ts` still pass without modification; if any assertion there asserts on the literal `Custom extractive summary` marker, update it to match the new framing.

## 5. Verification

- [ ] 5.1 Run the existing benchmark build (`tests/benchmark-build.test.ts`, `tests/benchmark-app.test.ts`, `tests/benchmark-runner.test.ts`) against `tests/fixtures/evaluation/` and confirm no fixture's expected Markdown changes (the fixture archive pins Markdown output and is the regression guard).
- [ ] 5.2 Run `tests/export-compression.test.ts`, `tests/export-workflow.test.ts`, `tests/export-ai.test.ts`, `tests/preview-output.test.ts`, `tests/settings-app.test.ts`, `tests/popup-app.test.ts`, and `tests/markdown-export.test.ts` to confirm the green-build contract holds.
- [ ] 5.3 Run `openspec validate improve-custom-extractive-summary-targeting --type change --strict` and require zero errors.
- [ ] 5.4 Smoke the change by exporting the `technical-blog-cloudflare-pingora` fixture end-to-end at Detail 50 and confirming: byte count is materially lower than the user's failing baseline (2073 words / 16761 bytes), zero `Custom extractive summary` literals appear, and the Conclusion section contributes a signal-rich sentence.