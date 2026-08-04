## Context

The approved website-evaluation corpus contains ten reviewed frozen captures under `tests/fixtures/evaluation/`. The existing evaluator loads those captures in Node and invokes `convertCapturedPage` with `jsdomHtmlParser`; it cannot establish behavior in a real extension document or exercise Chrome's local `LanguageDetector` and `Summarizer` APIs. The production popup does use `browserHtmlParser` and `createFinalExport`, but it is intentionally designed for a user-selected active tab and is unsuitable as a corpus runner.

The repository also retains an unused assessment page and synthetic Markdown-only assessment stack from the archived local-AI assessment kit. It is absent from the current production manifest and starts after HTML-to-Markdown conversion, so it cannot provide evidence for the current approved website corpus.

The benchmark must run entirely in a manually loaded Chrome extension on a qualifying machine. It must not require Playwright, a server, URL interception, live-page navigation, an account, or a network service. The benchmark's browser APIs are the extension-document DOM and Chrome built-in AI APIs; active-tab capture remains a distinct production smoke concern.

## Goals / Non-Goals

**Goals:**
- Produce a separate, load-unpacked benchmark build with an extension-owned page that evaluates every approved static fixture through the production browser conversion and final-export pipeline.
- Provide an explicit, versioned, serial settings matrix for complete/focused exports and every meaningful provider/Detail policy cell.
- Make local-model readiness and provisioning explicit, user-activated, and fully represented in the result evidence.
- Download one portable ZIP containing exact result Markdown, per-run metadata, fixture evidence, and an aggregate report suitable for independent review.
- Preserve the Node evaluator as the fast deterministic regression path and keep benchmark-only code and fixture assets out of production artifacts.
- Retain a small, documented manual production popup smoke procedure for the active-tab capture boundary.

**Non-Goals:**
- Capture, navigate to, or fetch the fixture origin URLs; fixture provenance identifies the frozen source and does not assert a new live capture.
- Use Playwright, a local web server, URL interception, or any external test controller on the machine running the benchmark.
- Treat generated local-AI prose as byte-stable or establish an automated quality score for it.
- Add a benchmark runner, fixtures, test permissions, or test controls to the production extension manifest or release archive.
- Replace the production popup flow, bypass Chrome model eligibility, or make a successful local-AI result mandatory on unsupported hardware.

## Decisions

### 1. Produce a dedicated benchmark build, not an automated end-to-end harness

A package command and build-time configuration will produce a Chrome MV3 benchmark output separate from `.output/chrome-mv3`. Its manifest exposes a benchmark page as the action/default experience and packages only the extension components needed to run the benchmark locally. The production build retains its existing popup, permissions, host-permission policy, and release archive contents.

The extension-owned page is the correct execution context for the browser parser and Chrome local AI. A test harness that drives the production action would require active-tab permission acquisition, external browser tooling, and native download automation, none of which exists on the target machine. Conversely, a standalone page would not validate extension-origin local-AI behavior.

### 2. Bundle the approved corpus as immutable benchmark inputs

A browser-consumable corpus module will statically package the existing fixture manifest, complete HTML, optional focused HTML, expected Markdown, and source screenshot. It will construct the same `CapturedPage` shape used by the Node fixture loader, taking the conversion base URL from the fixture's recorded final URL. It will retain the manifest's source hashes and limitations as evidence.

The benchmark will pass those captured pages to the production browser parser and `createFinalExport`. It will not invoke active-tab capture or re-run capture against a local server. Focused mode consumes the reviewed fixture's focused capture input; the benchmark thereby assesses the production conversion/compression path in a real browser document without claiming to reproduce live capture or Readability extraction.

Static bundling is preferred over runtime file access because extension pages cannot read repository files after the build is moved to the qualifying machine. The existing Node fixture loader remains unchanged for browser-independent regression tests.

### 3. Declare the complete matrix from policy boundaries

The benchmark configuration will be versioned and enumerate runs in a stable fixture-ID, mode, provider, and Detail order. The default full matrix is:

| Provider | Detail values | Cells per mode |
| --- | --- | ---: |
| None | 100 (Detail is inactive) | 1 |
| Custom | 0, 15, 40, 65, 85, 100 | 6 |
| Browser | 0, 15, 40, 65, 85, 100 | 6 |

Across ten fixtures and two modes, the full suite contains 260 runs. Browser cells below Detail 100 account for 100 model-attempt runs. Browser at Detail 100 remains in the matrix to prove that Browser selection preserves eligible prose without invoking the model.

