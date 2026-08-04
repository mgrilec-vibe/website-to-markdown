## MODIFIED Requirements

### Requirement: Persistent export defaults
The extension SHALL persist user-selected defaults for summarization provider, Detail level, and whether quick export attempts automatic clipboard copying. Focused content SHALL be the sole production export mode and SHALL no longer be a user-selectable persisted setting. Stored preferences MUST be applied when the extension action opens and MUST use extension-owned local storage separate from transient captured-page records.

Legacy stored preferences containing `mode: "complete"` SHALL normalize to focused behavior without failing an export or retaining Complete as a selectable compatibility path. Complete conversion MAY remain available to internal conversion and classifier tests but MUST NOT be exposed by production settings or quick export.

#### Scenario: Saved defaults initialize quick export
- **WHEN** a user has saved supported provider, Detail, and automatic-copy preferences and opens the extension action
- **THEN** the quick-export flow SHALL apply those preferences to focused content without requiring the user to select an export mode

#### Scenario: Legacy Complete preference is loaded
- **WHEN** persisted settings contain `mode: "complete"` from an earlier release
- **THEN** the extension SHALL normalize the export to focused content and SHALL not expose or preserve Complete as a user-selectable mode

#### Scenario: Preferences survive a browser-session export cleanup
- **WHEN** temporary captured export records are removed or expire
- **THEN** saved provider, Detail, and automatic-copy preferences SHALL remain available for a subsequent focused export

### Requirement: Settings entry point
The extension SHALL provide an extension action context-menu entry that opens an extension-owned settings surface. The settings surface SHALL let the user inspect and change summarization provider, Detail level, and automatic-copy defaults; it SHALL explain that exports use focused content and that Browser summarization uses Chrome local AI when available and otherwise falls back to deterministic extraction. The settings surface MUST NOT offer Complete page mode.

#### Scenario: User opens settings from the extension action menu
- **WHEN** the user opens the extension action context menu and chooses the settings command
- **THEN** the extension SHALL open its settings surface without capturing or converting the active page and without displaying a Complete mode control

#### Scenario: User saves settings
- **WHEN** the user changes a supported provider, Detail, or automatic-copy preference and saves
- **THEN** the extension SHALL validate and persist those values locally and use them for later focused quick exports
