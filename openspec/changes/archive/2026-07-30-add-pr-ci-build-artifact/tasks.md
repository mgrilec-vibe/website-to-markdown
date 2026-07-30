## 1. Workflow file

- [x] 1.1 Create `.github/workflows/ci.yml` with `name: CI`, triggers `pull_request` and `push` to `main`, single job on `ubuntu-latest`
- [x] 1.2 Add `actions/checkout@v4`, `actions/setup-node@v4` (Node 24, `cache: npm`), and `npm ci` steps in order

## 2. Gate pipeline

- [x] 2.1 Add a `wxt prepare` step before typecheck so the dependency is explicit in the workflow log
- [x] 2.2 Add `npm run typecheck`, the curated smoke subset (`npm test -- tests/conversion.test.ts tests/export-workflow.test.ts tests/validation.test.ts`), and `npm run build` steps that each fail the job on non-zero exit

## 3. Artifact publication

- [x] 3.1 Add `actions/upload-artifact@v4` with `name: extension-chrome-mv3-${{ github.sha }}`, `path: .output/chrome-mv3/**`, `if-no-files-found: error`, and `retention-days: 14`

## 4. Verification

- [ ] 4.1 Open a draft PR on a fork or branch and confirm the workflow appears in the Actions tab (locally verified equivalent: see implementation summary)
- [ ] 4.2 Confirm the workflow run uploads an artifact named `extension-chrome-mv3-<sha>` and that downloading and unpacking it yields a directory loadable as an unpacked Chrome extension (locally verified equivalent: see implementation summary)
- [ ] 4.3 Confirm the curated smoke subset runs the three files listed above without Playwright installed (browser-touching tests such as `capture-runner.test.ts` and `conversion-benchmark.test.ts` are intentionally not in the subset) (locally verified equivalent: see implementation summary)

## 5. Local evidence pack

- [x] 5.1 actionlint on `.github/workflows/ci.yml` exits clean (no findings)
- [x] 5.2 Per-step exit codes captured for `npm ci`, `npx wxt prepare`, `npm run typecheck`, the curated smoke subset, and `npm run build` — all 0
- [x] 5.3 Full enumeration of `.output/chrome-mv3/**` (13 files, 220 KB, manifest.json content verified)
- [x] 5.4 Negative test: mutating `conversion.test.ts` to expect a wrong golden produces a non-zero exit; restoring brings the subset back to 23/23 passing
