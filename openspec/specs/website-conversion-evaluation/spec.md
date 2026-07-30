# Website Conversion Evaluation

## Purpose

Provide local, evidence-backed evaluation of approved website conversion fixtures and separately captured public candidate pages.

## Requirements

### Requirement: Evaluation target resolution
The system SHALL evaluate an approved local conversion fixture when no public URL is supplied. It SHALL support selecting an approved fixture by stable fixture ID, category, or tag, and SHALL require a query to resolve to exactly one fixture. A supplied URL SHALL initiate a separate candidate-capture evaluation and SHALL NOT modify an approved fixture or its expected Markdown.

#### Scenario: Default fixture evaluation
- **WHEN** a developer invokes evaluation without a URL or explicit fixture query
- **THEN** the system SHALL resolve the configured default approved fixture and run without network access

#### Scenario: Unambiguous dataset query
- **WHEN** a developer selects a fixture by an ID, category, or tag that resolves to one approved fixture
- **THEN** the system SHALL evaluate that fixture and record its identity in the output report

#### Scenario: Ambiguous or unknown dataset query
- **WHEN** a fixture query resolves to zero or more than one approved fixture
- **THEN** the system SHALL fail before conversion with a diagnostic that identifies the unresolved query or matching fixture IDs

#### Scenario: Public URL creates a candidate capture
- **WHEN** a developer supplies a public HTTP(S) URL
- **THEN** the system SHALL create a separate candidate-capture evaluation and SHALL NOT replace an approved fixture, golden Markdown file, or expected limitation

### Requirement: Public rendered-document capture
The system SHALL capture a supplied candidate URL from a post-render Chromium document state using a documented capture profile. It SHALL serialize the source document evidence needed to construct a `CapturedPage`, record source provenance and a screenshot, and derive complete and focused conversion inputs from that same capture.

#### Scenario: Rendered page capture
- **WHEN** a public page becomes ready under the selected capture profile
- **THEN** the system SHALL preserve the rendered DOM snapshot, source metadata, source screenshot, capture profile, final URL, and content hashes before generating Markdown

#### Scenario: Focused capture input
- **WHEN** the captured document has Readability article content after the project's existing focus pre-cleanup policy
- **THEN** the system SHALL persist that focused HTML with the complete HTML from the same document capture

#### Scenario: Focused extraction is unavailable
- **WHEN** Readability cannot extract focused content from the captured document
- **THEN** the system SHALL preserve complete HTML, record the focused-extraction limitation, and allow the focused conversion fallback to be evaluated

### Requirement: Public capture safety bounds
The system SHALL accept only public HTTP(S) candidate URLs. It MUST reject URLs containing credentials and hosts or redirect destinations that resolve to loopback, localhost, link-local, private-network, or cloud-metadata address ranges. It SHALL bound navigation duration, redirect count, and captured response size.

#### Scenario: Unsafe initial target
- **WHEN** a candidate URL uses a non-HTTP(S) scheme, embeds credentials, or names a prohibited host or address range
- **THEN** the system SHALL reject it before browser navigation and SHALL not write a capture artifact

#### Scenario: Unsafe redirect target
- **WHEN** a candidate navigation redirects to a prohibited host or address range
- **THEN** the system SHALL abort capture and report the rejected redirect destination

#### Scenario: Test-only local capture harness
- **WHEN** an integration test supplies a project-owned local page through a test-only injected navigation source
- **THEN** the runner MAY capture that page while the production command exposes no bypass for the public-host restrictions

### Requirement: Dual-mode local evaluation evidence
The system SHALL convert every selected capture in complete and focused modes through the existing captured-HTML conversion pipeline. It SHALL write inspectable complete and focused Markdown files and a machine-readable local report containing source identity, selection mode, output hashes, conversion limitations, and structural validation results.

#### Scenario: Approved fixture evaluation output
- **WHEN** an approved fixture is evaluated
- **THEN** the system SHALL write complete Markdown, focused Markdown, and a local report derived only from the fixture evidence and converter output

#### Scenario: Candidate capture evaluation output
- **WHEN** a candidate URL is captured successfully
- **THEN** the system SHALL write complete Markdown, focused Markdown, source evidence, and a local report in a candidate-specific output location

#### Scenario: Offline regression evaluation
- **WHEN** an approved fixture evaluation runs
- **THEN** it SHALL not fetch the fixture's origin URL or transmit fixture content or evaluation results to a network service
