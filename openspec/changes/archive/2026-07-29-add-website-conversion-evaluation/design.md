## Context

The current converter accepts a `CapturedPage` and deterministically produces complete or focused Markdown with an injected HTML parser. Existing fixture tests validate a synthetic captured page and golden files locally. The extension, however, receives a fully rendered browser `Document`; an evaluation workflow must preserve that production input rather than judge raw HTTP response HTML.

The new workflow has two inputs: an explicit public URL captured once for review, or a named approved snapshot from a local dataset. The latter is the normal regression input. The evaluation must generate both complete and focused Markdown from the same capture and provide evidence that an agent can inspect without revisiting a changing source page.

## Goals / Non-Goals

**Goals:**
- Capture a public, rendered HTTP(S) page once and preserve the DOM snapshot, screenshot, metadata, focus result, and provenance required to reproduce evaluation locally.
- Evaluate approved fixtures without network access; no URL uses a configured default fixture.
- Query fixtures by stable ID, category, and tags; reject ambiguous or unknown selection.
- Convert each selected capture in complete and focused modes through the existing portable conversion path and produce inspectable Markdown plus machine-readable evidence.
- Provide a reusable agent skill that reviews frozen source evidence, produces separate evidence-backed 1–100 scores for complete and focused output, and uses `not-gradeable` rather than inventing a score for unavailable or non-representable source content.
- Keep the corpus structurally diverse: a category slot MUST differ in both publisher/domain and markup platform from another selected slot when that avoids duplicate templates.

**Non-Goals:**
- Reproduce webpage pixels, styles, JavaScript interaction, audio/video, canvas scenes, or cross-origin frame content in Markdown.
- Make live website capture a regular test-suite or CI dependency.
- Capture authenticated, private-network, credentialed, or user-session pages.
- Use an LLM or external scoring service as a deterministic pass/fail oracle.
- Change the extension's complete/focused export contract or make browser capture browserless.

## Decisions

### 1. Snapshot first; live URL capture is explicit ingestion

The default evaluation target is an approved local fixture, not a remote URL. A supplied URL starts a one-shot candidate-capture operation that stores evidence for review before it can join the corpus.

This separates source drift from converter regressions. It also keeps the existing local benchmark privacy/reproducibility contract intact. A live capture may contact only the URL the user selected and its page resources; dataset evaluation itself has no network dependency.

### 2. Capture the post-render browser document with a headless Chromium runner

The runner will use a Chromium automation dependency to load a public page, capture a fixed-viewport screenshot, and serialize the ready document state. This matches the extension boundary: a loaded `Document`, not raw fetch HTML. The implementation will use readiness policies that avoid treating indefinite background traffic as a pass condition: a fixed capture profile plus optional fixture-specific selector/stability criteria.

The runner must share or consolidate capture sanitization, metadata, and limitation logic with the extension rather than introducing a second semantic definition of `CapturedPage`. Focus extraction remains Readability after the existing project-owned pre-cleanup policy. The runner records both the complete snapshot and the Readability result from that same capture.

A raw HTTP fetch was rejected because it would turn JavaScript-rendered public pages into misleading failures despite the extension converting their loaded DOM in production.

### 3. Dataset fixtures are evidence bundles with queryable manifests

Each approved fixture contains a manifest, complete HTML, focused HTML when extraction succeeds, source screenshot, expected complete/focused Markdown, and structural/evaluation expectations. The manifest records origin/final URL, capture time, viewport/readiness profile, hashes, category, tags, publisher domain, markup platform, focus expectation, and declared limitations.

A dataset resolver exposes stable selection by fixture ID, category, or tag. A zero-argument evaluation resolves the declared default fixture. It fails clearly for unknown IDs, empty queries, or more than one candidate instead of choosing arbitrarily.

The initial corpus contains the cross-platform v1 ten: API reference, developer guide, rendered docs, technical blog, editorial article, knowledge reference, Q&A, forum thread, release notes, and a known limitation case. Capture admission requires distinct publisher/domain and markup platform coverage, not merely different pages on the same site template.

### 4. Evaluation output is a local, inspectable report

Every run writes a self-contained output directory with source identity, generated `complete.md` and `focused.md`, output hashes, converter limitations, selected fixture/capture metadata, and structural validation. A candidate capture is written separately from approved fixture data so it cannot silently update a golden.

Complete and focused are evaluated against different contracts. Complete output preserves accessible page reading content; focused output preserves the intended primary document/content unit and is not penalized for excluding navigation or unrelated chrome. Fixture manifests explicitly mark threads and other ambiguous pages so a grader knows whether focus is article, thread, ambiguous, or unavailable.

### 5. The agent skill supplies qualitative review, not the baseline oracle

The skill runs the local evaluation, reads the frozen source HTML/screenshot/report and both Markdown files, then grades each mode independently. Its rubric covers material content, structure/reading order, links/media/code/tables/lists, Markdown readability, and appropriate inclusion/exclusion. Every deduction cites source and output evidence.

Known converter limitations can explain a warning only when they match a declared limitation. They cannot relabel unexplained loss as acceptable. If the source was blocked, reduced to a JavaScript/bot-challenge shell, or its central content is not representable, the skill returns `not-gradeable` with a reason rather than a numeric grade.

## Risks / Trade-offs

- **Browser dependency increases developer setup and artifact size** → Restrict it to explicit capture operations; fixture tests and default evaluation use checked-in snapshots without launching or downloading a browser.
- **A public URL can target unsafe hosts or redirect unexpectedly** → Accept only HTTP(S); reject credentials, localhost, loopback, link-local, private-network, and metadata-service addresses before navigation and on redirects; bound redirects, duration, and response size.
- **Dynamic pages have no universal readiness point** → Use a documented capture profile and fixture-specific readiness criteria; retain screenshot/DOM evidence for review instead of treating timing as invisible.
- **Third-party snapshots can drift, include personal data, or have reuse constraints** → Review source terms, attribution, content sensitivity, and capture artifacts before approval; retain provenance and never refresh approved snapshots automatically.
- **Readability may select the wrong region, especially for discussions** → Store expected focus behavior and focus evidence; have the agent score primary-content selection separately from mechanical Markdown preservation.
- **1–100 grading can imply false precision** → Require scored dimensions and cited deductions; retain deterministic structural checks as the regression gate.
- **Multiple fixtures can accidentally test the same template** → Enforce publisher/domain and markup-platform diversity in manifest validation and corpus review.

## Migration Plan

1. Add the data model, resolver, browser candidate-capture boundary, and local evaluation output without altering existing extension exports.
2. Add the initial approved corpus and deterministic fixture/evaluation tests; retain existing synthetic fixtures.
3. Install the review skill and validate it against the approved corpus.
4. Make the default evaluation target the configured local fixture. Keep URL capture opt-in and exclude it from ordinary `npm test` and CI commands.

Rollback consists of removing the new command/skill and corpus integration while retaining the existing conversion fixture and benchmark paths; no persisted application data or exported Markdown format is migrated.

## Open Questions

- Which third-party snapshot licenses and terms are acceptable for repository storage, and should the corpus be private if full source HTML/screenshots are retained?
- What exact readiness profile and browser version should be pinned for capture reproducibility?
- Which v1 source candidates pass final access, content-sensitivity, and licensing review before capture?
- Should the 1–100 scores remain review-only indefinitely, or later drive advisory quality thresholds after calibration across the initial corpus?
