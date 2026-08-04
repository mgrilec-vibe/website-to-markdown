## ADDED Requirements

### Requirement: Separate self-contained benchmark distribution
The system SHALL provide a benchmark-specific Chrome MV3 build that a tester can load unpacked on a qualifying machine. The benchmark build SHALL expose an extension-owned benchmark page and SHALL contain the runner, the approved static corpus, benchmark configuration, and local report-export capability. It MUST run without Playwright, a local server, URL interception, live website navigation, accounts, API keys, telemetry, or content-bearing network requests.

The production build and release archive MUST NOT expose benchmark pages, benchmark-only controls, bundled benchmark fixtures, or test-only permissions. The existing Node evaluation path SHALL remain available as a browser-independent deterministic regression path.

#### Scenario: Tester loads the benchmark build
- **WHEN** a tester loads the benchmark output through Chrome Developer Mode
- **THEN** the extension provides the benchmark page and can inspect and run its bundled approved corpus without external configuration or a network request

#### Scenario: Production build remains benchmark-free
- **WHEN** a developer builds the production Chrome extension or release archive
- **THEN** the output does not include the benchmark page, corpus assets, runner, or benchmark-only manifest behavior

### Requirement: Approved static corpus uses the production browser export pipeline
The benchmark SHALL bundle every approved fixture from the website-evaluation corpus, including fixture manifest/provenance, complete HTML, optional focused HTML, expected Markdown, and source screenshot. For each benchmark run, it SHALL construct a `CapturedPage` from that frozen evidence, use the fixture final URL as the conversion base URL, and invoke the production browser HTML parser and final-export pipeline.

The benchmark MUST label every input as an approved static fixture and record its fixture ID, origin URL, final URL, capture timestamp, source hashes, and selected input mode. It MUST NOT navigate to, fetch, or claim to recapture the fixture origin URL. Focused runs SHALL use the fixture's reviewed focused HTML when it exists and SHALL otherwise exercise the production focused fallback behavior.

#### Scenario: Complete fixture run
- **WHEN** the benchmark runs a fixture in complete mode
- **THEN** it converts the fixture's complete HTML through the browser parser and records the fixture provenance with the final Markdown result

#### Scenario: Focused fixture run
- **WHEN** the benchmark runs a fixture in focused mode
- **THEN** it uses the fixture's reviewed focused input when available and records whether the focused fallback was used

#### Scenario: No live-page capture occurs
- **WHEN** a tester runs the full benchmark suite
- **THEN** no fixture origin is navigated to or fetched and the report identifies every result as derived from bundled frozen evidence

### Requirement: Versioned full settings matrix
The benchmark SHALL declare a versioned default matrix and execute its cells in deterministic fixture-ID, mode, provider, and Detail order. The default matrix SHALL include both `complete` and `focused` modes and, for each mode, the following provider/detail cells: None at Detail 100; Custom at Details 0, 15, 40, 65, 85, and 100; and Browser at Details 0, 15, 40, 65, 85, and 100.

For the ten-fixture approved corpus, the full default matrix SHALL contain 260 runs. The runner SHALL execute runs serially and SHALL retain completed evidence when a later run fails or the tester cancels. It MAY offer a clearly labelled diagnostic subset, but an exported report MUST identify the exact matrix selected and whether it was complete.

#### Scenario: Full matrix resolution
- **WHEN** the tester starts the default full benchmark suite
- **THEN** the runner schedules 260 serial runs consisting of every approved fixture, both modes, and every declared provider/detail cell

#### Scenario: Partial benchmark execution
- **WHEN** a tester selects a supported diagnostic subset or stops a running suite
- **THEN** the runner preserves each completed run, marks pending or cancelled runs without fabricating outputs, and records that the exported matrix is incomplete

#### Scenario: Browser at maximum Detail
- **WHEN** the benchmark runs Browser at Detail 100
- **THEN** it records Browser as requested, does not invoke the local summarizer, and verifies the no-summary behavior in the run evidence

