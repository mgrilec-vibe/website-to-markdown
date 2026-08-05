## MODIFIED Requirements

### Requirement: CI workflow runs the gate pipeline on Node 24
The workflow MUST install dependencies with `npm ci` and MUST run, in order, `wxt prepare`, `npm run typecheck`, the curated smoke subset (`npm test -- tests/conversion.test.ts tests/export-workflow.test.ts`), `npm run build`, and `npm run build:benchmark`. All five pipeline commands MUST execute on Node 24, pinned via `actions/setup-node`. If any command exits non-zero, the workflow MUST fail.

#### Scenario: Successful local commands all pass in CI
- **WHEN** `npm ci`, `wxt prepare`, `npm run typecheck`, the curated smoke subset command above, `npm run build`, and `npm run build:benchmark` all succeed locally on the current main
- **THEN** the same sequence passes in the CI workflow without modification

#### Scenario: Benchmark build failure fails the workflow
- **WHEN** `npm run build:benchmark` cannot produce `.output/benchmark-mv3/` because of a WXT, manifest, or bundled-corpus error
- **THEN** the workflow reports failure before attempting either artifact upload

### Requirement: CI workflow publishes unpacked extension artifacts
The workflow MUST upload the contents of `.output/chrome-mv3/**` and `.output/benchmark-mv3/**` as separate artifacts using `actions/upload-artifact@v4`. The production artifact MUST be named `extension-chrome-mv3-<sha>` and the benchmark artifact MUST be named `extension-benchmark-mv3-<sha>`, where `<sha>` is the commit SHA being built. Both upload steps MUST use `if-no-files-found: error` and a 14-day retention period so missing or renamed outputs fail visibly rather than producing empty artifacts.

#### Scenario: Reviewer downloads production and benchmark artifacts
- **WHEN** a reviewer opens the workflow run summary page for a pull request or push to `main`
- **THEN** they can download separately named production and benchmark artifacts whose unpacked roots are loadable through Chrome Developer Mode

#### Scenario: Reviewer runs a downloaded benchmark artifact
- **WHEN** a reviewer downloads and unpacks `extension-benchmark-mv3-<short-sha>`
- **THEN** they can load its root as the benchmark extension on a qualifying Chrome machine without a source checkout, Node.js, or a local build command

#### Scenario: Missing benchmark output fails the upload step
- **WHEN** `npm run build:benchmark` exits zero but `.output/benchmark-mv3/` is absent or empty
- **THEN** the benchmark artifact upload fails with `if-no-files-found: error` rather than uploading an unloadable artifact
