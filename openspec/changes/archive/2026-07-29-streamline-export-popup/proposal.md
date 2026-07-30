## Why

The current extension requires the user to configure an export, wait in a generic status state, review a large rendered preview, and then manually copy the result. A quick export interaction should make the common path—convert the active page and place its Markdown on the clipboard—clear, observable, and recoverable without changing the local-first conversion contract.

## What Changes

- Replace the popup's configuration-first interaction with a compact quick-export flow that starts conversion from the extension action and visibly reports capture, conversion, optional local summarization, and clipboard-copy progress.
- On a successful export, attempt to copy the exact final Markdown to the clipboard automatically and show an explicit copied result with measured word and byte counts plus a clearly labelled estimated token count.
- Preserve the final result and offer an explicit retry-copy control if the clipboard operation fails; capture/conversion failures similarly expose a retry action. Conversion limitations and browser-summarizer fallbacks remain visible but do not block copying.
- Add persistent export preferences for the existing focused/complete mode, summarization provider, Detail level, and quick-export behavior; make them reachable through an extension action context-menu entry that opens an extension-owned settings surface.
- Retain local-only processing, source provenance, safe Markdown rendering, deterministic fallback behavior, and manual download capability. No validity gate or semantic-content filter is added before copying.

## Capabilities

### New Capabilities
- `extension-quick-export-flow`: A compact, stateful extension-action export experience that reports progress, copies completed Markdown, exposes result metrics, and provides focused recovery actions.
- `extension-export-preferences`: Persistent, user-controlled defaults and an extension context-menu path to edit them.

### Modified Capabilities
- `local-ai-markdown-compression`: Update the popup export contract for preference-backed quick export, automatic copy attempts, copy failure recovery, and estimated token metrics.

## Impact

- Affected extension entrypoints: popup UI, background action/context-menu integration, manifest permissions, and a settings entrypoint or page.
- Affected modules: popup state rendering, clipboard/export orchestration, persistent storage boundaries, and export metrics.
- Affected tests: popup state transitions, background settings navigation, persisted preference handling, copy failure recovery, and metrics display.
- Existing active change `add-website-conversion-evaluation` remains independent; this change does not alter evaluation datasets or workflows.
