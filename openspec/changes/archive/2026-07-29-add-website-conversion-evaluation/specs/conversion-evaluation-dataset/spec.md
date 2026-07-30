## ADDED Requirements

### Requirement: Approved snapshot fixture evidence
The system SHALL store each approved dataset fixture as an immutable, browser-captured evidence bundle. A fixture MUST include a manifest, complete HTML, expected complete Markdown, expected focused Markdown, source screenshot, provenance hashes, and declared conversion limitations. It SHALL include focused HTML when focused extraction succeeded at capture time.

#### Scenario: Fixture is loaded for deterministic evaluation
- **WHEN** the evaluation resolver loads an approved fixture
- **THEN** it SHALL construct the conversion input and expected outputs from local fixture artifacts without contacting the origin URL

#### Scenario: Fixture records absent focused HTML
- **WHEN** focused extraction was unavailable during approved fixture capture
- **THEN** the fixture manifest SHALL record that state and the expected focused fallback behavior

### Requirement: Queryable fixture manifest
The system SHALL assign every approved fixture a stable ID, category, tags, origin URL, final URL, capture timestamp, capture profile, publisher domain, markup platform, expected focus behavior, and declared limitations. The fixture resolver SHALL support exact ID lookup and category/tag queries from those manifest fields.

#### Scenario: Fixture provenance inspection
- **WHEN** a developer or review skill inspects an approved fixture
- **THEN** the system SHALL expose its origin/final URLs, capture timestamp, capture profile, hashes, expected focus behavior, and declared limitations

#### Scenario: Category query
- **WHEN** a category query identifies one approved fixture
- **THEN** the resolver SHALL return that fixture's stable ID and local evidence paths

### Requirement: Corpus diversity
The approved corpus SHALL represent API/reference documentation, developer guides, rendered documentation, technical blogs, editorial articles, knowledge/reference pages, Q&A, forum threads, release notes, and known conversion-boundary content. Fixture admission MUST document its publisher domain and markup platform. A new category slot SHALL use a publisher/domain and markup platform distinct from existing selected fixtures when an existing source would otherwise duplicate a page template.

#### Scenario: Initial cross-platform corpus
- **WHEN** the initial corpus is approved
- **THEN** it SHALL contain one fixture for each required content category with documented publisher-domain and markup-platform diversity

#### Scenario: Duplicate template candidate
- **WHEN** a proposed fixture shares the same publisher/domain or markup platform as an existing slot and does not cover a documented new conversion behavior
- **THEN** the dataset review SHALL reject it or record why the additional fixture is necessary

### Requirement: Focus expectation evidence
The dataset SHALL classify each fixture's expected focus behavior as `article`, `thread`, `ambiguous`, or `unavailable`. It SHALL preserve page-title, Readability-title, and selected-region heading evidence sufficient for a reviewer to assess whether focused extraction selected the intended content unit.

#### Scenario: Article fixture focus review
- **WHEN** a fixture is classified as `article`
- **THEN** its evidence SHALL identify the expected primary document region and the focused evaluation SHALL assess preservation of that region rather than whole-page coverage

#### Scenario: Thread fixture focus review
- **WHEN** a fixture is classified as `thread` or `ambiguous`
- **THEN** its manifest SHALL identify the expected conversation content unit or ambiguity so focused evaluation does not assume article semantics

### Requirement: Candidate admission preserves approved baselines
The system SHALL keep a one-shot candidate capture separate from approved dataset fixtures until a reviewer explicitly admits it with required provenance, diversity, source-use, and expected-behavior metadata.

#### Scenario: Candidate capture is not a baseline
- **WHEN** a public URL capture completes
- **THEN** its source evidence and Markdown SHALL remain outside the approved fixture corpus and SHALL not participate in deterministic regression evaluation

#### Scenario: Approved fixture refresh
- **WHEN** a reviewer intentionally refreshes an approved fixture
- **THEN** the system SHALL require updated provenance and expected-output review rather than silently overwriting its source or Markdown artifacts
