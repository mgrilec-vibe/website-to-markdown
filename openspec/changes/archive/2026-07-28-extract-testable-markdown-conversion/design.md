## Context

`src/export-markdown.ts` currently parses captured HTML through the ambient `DOMParser`, normalizes it, converts it through Turndown, and classifies its Markdown blocks. `src/export-compression.ts` calls that converter internally, so compression tests patch `globalThis.DOMParser` and Linkedom table prototypes. `src/capture.ts` also parses stored HTML through `DOMParser` before rerunning Mozilla Readability. Production capture legitimately begins with a live browser document, but conversion and stored-capture focus extraction do not need a live tab.

The repository already has Linkedom for Node tests, an unused `tests/fixtures/export-page.html`, and a versioned report-builder pattern in `src/report.ts`. Mozilla documents jsdom as its Node DOM example for Readability; Vitest supports machine-readable benchmark results.

## Goals / Non-Goals

**Goals:**
- Run focused-content extraction and HTML-to-Markdown conversion deterministically in Node without a Chrome runtime or global DOM patches.
- Preserve the current production Markdown, limitation, and block-classification behavior while making parser choice explicit.
- Make compression consume a precomputed `MarkdownConversion`, so conversion is executed once per final export and can be tested independently.
- Establish a fixture corpus, golden assertions, and local benchmark output that identify extraction, parsing, conversion, and classification regressions separately.
- Keep all fixture content, outputs, and reports local.

**Non-Goals:**
- Reimplement Turndown or replace Mozilla Readability.
- Make `captureActiveDocument` browserless; it continues to inspect a live page document and capture metadata and limitations.
- Change focused-versus-complete export policy, Markdown semantics, compression policy, or local-AI behavior.
- Promise a DOM-type-system rewrite. Turndown remains DOM-typed; this change isolates runtime parser use. Re-declaring every conversion primitive against a structural DOM interface is deferred because it would add unsafe casts or require replacing Turndown without changing behavior.
- Turn the benchmark corpus into a real-page collection or a server-backed evaluation service.

## Decisions

### 1. Isolate conversion behind parser adapters

Create a local `src/conversion/` module family: `core` for normalization and Turndown rules, `classify` for block classification, `browser-parser` for production `DOMParser`, `report` for benchmark reporting, and `index` for public composition. The conversion API receives concrete HTML, base URL, inherited limitations, and an injected parser.

Focused-versus-complete selection remains a small pure orchestration helper operating on `CapturedPage`; the core does not accept `ExportMode`. Production supplies the browser parser. Tests supply a Linkedom parser. Readability focus extraction receives a parser through the same dependency direction; use a jsdom-backed Node adapter for Readability tests because that is the library's documented Node integration.
The browser parser inserts a `<base>` element using the captured source URL before normalization so parser-level relative URL resolution matches the exported page rather than `about:blank`.

**Alternatives considered:** retaining optional ambient-parser defaults keeps hidden runtime coupling; a new package adds release and build overhead without making imports more testable; a DOM-agnostic AST rewrite would replace a proven Turndown behavior surface and is outside the requested scope.

### 2. Make table conversion parser-portable

Refactor the table rule to traverse rows and cells through supported selector/attribute operations and read spans through `getAttribute`. It MUST preserve existing normal-table and merged-cell limitation behavior while no longer depending on browser-only `rows`, `cells`, `colSpan`, or `rowSpan` collection APIs.

**Alternatives considered:** retain the Linkedom prototype patch, which leaks a test-double implementation detail into unrelated compression tests; cast Linkedom objects to browser table types, which masks unsupported behavior.

### 3. Move conversion before compression

`createFinalExport` becomes the composition point: it selects source HTML, extracts focus when requested by the existing popup flow, invokes conversion once, and passes the resulting `MarkdownConversion` to complete, deterministic, and AI-assisted compression paths. `completeCompression` and deterministic compression helpers no longer accept raw capture/mode inputs or initiate HTML parsing. `withGeneratedSummaries` continues to compose over the precomputed conversion-derived blocks.

This makes `tests/export-compression.test.ts` operate on hand-authored `MarkdownConversion` data and keeps HTML/parser concerns in dedicated conversion tests.

### 4. Use explicit per-case fixture loading and two complementary suites

Move the unreferenced `tests/fixtures/export-page.html` into `tests/fixtures/conversion/export-page/` and pair it with capture metadata, Markdown goldens, and structured expectations. Add `tests/fixtures/conversion/load-case.ts` using `node:fs/promises` and `node:url`; Vitest does not discover non-test fixture files automatically.

Conversion fixtures SHALL cover complete/focused source selection, relative URL resolution, unsafe resources, code, normal and merged tables, checkbox lists, page chrome, and Readability fallback. Dedicated unit tests validate output and structural expectations; a separate Vitest benchmark suite measures each fixture with parser, conversion, and classification timing boundaries. Vitest's machine-readable benchmark output is used as the timing source; the conversion report builder adds stable hashes, limitations, structural checks, and aggregate outcomes.

The existing Markdown-only assessment fixtures remain separate because they start after conversion and serve local-AI compression evaluation.

### 5. Follow the existing report-builder pattern

Introduce conversion report types alongside the conversion report builder, reusing `CapturedPage`, `MarkdownBlock`, and `BlockKind` from `src/export-domain.ts` rather than creating another domain module. The builder follows `src/report.ts`: caller-provided run data, version/timestamp defaults, serialization, and browser-safe download behavior. The benchmark writes `.output/conversion-report.json` with environment identity, per-fixture timings and output/golden hashes, limitations, check status, and aggregate failures.

## Risks / Trade-offs
- [Linkedom and Chromium parse malformed HTML differently] → Compare Linkedom and jsdom on representative fixtures as a browserless parser-parity smoke check; verify browser capture separately through the extension release smoke path.
- [Readability output changes on dependency upgrade] → Record focused-output and final-Markdown goldens; review intentional golden changes with the dependency update.
- [Benchmark numbers vary by host] → Report environment and per-stage measurements; use benchmarks for relative regression detection, not cross-machine absolute thresholds.
- [Compression API migration misses a path] → Typecheck all consumers and add tests that prove compression accepts precomputed conversions without HTML parser access.
- [Fixture corpus grows into private content] → Keep initial fixtures synthetic/bundled and document that benchmark reports remain local.

## Migration Plan

1. Introduce conversion adapters and tests alongside the current behavior, using golden fixtures to establish parity.
2. Cut `createFinalExport` and compression helpers over to precomputed conversions, then remove global parser and Linkedom prototype test setup.
3. Add the conversion benchmark command and report output after functional fixtures pass.
4. Roll back by restoring the prior `export-markdown` orchestration path; no persisted export format or storage migration is required.

## Open Questions

- Confirm the benchmark command name and whether CI should only validate report structure or also retain benchmark samples; this does not affect the runtime conversion contract.
- Confirm the initial Readability fixture set after a short jsdom compatibility spike, especially near its content-length threshold.
