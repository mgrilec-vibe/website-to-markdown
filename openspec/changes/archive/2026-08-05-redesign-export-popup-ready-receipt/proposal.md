## Why

The popup currently starts a focused export as soon as it opens and then renders the full Markdown inside an oversized result surface. The supplied prototype establishes a clearer local workflow: configure one export explicitly, observe processing, and receive a compact completion receipt with provenance, metrics, copy, and download actions but no content preview.

## What Changes

- **BREAKING** Replace automatic export-on-open with a READY state and explicit **Build Markdown** action.
- Add export-local READY controls for Focused article or Complete page, summarization provider, and Detail; initialize them from focused mode plus saved provider and Detail defaults without silently persisting popup edits.
- Keep automatic-copy behavior as a saved default and explain before generation whether a successful result will be copied automatically.
- Restyle READY, processing, failure, and completion around the existing **Website to Markdown** name, the prototype tagline, and a consistent local-processing trust footer.
- **BREAKING** Remove the rendered Markdown preview and replace completion with a compact receipt containing source identity, export configuration, measured words and bytes, visibly approximate tokens, capability/fallback information, conversion limitations, and copy/download recovery actions.
- Restore Complete page as an explicit per-export choice in the production popup while keeping Focused article selected whenever a popup session starts.
- Preserve local-only processing, exact Markdown bytes for copy/download, Browser summarization fallback, failure recovery, and safe handling of transient captured records.
- Defer percentage progress, the multi-step progress ring, favicon capture, toolbar icon replacement, and a full product rename.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `extension-quick-export-flow`: Change popup initiation from automatic export to READY configuration plus explicit build, and redefine completion as a compact export receipt without rendered Markdown.
- `extension-export-preferences`: Define how saved provider, Detail, and automatic-copy defaults seed export-local popup controls while Complete page remains a non-persisted per-export selection.
- `local-ai-markdown-compression`: Remove the rendered-preview contract, restore production Complete-page selection for the current export, and preserve provenance, diagnostics, local processing, and exact copy/download artifacts in the receipt flow.

## Impact

- Popup orchestration, state, markup, and styles in `src/popup-app.ts`, `entrypoints/popup/main.ts`, and `src/export-styles.css`.
- Export selection types and the popup-to-workflow boundary; persisted preference storage remains limited to provider, Detail, and automatic copy.
- Preview-only modules and dependencies may become removable after repository-wide reference checks (`src/preview-output.ts`, `src/markdown-render.ts`, and their tests).
- Popup, settings, preference, renderer, and export-workflow tests will need contract updates; no remote service, host permission, or new runtime dependency is expected.
- `ideas.md` remains discovery context; this OpenSpec change becomes the implementation source of truth.
