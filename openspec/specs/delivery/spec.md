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

The workflow MUST install dependencies with `npm ci` and MUST run, in order, `wxt prepare`, `npm run typecheck`, the curated smoke subset (`npm test -- tests/conversion.test.ts tests/export-workflow.test.ts tests/validation.test.ts`), and `npm run build`. All four pipeline commands MUST execute on Node 24, pinned via `actions/setup-node`. If any command exits non-zero, the workflow MUST fail.

#### Scenario: Successful local commands all pass in CI
- **WHEN** `npm ci`, `wxt prepare`, `npm run typecheck`, the smoke subset command above, and `npm run build` all succeed locally on the current `main`
- **THEN** the same sequence passes in the CI workflow without modification

#### Scenario: Typecheck failure fails the workflow
- **WHEN** a pull request changes TypeScript in a way that `tsc --noEmit` rejects
- **THEN** the `npm run typecheck` step exits non-zero and the workflow reports failure

#### Scenario: Smoke test failure fails the workflow
- **WHEN** a pull request changes behavior such that one of the three curated smoke test files fails
- **THEN** the `Run smoke tests` step exits non-zero and the workflow reports failure

#### Scenario: Build failure fails the workflow
- **WHEN** `npm run build` cannot produce `.output/chrome-mv3/` because of a WXT or manifest error
- **THEN** the `npm run build` step exits non-zero and the workflow reports failure

### Requirement: CI workflow publishes the unpacked Chrome extension as a downloadable artifact

The workflow MUST upload the contents of `.output/chrome-mv3/**` as a single artifact using `actions/upload-artifact@v4`. The artifact MUST be named `extension-chrome-mv3-<short-sha>` where `<short-sha>` is the commit SHA being built. The upload step MUST use `if-no-files-found: error` so a missing or renamed output directory produces a visible failure rather than an empty artifact. Retention MUST be set to 14 days.

#### Scenario: Reviewer downloads and loads the artifact
- **WHEN** a reviewer opens the workflow run summary page
- **THEN** they can download an artifact named `extension-chrome-mv3-<short-sha>` whose unpacked contents are loadable into Chrome via `chrome://extensions` → "Load unpacked" and surface the extension declared by `wxt.config.ts`

#### Scenario: Missing build output fails the upload step
- **WHEN** the build step exits zero but `.output/chrome-mv3/` is absent or empty (for example because WXT renamed its output directory)
- **THEN** the `actions/upload-artifact` step fails with `if-no-files-found: error` rather than uploading an unloadable artifact

