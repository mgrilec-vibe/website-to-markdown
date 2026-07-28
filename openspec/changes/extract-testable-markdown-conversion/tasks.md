## 1. Conversion and focus-extraction boundaries

- [ ] 1.1 Add the local conversion module family, parser adapter contracts, browser parser adapter, and pure captured-source selection while preserving the current `MarkdownConversion` result shape.
- [ ] 1.2 Move HTML normalization, URL handling, Turndown configuration, and Markdown block classification into the conversion modules; rework table traversal around parser-portable selectors and span attributes while preserving normal and merged-table output.
- [ ] 1.3 Refactor stored-capture Readability focus extraction to accept an injected parser and parse a cloned document; retain live-document capture behavior in `captureActiveDocument`.
- [ ] 1.4 Add the documented Node DOM support needed for Readability fixture tests and implement the Node parser adapters without relying on global parser replacement.

## 2. Final-export and compression cutover

- [ ] 2.1 Change complete, deterministic, extractive, and AI-assisted compression paths to consume a precomputed `MarkdownConversion` and remove their captured-HTML/parser dependency.
- [ ] 2.2 Make final-export orchestration select source HTML and perform conversion exactly once before invoking compression; migrate every popup, workflow, and test call site.
- [ ] 2.3 Remove the legacy conversion entrypoint and global-parser assumptions after all production callers use the conversion composition API.

## 3. Browserless fixtures and validation

- [ ] 3.1 Create `tests/fixtures/conversion/load-case.ts` using `node:fs/promises` and `node:url`; move the orphaned export-page HTML into the per-case conversion fixture layout with metadata, Markdown goldens, and structured expectations.
- [ ] 3.2 Add `tests/conversion.test.ts` covering complete/focused selection, safe URL handling, code, checkbox, normal-table, merged-table, limitations, block classification, and golden output without browser globals or Linkedom prototype patches.
- [ ] 3.3 Add Node Readability focus-extraction fixtures and tests for successful article selection and no-article fallback.
- [ ] 3.4 Convert compression tests to hand-authored `MarkdownConversion` inputs, remove their HTML fixture/parser setup, and add representative browser parity smoke coverage for the conversion fixture corpus.

## 4. Benchmark evidence and verification

- [ ] 4.1 Define versioned conversion-report types and implement report construction, serialization, Blob/download behavior, hashes, structural/golden outcomes, and aggregate counters following the existing assessment report pattern.
- [ ] 4.2 Add a Vitest benchmark suite and package command that measures focus extraction, parsing, conversion, and classification per fixture and writes `.output/conversion-report.json` locally.
- [ ] 4.3 Add report and benchmark tests for stable metadata, local-only output, and golden-regression reporting; run typecheck, the full test suite, and the conversion benchmark to verify the completed change.
