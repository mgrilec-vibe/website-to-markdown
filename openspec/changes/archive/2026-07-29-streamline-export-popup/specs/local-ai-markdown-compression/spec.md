## MODIFIED Requirements

### Requirement: Reviewable compressed derivatives
The system SHALL keep conversion, provider selection, generation, review, copy, and download in the extension popup. After a successful capture, it SHALL render exactly one final Markdown result in that popup and MUST NOT create or navigate to an extension preview tab or window. The result SHALL be the converted source for None, the Custom deterministic derivative for Custom or Browser fallback, or the local-AI derivative for successful Browser generation.

The popup MUST render the final Markdown through the extension's safe Markdown renderer; it MUST NOT render captured source HTML directly, expose raw Markdown textareas, expose a Raw/Preview toggle, render a baseline-plus-derivative comparison, or retain an alternate export artifact. The sole rendered result SHALL visibly show the requested provider, actual summary origin, Detail where applicable, local-AI state or failure where applicable, measured word and byte counts, an estimated token count labelled as an estimate, immutable source title, source URL, capture time, export mode, and language state.

The user SHALL be able to change the provider before conversion through saved preferences. The popup SHALL render the selected final result after conversion and, when quick-export copying is enabled, attempt to copy its exact UTF-8 Markdown bytes automatically. A failed clipboard write MUST retain the result and expose an explicit retry-copy action. The copied or downloaded Markdown SHALL retain source provenance and actual summary-origin metadata; it MUST match the result Markdown rather than generated preview HTML. Conversion limitations and Browser fallback warnings SHALL be visible but SHALL NOT suppress copying.

#### Scenario: Conversion stays in the popup
- **WHEN** the user initiates conversion
- **THEN** capture and final-result rendering SHALL complete in the popup without opening or navigating to another extension document

#### Scenario: A single final result is displayed
- **WHEN** conversion produces a None, Custom, Browser, or Browser-fallback result
- **THEN** the popup SHALL render one safe final Markdown view and SHALL not render a baseline, alternate derivative, raw textarea, or Raw/Preview control

#### Scenario: Browser summary succeeds
- **WHEN** Browser summarization completes successfully below Detail 100
- **THEN** the popup SHALL render the local-AI result, visibly identify Browser as requested and `local-ai` as actual, and display measured output size

#### Scenario: Quick export copy succeeds
- **WHEN** quick-export copying is enabled and final Markdown generation succeeds
- **THEN** the popup SHALL attempt to copy the exact final result Markdown, confirm success when the write completes, and offer a copy-again action

#### Scenario: Quick export copy fails
- **WHEN** quick-export copying is enabled and the clipboard write fails
- **THEN** the popup SHALL preserve the final result, expose a copy-failure state and retry-copy action, and continue to offer download

#### Scenario: User copies or downloads a final result
- **WHEN** the user chooses to copy or download a None, Custom, Browser, or Browser-fallback export
- **THEN** the copied or downloaded UTF-8 Markdown SHALL match the sole final result's Markdown bytes rather than generated preview HTML
