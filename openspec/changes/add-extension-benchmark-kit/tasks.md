## 1. Benchmark build and corpus packaging

- [x] 1.1 Add an isolated benchmark build command and WXT configuration that writes `.output/benchmark-mv3`, exposes the benchmark page in that build, and keeps benchmark assets and manifest behavior out of `.output/chrome-mv3` and production ZIP output.
- [x] 1.2 Add the browser-compatible ZIP dependency, verify its license and benchmark-bundle inclusion, and ensure production bundles do not import it.
- [x] 1.3 Implement a browser-consumable static loader for every approved website-evaluation fixture, preserving manifests, HTML variants, expected Markdown, screenshots, provenance, limitations, and the `CapturedPage` contract without runtime filesystem access.
- [x] 1.4 Add shared validation for bundled fixture completeness and deterministic fixture ordering, while retaining the existing Node fixture loader and evaluator unchanged.

## 2. Corpus benchmark execution

- [x] 2.1 Define and version the default 260-cell matrix: ten fixtures, complete/focused modes, None at Detail 100, and Custom/Browser at Details 0, 15, 40, 65, 85, and 100.
- [x] 2.2 Implement serial matrix scheduling, explicit run states, stable result ordering, cancellation, and partial-result retention.
- [x] 2.3 Execute each static `CapturedPage` through `browserHtmlParser` and `createFinalExport`, recording conversion, language-detection, session-creation, summarization, and total elapsed timings with exact final Markdown.
- [x] 2.4 Implement deterministic check selection: golden comparison for None, structural/provenance/provider checks for Custom and Browser, and explicit no-model verification for Detail 100 without byte-comparing Browser-generated prose.
- [x] 2.5 Implement extension-document local-AI capability diagnostics and explicit user-activated provisioning, including progress, unavailable, cancelled, and failed states plus Browser fallback evidence.

## 3. Benchmark page and evidence archive

- [x] 3.1 Build the benchmark-page UI with matrix summary, capability/provisioning controls, full-suite launch, diagnostic-subset selection, serial progress, visible fallback status, cancellation, and partial-result state.
- [x] 3.2 Define versioned aggregate-report and per-run metadata schemas covering fixture provenance, matrix completeness, environment, settings, policy version, capability/provisioning history, output metrics/hashes, check outcomes, and diagnostics.
- [x] 3.3 Create the local ZIP exporter with aggregate report, environment file, fixture evidence, result Markdown, and per-run metadata; support complete and partial-suite archives without transmitting content.
- [x] 3.4 Add a concise archive README that explains static-fixture provenance, deterministic versus local-AI checks, summary-origin semantics, and how to review results.
- [x] 3.5 Display recorded, remaining, and total benchmark runs with an accessible progress bar.
- [x] 3.6 Add a six-cell quick benchmark and expose the current conversion stage.

## 4. Assessment cutover and production smoke guidance

- [x] 4.1 Migrate any reusable capability, provisioning, report, or download logic from the orphaned assessment implementation into the corpus benchmark only after tasks 1–3 are complete and tasks 5.1–5.3 pass against the benchmark build.
- [x] 4.2 Remove the obsolete assessment entrypoint, synthetic fixture model, compression-only runner, report/provisioning/UI modules, associated styles/assets, and obsolete tests with no compatibility aliases.
- [x] 4.3 Document the separate manual production-build smoke procedure for active HTTP(S)-tab capture, `chrome.scripting`, popup result rendering, and byte-faithful copy or download.

## 5. Verification

- [x] 5.1 Add deterministic tests for fixture bundling, matrix cardinality/order, run-state transitions, timing/report data, check selection, capability/provisioning transitions, and complete/partial ZIP archive manifests.
- [x] 5.2 Add build-level tests that verify benchmark and production manifests/assets are isolated and that the production release archive excludes benchmark artifacts and dependencies.
- [x] 5.3 Run the project typecheck, full test suite, production build, production ZIP, and benchmark build; inspect both build outputs for the required isolation.
- [x] 5.4 Load the benchmark build in a Chrome profile without available local AI; run a representative subset and verify deterministic completion, fallback diagnostics, and a reviewable ZIP.
- [x] 5.5 Load the benchmark build in a qualifying Chrome extension context, explicitly provision the local model if required, run the complete 260-cell matrix, and inspect the returned ZIP for all completed result artifacts and local-AI/fallback evidence.
- ~~5.6 Execute and record the separate production popup smoke procedure on an accessible HTTP(S) page.~~ **Skipped:** Local extension installation/loading for verification is prohibited on this workstation; see `AGENTS.md`.
