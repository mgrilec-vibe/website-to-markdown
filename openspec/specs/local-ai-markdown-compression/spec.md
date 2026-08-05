# Local AI Markdown Compression

## Purpose

Provide local, deterministic Markdown compression with optional Chrome on-device AI enhancement while preserving source provenance, protected content, receipt-based completion, and deterministic fallback behavior.

## Requirements

### Requirement: Local deterministic Markdown baseline
The system SHALL export the user-selected active Chrome tab as valid UTF-8 Markdown with source title, source URL, capture timestamp, and selected export mode. It SHALL produce a deterministic compressed result and, below Detail 100, a deterministic extractive compressed derivative before invoking any local AI API. The system MUST process page content, conversion, compression, receipt metadata, copy, and download locally and MUST NOT transmit page content, generated summaries, or content-bearing diagnostics to a service.

#### Scenario: User exports from a browser without local AI support
- **WHEN** the user exports an accessible active tab and Chrome's local AI APIs are unavailable
- **THEN** the system SHALL produce a deterministic Markdown result with a local completion receipt and copy/download actions without requiring a model, account, API key, preview render, or network request containing page content

#### Scenario: User exports from an inaccessible page
- **WHEN** Chrome does not permit access to the selected page
- **THEN** the system SHALL explain that the page cannot be exported and SHALL not claim that a partial local-AI result was created

### Requirement: Protected content and deterministic compression
The system SHALL classify converted content into provenance, protected, removable, and summarizable blocks before any summarization. It MUST retain provenance, headings, link destinations, code, tables, designated quotations, and conversion-limit notices verbatim in normal compressed exports. It MUST remove only documented removable blocks deterministically and MUST exclude protected, removable, navigation, sidebar, footer, and other secondary page-chrome content from Chrome Summarizer input.

#### Scenario: Protected structures are present
- **WHEN** an export contains code, a table, a link destination, headings, and source provenance
- **THEN** each protected structure SHALL remain present and unchanged in both the deterministic compressed result and any locally AI-assisted result

#### Scenario: Complete-page chrome surrounds an article
- **WHEN** Complete page conversion contains primary article prose plus navigation, sidebar, footer, or related-page material
- **THEN** the selected-mode export SHALL retain content according to Complete conversion and compression rules while only the coherent focused primary-content unit is eligible as Browser summary input

#### Scenario: Removable page chrome is present
- **WHEN** converted content contains a block classified as removable
- **THEN** the deterministic compressor SHALL remove that block without sending it to a local AI API and SHALL retain removal accounting in final export metadata without rendering the removed or retained page text in the receipt

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
The system SHALL determine the language state of summarizable prose locally when a user enables local-AI enhancement. It SHALL treat a page-declared language as a hint and, when Chrome Language Detector is available, show the detected primary language and confidence in the completion receipt. It MUST identify whether the primary language is supported by Chrome Summarizer and visibly warn in the receipt when local-AI enhancement is unsupported, ambiguous, materially mixed, unknown, or language detection is unavailable. These states MUST NOT disable deterministic extractive summarization.

#### Scenario: Supported language is detected confidently
- **WHEN** eligible prose has a confidently detected supported primary language
- **THEN** the receipt SHALL display the language and confidence and the system SHALL configure any local summary session to expect that input and output language

#### Scenario: Unsupported language is detected
- **WHEN** eligible prose has a detected primary language that Chrome Summarizer does not support
- **THEN** the receipt SHALL warn that local summarization is unavailable for that language, SHALL not silently substitute another language, and SHALL retain deterministic compression controls

#### Scenario: Language detection is uncertain or mixed
- **WHEN** language detection does not establish a confident supported primary language
- **THEN** the receipt SHALL label local-AI enhancement as uncertain or mixed, the system SHALL disable automatic local-AI summarization, and deterministic extractive compression SHALL remain available

### Requirement: Explicit local-model capability and provisioning
The system SHALL feature-detect Chrome Language Detector and Summarizer APIs in an extension-owned document context. It SHALL report available, downloadable, downloading, unavailable, cancelled, and failed states. The system MUST require an explicit user action before creating a downloadable model session and MUST NOT run local AI sessions from the MV3 service worker.

#### Scenario: A required local model is downloadable
- **WHEN** an API reports `downloadable`
- **THEN** the popup SHALL explain that a local browser-model download is required and SHALL begin the download only after the user explicitly requests it

#### Scenario: Local model creation is cancelled or fails
- **WHEN** detector or summarizer provisioning is cancelled or fails
- **THEN** the system SHALL preserve the deterministic extractive result, record the local-AI failure state in the receipt, and SHALL not replace source-preserved content with partial generated output

