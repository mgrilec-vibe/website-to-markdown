## Context

The production popup currently receives saved provider, Detail, and automatic-copy preferences, immediately captures the active tab from `mountExportPopup`, always passes `focused` to `createFinalExport`, and renders the returned Markdown through `preview-output.ts` and `markdown-render.ts`. The conversion and compression layers already support `ExportMode = 'focused' | 'complete'`, and Browser summarization already derives its input from a separate focused conversion even when the result mode differs.

The target keeps the extension name **Website to Markdown**, adds an explicit READY configuration state, restores Complete page as a one-export choice, and replaces the rendered document with a compact receipt. Page content must remain local and must not enter popup HTML. The workstation must not install or load the production extension into local Chrome for verification.

## Goals / Non-Goals

**Goals:**

- Open in READY without capturing or processing the active tab.
- Let the user choose Focused article or Complete page, provider, and Detail for one export.
- Seed READY from focused mode plus saved provider and Detail defaults while leaving saved settings unchanged.
- Snapshot selections when Build Markdown is activated and use the same snapshot for processing and retry.
- Preserve exact copy/download bytes, automatic-copy behavior, local-AI fallback, diagnostics, limitations, and provenance.
- Present a compact, accessible completion receipt without rendering Markdown or captured source content.
- Remove preview-only code and dependencies after proving they have no remaining callers.
- Apply the prototype's visual hierarchy, tagline, action hierarchy, and local-processing footer across READY, progress, failure, and completion states.

**Non-Goals:**

- Persisting Focused or Complete as a saved default.
- Renaming the product to Document Journey.
- Percentage progress, a circular progress indicator, or new workflow progress instrumentation.
- A preview teaser, popup expansion, modal, preview tab, or preview window.
- Favicon capture, new Chrome permissions, toolbar icon replacement, or a real model-specific tokenizer.
- Changing conversion, compression, local-AI policies, or the focused-only source used for Browser summaries.

## Decisions

### 1. Model the popup as an explicit state machine

`mountExportPopup` will own a discriminated state representing `ready`, `capturing`, `converting`, `summarizing`, `copying`, `done`, and `failed`. Rendering remains a pure projection of state into the existing root element; event handlers dispatch transitions rather than invoking export during mount.

The minimum state carried across transitions is:

- READY draft: `mode`, `provider`, and `detail`;
- immutable build snapshot: the same three values plus saved `autoCopy`;
- failure context: whether a final result exists and the snapshot eligible for retry;
- completion context: the `FinalExport` itself and copy/download action state.

Build copies the READY draft into a new snapshot. Capture and conversion read only that snapshot. **Try again** reuses it; **Edit choices** copies its values into a new READY draft. Closing the popup naturally discards all draft and transient result state.

Alternative considered: keep the current implicit nested-function lifecycle and add a READY render in front. Rejected because retry, edit, copying, and completion would continue to rely on captured mutable variables and become difficult to prove consistent.

### 2. Keep persisted preferences separate from export-local selection

`ExportPreferences` remains the stored contract for `provider`, `detail`, and `autoCopy`. Add a popup-local selection type containing `mode`, `provider`, and `detail`; do not add `mode` back to storage. READY always initializes mode to `focused`, while provider and Detail come from normalized saved preferences. READY changes never call `saveExportPreferences`.

The popup shall show whether saved automatic copy is enabled but shall not add an export-local auto-copy toggle. Settings remains the only writer for automatic-copy defaults.

Alternative considered: persist every READY change. Rejected because opening the popup for a one-off Complete export would silently change future behavior. Alternative considered: restore a persisted mode default. Rejected to preserve the current storage migration and keep Complete an explicit exception.

### 3. Pass selected mode through the existing workflow boundary

Change the popup dependency boundary so `createFinalExport` receives the immutable popup selection, including `mode`, instead of a preference object whose adapter hardcodes `focused`. `entrypoints/popup/main.ts` passes the selected mode to the existing `createFinalExport(captured, mode, detail, provider, ...)` signature.

Continue deriving `focusedHtml` after capture. This is required even for Complete output because the existing Browser path independently converts `captured.focusedHtml` to construct a coherent summary source while producing the final body from the selected mode. None, Custom, Detail 100, and Browser fallback continue to use the selected-mode conversion already supported by the workflow.

Alternative considered: summarize the Complete conversion directly. Rejected because navigation, sidebar, footer, and related-page material must never become Browser summary input.

### 4. Treat `FinalExport.result.metadata` as the receipt source of truth

The receipt reads immutable source title, source URL, capture time, export mode, requested provider, actual summary origin, Detail, measured words/bytes, and language from `finalExport.result.metadata` plus capability/language/failure fields on `FinalExport`. Do not pass a separate mutable title or reconstruct provenance from the active tab.

Selected-mode conversion limitations currently flow into blockquote notices inside the opaque Markdown but are not exposed separately to the popup. Extend `CompressionResult` with a readonly `limitations` collection copied from `MarkdownConversion.limitations` by the result builder and preserved by summary/fallback transformations. The receipt reads `finalExport.result.limitations`; it MUST NOT recover notices by parsing the Markdown string.

