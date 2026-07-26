## MODIFIED Requirements

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