### Requirement: Deterministic extractive summary fallback
The system SHALL offer a single-choice **Summarization** setting with **None**, **Browser**, and **Custom** options for an exported page. **None** SHALL produce the complete converted Markdown without summary generation and SHALL make Detail inactive. **Custom** SHALL produce a language-independent deterministic extractive derivative for eligible prose when Detail is below 100. **Browser** SHALL invoke Chrome's local Summarizer only after the user explicitly selected Browser and initiated conversion; if the capability is unavailable, unsupported, declined, cancelled, or fails, the system SHALL produce the Custom derivative instead.

Custom extraction SHALL use the Detail-policy sentence budget and relevance signals, then select source sentences greedily with version-1 MMR scoring of `0.7 × normalized relevance − 0.3 × maximum lexical similarity to a selected sentence` within the same source block. It MUST segment only summarizable prose into source sentences, preserve selected sentences verbatim in source order, exclude provenance, protected, and removable blocks, and retain a source-anchored representation for each non-retained prose block. Custom extraction MUST use no model, dependency, content-bearing network request, language detector, or model provisioning. It MUST use lexical similarity locally, with a character n-gram fallback when word-token overlap is insufficient.

When Detail is 100, Browser and Custom SHALL retain eligible prose verbatim and SHALL not invoke a model or add a summary. The system SHALL record the requested provider separately from the actual summary origin: `none`, `deterministic-diverse-extractive`, or `local-ai`. A Browser fallback MUST identify `browser` as requested and `deterministic-diverse-extractive` as actual; it MUST NOT be presented as Browser output.

#### Scenario: None retains converted source without a summary
- **WHEN** the user selects None at any Detail value
- **THEN** the system SHALL produce complete converted Markdown without summary generation, SHALL make Detail inactive, and SHALL record `none` as the actual summary origin

#### Scenario: Custom extraction avoids redundant sentences
- **WHEN** a non-retained prose block contains near-duplicate high-relevance sentences and an orthogonal source sentence within its Detail-policy budget
- **THEN** Custom extraction SHALL select no more than one of the near-duplicate sentences when an orthogonal candidate adds greater non-redundant coverage

#### Scenario: Browser falls back to Custom
- **WHEN** the user selects Browser below Detail 100 and Chrome Summarizer is unavailable, unsupported, declined, cancelled, or fails
- **THEN** the system SHALL create the Detail-policy Custom derivative without requiring a model or network request and SHALL retain the Browser failure state beside its actual Custom origin

#### Scenario: Custom extraction uses lexical fallback
- **WHEN** a Custom candidate sentence lacks sufficiently granular word tokens for lexical overlap
- **THEN** Custom extraction SHALL use its deterministic local character n-gram similarity fallback without changing the source text

#### Scenario: Maximum Detail does not summarize
- **WHEN** the user selects Browser or Custom at Detail 100
- **THEN** the system SHALL retain eligible prose verbatim, SHALL not invoke Chrome Summarizer, and SHALL record no generated summary

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

### Requirement: Receipt-based compressed derivatives
The system SHALL keep export selection, conversion, generation, completion, copy, and download in the extension popup. READY SHALL initialize Focused article and SHALL allow the user to select Complete page for the current export before conversion. The final Markdown SHALL be the selected-mode converted source for None, the selected-mode Custom derivative for Custom or Browser fallback, or the selected-mode derivative with the local-AI Summary section after successful Browser generation. Browser summary input MUST remain limited to the coherent focused primary-content unit even when the selected export mode is Complete page.

A successful Browser summary SHALL appear once in the final Markdown at a stable semantic boundary after the document title or, when no body title is available, before the first substantive body section. It SHALL use a neutral `Summary` heading without the repeated application label `Locally generated summary`. Machine-readable metadata SHALL continue to record `summary_origin: local-ai`, requested provider, model state, selected export mode, and measured output size. Export and receipt language metadata MUST agree with the detected language used to configure the Summarizer session.

After generation, the popup SHALL display a compact receipt and MUST NOT render final Markdown, captured source HTML, page-derived headings or links, a raw Markdown textarea, a Raw/Preview toggle, a baseline comparison, or an alternate export artifact. The receipt SHALL visibly show immutable source title and URL, capture time, selected export mode, requested provider, actual summary origin, Detail where applicable, local-AI state or failure where applicable, measured word and byte counts, an estimated token count labelled as an estimate, language state, conversion limitations, and copy/download state.

When saved automatic copying is enabled, the popup SHALL attempt to copy the exact final UTF-8 Markdown bytes after generation. A failed clipboard write MUST retain the final result in memory and expose an explicit retry-copy action without displaying its body. The copied or downloaded Markdown SHALL retain source provenance and actual summary-origin metadata and MUST match the final Markdown held for that action. Conversion limitations and Browser fallback warnings SHALL be visible in the receipt but SHALL NOT suppress copying or download.

