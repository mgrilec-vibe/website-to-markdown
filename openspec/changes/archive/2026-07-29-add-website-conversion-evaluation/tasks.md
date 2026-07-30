## 1. Evaluation foundation

- [x] 1.1 Define the evaluation, capture-provenance, fixture-manifest, focus-expectation, structural-result, and review-result data models without changing the existing `CapturedPage` conversion contract.
- [x] 1.2 Implement public-URL validation and redirect safety checks for HTTP(S), credentials, loopback, localhost, link-local, private-network, and metadata-service targets; cover accepted and rejected targets with deterministic tests.
- [x] 1.3 Add the pinned headless Chromium automation dependency and documented local browser-install workflow, isolated from ordinary unit-test setup.

## 2. Rendered capture and conversion evaluation

- [x] 2.1 Implement the configurable post-render Chromium capture runner with bounded navigation, fixed viewport, readiness profile, screenshot, DOM serialization, final-URL provenance, and response-size limits.
- [x] 2.2 Consolidate the runner and extension capture semantics for metadata, pre-cleanup, limitations, and Readability focus so complete and focused HTML originate from the same rendered document capture.
- [x] 2.3 Implement candidate-capture output isolation so supplied URLs write source evidence, complete Markdown, focused Markdown, and hashes without changing approved fixtures or goldens.
- [x] 2.4 Implement the local evaluation report and output layout for both approved fixtures and candidate captures, including output hashes, limitations, selection mode, and structural results.
- [x] 2.5 Add an evaluation command that defaults to the configured fixture and accepts explicit fixture ID, category/tag query, or public URL input.

## 3. Snapshot dataset and querying

- [x] 3.1 Implement the approved fixture evidence-bundle format, loader, manifest validation, and exact ID/category/tag resolver with deterministic unknown and ambiguous-query failures.
- [x] 3.2 Implement candidate-admission checks for provenance, source-use review status, declared limitations, expected focus behavior, publisher-domain diversity, and markup-platform diversity.
- [x] 3.3 Capture and approve reviewed API/reference, developer-guide, rendered-documentation, and technical-blog fixtures from distinct publisher/domain and markup-platform sources.
- [x] 3.4 Capture and approve reviewed editorial-article, knowledge/reference, and Q&A fixtures from distinct publisher/domain and markup-platform sources.
- [x] 3.5 Capture and approve reviewed forum-thread, release-notes, and known-boundary fixtures; record expected `thread`, `ambiguous`, or `unavailable` focus behavior where article semantics do not apply.
- [x] 3.6 Configure the default approved fixture and ensure all approved-fixture evaluation paths run without network access.

## 4. Agent review skill

- [x] 4.1 Create the reusable website-conversion review skill with commands for default-fixture, queried-fixture, and candidate-capture review.
- [x] 4.2 Encode separate complete/focused review contracts, the 1–100 rubric, evidence-citation format, declared-limitation handling, and `not-gradeable` outcomes in the skill guidance.
- [x] 4.3 Integrate the skill through the project's APM-managed target layout and verify installed skill discovery without replacing upstream OpenSpec skills.

## 5. Verification and release readiness

- [x] 5.1 Add deterministic tests for fixture resolution, manifest validation, focus expectations, candidate isolation, evaluation report serialization, and offline default evaluation.
- [x] 5.2 Add browser-runner integration tests for rendered capture, redirects, unsafe-target rejection, and dual-mode evidence generation using a project-owned local test server enabled only through a nonproduction test injection; production URL validation remains strict.
- [x] 5.3 Exercise each approved corpus fixture through both conversion modes; verify Markdown goldens, declared limitations, output hashes, and report evidence.
- [x] 5.4 Run the review skill against representative article, thread, and boundary fixtures; verify cited dual scores and `not-gradeable` behavior.
- [x] 5.5 Run the project typecheck, test suite, evaluation default smoke test, and APM audit; record final corpus provenance and source-use review results.