Display the title and hostname as compact identity fields while retaining the exact source URL and capture time in receipt details. Set every page-derived string with DOM `textContent`; do not interpolate it into `innerHTML`. Derive the host with `new URL(result.metadata.sourceUrl).hostname`, falling back to the exact URL text only if parsing unexpectedly fails.

Alternative considered: keep the current separate `title` parameter to `renderResult`. Rejected because it duplicates metadata and makes it easier for receipt identity to diverge from the copied/downloaded artifact.

### 5. Replace preview rendering with an opaque-result receipt

The popup stores final Markdown only inside the `FinalExport` held for copy/download. It must never parse that string or insert any portion of it into DOM. Completion shows:

- source title, hostname/exact URL, and capture time;
- selected mode, provider, actual origin, Detail when active, language, and model state;
- measured word count and human-readable byte size;
- the existing UTF-8-size estimate, visibly prefixed or labelled as approximate;
- Browser failure and conversion limitations;
- primary Copy Markdown, secondary Download `.md`, and tertiary Settings actions.

After reference checks, remove `preview-output.ts`, `markdown-render.ts`, their tests, `marked`, and `dompurify` if no other production or test surface uses them. Update the lockfile through the package manager rather than editing it manually.

Alternative considered: hide the existing preview with CSS. Rejected because Markdown would still be parsed into DOM and preview-only dependencies and attack surface would remain. Alternative considered: retain a teaser. Rejected because even a teaser inserts private page content and implies a full-preview destination that is explicitly out of scope.

### 6. Preserve copy/download and failure invariants

Automatic copy occurs only after final generation and only when the saved `autoCopy` snapshot is true. Copy state transitions operate on the retained `FinalExport.result.markdown` bytes. Copy failure preserves the result and Download action. Download failure preserves the result and Copy action.

Failures before a final result show **Try again** using the same immutable snapshot and **Edit choices** returning to READY. Browser fallback is a completed result, not a workflow failure; its requested provider, actual origin, and warning remain visible and automatic copy still applies.

### 7. Reuse current progress events without fake percentages

Continue mapping capture, conversion, summarization, and copying to textual live-region states. Do not show a percentage or a determinate ring because the workflow exposes phases, not measurable work units. A later change may add structured progress instrumentation.

### 8. Use one shared visual shell with native controls

Each state uses the same header, **Website to Markdown** label, “Capture any article. Export clean Markdown.” tagline, Settings affordance where appropriate, and “Runs locally in your browser” footer. READY mode selection uses native radio inputs styled as a segmented control; provider remains a native select or native single-choice control, and Detail remains an integer range with an associated output. Detail is disabled and labelled inactive when provider is None.

Use existing system light/dark behavior, visible keyboard focus, non-color selected state, `role="status"`/`aria-live` for progress and copy state, and `role="alert"` for failures. Do not add animation that requires reduced-motion handling in this change.

## Risks / Trade-offs

- [Removing the preview eliminates in-extension content inspection] → Make explicit READY configuration, provenance, diagnostics, exact copy/download actions, and receipt transparency the replacement product contract; update vision/README language during implementation rather than implying review still exists.
- [Complete output can contain substantially more page chrome and private content] → Make Complete an explicit non-persisted selection that resets to Focused on every popup open, and keep Browser summary input focused-only.
- [Popup-local selections could drift between displayed values and execution] → Snapshot once on Build and pass that object through capture, retry, workflow, and receipt mode labeling.
- [Page-derived metadata could create DOM injection after preview removal] → Assign title, URL, host, limitations, and error details using `textContent`; keep result Markdown opaque.
- [Removing `marked` and `dompurify` could break another surface] → Run repository-wide symbol/import checks before deletion and remove dependencies only when callers are zero.
- [The visual change cannot receive production popup smoke verification on this workstation] → Verify state behavior with DOM-level tests, run typecheck and production build, and leave real unpacked-extension visual review to an allowed environment.
- [The source `ideas.md` may diverge from implementation artifacts] → Treat this change's proposal, specs, design, and tasks as authoritative; keep `ideas.md` only as historical discovery context.

## Migration Plan

1. Introduce the popup selection/state model and READY rendering while retaining existing workflow adapters.
2. Pass selected mode through the popup adapter and cover both Focused and Complete results before removing the old automatic mount behavior.
3. Replace result rendering with the receipt while retaining copy/download and fallback behavior.
4. Remove preview modules, tests, and dependencies only after receipt behavior passes and reference checks show no remaining callers.
5. Update product documentation to describe configure → build → receipt rather than preview-first export.
6. Run targeted popup, preference, workflow, and conversion tests, then typecheck and build. Do not install or load the production extension locally on this workstation.

Rollback is a source-level revert: restore automatic mount export and preview rendering together with `marked`/`dompurify`. No storage rollback is required because persisted preference shape is unchanged and legacy `mode` remains discarded.

## Open Questions

None. The change fixes these decisions: retain the Website to Markdown name; READY returns; Focused is the default each session; Complete is export-local; provider and Detail are export-local overrides seeded from saved defaults; automatic copy remains a saved setting; and completion contains no preview.
