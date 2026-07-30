# Extension Export Preferences

## Purpose

Persist export defaults and provide an extension-owned settings entry point for managing them.

## Requirements

### Requirement: Persistent export defaults
The extension SHALL persist user-selected defaults for export mode, summarization provider, Detail level, and whether quick export attempts automatic clipboard copying. Stored preferences MUST be applied when the extension action opens and MUST use extension-owned local storage separate from transient captured-page records.

#### Scenario: Saved defaults initialize quick export
- **WHEN** a user has saved export preferences and opens the extension action
- **THEN** the quick-export flow SHALL use those preferences without requiring the user to reselect them for that export

#### Scenario: Preferences survive a browser-session export cleanup
- **WHEN** temporary captured export records are removed or expire
- **THEN** saved export preferences SHALL remain available for a subsequent extension action

### Requirement: Settings entry point
The extension SHALL provide an extension action context-menu entry that opens an extension-owned settings surface. The settings surface SHALL let the user inspect and change each persisted export default and shall explain that Browser summarization uses Chrome local AI when available and otherwise falls back to deterministic extraction.

#### Scenario: User opens settings from the extension action menu
- **WHEN** the user opens the extension action context menu and chooses the settings command
- **THEN** the extension SHALL open its settings surface without capturing or converting the active page

#### Scenario: User saves settings
- **WHEN** the user changes a supported export preference and saves it
- **THEN** the extension SHALL validate the supported mode, provider, and Detail range, persist the values locally, and use them for later quick exports
