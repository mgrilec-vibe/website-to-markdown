## Why

HTML-to-Markdown conversion is currently exercised only through compression tests, which replace the global browser `DOMParser` and patch Linkedom table prototypes. Readability focus extraction has the same global-parser dependency. This obscures conversion regressions, prevents reproducible browserless benchmarks, and couples compression correctness to HTML parsing.

## What Changes

- Extract the captured-HTML-to-`MarkdownConversion` pipeline into a local TypeScript conversion library with an injected HTML parser and a browser `DOMParser` adapter.
- Make focused-content extraction independently executable with an injected parser while retaining live-page capture as a browser concern.
- Move conversion orchestration ahead of compression so compression consumes one already-created `MarkdownConversion` and never parses HTML.
- Replace browser-only table collection access with parser-portable table traversal, eliminating test-time global and Linkedom prototype mutation.
- Add dedicated Node conversion and Readability tests using an explicit HTML fixture loader and fixture-specific Markdown goldens and structural expectations. Fold the currently unreferenced `tests/fixtures/export-page.html` into that corpus.
- Add a versioned, local conversion benchmark report that records extraction, parsing, conversion, classification, output stability, and structural-check results per fixture.

## Capabilities

### New Capabilities
- `testable-markdown-conversion`: Provides browserless, deterministic conversion and focused-extraction fixtures, validation, and benchmark reporting for captured HTML.

### Modified Capabilities
- None.

## Impact

- Affected source: `src/capture.ts`, `src/export-markdown.ts`, `src/export-compression.ts`, `src/export-workflow.ts`, conversion/report modules, and their tests.
- Affected tests and fixtures: replace the global `DOMParser` and Linkedom table patches in `tests/export-compression.test.ts`; add dedicated conversion/focus tests and a fixture loader under `tests/fixtures/conversion/`.
- Affected runtime composition: the extension continues to use browser capture and a browser parser adapter; conversion, compression, fixtures, and benchmarks run locally with no network transmission.
- Dependency consideration: use a Node-compatible DOM adapter for Readability tests; no application server or external service is introduced.
