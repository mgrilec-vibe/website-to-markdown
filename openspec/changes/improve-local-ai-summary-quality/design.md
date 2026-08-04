## Context

The Browser provider currently derives its model input from `deterministicCompression(...).summarizableBlocks`: the heterogeneous blocks that Detail retention omitted. `summarizeBlocks()` joins those Markdown fragments under a hardcoded 5,000-character ceiling, asks Chrome for `key-points`, reduces multiple summaries when necessary, and anchors the final summary to the last omitted source block. `withSummaries()` then orders that generated block by the anchor's source position and adds `Locally generated summary`.

The uploaded benchmark demonstrates the consequence. Complete MDN Browser@40 combined navigation, compatibility prose, article examples, sidebar labels, and footer material into a five-bullet summary placed in the footer. Focused Browser@40 received cleaner input but placed a vague four-bullet summary inside an example. Both runs used one chunk, so recursive reduction did not cause the observed defect. Chrome produced the documented shape for medium `key-points`; source selection and placement are application defects.

Chrome Summarizer accepts arbitrary text and provides `sharedContext`, per-call `context`, `inputQuota`, `measureInputUsage()`, expected language options, and type/length/format/preference controls. Chrome recommends removing unnecessary markup. Local extension installation and `agent-browser` verification are prohibited on this workstation by `AGENTS.md`; controlled adapters and returned benchmark archives remain the verification boundary.

## Goals / Non-Goals

**Goals:**

- Summarize one coherent focused primary-content unit rather than Detail-removal leftovers.
- Decouple summary generation from deterministic body retention.
- Place at most one neutral Summary section at an introductory semantic boundary.
- Measure Chrome input usage against the active session quota and split only at semantic section boundaries when required.
- Normalize model input and provide stable page-role/audience context.
- Propagate detected language consistently into final export metadata and frontmatter.
- Make focused content the only production mode, migrate legacy Complete preferences, and reduce user-facing benchmark matrices accordingly.
- Preserve deterministic Custom fallback and protected Markdown structures.

**Non-Goals:**

- Changing Chrome's model, supported languages, or output budgets.
- Redesigning the bounded summary-of-summaries reduction algorithm; it did not run in the observed failure.
- Removing complete conversion, fixtures, or adversarial classifier regression coverage.
- Adding new fixtures, a second benchmark harness, remote inference, prompts exposed to users, or local Chrome verification on this workstation.
- Guaranteeing deterministic generated prose or grading model output by exact bytes.

## Decisions

### 1. Use focused extraction as the semantic source boundary

Production already derives a Readability-focused capture before final export. Browser summary input will be built from the focused conversion's primary prose in document order, regardless of which blocks the Detail policy retains in the body. Protected structures remain in the body but are excluded from model text; removable blocks and complete-page secondary material never enter the model input.

This uses the existing focused-content boundary instead of adding a new public `MarkdownBlock.kind`. A parallel internal source-selection result may carry selected block IDs and section boundaries for evidence, but it will not reinterpret `summarizable` as a semantic role across the whole conversion system.

Alternative: add `primary | navigation | sidebar | footer` roles to every Markdown block. Rejected for this change because focused extraction already establishes the production boundary and the broader schema migration would ripple through conversion, evaluation, compression, and archived fixture expectations.

### 2. Separate summary source, compressed body, and insertion position

The workflow will compute:

1. a focused conversion;
2. a coherent normalized summary source from that conversion;
3. the independently retained deterministic body at the selected Detail;
4. zero or one generated page summary;
5. final assembly at a stable introductory boundary.

A generated summary is no longer anchored to the final omitted block. If the retained body begins with a title heading, the Summary section follows it; otherwise it follows frontmatter and precedes the first substantive body section. The generated content uses `## Summary`, not `Locally generated summary`; provenance remains in frontmatter and popup metadata.

Alternative: insert an unlabeled blockquote. Rejected because a stable neutral section communicates document structure without exposing implementation provenance in prose.

### 3. Make capacity session-driven

`SummarizerSession` will expose `inputQuota` and `measureInputUsage(text)`. The workflow will first measure the complete normalized focused source. If it fits, one batch `summarize()` call is used. If not, the selector will group complete semantic sections while each group fits measured quota. It will not split paragraphs, lists, tables, or code structures merely to satisfy a character count.

The existing bounded reduction remains available for multiple section summaries. Its policy is unchanged and will be evaluated separately with future multi-chunk evidence. Any measurement, chunking, or generation failure preserves the deterministic fallback.

Alternative: retain `MAX_SUMMARY_CHARS = 5_000`. Rejected because JavaScript character count is not Chrome's documented model-usage unit.

### 4. Normalize coherent prose before generation

Model input will be plain readable text derived from selected Markdown blocks: link labels remain while destinations and Markdown punctuation are removed; meaningful code identifiers, headings, paragraphs, and list text remain. Code bodies, tables, provenance, and conversion notices are excluded from generation input but retained unchanged in the output body.

Normalization is deterministic and testable without Chrome. The captured page title and retained section headings provide topic context.

### 5. Use context as guidance, not as a classifier

The session `sharedContext` will identify the input as focused technical/article content and name the source title and intended reader. Per-call `context` will request emphasis appropriate to the page role, such as behavior, parameters, return values, errors, and cautions for API reference content. Context cannot admit or reject blocks; deterministic selection remains authoritative.

Expected input/output languages continue to use the detected supported language. `expectedContextLanguages` describes the actual shared/per-call context language rather than serving as a duplicate language gate.

### 6. Make focused mode the production cutover

The production settings surface removes the mode selector and always exports focused content. Preference normalization maps absent, invalid, or legacy `complete` mode values to focused behavior. No alias or hidden Complete toggle remains.

Complete conversion remains an internal capability for fixture evidence, evaluation, and adversarial tests that ensure page chrome cannot contaminate selected summary input. User-facing benchmark matrices contain only focused runs: the representative quick matrix becomes three provider/detail cells, and the full corpus matrix retains all provider/detail policy bands for focused mode only.

### 7. Verify quality as structure plus reviewable evidence

Controlled adapters assert exact input selection, exclusion, context options, quota decisions, placement, metadata, and fallback. Generated wording is not byte-asserted. The existing `api-reference-mdn-fetch` fixture and benchmark archive compare focused Browser@40 output against the failure evidence. Returned AI-machine archives remain subject to qualitative review; this workstation does not install or load the extension.

## Risks / Trade-offs

- **Readability extraction can fail or choose the wrong region.** Production already falls back when focus is unavailable; Browser generation must then use deterministic Custom output rather than summarize a mixed complete page.
- **Whole focused articles can exceed quota.** Session-measured semantic chunking adds orchestration complexity but avoids an undocumented character assumption.
- **Context can bias generated wording.** It remains generic, non-user-configurable, and subordinate to deterministic selection; output stays visibly attributable through metadata.
- **A neutral Summary heading is less explicit to human readers about AI origin.** Frontmatter and popup metadata retain exact provenance, while the document reads naturally.
- **Focused-only production is breaking for users who saved Complete.** Automatic normalization avoids failed exports but intentionally changes their output scope.
- **Removing complete cells halves user-facing benchmark coverage.** Internal complete fixture/converter tests preserve classification regression evidence while expensive model runs focus on the supported product path.
- **Reduction remains a future risk.** The observed runs used one chunk; changing it now would conflate root-cause correction with an unproven multi-chunk redesign.
