## MODIFIED Requirements

### Requirement: Persistent export defaults
The extension SHALL persist user-selected defaults for summarization provider, Detail level, and whether a completed export attempts automatic clipboard copying. Stored preferences MUST use extension-owned local storage separate from transient captured-page records. When the extension action opens, READY SHALL initialize Focused article plus the saved provider and Detail defaults and SHALL explain the saved automatic-copy behavior. READY SHALL permit Focused article or Complete page, provider, and Detail changes for the current export without persisting those changes. Complete page SHALL be an export-local selection and MUST NOT become a persisted default.

Legacy stored preferences containing `mode: "complete"` SHALL normalize by discarding the stored mode without failing an export or preselecting Complete page. Complete conversion MAY remain available to internal conversion and classifier tests and SHALL also be available through an explicit Complete page selection in READY.

#### Scenario: Saved defaults initialize READY
- **WHEN** a user has saved supported provider, Detail, and automatic-copy preferences and opens the extension action
- **THEN** READY SHALL initialize Focused article plus those saved provider and Detail values and SHALL truthfully state whether successful generation will attempt automatic copying

#### Scenario: User selects Complete for one export
- **WHEN** the user selects Complete page in READY and activates Build Markdown
- **THEN** that export SHALL use Complete page content and a later popup session SHALL initialize Focused article unless the user selects Complete again

#### Scenario: Legacy Complete preference is loaded
- **WHEN** persisted settings contain `mode: "complete"` from an earlier release
- **THEN** the extension SHALL discard the legacy mode, initialize READY to Focused article, and retain valid provider, Detail, and automatic-copy values

#### Scenario: READY override does not save defaults
- **WHEN** the user changes provider or Detail in READY and completes or abandons the export
- **THEN** the stored provider and Detail defaults SHALL remain unchanged

#### Scenario: Preferences survive browser-session export cleanup
- **WHEN** temporary captured export records are removed or expire
- **THEN** saved provider, Detail, and automatic-copy preferences SHALL remain available for a subsequent READY session

### Requirement: Settings entry point
The extension SHALL provide an extension action context-menu entry and a READY-state action that open an extension-owned settings surface. The settings surface SHALL let the user inspect and change summarization provider, Detail level, and automatic-copy defaults; it SHALL explain that READY starts each popup session with Focused article, that Complete page is available only for the current export, and that Browser summarization uses Chrome local AI when available and otherwise falls back to deterministic extraction. The settings surface MUST NOT persist or offer an export-mode default.

#### Scenario: User opens Settings without capture
- **WHEN** the user opens Settings from the extension action menu or READY
- **THEN** the extension SHALL open its settings surface without capturing or converting the active page and without displaying an export-mode default control

#### Scenario: User saves settings
- **WHEN** the user changes a supported provider, Detail, or automatic-copy preference and saves
- **THEN** the extension SHALL validate and persist those values locally and use them to initialize later READY sessions
