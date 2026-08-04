## Why

Chrome Summarizer currently receives the heterogeneous Markdown fragments that Detail compression plans to remove, so complete-page navigation, article prose, sidebars, and footer labels can be combined into an off-topic summary and inserted at the final omitted block. Focused benchmark evidence is cleaner but still places a vague summary inside an example; the product needs coherent primary-content input, stable placement, quota-aware sizing, and a focused-only user path.

## What Changes

- Select one coherent primary content unit for Browser local-AI summarization instead of treating every summarizable compression remainder as a homogeneous model input.
- Generate a single page summary independently from deterministic Detail retention, and place it at a stable semantic boundary near the beginning of the focused result.
- Normalize selected model input to readable plain text while preserving meaningful technical identifiers and section context.
- Replace the hardcoded 5,000-character capacity assumption with Chrome `inputQuota` and `measureInputUsage()` checks; use deterministic section boundaries when selected content exceeds quota.
- Supply documented shared and per-request context describing the page role, audience, and summary focus without relying on unrestricted prompting.
- Render a neutral `Summary` section rather than the application-injected `Locally generated summary` label; retain `summary_origin: local-ai` in export metadata.
- **BREAKING**: Hide Complete page mode from production settings, normalize legacy saved `complete` preferences to `focused`, and run user-facing benchmark matrices in focused mode only. Retain internal complete-conversion regression coverage as an adversarial classifier check.
- Keep the existing bounded summary-of-summaries algorithm unchanged in this change; the inspected failing runs used one chunk, so reduction policy is a separate future decision.
- Reuse the existing benchmark archive and approved MDN fixture to verify input selection, placement, output metadata, deterministic fallback, and focused Browser@40 quality without adding a parallel harness.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `local-ai-markdown-compression`: Change Browser summary source selection, quota handling, input normalization, context, placement, visible labeling, metadata consistency, and regression expectations.
- `extension-export-preferences`: Make focused export the only production-selectable mode and migrate legacy Complete preferences safely.

## Impact

- Affected conversion/compression contracts: Markdown block semantics, focused-content selection, Browser summary orchestration, summary insertion, and export metadata.
- Affected UI and persistence: settings mode control and preference normalization.
- Affected benchmark behavior: user-facing matrices become focused-only while existing complete-mode converter tests remain internal regression coverage.
- Affected tests: classifier roles, quota-aware summarization adapters, summary placement, language metadata propagation, legacy preference migration, and benchmark archive assertions.
- No page content is transmitted; Chrome on-device generation and deterministic fallback boundaries remain unchanged.
