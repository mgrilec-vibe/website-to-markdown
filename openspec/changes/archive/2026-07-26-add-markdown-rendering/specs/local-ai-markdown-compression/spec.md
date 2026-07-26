## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Reviewable compressed derivatives
The system SHALL render the deterministic Markdown result and the current compressed derivative as separate, reviewable Markdown views in the extension-owned preview. The preview SHALL distinguish source-preserved Markdown, deterministic extractive summaries, and locally generated summaries. It SHALL keep each view's measured size, immutable source title, source URL, capture time, export mode, Detail, language state, summary origin, and local-AI usage visible where applicable.

The preview MUST NOT render captured source HTML directly and MUST NOT expose raw Markdown textareas or a Raw/Preview toggle. The user SHALL be able to copy or download the exact Markdown bytes for the compressed derivative regardless of whether it is deterministic-extractive or locally AI-assisted.

#### Scenario: Deterministic baseline and derivative are displayed
- **WHEN** the preview opens after a successful export
- **THEN** it SHALL render both the deterministic baseline and current derivative as Markdown views instead of raw Markdown textareas

#### Scenario: Deterministic extractive summary succeeds
- **WHEN** a Detail policy produces a deterministic extractive summary
- **THEN** the rendered derivative SHALL visibly mark the extractive boundary, display measured output size, and retain the rendered deterministic source result for review

#### Scenario: Local summary succeeds
- **WHEN** local-AI summarization completes successfully
- **THEN** the rendered derivative SHALL visibly mark the local-AI boundary, display measured output size, and retain the rendered extractive fallback and deterministic baseline for review

#### Scenario: User copies or downloads a compressed derivative
- **WHEN** the user chooses to copy or download an extractive or AI-assisted compressed export
- **THEN** the copied or downloaded UTF-8 Markdown SHALL retain its source provenance and summary-origin metadata and SHALL match the derivative Markdown bytes rather than generated preview HTML

### Requirement: Regression coverage for deterministic extraction, local AI, and fallback behavior
The system SHALL test the observable compression and preview contract with deterministic fixtures and controlled browser-AI adapters. The fixture set MUST cover removable chrome, protected code/tables/links, sentence selection and original-order preservation, each Detail policy band, language-independent fallback behavior, supported and unsupported local-AI language states, unavailable/downloadable/cancelled/failed model states, summary-origin boundaries, and oversized prose chunking. It MUST also cover rendered baseline and derivative structures, raw-HTML suppression, unsafe-link suppression, safe-link isolation, non-fetching image/media/embed handling, and copy/download Markdown-byte fidelity.

#### Scenario: Controlled local AI is unavailable
- **WHEN** a regression test simulates an unavailable Summarizer
- **THEN** the test SHALL verify that deterministic extractive compression remains complete and that the rendered preview explains the unavailable optional local-AI feature

#### Scenario: Rendered preview receives hostile Markdown
- **WHEN** a regression fixture supplies hostile HTML, unsafe destinations, and remote-resource Markdown
- **THEN** the test SHALL verify that executable markup is absent, only allowlisted links are interactive, and no preview resource request is initiated

#### Scenario: Compression policy changes
- **WHEN** a regression fixture runs at multiple Detail values
- **THEN** the test SHALL verify protected-content retention, documented retention and extractive policies, measured output metadata, rendered provenance boundaries, absence of any summary at Detail 100, and deterministic-extractive origin below Detail 100
