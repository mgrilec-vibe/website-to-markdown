## MODIFIED Requirements

### Requirement: Protected content and deterministic compression
The system SHALL classify converted content before summarization so primary focused prose is distinguishable from provenance, protected structures, removable page chrome, and secondary complete-page material. It MUST retain provenance, headings, link destinations, code, tables, designated quotations, and conversion-limit notices verbatim in normal compressed exports. It MUST remove only documented removable blocks deterministically and MUST exclude protected, removable, navigation, sidebar, footer, and other secondary page-chrome content from Chrome Summarizer input.

#### Scenario: Protected structures are present
- **WHEN** an export contains code, a table, a link destination, headings, and source provenance
- **THEN** each protected structure SHALL remain present and unchanged in both the deterministic compressed result and any locally AI-assisted result

#### Scenario: Complete-page chrome surrounds an article
- **WHEN** a converted page contains primary article prose plus navigation, sidebar, footer, or related-page material
- **THEN** only the coherent focused primary-content unit SHALL be eligible as the Browser summary source, regardless of whether complete conversion remains under internal regression coverage

#### Scenario: Removable page chrome is present
- **WHEN** converted content contains a block classified as removable
- **THEN** the deterministic compressor SHALL remove that block without sending it to a local AI API and SHALL make the removal accounting available in the preview

### Requirement: Bounded local prose summarization
The system SHALL generate at most one page-level Browser summary from coherent normalized plain text derived from the focused primary-content unit. Summary source selection SHALL be independent from the Detail policy's retained and omitted body blocks. The system SHALL use documented type, format, length, preference, shared context, per-request context, expected-language, and output-language options for the selected Detail policy.

The system SHALL use the active Chrome Summarizer session's `inputQuota` and `measureInputUsage()` contract rather than a hardcoded character ceiling. When the selected primary content exceeds usable session capacity, it SHALL split only at deterministic semantic section boundaries and SHALL retain the deterministic fallback if quota-aware processing cannot complete. This change SHALL NOT alter the existing bounded summary-of-summaries reduction policy.

#### Scenario: Focused primary content fits the session
- **WHEN** normalized focused primary content fits the active Summarizer session quota and its language is supported
- **THEN** the system SHALL summarize that coherent content in one request with page-role and audience context, independently of which body blocks Detail compression retains

#### Scenario: Focused primary content exceeds the session
- **WHEN** measured input usage exceeds the active Summarizer session's usable quota
- **THEN** the system SHALL split at deterministic section boundaries, report that chunking occurred, and preserve deterministic fallback behavior if bounded processing cannot complete

#### Scenario: Complete-page material is available internally
- **WHEN** an internal conversion or benchmark path retains complete-page material
- **THEN** navigation, sidebar, footer, and other secondary material SHALL remain excluded from the Browser summary source

### Requirement: Reviewable compressed derivatives
The system SHALL keep conversion, provider selection, generation, review, copy, and download in the extension popup. After successful capture, it SHALL render exactly one final Markdown result and MUST NOT create or navigate to an extension preview tab or window. The production export SHALL use focused content. The result SHALL be the focused converted source for None, the Custom focused derivative for Custom or Browser fallback, or the local-AI-assisted focused derivative after successful Browser generation.

A successful Browser summary SHALL appear once at a stable semantic boundary after the document title or, when no body title is available, before the first substantive body section. It SHALL use a neutral `Summary` heading without the repeated application label `Locally generated summary`. Machine-readable metadata SHALL continue to record `summary_origin: local-ai`, requested provider, model state, and measured output size. The visible and nested export language metadata MUST agree with the detected language used to configure the Summarizer session.

The popup MUST render final Markdown through the safe renderer and SHALL continue to expose requested provider, actual summary origin, Detail, local-AI state or failure, measured word and byte counts, estimated token count, immutable source metadata, focused export mode, and language state. Copied or downloaded UTF-8 Markdown SHALL match the sole final result.

#### Scenario: Browser summary succeeds
- **WHEN** Browser summarization completes successfully below Detail 100
- **THEN** the final Markdown SHALL contain one neutral Summary section at the stable introductory boundary, record `local-ai` as actual origin, and preserve the independently compressed focused body

#### Scenario: Browser summary falls back
- **WHEN** local summarization is unavailable, unsupported, cancelled, or fails
- **THEN** the system SHALL omit the generated Summary section, retain the deterministic Custom focused derivative, and identify Browser as requested and deterministic extraction as actual

#### Scenario: Detected language is recorded
- **WHEN** Browser generation uses a supported detected primary language
- **THEN** run-level, nested export, frontmatter, and visible language evidence SHALL consistently report that language rather than retaining an `unknown` placeholder

### Requirement: Regression coverage for deterministic extraction, local AI, and fallback behavior
The system SHALL test the observable focused compression and popup contract with deterministic fixtures and controlled browser-AI adapters. Coverage MUST include coherent primary-content selection, exclusion of navigation/sidebar/footer text, stable Summary placement, neutral labeling, quota measurement, semantic section chunking, language metadata propagation, deterministic Detail retention independent from summary source selection, protected-content retention, local-AI capability states, and deterministic fallback.

The approved `api-reference-mdn-fetch` fixture and existing benchmark archive SHALL verify focused Browser Detail 40 behavior. Complete conversion SHALL remain in internal deterministic and adversarial classifier tests but SHALL NOT appear in user-facing benchmark matrices. Tests MUST NOT require a locally installed extension or local Chrome AI model on this workstation.

#### Scenario: Controlled Browser AI receives an article fixture
- **WHEN** a controlled adapter summarizes the MDN fixture at focused Browser Detail 40
- **THEN** its input SHALL contain the coherent focused article, omit MDN navigation/sidebar/footer text, and place one Summary section at the introductory boundary

#### Scenario: Complete conversion guards classification
- **WHEN** internal regression coverage converts the complete MDN fixture
- **THEN** it SHALL verify that complete material remains representable while secondary page chrome cannot enter Browser summary input

#### Scenario: Controlled Browser AI is unavailable
- **WHEN** a regression test simulates an unavailable Chrome Summarizer after Browser is selected
- **THEN** the test SHALL verify that the Custom fallback is complete, is labelled as the actual result, and explains the unavailable optional Browser feature