Runs execute serially. This prevents model-session contention, preserves comparable elapsed measurements, produces deterministic report ordering, and ensures a failed or cancelled cell does not discard completed evidence. The UI may offer a bounded subset for diagnosis, but the full declared matrix is the default suite and every exported report states which matrix was selected.

### 4. Treat local model provisioning as explicit benchmark evidence

The benchmark page will first feature-detect the production local-AI adapters and display independent detector/summarizer capability states. If Chrome reports a downloadable model, a dedicated user-clicked provisioning action creates the necessary extension-document sessions and reports progress, cancellation, and terminal errors. A benchmark run must not silently initiate first-use provisioning.

Every Browser matrix cell records requested provider, capability observed at run time, actual summary origin, language state, chunk count, and any fallback failure. `local-ai` is evidence of a successful on-device result; deterministic extractive fallback is a valid completed result when the model is unavailable, unsupported, cancelled, or fails. The UI must make this distinction visible before ZIP export.

### 5. Export a self-contained, content-bearing ZIP

The benchmark will create a ZIP in the extension page with a browser-compatible ZIP library (`fflate`); it supports multiple text and binary entries without Node APIs. The archive includes:

```text
website-to-markdown-benchmark-<timestamp>.zip
├── benchmark-report.json
├── README.txt
├── environment.json
├── fixtures/<fixture-id>/{manifest.json,complete.html,focused.html,expected-*.md,source.png}
└── runs/<fixture-id>/<mode>--<provider>--detail-<n>/{result.md,metadata.json}
```

The aggregate report is schema-versioned and contains the matrix declaration, fixture identity and source hashes, extension and browser environment, capability/provisioning history, ordered run summaries, outcome counts, and archive layout. Per-run metadata includes input identity, selected settings, detail-policy version, elapsed timings, output bytes/words/hash, block and summary chunk counts, actual provider/origin, language state, deterministic structural/golden checks when applicable, and errors/fallback diagnostics.

Exact Markdown is a separate file rather than JSON-embedded only, so a reviewer can inspect outputs directly. Including the frozen fixture evidence makes the returned ZIP independently reviewable. ZIP creation and download remain local; no fixture or result content is transmitted.

### 6. Compare only deterministic contracts automatically

The None path can compare output against reviewed conversion goldens. Browser output is never judged by byte equality because generated prose varies by model and device. Custom results and Browser-at-100 results receive only checks that are valid for their selected policy: protected/provenance retention, output validity, actual-origin labeling, and expected no-model behavior where applicable.

This reports regressions without turning non-deterministic prose quality into a false automated pass/fail. The content-bearing artifacts are the input for human or later AI-assisted judgment.

### 7. Make the old assessment implementation a clean cutover

The benchmark replaces the unused assessment entrypoint, synthetic fixture model, compression-only runner, report schema/exporter, provisioning adapter, UI, and their tests. Reusable concepts—explicit provisioning, capability diagnostics, versioned reports, and local downloads—will move into benchmark-specific modules only where they fit the current `CapturedPage → createFinalExport` contract. No compatibility alias or alternate assessment UI remains.

A compact production smoke guide remains outside benchmark code: load the production output, export one accessible HTTP(S) page from the action popup, and confirm capture, result rendering, and byte-faithful copy/download. It covers the real active-tab boundary the static benchmark intentionally excludes.

## Risks / Trade-offs

- **Benchmark archive size and browser memory:** Bundling inputs plus 260 results can be sizable. Build the ZIP after result collection with asynchronous/multi-file compression, surface progress, and retain a downloadable partial archive after cancellation or failure.
- **Long and device-variable local-AI execution:** Serial runs may take substantial time, especially for large fixtures and chunked summaries. Report per-stage and total timing; never use a cross-machine absolute timeout or throughput threshold as a quality gate.
- **Model unavailable or provisioning fails:** Treat it as an observed capability result, preserve deterministic cells, and clearly distinguish completed fallback from a local-AI success.
- **Static focus input does not retest active-tab capture:** This is intentional. The benchmark must label its input as an approved static fixture and the production popup smoke procedure covers the capture boundary separately.
- **Two evaluators could drift:** Keep fixture metadata, expected Markdown, and `CapturedPage` construction aligned through shared types/validation; the Node evaluator remains the deterministic source of regression truth while the extension benchmark is environment evidence.
- **Removal touches historically verified code:** Remove the orphaned synthetic assessment stack only after the corpus-backed benchmark tests and build prove the replacement. Do not retain dead modules as an undocumented fallback.
