## 1. Focused production cutover

- [x] 1.1 Remove the production export-mode selector, make focused content the sole quick-export mode, and keep the selected mode visible in final metadata.
- [x] 1.2 Normalize absent, invalid, and legacy `complete` stored preferences to focused behavior without retaining a compatibility toggle or alias.
- [x] 1.3 Change user-facing quick and full benchmark matrices to focused-only provider/detail cells while retaining complete conversion in internal fixture and classifier regression coverage.

## 2. Coherent summary source

- [x] 2.1 Define a workflow-level focused summary-source result that records selected block IDs and semantic section boundaries without changing the public `MarkdownBlock.kind` contract.
- [x] 2.2 Select primary focused prose in document order and deterministically exclude provenance, protected structures, navigation, sidebars, footers, related indexes, removable blocks, and conversion notices from model input.
- [x] 2.3 Normalize selected headings, paragraphs, list text, link labels, and meaningful technical identifiers into plain readable model text without Markdown destinations or presentation punctuation.
- [x] 2.4 Decouple the coherent summary source from Detail-retained and Detail-omitted body blocks so changing Detail cannot change the summary topic or insertion anchor.

## 3. Chrome Summarizer contract
- [x] 3.1 Extend the injected Summarizer session boundary with `inputQuota` and `measureInputUsage()` and remove the hardcoded 5,000-character capacity assumption.
- [x] 3.2 Measure the complete normalized source first; when it exceeds quota, group whole semantic sections by measured usage without splitting paragraphs, lists, tables, or code structures.
- [x] 3.3 Configure shared and per-request context from immutable page role, title, audience, and summary focus while preserving supported input/output language gating and deterministic fallback.
- [x] 3.4 Preserve the existing bounded reduction algorithm unchanged and retain the deterministic Custom derivative after any quota measurement, chunking, session creation, or summarization failure.

## 4. Final Markdown assembly

- [x] 4.1 Assemble at most one generated page summary independently from the deterministic focused body and insert it after the body title or before the first substantive section.
- [x] 4.2 Replace the application label `Locally generated summary` with a neutral `## Summary` section while retaining requested provider and `summary_origin: local-ai` in machine-readable and popup evidence.
- [x] 4.3 Propagate the detected supported language consistently through run-level state, nested export metadata, frontmatter, and visible popup evidence.
- [x] 4.4 Preserve protected Markdown, safe preview rendering, exact UTF-8 copy/download bytes, and Browser-to-Custom fallback semantics after the new assembly path.

## 5. Verification

- [x] 5.1 Exercise the approved MDN fixture at focused Browser Detail 40 with a controlled adapter and verify coherent article input, excluded chrome, context options, quota decisions, stable Summary placement, and independent Detail retention.
- [x] 5.2 Exercise unavailable, unsupported, cancelled, quota-failed, and generation-failed Browser paths and verify deterministic focused Custom output with no generated Summary section.
- [x] 5.3 Verify legacy Complete preference migration, focused-only settings, focused-only user-facing benchmark cardinality/order, and retained internal complete conversion/classifier coverage.
- [x] 5.4 Run the project typecheck, full suite, production build/ZIP, and benchmark build, then inspect output isolation without installing or loading the extension into local Chrome on this workstation.
- [x] 5.5 Review any externally returned qualifying-Chrome benchmark archive with the existing archive harness; compare MDN focused Browser Detail 40 metadata, input evidence, placement, and prose quality without exact-byte assertions for generated text.
