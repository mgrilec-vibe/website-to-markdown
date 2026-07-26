## 1. Extension foundation and export contract

- [x] 1.1 Scaffold the TypeScript Manifest V3 Chrome extension with action, service worker, injected active-tab processor, and extension-owned preview page.
- [x] 1.2 Configure least-privilege manifest permissions for explicit active-tab capture, copy/download workflow, and no remote content-processing path.
- [x] 1.3 Define versioned domain types for captured metadata, semantic/Markdown blocks, block classifications, deterministic compression policies, language states, local-model states, and export metadata.
- [x] 1.4 Add transient local export-result storage and message boundaries that survive MV3 service-worker suspension without retaining a live page DOM.

## 2. Deterministic capture, conversion, and compression

- [x] 2.1 Implement active-tab snapshot capture with source title, observed URL, canonical URL when valid, capture timestamp, and clear inaccessible-page errors.
- [x] 2.2 Implement focused and complete deterministic conversion to UTF-8 Markdown, including safe URLs, headings, links, images, code, tables, and explicit conversion-limit notices.
- [x] 2.3 Classify ordered converted blocks as provenance, protected, removable, or summarizable; preserve protected blocks verbatim and make removable-block accounting available.
- [x] 2.4 Implement versioned Detail 0–100 policy mapping, deterministic eligible-prose retention, measured word/byte calculation, and Detail-100 no-summary behavior.
- [x] 2.5 Emit reviewable compressed Markdown metadata and generated-summary boundary markers while keeping immutable source provenance intact.

## 3. Local AI and language adapters

- [x] 3.1 Implement document-context capability adapters for Chrome Language Detector and Summarizer, including available, downloadable, downloading, unavailable, cancelled, and failed states.
- [x] 3.2 Implement explicit user-activated local-model provisioning with progress reporting and deterministic fallback for every terminal failure state.
- [x] 3.3 Detect the language of eligible prose locally, combine the result with page-language hints, model supported/unsupported, mixed, uncertain, and unknown states, and expose confidence metadata.
- [x] 3.4 Implement Detail-policy-specific Summarizer sessions using only supported expected input/output languages and only summarizable plain-text prose.
- [x] 3.5 Implement deterministic block-boundary chunking, bounded summary-of-summaries processing, cancellation, capacity/error handling, and unchanged deterministic fallback.

## 4. Review, control, and export experience

- [x] 4.1 Build the preview page with focused/complete mode selection, deterministic baseline, and locally AI-assisted derivative views.
- [x] 4.2 Add the 0–100 Detail slider with documented qualitative bands, pre-generation estimate, post-generation measured words/bytes, and no exact-word-count claim.
- [x] 4.3 Display language origin, detected primary language, confidence, support status, and actionable warnings for unsupported, mixed, uncertain, unknown, or detector-unavailable states.
- [x] 4.4 Make source-preserved and generated-summary boundaries visible; preserve access to the deterministic result when AI output is unavailable, cancelled, or rejected.
- [x] 4.5 Implement explicit copy and UTF-8 Markdown download actions for the selected reviewed result with safe filenames and matching preview bytes.

## 5. Contract verification

- [x] 5.1 Add deterministic fixtures covering page chrome removal, provenance, headings, links, code, tables, quotations, Detail policy bands, and measured-size metadata.
- [x] 5.2 Add controlled AI-adapter tests for supported, unsupported, mixed, uncertain, and unavailable language states; model download/progress; cancellation; capacity errors; and summarizer failures.
- [x] 5.3 Add fixture tests proving protected/removable blocks never reach Summarizer input, Detail 100 generates no summaries, and generated summaries retain explicit boundaries.
- [x] 5.4 Add chunking and summary-of-summaries tests that preserve deterministic fallback when a stage cannot complete.
- [x] 5.5 Run a local fixture through deterministic extractive compression and verify preview/copy/download byte equality, fallback labeling, and absence of content-bearing network egress.
- [ ] 5.6 Deferred: on a qualifying Chrome profile, manually verify optional user-triggered model download, supported-language local-AI enhancement, language warning states, and reviewable AI-assisted derivative output. This machine MUST NOT provision or run Gemini Nano for this check.

## 6. Deterministic extractive fallback

- [x] 6.1 Implement language-independent sentence segmentation, deterministic sentence scoring, Detail-policy selection, and source-order restoration for eligible prose.
- [x] 6.2 Emit deterministic-extractive summary origin metadata and preview boundaries while retaining the baseline and optional local-AI derivative.
- [x] 6.3 Route unavailable, unsupported, declined, cancelled, and failed local-AI states to the deterministic extractive derivative.
- [x] 6.4 Add extraction tests for language independence, protected-block exclusion, source-sentence fidelity/order, Detail 100, and local-AI fallback routing.