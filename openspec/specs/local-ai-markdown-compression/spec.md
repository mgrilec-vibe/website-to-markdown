# Local AI Markdown Compression

## Purpose

Provide local, deterministic Markdown compression with optional Chrome on-device AI enhancement while preserving source provenance, protected content, reviewable derivatives, and deterministic fallback behavior.

## Requirements

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
The system SHALL send only summarizable plain-text prose to Chrome Summarizer. It SHALL use a documented type, format, length, and preference for the selected Detail policy. For input exceeding usable session capacity, it SHALL chunk only at deterministic block boundaries and use a bounded summary-of-summaries strategy where needed. It MUST retain the deterministic result if any required local summary stage fails.

#### Scenario: Eligible prose fits a local summary session
- **WHEN** summarizable prose fits the active local session capacity and the language is supported
- **THEN** the system SHALL generate the policy-selected local summary and insert it only at the corresponding eligible-prose boundary

#### Scenario: Eligible prose exceeds capacity
- **WHEN** eligible prose exceeds the usable local session capacity
- **THEN** the system SHALL summarize deterministic chunks without including protected blocks, surface that chunking occurred, and retain the deterministic result if bounded chunking cannot complete

### Requirement: Safe rendered Markdown preview boundary
The system SHALL treat every Markdown string displayed in the extension preview as untrusted page-derived input. It MUST parse Markdown without interpreting embedded HTML and MUST sanitize generated preview markup before insertion into the preview document. The rendered-preview allowlist MUST exclude scripts, event attributes, inline styles, forms, SVG, MathML, frames, embeds, images, video, audio, and other remote-resource elements.

Rendered links MUST be limited to absolute `http:`, `https:`, and `mailto:` destinations. Unsupported, malformed, relative, and non-allowlisted destinations MUST render as non-link text. Rendered web links MUST use opener isolation. Image, media, and embed Markdown MUST render without creating a network-fetching element.

#### Scenario: Preview receives raw HTML and executable markup
- **WHEN** deterministic or compressed Markdown contains raw HTML, event attributes, or executable markup
- **THEN** the preview SHALL present it only as Markdown text where applicable and SHALL not create executable or styled HTML DOM from that input

#### Scenario: Preview receives unsafe link destinations
- **WHEN** deterministic or compressed Markdown contains `javascript:`, `data:`, `tel:`, relative, malformed, or other non-allowlisted link destinations
- **THEN** the preview SHALL not create clickable links for those destinations

#### Scenario: Preview receives safe external links
- **WHEN** deterministic or compressed Markdown contains an absolute `http:`, `https:`, or `mailto:` link
- **THEN** the preview SHALL render the link with its destination restricted to that allowlist, and any newly opened web page SHALL be isolated from the preview opener

#### Scenario: Preview receives image or embedded resource Markdown
- **WHEN** deterministic or compressed Markdown contains an image, media, or embed reference
- **THEN** the preview SHALL show non-fetching accessible replacement content and SHALL not issue a request for the referenced resource

### Requirement: Reviewable compressed derivatives
The system SHALL keep conversion, provider selection, generation, review, copy, and download in the extension popup. After a successful capture, it SHALL render exactly one final Markdown result in that popup and MUST NOT create or navigate to an extension preview tab or window. The result SHALL be the converted source for None, the Custom deterministic derivative for Custom or Browser fallback, or the local-AI derivative for successful Browser generation.

The popup MUST render the final Markdown through the extension's safe Markdown renderer; it MUST NOT render captured source HTML directly, expose raw Markdown textareas, expose a Raw/Preview toggle, render a baseline-plus-derivative comparison, or retain an alternate export artifact. The sole rendered result SHALL visibly show the requested provider, actual summary origin, Detail where applicable, local-AI state or failure where applicable, measured size, immutable source title, source URL, capture time, export mode, and language state.

The user SHALL be able to change the provider before conversion. The popup SHALL render the selected final result after conversion and copy or download the exact UTF-8 Markdown bytes for that result. The copied or downloaded Markdown SHALL retain source provenance and actual summary-origin metadata; it MUST match the result Markdown rather than generated preview HTML.

#### Scenario: Conversion stays in the popup
- **WHEN** the user initiates conversion
- **THEN** capture and final-result rendering SHALL complete in the popup without opening or navigating to another extension document

#### Scenario: A single final result is displayed
- **WHEN** conversion produces a None, Custom, Browser, or Browser-fallback result
- **THEN** the popup SHALL render one safe final Markdown view and SHALL not render a baseline, alternate derivative, raw textarea, or Raw/Preview control

#### Scenario: Browser summary succeeds
- **WHEN** Browser summarization completes successfully below Detail 100
- **THEN** the popup SHALL render the local-AI result, visibly identify Browser as requested and `local-ai` as actual, and display measured output size

#### Scenario: User copies or downloads a final result
- **WHEN** the user chooses to copy or download a None, Custom, Browser, or Browser-fallback export
- **THEN** the copied or downloaded UTF-8 Markdown SHALL match the sole final result's Markdown bytes rather than generated preview HTML

### Requirement: Regression coverage for deterministic extraction, local AI, and fallback behavior
The system SHALL test the observable compression and popup contract with deterministic fixtures and controlled browser-AI adapters. The fixture set MUST cover removable chrome, protected code/tables/links, source-sentence selection and original-order preservation, each Detail policy band, language-independent fallback behavior, supported and unsupported local-AI language states, unavailable/downloadable/cancelled/failed model states, source metadata, actual summary-origin boundaries, and oversized prose chunking.

It MUST also cover Custom redundant-sentence avoidance, lexical similarity fallback, repeated-run determinism, Detail-100 behavior, None's complete unsummarized output and inactive Detail control, requested-provider versus actual-origin labels, popup-only capture-to-result transition with no tab/window creation, one rendered final-result structure, raw-HTML suppression, absent raw textarea/dual-preview UI, and byte-faithful copy/download of the final Markdown.

#### Scenario: Controlled Browser AI is unavailable
- **WHEN** a regression test simulates an unavailable Chrome Summarizer after Browser is selected
- **THEN** the test SHALL verify that the Custom fallback is complete, is labelled as the actual result, and explains the unavailable optional Browser feature

#### Scenario: Custom extraction receives repeated claims
- **WHEN** a regression fixture supplies a prose block with repeated claims and a distinct evidence, caveat, or conclusion sentence
- **THEN** the test SHALL verify that Custom extraction selects verbatim, source-ordered sentences with reduced lexical redundancy

#### Scenario: Provider policy changes
- **WHEN** a regression fixture runs at multiple Detail values and each requested provider
- **THEN** the test SHALL verify protected-content retention, documented retention and extractive policies, measured output metadata, provider/origin labeling, popup-only one-result rendering, no summary at Detail 100 for Browser and Custom, and byte-faithful final Markdown export
