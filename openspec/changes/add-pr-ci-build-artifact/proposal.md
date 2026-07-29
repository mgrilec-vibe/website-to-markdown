## Why

The repository has no continuous integration today: there is no `.github/workflows/` directory, no automated build on pull requests, and reviewers must run `npm run build` locally before they can load the extension and exercise a change. Every PR is therefore trusted on faith for typecheck, tests, and a buildable extension bundle. We want a single, simple CI workflow that runs on every PR, gates merges on typecheck + a small curated smoke test subset + a successful build, and publishes the unpacked Chrome extension as a downloadable artifact so reviewers can load it directly without a local build.

## What Changes

- Add `.github/workflows/ci.yml`, a single GitHub Actions workflow that runs on `pull_request` and on `push` to `main`.
- The workflow installs dependencies with `npm ci` on Node 24, runs `wxt prepare`, then `npm run typecheck`, the curated smoke subset (`npm test -- tests/conversion.test.ts tests/export-workflow.test.ts tests/validation.test.ts`), and `npm run build`.
- The workflow uploads `.output/chrome-mv3/` as a per-run artifact named `extension-chrome-mv3-<short-sha>` so reviewers can download the unpacked Chrome extension from the Actions run page and load it via `chrome://extensions → Load unpacked`.
- No linter, no signing, and no release publishing are introduced. Those remain out of scope for "simple CI."

## Capabilities

### New Capabilities

- `delivery-ci`: Continuous integration for pull requests and pushes to `main`, covering typecheck, the curated vitest smoke subset (the three test files above), extension build, and per-run publication of the unpacked Chrome extension as a downloadable artifact.

### Modified Capabilities

None.
