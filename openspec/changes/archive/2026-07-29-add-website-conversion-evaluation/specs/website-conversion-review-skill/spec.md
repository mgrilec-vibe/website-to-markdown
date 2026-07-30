## ADDED Requirements

### Requirement: Frozen-evidence review workflow
The system SHALL provide an agent skill that runs or consumes a local website-conversion evaluation and reviews the captured source evidence, local report, complete Markdown, and focused Markdown. For an approved fixture, the skill SHALL judge the frozen evidence and SHALL NOT re-fetch the source page as part of normal review.

#### Scenario: Approved fixture review
- **WHEN** an agent invokes the review skill for an approved fixture evaluation
- **THEN** the skill SHALL inspect the fixture's local source evidence, evaluation report, complete Markdown, and focused Markdown before reporting a judgment

#### Scenario: Candidate capture review
- **WHEN** an agent invokes the review skill for a successfully captured candidate URL
- **THEN** the skill SHALL judge the candidate's captured evidence and generated Markdown from the same evaluation output

### Requirement: Independent complete and focused assessments
The review skill SHALL issue separate assessments for complete and focused Markdown. Complete assessment SHALL measure preservation of accessible page reading content. Focused assessment SHALL measure preservation of the fixture's documented primary content unit and SHALL not deduct for intentionally excluded navigation or unrelated page chrome.

#### Scenario: Complete output contains an unexplained loss
- **WHEN** source evidence contains material accessible reading content that is absent or materially distorted in complete Markdown without a declared limitation
- **THEN** the complete assessment SHALL identify the source and Markdown evidence and deduct for the loss

#### Scenario: Focused output excludes page chrome
- **WHEN** focused Markdown excludes navigation, subscription prompts, related-content modules, or other non-primary chrome consistent with the fixture focus expectation
- **THEN** the focused assessment SHALL not deduct for those exclusions

### Requirement: Evidence-backed 1–100 grading
When source content is gradeable, the review skill SHALL assign independent integer scores from 1 through 100 for complete and focused Markdown. Each score SHALL use documented dimensions for material-content retention, structure and reading order, links/media/code/tables/lists, Markdown readability, and appropriate inclusion/exclusion. Every deduction SHALL cite corresponding source and Markdown evidence.

#### Scenario: Gradeable article review
- **WHEN** the source evidence and relevant primary content are accessible and representable as Markdown
- **THEN** the skill SHALL report separate complete and focused scores, rubric dimensions, deductions, and supporting evidence

#### Scenario: Declared conversion limitation
- **WHEN** a discrepancy is explained by a fixture-declared converter limitation
- **THEN** the skill SHALL report it as a limitation and SHALL distinguish it from an unexplained conversion defect

### Requirement: Not-gradeable outcome
The review skill SHALL return `not-gradeable` instead of a numeric score when the capture is blocked, is a bot-challenge or JavaScript shell, lacks the source evidence needed for comparison, or has central content that cannot be represented as Markdown. It SHALL state the specific reason and any available limitation evidence.

#### Scenario: Canvas-dominant source
- **WHEN** the source's material content is primarily a canvas/WebGL scene without an accessible textual equivalent
- **THEN** the skill SHALL mark the affected assessment `not-gradeable` and explain that the central visual content is not represented by the Markdown contract

#### Scenario: Inaccessible candidate capture
- **WHEN** a candidate capture produces an authentication page, bot challenge, or non-content error instead of the requested source content
- **THEN** the skill SHALL mark the evaluation `not-gradeable` and SHALL not assign a conversion-quality score
