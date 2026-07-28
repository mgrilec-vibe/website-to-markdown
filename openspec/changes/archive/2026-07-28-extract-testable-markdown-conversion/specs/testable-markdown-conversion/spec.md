## ADDED Requirements

### Requirement: Browserless captured-HTML conversion
The system SHALL expose the captured-HTML-to-`MarkdownConversion` pipeline through an explicit HTML parser dependency. The conversion pipeline MUST accept concrete HTML, a source base URL, inherited limitations, and a caller-provided parser; it MUST NOT read or construct a global `DOMParser`. Given equivalent parsed input, the browser adapter and the Node test adapter SHALL apply the same normalization, URL-safety, Turndown, limitation, and block-classification rules.

#### Scenario: Node conversion runs without browser globals
- **WHEN** a test supplies captured HTML and a Node parser adapter while `globalThis.DOMParser` is unavailable
- **THEN** the system SHALL produce a `MarkdownConversion` without mutating global parser state

#### Scenario: Browser conversion uses the production adapter
- **WHEN** an extension export converts selected captured HTML
- **THEN** the system SHALL use the browser parser adapter and preserve the existing Markdown blocks and limitations contract

### Requirement: Parser-portable table conversion
The system SHALL convert normal tables to Markdown tables and SHALL represent merged-cell tables with the existing conversion-limitation form. The table rule MUST obtain rows, cells, and span values through parser-portable DOM traversal and attributes rather than browser-only table collection properties.

#### Scenario: Node adapter converts a normal table
- **WHEN** a captured HTML fixture contains a table with unmerged header and data cells
- **THEN** the system SHALL produce the expected Markdown table without test-time prototype patches

#### Scenario: Node adapter identifies a merged table
- **WHEN** a captured HTML fixture contains a cell with `colspan` or `rowspan` other than one
- **THEN** the system SHALL emit the merged-table limitation representation and preserve the row text

### Requirement: Independently testable focused extraction
The system SHALL make stored-capture Readability focus extraction executable with an injected parser. It MUST operate on a clone of its parsed document and SHALL return the original captured page unchanged when no focused article content is available. Live-page capture remains a browser concern.

#### Scenario: Readability extracts a focused article in Node
- **WHEN** a Node fixture contains article prose surrounded by page chrome and a Node Readability parser adapter is supplied
- **THEN** the system SHALL return focused HTML suitable for conversion without requiring Chrome APIs

#### Scenario: Readability cannot extract an article
- **WHEN** a stored captured page has no extractable Readability article
- **THEN** the system SHALL retain the original captured page and allow complete-page conversion

### Requirement: Conversion fixtures and deterministic validation
The system SHALL provide an explicit Node fixture loader for conversion cases. Each fixture SHALL define captured input metadata, HTML source, expected Markdown output, and structured expectations for limitations and block classification. The initial corpus MUST incorporate the formerly unreferenced `tests/fixtures/export-page.html` as a named conversion fixture. Conversion tests MUST NOT install global parser replacements or Linkedom prototype patches.

#### Scenario: Fixture verifies conversion behavior
- **WHEN** the conversion test suite loads a fixture through its loader
- **THEN** it SHALL compare the conversion result with the fixture Markdown golden and structured expectations for blocks and limitations

#### Scenario: Existing export-page fixture is exercised
- **WHEN** the conversion suite runs the migrated export-page fixture
- **THEN** it SHALL validate page-chrome handling, relative-link resolution, code-fence preservation, and table conversion

### Requirement: Local conversion benchmark evidence
The system SHALL provide a local, versioned conversion benchmark report for its fixture corpus. The report SHALL record environment identity, per-fixture focus-extraction, parsing, conversion, and classification measurements where applicable; output and golden hashes; limitations; structural and golden check results; and aggregate outcome counts. The benchmark and report MUST NOT transmit fixture content or results to a network service.

#### Scenario: Benchmark produces a machine-readable local report
- **WHEN** a developer runs the conversion benchmark against the bundled fixture corpus
- **THEN** the system SHALL write a versioned conversion report under `.output/` containing per-fixture measurements and validation outcomes

#### Scenario: Benchmark identifies a golden regression
- **WHEN** a fixture conversion output differs from its expected Markdown golden
- **THEN** the report SHALL identify the fixture, record the output and golden hashes, and count the golden check as failed

### Requirement: Compression consumes converted content
The system SHALL construct conversion once in the final-export orchestration path and SHALL pass the resulting `MarkdownConversion` to complete, deterministic, and AI-assisted compression. Compression helpers MUST NOT parse captured HTML or require a parser dependency.

#### Scenario: Compression runs from a precomputed conversion
- **WHEN** the final-export workflow receives a selected captured page
- **THEN** it SHALL convert the page once before compression and SHALL derive its result from that conversion

#### Scenario: Compression test has no HTML parser
- **WHEN** a compression test supplies a hand-authored `MarkdownConversion`
- **THEN** the compression helper SHALL produce its deterministic result without an HTML fixture, `DOMParser`, or parser adapter
