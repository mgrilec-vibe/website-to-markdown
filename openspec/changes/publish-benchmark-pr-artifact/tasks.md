## 1. CI benchmark artifact

- [x] 1.1 Keep the lightweight two-test smoke gate and add the benchmark build step after the production extension build.
- [x] 1.2 Upload `.output/benchmark-mv3/**` as `extension-benchmark-mv3-<sha>` with 14-day retention and `if-no-files-found: error`.
- [x] 1.3 Add focused workflow assertions and run the full local verification pipeline.
- [x] 1.4 Create a branch, commit all benchmark and delivery changes, push it, and open a pull request.
