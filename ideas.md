# Document Journey prototype — planning

Status: Planning only — not implemented. No source, test, or OpenSpec changes have been made.

## Source

- Prototype image: `Generated image 2 (3).png` at the repository root on `origin/main` (commit `065620d`). The asset is referenced by name only; the path may be reorganized before implementation begins.

## What the prototype shows

The design is a "Document Journey" rebrand of the extension popup with three states and an icon specimen.

- **READY state** — branded header, "Capture any article. Export clean Markdown." tagline, segmented `Focused article` / `Complete page` selector with one-line captions under each option, a summarization/detail row, a "Build Markdown" primary action, and a "Runs locally in your browser" footer with a shield glyph.
- **CONVERTING state** — a stepper (`Capture ✓ → Convert ● → Finalize ○`), a centered circular progress ring with a `.md` glyph dead-center and a "Building Markdown · 64%" label, and the same local-only footer.
- **DONE state** — a source card with title and host (`Focusing Attention: Why Focus Beats Motivation for Deep Work · fs.blog`), a Markdown ready notice, `Copy Markdown` (primary) and `Download .md` (secondary) buttons, a stats row (`12.4 KB / Markdown size`, `3,184 tokens / Approximate`), a one-line preview teaser (`Preview: # Why Focus Beats Motivation for Deep Work …`), and an `Open full preview` affordance.
- **Icon specimen** — `.md` glyph rendered as a rounded square at 16 / 24 / 32 px in monochrome, light tint, and dark tint variants.

## Current extension baseline

Mapped against existing code so the list reflects "exists, needs restyle" versus "new".

- `entrypoints/popup/main.ts` and `src/popup-app.ts` already mount a single popup that captures, converts, and shows a preview plus copy/download.
- `src/export-preferences.ts` already persists `mode` (`focused`/`complete`), `provider` (`none`/`browser`/`custom`), `detail` (0–100), and `autoCopy`.
- `src/export-workflow.ts` already emits `converting` / `summarizing` phase progress via `FinalExportProgress`, but not sub-phases or percentages.
- `src/capture.ts` already provides `title`, `sourceUrl`, and `canonicalUrl` for the source card.
- `src/export-metrics.ts` already computes byte count and a heuristic token estimate.
- `src/preview-output.ts` already renders a full Markdown preview and is mounted into the popup.
- `src/export-styles.css` already provides layout primitives (`.export-popup`, `.actions`, `.success`, `.notice`, `.link-button`, segmented-row look is not present yet).

## Viable work items, ordered by complexity

Items below are grouped by effort. Each item records whether it is new or a restyle, the existing surface it touches, and any open decisions before implementation.

### Low — markup, copy, restyling on existing behavior

1. **Rebrand copy and footer.** Replace existing eyebrow + titles with "Document Journey" / "Capture any article. Export clean Markdown." Add the "Runs locally in your browser" footer with shield glyph to all three states. Existing: popup header text, settings link, footer-less result.
2. **READY-state segmented selector.** Replace the current single-row toggle with the `Focused article` / `Complete page` segmented control and one-line captions ("Best for reading and review.", "Keep the full content.", "Good balance of brevity and completeness."). Existing: `mode` preference field in `ExportPreferences`.
3. **DONE-state primary/secondary actions.** Restyle the existing copy/download buttons to match `Copy Markdown` (primary) and `Download .md` (secondary). Existing: copy + download flow in `popup-app.ts` and `src/markdown-export.ts`.
4. **Show source title + host on DONE.** Render `captured.metadata.title` and the host of `captured.metadata.sourceUrl`. Existing: metadata already collected in `capture.ts`.
5. **Compact preview teaser.** Replace the current full inline preview with a one-line teaser truncated from the first heading. Existing: full preview remains available via "Open full preview".

Open decision: confirm teaser is first heading only (prototype shows `# Why Focus Beats Motivation for Deep Work …`) or first N characters.

### Medium — new components, modest state plumbing

