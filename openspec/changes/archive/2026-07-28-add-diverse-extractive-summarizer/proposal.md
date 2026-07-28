## Why

The separate preview tab interrupts conversion and forces the user to compare intermediate Markdown views rather than review the one result they will export. Users need a single popup workflow where they choose whether to keep the converted source, use Chrome's browser summarizer, or use the extension's local no-download summarizer.

## What Changes

- Keep Convert and the complete review/export experience in the extension popup; do not open a preview tab or window.
- Replace the Standard/Diverse deterministic-strategy control with a **Summarization** setting: **None**, **Browser**, and **Custom**.
- Define **None** as the complete converted Markdown without any summarization, **Browser** as Chrome's explicitly enabled local Summarizer, and **Custom** as the in-house diverse-extractive MMR path.
- Preserve a deterministic Custom result when Browser summarization is unavailable, unsupported, declined, cancelled, or fails; visibly identify it as the actual final result rather than presenting it as Browser output.
- Render only one safe, final Markdown preview in the popup. Copy and download export the exact UTF-8 Markdown represented by that preview.
- Retain source-faithful custom extraction: eligible prose only; verbatim, source-ordered sentences; per-block representation; language-neutral lexical similarity with character n-gram fallback; no third-party NLP library, model, model download, or content-bearing network request.
- Add coverage for popup-only conversion, all summarization selections and Browser fallback, one-result rendering, and byte-faithful export.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `local-ai-markdown-compression`: Provide an explicit popup-local summary-provider setting and one final reviewable derivative, while preserving safe Markdown rendering, source-protected compression, and local-AI fallback behavior.

## Impact

- Updates capture-to-popup messaging, transient export-result state, deterministic compression types and metadata, popup controls/state, and compression/preview tests.
- Removes the separate preview-tab workflow and the planned dual baseline/derivative interface from this change.
- Adds no runtime model, model download, remote service, or third-party summarization dependency beyond the user-selected browser capability.
- Maintains local-only processing, protected-block handling, and deterministic Custom fallback whenever Browser summarization cannot complete.
