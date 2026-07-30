## Context

The project is a WXT-built Chrome extension (TypeScript, vite under the hood, MV3) targeting Chrome. The README already documents the canonical local-build flow: `npm install`, `npm run build`, then load `.output/chrome-mv3` via `chrome://extensions → Load unpacked`. Today there is no `.github/workflows/` directory at all, so every PR must be trusted on faith for typecheck, tests, and a buildable bundle. Reviewers who want to exercise a change locally must reproduce the build environment on their own machine.

There is one minor drift to acknowledge, not fix in this change: `README.md` describes the project as a "Chrome Local AI Assessment Kit" while `vision.md` and `wxt.config.ts` describe it as "Website to Markdown." Resolving that documentation debt is out of scope for "simple CI" and is logged as a follow-up.

The repository also carries an `apm.lock.yaml` and an `apm_modules/` directory alongside `package-lock.json`. Inspection of the lockfile shows apm only deploys skill assets into agent-platform directories (`.agents/skills/*`, `.claude/commands/*`). All runtime dependencies live in `package.json` and are installed by `npm ci`. CI therefore does not need `apm install`.

## Goals / Non-Goals

**Goals:**

- One GitHub Actions workflow that gates PRs and `main` on `npm ci`, `wxt prepare`, `npm run typecheck`, the curated smoke subset, and `npm run build` succeeding.
- Publish `.output/chrome-mv3/` as a downloadable artifact on every run so reviewers can load the unpacked Chrome extension from the Actions UI.
- Pin Node 24 to match the README's prerequisite.
- Keep the workflow minimal: one job, no matrix, no linter, no release signing.

**Non-Goals:**

- Introducing a linter (oxlint, ESLint, Biome) or a formatter check.
- Signing the extension for the Chrome Web Store.
- Publishing a GitHub Release or pushing to the Chrome Web Store.
- Installing Playwright/Chromium. The smoke subset runs as fast vitest without browser tests, so no Playwright install step is needed in CI.
- Resolving the README/vision drift.

## Decisions

**One workflow file, one job.** A single `ci.yml` is sufficient for "simple CI." Adding separate jobs (lint, build, test) buys nothing for a sub-2-second `npm test -- <files>` and a sub-second `npm run build` and only adds job-graph complexity.

**Trigger on `pull_request` and `push` to `main`.** PR builds cover the contributor workflow; the `main` push produces the artifact for the merged commit so reviewers can confirm the merged result still loads.

**Use `npm ci`, not `npm install` and not `apm install`.** `package-lock.json` is authoritative; `npm ci` is deterministic and faster. `apm install` deploys agent-platform skill assets that CI does not need.

**Run `wxt prepare` explicitly before `npm run typecheck`.** `npm run typecheck` already chains `wxt prepare && tsc --noEmit`, but invoking `wxt prepare` as its own step makes the dependency explicit in the workflow log and decouples typecheck output from preparation output if either fails.

**Smoke subset is a curated file list, not a vitest `-t` regex.** The `npm test` step is `npm test -- tests/conversion.test.ts tests/export-workflow.test.ts tests/validation.test.ts`. These three files cover the surfaces the user explicitly chose: HTML conversion correctness, the export provider workflow, and structural validation of compressed output. The choice lives in `.github/workflows/ci.yml` — not in test descriptions — so test output reads naturally for humans running `npm test` locally, and the curated subset is auditable from a single file. Local developers still run `npm test` for the full suite on their machines.

**Cache npm via `actions/setup-node` with `cache: npm`.** Standard GitHub-Actions pattern; no custom cache key needed for a single-job workflow.

**Artifact upload via `actions/upload-artifact@v4` with `path: .output/chrome-mv3/**` and `if-no-files-found: error`.** Using the `**` glob inside the output directory (rather than the directory itself) means a silent WXT rename of the output folder — e.g. `chrome-mv3` → `chromium-mv3` — produces a hard failure rather than an empty-directory upload that downstream reviewers would download and find unloadable. `if-no-files-found: error` makes the failure visible in the workflow summary. The artifact name is `extension-chrome-mv3-<short-sha>`; the SHA suffix keeps it unique per run and readable from the Actions UI. Retention is 14 days, which is enough for reviewer cycles without bloating storage.

## Risks / Trade-offs

- **Fork PRs have read-only secrets and no write-back permissions.** GitHub Actions sandboxes `pull_request` events from forks; the artifact upload is permitted because it does not require secrets, but artifact retention for fork PRs may be shorter than for first-party PRs. Acceptable for the "reviewer can download" goal.
- **No `wxt prepare` cache.** `.wxt/` is regenerated on every run; this is fast and avoids stale-cache footguns.

- **Build and tests run serially.** Acceptable for the current runtime (~1–2 minutes total). Revisit only if test runtime grows materially.
- **Artifact retention 14 days.** Longer-than-default-for-Actions would cost more; shorter would risk losing the artifact before reviewers can grab it. 14 days is a reasonable middle.
