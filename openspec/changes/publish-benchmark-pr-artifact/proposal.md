## Why

The benchmark must be built in CI and exposed on the pull request so a qualifying Chrome machine only downloads and loads the artifact; it must not require a local source checkout or build toolchain.

## What Changes

- Extend the existing CI workflow to run `npm run build:benchmark` after the production build.
- Publish `.output/benchmark-mv3/**` as a separately named downloadable artifact on pull requests and pushes to `main`.
- Preserve the existing production artifact, Node 24 gate order, and no-Playwright CI policy.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `delivery`: Publishes the isolated benchmark extension build as a second CI artifact alongside the production extension artifact.

## Impact

- `.github/workflows/ci.yml` gains one benchmark-build step and one benchmark-artifact upload step.
- Reviewers can download the benchmark artifact from a PR, load it unpacked on an AI-capable Chrome machine, and return the locally generated evidence ZIP.
