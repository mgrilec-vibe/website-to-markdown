## ADDED Requirements

### Requirement: Local deterministic Markdown baseline
The system SHALL export the user-selected active Chrome tab as valid UTF-8 Markdown with source title, source URL, capture timestamp, and selected export mode. It SHALL produce a deterministic compressed result and, below Detail 100, a deterministic extractive compressed derivative before invoking any local AI API. The system MUST process page content, conversion, compression, preview, copy, and download locally and MUST NOT transmit page content, generated summaries, or content-bearing diagnostics to a service.

#### Scenario: User exports from a browser without local AI support
- **WHEN** the user exports an accessible active tab and Chrome's local AI APIs are unavailable
- **THEN** the system SHALL present a deterministic Markdown result that can be reviewed, copied, and downloaded without a model, account, API key, or network request containing page content

#### Scenario: User exports from an inaccessible page
- **WHEN** Chrome does not permit access to the selected page
- **THEN** the system SHALL explain that the page cannot be exported and SHALL not claim that a partial local-AI result was created

### Requirement: Protected content and deterministic compression
The system SHALL classify converted content into provenance, protected, removable, and summarizable blocks before any summarization. It MUST retain provenance, headings, link destinations, code, tables, designated quotations, and conversion-limit notices verbatim in normal compressed exports. It MUST remove only documented removable blocks deterministically and MUST exclude protected and removable blocks from deterministic extraction and Summarizer input.

#### Scenario: Protected structures are present
- **WHEN** an export contains code, a table, a link destination, headings, and source provenance
- **THEN** each protected structure SHALL remain present and unchanged in both the deterministic compressed result and any locally AI-assisted result

#### Scenario: Removable page chrome is present
- **WHEN** converted content contains a block classified as removable
- **THEN** the deterministic compressor SHALL remove that block without sending it to a local AI API and SHALL make the removal accounting available in the preview

### Requirement: Detailed compression control
The system SHALL provide an integer Detail control from 0 through 100 for the compressed export. The control SHALL map each value to a versioned deterministic retention policy and a deterministic extractive-summary policy; where local AI is eligible, it SHALL also map to a documented Summarizer enhancement policy. The system MUST label the control as a level of detail or compression rather than an exact output-word target, and MUST display measured final word and byte counts after generation.

#### Scenario: User requests maximum detail
- **WHEN** the user selects Detail 100
- **THEN** the system SHALL preserve all eligible prose selected by the deterministic export and SHALL not substitute any prose with a generated summary

#### Scenario: User changes Detail within a policy band
- **WHEN** the user changes Detail between two values that use the same qualitative Summarizer length
- **THEN** the system SHALL apply the values' distinct deterministic retention policies and SHALL display the resulting measured output size without claiming an exact predicted count

#### Scenario: User requests low detail with local AI unavailable
- **WHEN** the user selects a low Detail value and local summarization cannot run
- **THEN** the system SHALL apply the corresponding deterministic retention and extractive-summary policies, preserve protected structures, and identify the derivative as deterministic-extractive

### Requirement: Optional local-AI language detection and language-support warning
The system SHALL determine the language state of summarizable prose locally when a user enables local-AI enhancement. It SHALL treat a page-declared language as a hint and, when Chrome Language Detector is available, show the detected primary language and confidence. It MUST identify whether the primary language is supported by Chrome Summarizer and visibly warn when local-AI enhancement is unsupported, ambiguous, materially mixed, unknown, or language detection is unavailable. These states MUST NOT disable deterministic extractive summarization.

#### Scenario: Supported language is detected confidently
- **WHEN** eligible prose has a confidently detected supported primary language
- **THEN** the preview SHALL display the language and confidence and SHALL configure any local summary session to expect that input and output language

#### Scenario: Unsupported language is detected
- **WHEN** eligible prose has a detected primary language that Chrome Summarizer does not support
- **THEN** the system SHALL warn that local summarization is unavailable for that language, SHALL not silently substitute another language, and SHALL retain deterministic compression controls

#### Scenario: Language detection is uncertain or mixed
- **WHEN** language detection does not establish a confident supported primary language
- **THEN** the system SHALL label local-AI enhancement as uncertain or mixed, disable automatic local-AI summarization, and preserve deterministic extractive compression

### Requirement: Explicit local-model capability and provisioning
The system SHALL feature-detect Chrome Language Detector and Summarizer APIs in an extension-owned document context. It SHALL report available, downloadable, downloading, unavailable, cancelled, and failed states. The system MUST require an explicit user action before creating a downloadable model session and MUST NOT run local AI sessions from the MV3 service worker.

