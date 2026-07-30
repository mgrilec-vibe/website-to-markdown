## 1. Export preferences and settings

- [x] 1.1 Add a typed local-storage preference module with normalized defaults for export mode, provider, Detail, and `autoCopy: true`, isolated from session-scoped capture storage.
- [x] 1.2 Add a testable settings surface that loads, validates, saves, and explains persisted export defaults and Browser fallback behavior.
- [x] 1.3 Add the extension action context-menu permission and register an action-scoped `chrome.contextMenus` settings command using `contexts: ['action']`; open the settings surface without capturing a page.
- [x] 1.4 Add unit and integration coverage for preference normalization, persistence, settings save behavior, and action-context settings navigation.

## 2. Quick-export popup workflow

- [x] 2.1 Refactor the popup entrypoint to load saved preferences and begin export immediately, replacing the in-popup mode/provider/Detail configuration form with a compact progress surface and settings entry point.
- [x] 2.2 Model and render `capturing`, `converting`, optional `summarizing`, `copying`, `copied`, `copy-failed`, and capture/conversion failure states while retaining the one safe final Markdown preview.
- [x] 2.3 Attempt the popup-owned clipboard write automatically when `autoCopy` is enabled; retain the exact final result, copy-again control, and download action after completion.
- [x] 2.4 Handle clipboard and download promise rejections in the popup UI; expose retry-copy after a clipboard failure and retry export after a capture/conversion failure without adding output-validity gating.
- [x] 2.5 Retain visible requested-provider, actual-origin, limitation, and Browser-fallback information for completed exports, including when fallback Markdown is copied.

## 3. Export metrics and presentation

- [x] 3.1 Add a deterministic token estimate helper defined as `ceil(UTF-8 byte length / 4)` and display it as an explicitly estimated, model-agnostic value beside exact word and byte counts.
- [x] 3.2 Update popup styles for compact progress, copied, copy-failed, failure, metrics, warning, and result states while preserving accessible live announcements and safe preview rendering.
- [x] 3.3 Add focused unit coverage that pins the token-estimate formula for ASCII and multibyte Markdown inputs.

## 4. Contract verification

- [x] 4.1 Extend popup workflow tests for preference-backed automatic copying, each visible progress phase, successful copy, clipboard rejection with retry-copy, capture/conversion failure with retry, Browser fallback copying, and download rejection.
- [x] 4.2 Extend extension/background tests for the action-scoped context-menu settings command and the no-capture guarantee.
- [x] 4.3 Run `npm run typecheck` and `npm test`, then fix regressions before completing the change.