#### Scenario: Conversion stays in the popup
- **WHEN** the user activates Build Markdown from READY
- **THEN** capture, conversion, generation, and receipt rendering SHALL complete in the popup without opening or navigating to another extension document

#### Scenario: Receipt omits Markdown content
- **WHEN** conversion produces a None, Custom, Browser, or Browser-fallback result
- **THEN** the popup SHALL render one receipt without inserting final Markdown or captured source content into the popup DOM

#### Scenario: Complete page is selected
- **WHEN** the user selects Complete page for the current export and activates Build Markdown
- **THEN** the copied or downloaded result SHALL identify Complete as its export mode while any Browser summary source remains limited to the coherent focused primary-content unit

#### Scenario: Browser summary succeeds
- **WHEN** Browser summarization completes successfully below Detail 100
- **THEN** the final Markdown SHALL contain one neutral Summary section at the stable introductory boundary, record `local-ai` as actual origin, preserve the independently compressed selected-mode body, and expose only its metadata in the receipt

#### Scenario: Browser summary falls back
- **WHEN** local summarization is unavailable, unsupported, cancelled, or fails
- **THEN** the system SHALL omit the generated Summary section, retain the selected-mode deterministic Custom derivative, and identify Browser as requested and deterministic extraction as actual in the receipt

#### Scenario: Detected language is recorded
- **WHEN** Browser generation uses a supported detected primary language
- **THEN** run-level, nested export, frontmatter, and receipt language evidence SHALL consistently report that language rather than retaining an `unknown` placeholder

#### Scenario: Automatic copy succeeds
- **WHEN** saved automatic copying is enabled and final Markdown generation succeeds
- **THEN** the popup SHALL copy the exact final Markdown, confirm success, and offer copy-again and download actions without rendering the Markdown

#### Scenario: Automatic copy fails
- **WHEN** saved automatic copying is enabled and the clipboard write fails
- **THEN** the popup SHALL retain the final result in memory, expose a copy-failure state and retry-copy action, and continue to offer download

#### Scenario: User copies or downloads a final result
- **WHEN** the user chooses to copy or download a None, Custom, Browser, or Browser-fallback export
- **THEN** the copied or downloaded UTF-8 Markdown SHALL match the final result bytes and SHALL not be derived from receipt markup

### Requirement: Regression coverage for deterministic extraction, local AI, and fallback behavior
The system SHALL test observable Focused and Complete compression plus the READY, processing, failure, and receipt contracts with deterministic fixtures and controlled browser-AI adapters. Coverage MUST include export-local mode selection, coherent primary-content summary selection, exclusion of navigation/sidebar/footer text from Browser input, stable Summary placement, neutral labeling, quota measurement, semantic section chunking, language metadata propagation, deterministic Detail retention independent from summary source selection, protected-content retention, local-AI capability states, receipt metadata, byte-faithful copy/download, and deterministic fallback without rendering page-derived Markdown in the popup DOM.

The approved `api-reference-mdn-fetch` fixture and existing benchmark archive SHALL continue to verify focused Browser Detail 40 behavior. Complete selection SHALL be covered by production popup and conversion regression tests without requiring a new user-facing Browser benchmark matrix. Tests MUST NOT require a locally installed extension or local Chrome AI model on this workstation.

#### Scenario: Controlled Browser AI receives an article fixture
- **WHEN** a controlled adapter summarizes the MDN fixture at focused Browser Detail 40
- **THEN** its input SHALL contain the coherent focused article, omit MDN navigation/sidebar/footer text, and place one Summary section at the introductory boundary

#### Scenario: Production Complete export guards summary selection
- **WHEN** a popup regression selects Complete page for an article fixture with surrounding page chrome
- **THEN** the final export SHALL identify Complete mode while controlled Browser summary input excludes navigation, sidebar, footer, and related-page material

#### Scenario: Controlled Browser AI is unavailable
- **WHEN** a regression test simulates an unavailable Chrome Summarizer after Browser is selected
- **THEN** the test SHALL verify that the selected-mode Custom fallback is complete, is labelled as the actual result, and explains the unavailable optional Browser feature in the receipt

#### Scenario: Custom extraction receives repeated claims
- **WHEN** a regression fixture supplies a prose block with repeated claims and a distinct evidence, caveat, or conclusion sentence
- **THEN** the test SHALL verify that Custom extraction selects verbatim, source-ordered sentences with reduced lexical redundancy

#### Scenario: Provider and mode policy changes
- **WHEN** regression fixtures run at multiple Detail values, each requested provider, and both READY export modes
- **THEN** tests SHALL verify protected-content retention, documented retention and extractive policies, measured output metadata, provider/origin and mode labeling, no summary at Detail 100 for Browser and Custom, no Markdown body in the receipt, and byte-faithful final Markdown export