#### Scenario: A required local model is downloadable
- **WHEN** an API reports `downloadable`
- **THEN** the preview SHALL explain that a local browser-model download is required and SHALL begin the download only after the user explicitly requests it

#### Scenario: Local model creation is cancelled or fails
- **WHEN** detector or summarizer provisioning is cancelled or fails
- **THEN** the system SHALL preserve the deterministic extractive result, record the local-AI failure state in the preview, and SHALL not replace source-preserved content with partial generated output


### Requirement: Deterministic extractive summary fallback
The system SHALL provide a language-independent deterministic extractive summary for eligible prose whenever Detail is below 100 and local-AI enhancement is unavailable, unsupported, declined, cancelled, or fails. It MUST segment only summarizable prose into source sentences, deterministically score and select sentences according to the Detail policy, preserve selected sentences verbatim in source order, and exclude provenance, protected, and removable blocks. It MUST label this content and export metadata with `summary_origin: deterministic-extractive`.

#### Scenario: Unsupported language uses deterministic extraction
- **WHEN** the detected or declared page language is unsupported by Chrome Summarizer
- **THEN** the system SHALL create the Detail-policy deterministic extractive derivative without requiring language detection or model provisioning

#### Scenario: Maximum Detail does not summarize
- **WHEN** the user selects Detail 100
- **THEN** the system SHALL retain eligible prose verbatim and SHALL not add a deterministic extractive or local-AI summary

#### Scenario: Deterministic extraction selects sentences
- **WHEN** a lower Detail policy selects eligible prose for summary
- **THEN** the system SHALL emit only selected source sentences in their original order and SHALL not synthesize or paraphrase text

### Requirement: Bounded local prose summarization
The system SHALL send only summarizable plain-text prose to Chrome Summarizer. It SHALL use a documented type, format, length, and preference for the selected Detail policy. For input exceeding usable session capacity, it SHALL chunk only at deterministic block boundaries and use a bounded summary-of-summaries strategy where needed. It MUST retain the deterministic result if any required local summary stage fails.

#### Scenario: Eligible prose fits a local summary session
- **WHEN** summarizable prose fits the active local session capacity and the language is supported
- **THEN** the system SHALL generate the policy-selected local summary and insert it only at the corresponding eligible-prose boundary

#### Scenario: Eligible prose exceeds capacity
- **WHEN** eligible prose exceeds the usable local session capacity
- **THEN** the system SHALL summarize deterministic chunks without including protected blocks, surface that chunking occurred, and retain the deterministic result if bounded chunking cannot complete

### Requirement: Reviewable compressed derivatives
The system SHALL distinguish source-preserved Markdown, deterministic extractive summaries, and locally generated summaries in the preview and in compressed export metadata. Every derivative MUST retain immutable source title, source URL, capture time, and export mode, and MUST record Detail, measured size, language state, summary origin, and local-AI usage when applicable. The user SHALL be able to review, copy, or download the deterministic result regardless of whether an extractive or local-AI derivative is also available.

#### Scenario: Deterministic extractive summary succeeds
- **WHEN** a Detail policy produces a deterministic extractive summary
- **THEN** the preview SHALL visibly mark the extractive boundary, display measured output size, and offer the deterministic source result and extractive derivative for review

#### Scenario: Local summary succeeds
- **WHEN** local-AI summarization completes successfully
- **THEN** the preview SHALL visibly mark the local-AI boundary, display measured output size, and offer the extractive fallback and locally AI-assisted derivative for review

#### Scenario: User downloads a compressed derivative
- **WHEN** the user chooses to download an extractive or AI-assisted compressed export
- **THEN** the downloaded Markdown SHALL retain source provenance and metadata identifying the summary origin

### Requirement: Regression coverage for deterministic extraction, local AI, and fallback behavior
The system SHALL test the observable compression contract with deterministic fixtures and controlled browser-AI adapters. The fixture set MUST cover removable chrome, protected code/tables/links, sentence selection and original-order preservation, each Detail policy band, language-independent fallback behavior, supported and unsupported local-AI language states, unavailable/downloadable/cancelled/failed model states, summary-origin boundaries, and oversized prose chunking.

#### Scenario: Controlled local AI is unavailable
- **WHEN** a regression test simulates an unavailable Summarizer
- **THEN** the test SHALL verify that deterministic extractive compression remains complete and that the preview explains the unavailable optional local-AI feature

#### Scenario: Compression policy changes
- **WHEN** a regression fixture runs at multiple Detail values
- **THEN** the test SHALL verify protected-content retention, documented retention and extractive policies, measured output metadata, absence of any summary at Detail 100, and deterministic-extractive origin below Detail 100