### Requirement: Explicit local-AI readiness and provisioning evidence
The benchmark page SHALL feature-detect the production Chrome Language Detector and Summarizer adapters in its extension-owned document context. It SHALL visibly report available, downloadable, downloading, unavailable, cancelled, and failed capability/provisioning states. A downloadable model MUST be provisioned only after an explicit user action on the benchmark page.

For every Browser run below Detail 100, the report SHALL record capability state, language state, requested provider, actual summary origin, summary chunk count, and any fallback diagnostic. If local AI is unavailable, unsupported, cancelled, or fails, the runner SHALL still complete the deterministic extractive result and identify it as a Browser-requested fallback. A `local-ai` actual origin SHALL be recorded only after a successful local model result.

#### Scenario: Local model is available
- **WHEN** the capability check reports the required local model as available and a Browser run uses Detail below 100
- **THEN** the benchmark may create local sessions in the extension page and records whether the actual result origin is `local-ai`

#### Scenario: Local model requires download
- **WHEN** a required local API reports `downloadable`
- **THEN** the benchmark explains that local model provisioning is required and performs it only after the tester explicitly selects the provisioning action

#### Scenario: Local model cannot run
- **WHEN** a Browser run cannot obtain or use the detector or summarizer because it is unavailable, unsupported, cancelled, or fails
- **THEN** the run retains its deterministic extractive output, reports Browser as requested and the deterministic origin as actual, and includes the diagnostic in its evidence

### Requirement: Reviewable local benchmark evidence ZIP
After at least one benchmark run completes, the tester SHALL be able to download one local ZIP archive. The archive SHALL contain a schema-versioned aggregate report, environment metadata, the bundled evidence for every fixture included in the selected matrix, exact Markdown files for completed runs, and per-run metadata files. ZIP construction and download MUST remain local to the extension page.

The aggregate report SHALL record the benchmark version, extension version, browser environment, matrix declaration and completeness, capability/provisioning history, ordered result summaries, and outcome counts. Each run metadata file SHALL record fixture identity/provenance, selected mode/provider/Detail, detail-policy version, elapsed timings, output bytes/words/hash, block and summary chunk counts, actual summary origin, language state, deterministic check outcomes where valid, and errors or fallback diagnostics.

#### Scenario: Complete suite archive
- **WHEN** all default matrix runs complete
- **THEN** the downloaded ZIP contains 260 ordered run result directories, their exact Markdown and metadata, fixture evidence, and an aggregate report that identifies the matrix as complete

#### Scenario: Partial suite archive
- **WHEN** a run fails or the tester cancels an in-progress suite after one or more results complete
- **THEN** the tester can download a ZIP containing completed artifacts and an aggregate report that identifies failed, cancelled, and pending cells without creating result Markdown for them

### Requirement: Deterministic checks are scoped to valid contracts
The benchmark SHALL automatically compare only behavior with a deterministic expectation. None results SHALL be compared with the approved conversion golden for the selected mode. Custom and Browser results SHALL verify protected/provenance retention, output validity, provider/origin labelling, and, where applicable, Detail-100 no-model behavior. Browser-generated prose MUST NOT be evaluated by byte equality.

The benchmark artifacts SHALL retain both input evidence and exact generated outputs so human or later AI-assisted review can judge generated prose independently of automated checks.

#### Scenario: None golden regression
- **WHEN** a None result differs from the approved Markdown golden for its fixture and mode
- **THEN** the run metadata records the expected and observed hashes, a failed golden check, and the exact observed Markdown

#### Scenario: Successful local-AI output
- **WHEN** a Browser run produces a `local-ai` result
- **THEN** the runner records structural and provenance checks but does not classify the generated prose as pass or fail by byte comparison

### Requirement: Production active-tab boundary remains separately smoke-tested
The project SHALL document a compact manual production-build smoke procedure distinct from the static benchmark. The procedure SHALL require loading the production extension, exporting an accessible HTTP(S) active tab through the action popup, and confirming capture, rendered result, and byte-faithful copy or download.

#### Scenario: Production smoke procedure
- **WHEN** a tester follows the production smoke procedure on the production build
- **THEN** it exercises the active-tab, `chrome.scripting`, popup, and export-download boundary without being represented as a static-corpus benchmark result
