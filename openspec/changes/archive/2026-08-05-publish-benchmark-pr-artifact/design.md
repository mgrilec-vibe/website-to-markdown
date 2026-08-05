## Context

The benchmark build is intentionally separate from the production extension so it can bundle the approved corpus without increasing the release archive. The existing CI workflow builds and uploads only `.output/chrome-mv3`; a reviewer would otherwise need a checkout and Node toolchain to create the benchmark build before taking it to a qualifying Chrome machine.

## Goals / Non-Goals

**Goals:**
- Build `.output/benchmark-mv3` in the existing CI workflow on every pull request and push to `main`.
- Publish the unpacked benchmark extension as a separately named, 14-day GitHub Actions artifact.
- Keep the existing production build gate and production artifact unchanged.

**Non-Goals:**
- Run the benchmark, provision Chrome local AI, or inspect generated evidence in CI.
- Add a workflow matrix, Playwright installation, a separate workflow, or a release asset.
- Add benchmark contents to the production archive.

## Decisions

### Build and publish both extension targets in the existing workflow

After the production `npm run build` step succeeds, CI will invoke `npm run build:benchmark`. It will upload `.output/benchmark-mv3/**` using `actions/upload-artifact@v4` with a name that includes the short commit SHA and distinguishes it from the production artifact.

This preserves the existing CI gate order and makes both unpacked extensions discoverable on the same PR. A separate workflow was rejected because the benchmark build shares Node dependencies and source with the production build, while a release asset was rejected because the benchmark is a reviewer diagnostic distribution rather than a user release.

### Fail visibly on missing benchmark output

The benchmark upload uses `if-no-files-found: error` and the same 14-day retention policy as the production artifact. A reviewer can download the artifact, load its root as an unpacked extension, and run the benchmark on an AI-capable Chrome machine without building from source.

## Risks / Trade-offs

- **Additional CI work and artifact storage:** The benchmark bundle includes corpus screenshots and is larger than the production extension. Building once per CI run and retaining it for 14 days keeps the cost bounded.
- **CI cannot prove local-AI execution:** CI only proves that the benchmark build is loadable; local model availability remains a property of the reviewer’s Chrome profile and is recorded by the benchmark ZIP.