6. **Stats row (KB + token estimate).** Add a `.stats` block with Markdown size in KB and approximate tokens. Existing: `result.metadata.bytes` already provides KB; `estimateMarkdownTokens` exists in `src/export-metrics.ts` but is a heuristic (`Math.ceil(chars/4)` style). Decision required: keep the heuristic for v1 or swap in a real tokenizer (e.g., gpt-tokenizer or `@dqbd/tiktoken`). Tokenizer swap is a dependency and bundle-size change, so treat it as a separate task if chosen.
7. **CONVERTING stepper (`Capture → Convert → Finalize`).** Add a `Stepper` component and expose named sub-phases from the workflow so the stepper can advance. Existing: `FinalExportProgress` is two-value; needs three named sub-phases plus a mapping from `captureActiveTab` → `convertCapturedPage` → `summarize`/`finalize`.
8. **Centered circular progress ring.** SVG ring with the `.md` glyph centered. Track + progress arc, light/dark safe. Existing: none. Use `prefers-reduced-motion` to disable the stroke animation.
9. **`Open full preview` affordance.** Link from the popup to a dedicated extension page that loads the stored export by ID. Existing: `preview-output.ts` can be reused, but the popup cannot host an expanded preview reliably because of MV3 action popup sizing. Decision required: separate extension page (preferred), modal dialog, or popup-expansion hack. Separate page is the safest target.

Open decisions for medium items:
- Real token counting vs. heuristic (item 6).
- Sub-phase names and boundaries for the stepper (item 7).
- Full preview surface: dedicated page vs. in-popup expansion (item 9).

### Higher — instrumentation, design assets, accessibility

10. **Real structured progress with percent.** `export-workflow.ts` currently runs conversion and summarization synchronously relative to the popup. To drive a real percentage, capture, conversion, and finalization must emit stage + percent. Decision required: define progress units (parser milestones, block count, summary chunks) and emit them. Do not ship a fake percentage.
11. **Icon specimen deliverable.** Produce actual `.png` and `.svg` assets at 16 / 24 / 32 px in light tint, dark tint, and monochrome variants. Wire them into `wxt.config.ts` action icons and the toolbar. Decision required: source (designer export vs. generated), file naming, and which surfaces use which variant.
12. **Responsive and accessibility pass.** Focus rings, keyboard operation across the segmented control, ARIA live regions for the converting and done states, reduced-motion support for the ring, high-contrast fallback, and explicit light/dark theming. Decision required: do this alongside the popup redesign, not as deferred polish.
13. **`favIconUrl` for source thumbnails (if pursued).** MV3 requires either the `tabs` permission to read `activeTab.favIconUrl` or a content-script probe to extract the icon link. Not zero-cost: adds a permission, content-script surface, or per-page extraction step. Flagged here so it is not assumed to be a 5-minute add.

Open decisions for higher items:
- Sub-phase vs. work-unit progress model (item 10).
- Whether `favIconUrl` thumbnails are part of v1 or a follow-up (item 13).

## Dependencies and prerequisites

- Items 7, 8, 10 form a single design slice: real progress is needed before the stepper can advance and the ring can show a meaningful percentage. Do them together.
- Item 9 (full preview) is independent of progress work and can ship earlier if a dedicated extension page is acceptable.
- Items 11, 12, 13 are independent deliverables but should accompany the popup redesign.
- The existing preferences model already covers `mode`, `provider`, `detail`, and `autoCopy`; the READY-state redesign should decide between per-export overrides and persisted defaults before implementation (prototype implies per-export).

## Recommended delivery order

1. Rebrand copy + footer + DONE action restyle + source title/host (Low).
2. READY-state segmented selector + captions.
3. Stats row with existing heuristic token estimate.
4. Compact preview teaser.
5. Dedicated full preview page behind `Open full preview`.
6. CONVERTING stepper + ring (with realistic sub-phases).
7. Real structured progress with percent.
8. Icon specimen assets wired into `wxt.config.ts`.
9. Accessibility and reduced-motion pass.
10. Decide whether `favIconUrl` thumbnails and a real tokenizer are in scope.

## Risks and non-goals for this work

- Token count must be honestly labeled as approximate until a real tokenizer is wired in.
- The popup cannot host a full Markdown preview reliably; the teaser + dedicated preview page model should not regress into trying to expand the action popup.
- Source thumbnails require additional permissions or content-script work; do not promise them without deciding the cost.
- Progress percentage must not be a fake value; ship the ring as indeterminate until real work-unit progress exists.

## Reorganization note

The prototype asset currently sits at the repository root with a generic filename (`Generated image 2 (3).png`). Implementation planning should confirm a final path under `design/` or similar before any code work begins. No path change has been made locally.
