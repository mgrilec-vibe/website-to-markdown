# delivery Specification

## Purpose
Defines the continuous-integration contract for this repository: every pull request and every push to `main` MUST be gated by a single GitHub Actions workflow that runs the project's typecheck, a curated vitest smoke subset, and the production extension build, and that publishes the unpacked Chrome extension as a downloadable artifact so reviewers can load it directly from the Actions UI.
## Requirements
### Requirement: CI workflow exists and triggers on pull requests and pushes to main

The repository MUST contain a single GitHub Actions workflow at `.github/workflows/ci.yml`. The workflow MUST run on `pull_request` events and on `push` events whose branch is `main`. The workflow MUST NOT introduce a matrix, a linter step, a release-signing step, or a Playwright install step.

#### Scenario: Pull request from a feature branch triggers the workflow
- **WHEN** a contributor opens a pull request against `main`
- **THEN** the `ci` workflow runs on that pull request's head commit

#### Scenario: Push to main triggers the workflow
- **WHEN** commits are pushed to the `main` branch
- **THEN** the `ci` workflow runs on that push

### Requirement: CI workflow runs the gate pipeline on Node 24

The workflow MUST install dependencies with `npm ci` and MUST run, in order, `wxt prepare`, `npm run typecheck`, the curated smoke subset (`npm test -- tests/conversion.test.ts tests/export-workflow.test.ts`), `npm run build`, and `npm run build:benchmark`. All five pipeline commands MUST execute on Node 24, pinned via `actions/setup-node`. If any command exits non-zero, the workflow MUST fail.

#### Scenario: Successful local commands all pass in CI
- **WHEN** `npm ci`, `wxt prepare`, `npm run typecheck`, the curated smoke subset command above, `npm run build`, and `npm run build:benchmark` all succeed locally on the current main
- **THEN** the same sequence passes in the CI workflow without modification

#### Scenario: Typecheck failure fails the workflow
- **WHEN** a pull request changes TypeScript in a way that `tsc --noEmit` rejects
- **THEN** the `npm run typecheck` step exits non-zero and the workflow reports failure

#### Scenario: Smoke test failure fails the workflow
- **WHEN** a pull request changes behavior such that one of the curated smoke test files fails
- **THEN** the `Run smoke tests` step exits non-zero and the workflow reports failure

#### Scenario: Build failure fails the workflow
- **WHEN** `npm run build` cannot produce `.output/chrome-mv3/` because of a WXT or manifest error
- **THEN** the `npm run build` step exits non-zero and the workflow reports failure

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

#### Scenario: Missing build output fails the upload step
- **WHEN** the build step exits zero but `.output/chrome-mv3/` is absent or empty (for example because WXT renamed its output directory)
- **THEN** the `actions/upload-artifact` step fails with `if-no-files-found: error` rather than uploading an unloadable artifact

#### Scenario: Missing benchmark output fails the upload step
- **WHEN** `npm run build:benchmark` exits zero but `.output/benchmark-mv3/` is absent or empty
- **THEN** the benchmark artifact upload fails with `if-no-files-found: error` rather than uploading an unloadable artifact

