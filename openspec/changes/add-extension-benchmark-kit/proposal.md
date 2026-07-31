## Why

The approved website corpus is currently evaluated in Node with jsdom, while Chrome's local AI APIs and browser DOM behavior can only be assessed in a qualifying extension document. A self-contained benchmark build is needed so an AI-capable machine can run the complete frozen corpus locally and return content-bearing evidence for review without Playwright, a server, live-page capture, or telemetry.

## What Changes

- Add a separate load-unpacked benchmark extension build whose extension-owned benchmark page bundles the approved website-evaluation corpus and runs it through the production browser parser and final-export pipeline.
- Define a versioned full settings matrix across complete/focused modes, None, Custom, and Browser providers at every meaningful Detail-policy boundary; run cells serially and retain partial results on failure or cancellation.
- Add explicit Chrome local-AI capability and model-provisioning controls, then record available, downloadable, downloading, unavailable, cancelled, and failed states as benchmark evidence.
- Export a self-contained ZIP containing fixture evidence, exact Markdown from every completed run, per-run metadata, capability/provisioning diagnostics, deterministic checks, timings, and an aggregate report.
- Replace the orphaned synthetic assessment runner/page with the benchmark implementation; do not expose benchmark pages, fixtures, or test controls in the production release build.
- Retain a small documented production-build popup smoke procedure for the active-tab capture, `chrome.scripting`, popup, and download boundary. This is deliberately separate from the static-corpus benchmark.

## Capabilities

### New Capabilities
- `extension-benchmark-kit`: Provides a self-contained, load-unpacked Chrome benchmark build that evaluates the approved static website corpus through the production browser conversion and local-AI export pipeline and downloads a reviewable evidence ZIP.

### Modified Capabilities
- None.

## Impact

- Build configuration and package scripts gain a benchmark-specific output that is excluded from the production release archive and CI production artifact.
- The benchmark replaces unused assessment entrypoint, synthetic fixtures, runner, report, provisioning, and UI modules with corpus-backed benchmark equivalents; reusable report/provisioning concepts may be migrated rather than duplicated.
- Approved fixture packaging gains a browser-consumable loader while the existing Node evaluator remains deterministic and browser-independent.
- New browser-facing tests cover benchmark matrix resolution, report/ZIP manifest composition, capability/provisioning transitions, and separation from the production manifest. Manual verification on an AI-capable Chrome profile covers real local-AI execution and the production popup smoke path.
