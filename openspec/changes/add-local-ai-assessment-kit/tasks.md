## 1. Assessment extension foundation

- [x] 1.1 Scaffold a TypeScript Manifest V3 unpacked-extension project with an extension-owned assessment page and reproducible build command.
- [x] 1.2 Configure the manifest and extension page for local-only operation, with no host permissions, remote configuration, telemetry, accounts, or API-key path.
- [x] 1.3 Define versioned domain types for fixtures, classified blocks, compression policies, capability/provisioning events, paired results, reviewer input, and report schema.
- [x] 1.4 Add a capability diagnostic that detects the Summarizer API and records browser/version, availability state, model-session outcome, download progress, and terminal errors.

## 2. Controlled fixture and deterministic baseline

- [x] 2.1 Define the fixture-expectation format for protected, removable, and summarizable blocks, including protected-content assertions and fixture expectation versions.
- [x] 2.2 Bundle non-private representative fixtures covering article chrome, documentation prose, code, tables, long prose, and unavailable-model fallback behavior.
- [x] 2.3 Implement deterministic compression that removes only designated removable blocks and preserves protected blocks verbatim.
- [x] 2.4 Implement structural checks for provenance, headings, links, code, tables, quotations, removals, output words, and output bytes.
- [x] 2.5 Add deterministic-unit fixtures proving protected content cannot reach summarization input and that deterministic-only outputs meet their expectations.

## 3. Local summarization assessment

- [x] 3.1 Implement explicit user-activated model provisioning and clear available, downloadable, downloading, unavailable, cancelled, and failed states.
- [x] 3.2 Define Full source, Compact, Brief, and Outline policies with documented deterministic selection, Summarizer type/length/format/preference, and visible generated-summary boundaries.
- [x] 3.3 Implement a Summarizer adapter that sends only eligible prose and preserves deterministic-only results when a local-AI run fails.
- [x] 3.4 Implement bounded prose chunking and summary-of-summaries processing, recording each stage and capacity failure.
- [x] 3.5 Implement paired deterministic-only and deterministic-plus-summary runs from the same selected fixture content for every enabled profile.
- [x] 3.6 Add tests for unavailable, downloadable, available, cancelled, and failed model paths using controlled API adapters.

## 4. Review and portable evidence

- [x] 4.1 Build the assessment workflow UI for fixture selection, capability check, explicit model-download initiation, profile runs, paired-output comparison, and clear fallback status.
- [x] 4.2 Add per-fixture reviewer inputs for central-claim preservation, material omission, protected-structure survival, relative usefulness, and notes.
- [x] 4.3 Implement a self-contained JSON report exporter that includes capability/provisioning diagnostics, policy configuration, measurements, structural checks, errors, reviewer input, generated fixture summaries, and final outputs.
- [x] 4.4 Verify the report excludes real user-page content and that the bundled assessment makes no content-bearing network request.
- [x] 4.5 Add tester instructions for loading the unpacked extension, enabling/download provisioning, running the suite, reviewing outputs, and returning the downloaded report.

## 5. Verification and packaging

- [x] 5.1 Run the automated deterministic, policy, fallback, report-schema, and report-content test suites.
- [x] 5.2 Run the built assessment in Chrome without local AI support and verify deterministic-only completion plus an unavailable-state report.
- [ ] 5.3 Run the built assessment on a qualifying Chrome 138+ desktop profile, verify provisioning and paired local-AI runs, and capture a sample report containing generated fixture outputs.
- [x] 5.4 Validate that the final distribution can be loaded unpacked and includes all fixtures, expectations, documentation, and report-export capability without external configuration.