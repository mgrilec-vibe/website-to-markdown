# Local AI Assessment Kit

## Purpose

Provide a self-contained Chrome extension diagnostic suite that assesses deterministic Markdown compression against Chrome's on-device summarization without processing real user-page content or sending assessment data to a service.

## Requirements

### Requirement: Self-contained assessment distribution
The system SHALL provide a load-unpacked Manifest V3 Chrome extension assessment kit containing its runner, non-private fixtures, deterministic expectations, reviewer form, and report exporter. The assessment kit MUST NOT require an account, API key, remote service, or real user-page capture to run its bundled suite.

#### Scenario: Tester loads the assessment kit
- **WHEN** a tester loads the packaged extension through Chrome Developer Mode
- **THEN** the extension SHALL present an assessment page that can run the bundled suite without a remote configuration request

#### Scenario: Bundled suite has no local AI support
- **WHEN** the tester runs the bundled suite on a browser where the local AI API is unavailable
- **THEN** the extension SHALL complete deterministic-only checks and report the unavailable state without requiring any external service

### Requirement: Local model capability and provisioning diagnostics
The system SHALL feature-detect Chrome's Summarizer API and SHALL record the API presence, `availability()` result, browser version, session-creation outcome, model-download progress or terminal outcome, and any API error in the report. The system MUST require an explicit tester action before initiating a downloadable model.

#### Scenario: Local model is already available
- **WHEN** the tester checks availability and Chrome reports the Summarizer as available
- **THEN** the extension SHALL allow local-AI assessment runs and record the available state in the report

#### Scenario: Local model requires download
- **WHEN** Chrome reports that the Summarizer is downloadable
- **THEN** the extension SHALL explain that a local model download is required and SHALL begin provisioning only after the tester explicitly requests it

#### Scenario: Local model is unsupported
- **WHEN** Chrome reports that the Summarizer is unavailable
- **THEN** the extension SHALL report the unavailable state and SHALL preserve access to deterministic-only assessment runs

### Requirement: Controlled deterministic compression baseline
The system SHALL classify each bundled fixture into protected, removable, and summarizable content according to versioned fixture expectations. The deterministic compressor MUST preserve protected content verbatim, MUST remove only designated removable content, and MUST exclude protected and removable content from local-AI summarization input.

#### Scenario: Deterministic compression processes a fixture
- **WHEN** the tester runs a compression profile against a bundled fixture
- **THEN** the report SHALL identify the fixture expectation version, removed blocks, protected-content checks, and deterministic output size

#### Scenario: Protected source content is encountered
- **WHEN** a fixture contains protected provenance, headings, link destinations, code, tables, or designated quotations
- **THEN** the deterministic compressor SHALL retain that content without local-AI summarization

### Requirement: Paired compression evaluation
The system SHALL execute a deterministic-only result and a deterministic-plus-local-summary result for every fixture and enabled compression profile where local AI is available. Both runs MUST start from the same fixture and deterministic selection; only eligible prose may differ through summarization.

#### Scenario: Local AI is available for a Compact profile
- **WHEN** the tester runs the Compact profile on an eligible fixture and the local Summarizer is available
- **THEN** the extension SHALL produce and report both the deterministic-only output and the deterministic-plus-summary output

#### Scenario: Local AI run fails
- **WHEN** a local summary request is cancelled, exceeds capability, errors, or otherwise fails
- **THEN** the extension SHALL retain and report the deterministic-only result and SHALL record the local-AI failure without silently substituting generated content

### Requirement: Named compression policies and visible summarization boundaries
The system SHALL assess Full source, Compact, Brief, and Outline policies with documented deterministic selection rules and local-AI configuration. The system MUST report measured output words and bytes for every result and MUST NOT represent a policy as an exact output word-count guarantee. Generated summaries MUST be visibly separated from preserved source content.

#### Scenario: Tester selects a Brief profile
- **WHEN** the tester runs the Brief policy
- **THEN** the extension SHALL apply the policy's documented deterministic selection and local summarization configuration and SHALL report the actual output size

#### Scenario: Generated summary is included in output
- **WHEN** a local-AI run produces summarized prose
- **THEN** the output SHALL identify the generated summary boundary so reviewers can distinguish it from preserved source content

### Requirement: Bounded prose summarization
The system SHALL send only eligible prose to Chrome's local Summarizer API. For input that exceeds a usable model context, the system SHALL apply documented bounded chunking and summary-of-summaries processing, and SHALL record the chunking stages and any capacity failure in the report.

#### Scenario: Eligible prose fits one summary request
- **WHEN** a fixture's eligible prose fits the active summarization session
- **THEN** the extension SHALL summarize that prose without sending protected blocks to the model

#### Scenario: Eligible prose exceeds one summary request
- **WHEN** the active session cannot accommodate all eligible fixture prose at once
- **THEN** the extension SHALL use its documented chunking strategy and record every summary stage in the report

### Requirement: Reviewable local report export
The system SHALL export a self-contained machine-readable report for bundled fixtures. The report MUST include generated summaries and final outputs by default, capability and provisioning diagnostics, compression configurations, measurements, structural checks, errors, and reviewer responses. The report MUST NOT include user-supplied page content because this change SHALL not process real user pages.

#### Scenario: Tester completes a bundled run
- **WHEN** a bundled fixture suite has completed
- **THEN** the tester SHALL be able to download a report containing the generated outputs and diagnostics needed to independently review the run

#### Scenario: Reviewer records quality assessment
- **WHEN** the tester completes a fixture review form
- **THEN** the exported report SHALL include whether the central claim was preserved, whether a material omission was found, whether protected structures survived, and the reviewer's comparison of AI-assisted output to deterministic-only output

### Requirement: Local-only assessment data handling
The assessment kit SHALL run fixture processing, summarization, review, and report generation locally in Chrome. The extension MUST NOT transmit fixture text, generated outputs, diagnostics, or report contents to a service.

#### Scenario: Tester runs the assessment
- **WHEN** the tester provisions the local model and executes the bundled fixture suite
- **THEN** the extension SHALL not issue a network request containing fixture or report content
