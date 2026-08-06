## 1. Popup State and Selection Boundary

- [x] 1.1 Add popup-local READY draft and immutable build-snapshot types for mode, provider, Detail, and saved automatic-copy behavior without adding mode to persisted `ExportPreferences`.
- [x] 1.2 Refactor `mountExportPopup` into explicit READY, capture, conversion, summarization, copying, done, and failure states and remove automatic export execution during mount.
- [x] 1.3 Update the popup dependency boundary and `entrypoints/popup/main.ts` adapter to pass the selected Focused or Complete mode into the existing `createFinalExport` workflow.
- [x] 1.4 Preserve focused-content derivation for both selected modes and verify that a Complete Browser export still uses focused-only summary input while producing Complete-mode output.
- [x] 1.5 Add selected-mode conversion limitations to `CompressionResult`, propagate them through complete, deterministic, Browser, and fallback result transformations, and cover that receipt-safe field without parsing Markdown.

## 2. READY Configuration Surface
- [x] 2.1 Render READY with the Website to Markdown name, prototype tagline, Settings action, and local-processing trust footer without capturing the active tab.
- [x] 2.2 Add an accessible native-radio segmented control for Focused article and Complete page with Focused selected for every new popup session.
- [x] 2.3 Add export-local provider and Detail controls seeded from saved defaults, disable and label Detail inactive for None, and explain the saved automatic-copy behavior before Build.
- [x] 2.4 Wire Build Markdown to snapshot READY values once, disable configuration during processing, and start capture only from that explicit action.

## 3. Processing and Recovery States
- [x] 3.1 Apply the shared branded shell and truthful text-only live statuses to capture, conversion, optional local summarization, and copying without adding fake percentages or determinate progress.
- [x] 3.2 Preserve Browser fallback as a completed selected-mode result with requested provider, actual deterministic origin, and failure warning.
- [x] 3.3 Make pre-result failures offer Try again with the immutable selection snapshot and Edit choices with a new editable READY draft.
- [x] 3.4 Preserve the final result across copy and download failures so retry-copy and the alternate export action continue to use the exact Markdown bytes.

## 4. Completion Receipt

- [x] 4.1 Replace rendered Markdown output with a receipt sourced exclusively from `FinalExport.result.metadata`, `FinalExport.result.limitations`, capability, language, and action state.
- [x] 4.2 Render source title, exact URL/hostname, capture time, selected mode, requested provider, actual origin, applicable Detail, language/model state, fallback warnings, and propagated conversion limitations using safe DOM text assignment.
- [x] 4.3 Add a compact metrics row for measured words, human-readable Markdown bytes, and the existing visibly approximate token estimate.
- [x] 4.4 Apply primary Copy Markdown, secondary Download `.md`, tertiary Settings, copy-progress, copied, copy-failed, and download-failed visual states while retaining accessible status and alert semantics.
- [x] 4.5 Update `src/export-styles.css` for the shared READY/processing/failure/receipt shell, keyboard focus, non-color selection cues, responsive popup sizing, and existing system light/dark behavior.

## 5. Preview Removal
- [x] 5.1 Confirm repository-wide callers of `preview-output.ts`, `markdown-render.ts`, `marked`, and `dompurify`, then remove the preview modules and their dedicated tests when no non-popup callers remain.
- [x] 5.2 Remove `marked` and `dompurify` through the package manager and update the lockfile without changing unrelated dependencies.
- [x] 5.3 Verify that final Markdown remains opaque popup state used only by copy/download and that no Markdown body, heading, link, summary, or captured source HTML is inserted into the popup DOM.

## 6. Contract Coverage and Documentation
- [x] 6.1 Update popup DOM tests for no-capture READY initialization, non-persisted overrides, Focused reset, Complete selection, immutable retry, Edit choices, progress phases, receipt metadata, and absence of rendered page content.
- [x] 6.2 Cover automatic-copy enabled/disabled, copy retry, download failure, Browser fallback, Detail inactive for None, exact byte reuse, and source metadata consistency in targeted tests.
- [x] 6.3 Add workflow coverage proving Complete-mode None/Custom/Browser outputs retain Complete metadata while Browser summary input remains the coherent focused content unit.
- [x] 6.4 Update README and product vision from preview-first automatic export to explicit configure → build → receipt, and mark `ideas.md` as historical discovery superseded by this OpenSpec change.

## 7. Verification
- [x] 7.1 Run the targeted popup, preference, export-workflow, conversion, and compression tests covering the changed contracts.
- [x] 7.2 Run project typecheck, full tests, and the production Chrome build and resolve all failures attributable to this change.
- [x] 7.3 Confirm the production build requests no new permission and record that unpacked-extension popup smoke is intentionally skipped on this workstation per repository restriction.
