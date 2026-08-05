# Extension Quick Export Flow

## Purpose

Provide a compact, local export flow with an explicit READY configuration, visible progress, automatic copying, measured results, and recovery actions.

## Requirements

### Requirement: Quick export lifecycle
The extension SHALL provide a compact popup flow that opens in a READY state without capturing the active tab. READY SHALL initialize Focused article, the saved summarization provider and Detail defaults, and a truthful explanation of the saved automatic-copy behavior; it SHALL also permit Complete page as an export-local mode. The extension SHALL begin capture only after the user activates **Build Markdown**, using an immutable snapshot of the READY selections. From that action until completion, the popup SHALL visibly identify the current phase as capturing, converting, locally summarizing when Browser summarization is selected, or copying. The flow MUST remain local to the extension and MUST NOT send page-derived content to a service.

#### Scenario: Popup opens without capture
- **WHEN** the user opens the extension action
- **THEN** the popup SHALL show READY controls initialized to Focused article plus saved provider and Detail defaults and SHALL NOT capture, convert, summarize, copy, or download page content

#### Scenario: User builds without Browser summarization
- **WHEN** the user selects Focused article or Complete page with provider None or Custom and activates Build Markdown
- **THEN** the popup SHALL capture and convert the active page from that immutable selection snapshot, visibly progress through capturing and converting, and apply the saved automatic-copy behavior to the exact final Markdown

#### Scenario: User builds with Browser summarization
- **WHEN** the user selects Browser summarization below Detail 100 and activates Build Markdown and the final export invokes Chrome's local summarizer
- **THEN** the popup SHALL visibly identify local summarization before applying the saved automatic-copy behavior

#### Scenario: READY edits do not persist
- **WHEN** the user changes mode, provider, or Detail in READY and closes the popup without changing Settings
- **THEN** a later popup session SHALL initialize Focused article plus the still-saved provider and Detail defaults rather than the prior export-local selections

### Requirement: Completion result and export metrics
After final Markdown generation, the popup SHALL display a compact completion receipt without rendering any Markdown body or captured source HTML. The receipt SHALL identify the immutable source title and URL, capture time, export mode, requested provider, actual summary origin, Detail where applicable, language and capability state, measured word and byte counts, and an estimated token count. The token count MUST be visibly labelled as an estimate and MUST NOT be represented as a model-specific exact count. The popup SHALL preserve access to the exact final Markdown through an explicit copy action and the existing download action.

#### Scenario: Automatic clipboard copy succeeds
- **WHEN** saved automatic copying is enabled and the exact final Markdown is copied successfully
- **THEN** the popup SHALL confirm the copy, display the source receipt and required metrics, and offer copy-again and download actions without rendering Markdown content

#### Scenario: Automatic clipboard copy is disabled
- **WHEN** saved automatic copying is disabled and final generation succeeds
- **THEN** the popup SHALL state that Markdown is ready and offer copy and download actions with the same receipt information without attempting a clipboard write

#### Scenario: Completion contains private page content
- **WHEN** final Markdown contains private or page-derived text
- **THEN** the popup SHALL retain that Markdown only for copy and download actions and SHALL NOT insert its body, headings, links, or generated summary into the popup DOM

### Requirement: Failure and fallback recovery
The popup SHALL distinguish capture/conversion failure from clipboard-copy failure. A capture or conversion failure SHALL identify that no final export was copied and SHALL offer retry with the same immutable READY selection snapshot plus a route back to editable READY controls. A clipboard-copy failure SHALL preserve the final export in memory and SHALL expose an explicit retry-copy action without rendering its Markdown. Conversion limitations and Browser summarizer fallback warnings SHALL remain visible in the completion receipt and MUST NOT prevent copying or download.

#### Scenario: Capture fails before an export exists
- **WHEN** the active tab cannot be captured or no stored capture can be loaded
- **THEN** the popup SHALL explain that no export was created or copied and offer both retry with the same selections and return to READY

#### Scenario: Clipboard copy fails after conversion
- **WHEN** final Markdown generation succeeds but the clipboard write rejects
- **THEN** the popup SHALL display a copy-failure message, retain the receipt and download action, and offer an explicit Copy Markdown retry action

#### Scenario: Browser summarization falls back
- **WHEN** Browser summarization is unavailable, unsupported, cancelled, or fails and the deterministic fallback completes
- **THEN** the popup SHALL display Browser as requested, deterministic extraction as actual, and the failure warning and SHALL still apply the saved automatic-copy behavior
