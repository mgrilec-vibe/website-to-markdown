# Extension Quick Export Flow

## Purpose

Provide a compact, local quick-export flow with visible progress, automatic copying, measured results, and recovery actions.

## Requirements

### Requirement: Quick export lifecycle
The extension SHALL provide a compact popup flow that starts an export of the active tab using the user's saved export preferences. From the initiating action until completion, the popup SHALL visibly identify the current phase as capturing, converting, locally summarizing when Browser summarization is selected, or copying. The flow MUST remain local to the extension and MUST NOT send page-derived content to a service.

#### Scenario: Quick export completes without Browser summarization
- **WHEN** the user opens the extension action on an exportable active tab whose saved provider is None or Custom
- **THEN** the popup SHALL capture and convert the page, visibly progress through capturing and converting, and attempt to copy the exact final Markdown to the clipboard

#### Scenario: Quick export completes with Browser summarization
- **WHEN** the user opens the extension action with Browser summarization selected and the final export invokes Chrome's local summarizer
- **THEN** the popup SHALL visibly identify local summarization before attempting to copy the resulting exact final Markdown

### Requirement: Completion result and export metrics
After a successful clipboard write, the popup SHALL display a copied confirmation, the exact final export's measured word and byte counts, and an estimated token count. The token count MUST be visibly labelled as an estimate and MUST NOT be represented as a model-specific exact count. The popup SHALL preserve access to the final Markdown through an explicit copy-again action and the existing download action.

#### Scenario: Clipboard copy succeeds
- **WHEN** a final export is generated and its clipboard write succeeds
- **THEN** the popup SHALL confirm that the Markdown was copied, display its measured word and byte counts plus an estimated token count, and offer copy-again and download actions

### Requirement: Failure and fallback recovery
The popup SHALL distinguish capture/conversion failure from clipboard-copy failure. A capture or conversion failure SHALL identify that no final export was copied and offer retry. A clipboard-copy failure SHALL preserve the final export and offer an explicit retry-copy action. Conversion limitations and Browser summarizer fallback warnings SHALL remain visible for completed exports and MUST NOT prevent a clipboard-copy attempt.

#### Scenario: Capture fails before an export exists
- **WHEN** the active tab cannot be captured or no stored capture can be loaded
- **THEN** the popup SHALL explain that no export was created or copied and offer a retry action

#### Scenario: Clipboard copy fails after conversion
- **WHEN** final Markdown generation succeeds but the clipboard write rejects
- **THEN** the popup SHALL display a copy-failure message, retain the result metrics and download action, and offer an explicit Copy Markdown retry action

#### Scenario: Browser summarization falls back
- **WHEN** Browser summarization is unavailable, unsupported, cancelled, or fails and the deterministic fallback completes
- **THEN** the popup SHALL retain the existing requested-provider, actual-summary-origin, and failure warning information and SHALL still attempt to copy the fallback Markdown
