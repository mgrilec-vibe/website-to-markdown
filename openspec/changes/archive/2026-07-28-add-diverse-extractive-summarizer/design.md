## Context

Today the popup asks the background worker to capture the active tab, stores an export record, and opens a separate extension preview page. That page derives a deterministic baseline and a second compressed derivative, then may replace the derivative with Chrome's built-in local-AI result. The active change was originally planned as a Standard-versus-Diverse deterministic selector in that two-result page.

That model makes the user leave the popup and inspect intermediate results that are not their chosen export. The revised workflow has one requested summary provider and one final result: converted Markdown without a summary, Chrome's on-device summary, or the extension's deterministic diverse extractor.

## Goals / Non-Goals

**Goals:**
- Keep capture, provider selection, generation, review, copy, and download in the extension popup; do not open a preview tab or window.
- Offer one explicit **Summarization** setting with **None**, **Browser**, and **Custom** options.
- Render one safe, reviewable final Markdown result and export those exact UTF-8 Markdown bytes.
- Keep Custom extraction deterministic, source-faithful, model-free, dependency-free, and usable in every supported browser.
- Use Chrome's built-in Summarizer only after the user selected Browser and preserve an explicit Custom result when it cannot complete.
- Retain Detail as the compression-size policy for Custom and Browser results while making it inactive for None.

**Non-Goals:**
- Generate, paraphrase, translate, or synthesize text in the Custom provider.
- Download a model, add a third-party NLP/summarization dependency, or send page content to a service.
- Retain a dual baseline/derivative view, a Raw/Preview toggle, a raw Markdown textarea, or a separate extension preview page.
- Persist a cross-session provider preference or support a user-supplied model/API as “Custom.”
- Globally rank all prose or silently discard otherwise represented source blocks in Custom extraction.

## Decisions

### Make the popup the sole result surface

The background worker continues to capture and persist the transient export record because the service worker cannot hold the page DOM and message payloads should remain bounded. It returns the export identifier to the still-open popup; the popup loads that transient record, derives the requested final result, and replaces its capture controls with the result state. It MUST NOT create or navigate to an extension preview tab or window.

The popup can reopen a transient record from session storage while that record exists, but there is never a parallel preview page. This removes the current cross-document UI split while retaining MV3-safe capture handoff. Returning a complete captured page directly in the runtime response was rejected because it duplicates the transient transport contract and can make a large page payload live in the popup message channel.

### Replace extraction strategies with summary providers

The popup exposes a radio group or equivalent single-choice control labelled **Summarization**:

| Requested provider | Final output | Detail behavior |
| --- | --- | --- |
| **None** | Complete converted Markdown with no summary generation | Inactive |
| **Browser** | Chrome local-AI result when provisioned and successful; otherwise Custom fallback | Applies to the requested browser size and fallback |
| **Custom** | In-house diverse extractive derivative | Applies |

**None** means no summary, not a low-detail omission mode: the final result is the complete converted Markdown after normal capture/conversion cleanup. **Custom** names the extension-owned diverse extractor, not a user-configured remote service or model. Standard deterministic extraction is no longer user-selectable under this change.

Browser remains user-initiated: selecting Browser and pressing Convert is the explicit action that checks capability, starts provisioning if needed, and generates the local summary. If Browser is unsupported, unavailable, declined, cancelled, or fails, the popup produces the deterministic Custom derivative rather than leaving the user without an export. The visible status and metadata retain both the requested provider (`browser`) and actual result origin (`deterministic-diverse-extractive`); they MUST NOT describe a fallback as Browser output.

### Keep diverse extraction per source block

For a Custom block's Detail-policy sentence budget, calculate the established relevance score for every candidate. Select greedily: the first sentence has highest relevance; each later selection maximizes `0.7 × normalized relevance − 0.3 × maximum lexical similarity to a selected sentence`. Restore selected sentences to source order and leave every non-retained prose block represented at its source location.

Similarity uses normalized unique word-token Jaccard overlap when both sentences have sufficiently granular word tokens. If either candidate lacks such tokens, use normalized character trigrams with a minimum population before assigning a redundancy penalty. Both representations are local and bounded by the source block's candidates. A global TextRank/LexRank graph was rejected because it can omit whole sections and requires quadratic whole-document similarity work.

### Render and export the final Markdown only

The popup turns only the selected final Markdown into sanitized rendered DOM. It does not render captured HTML, expose a raw Markdown textarea, render an alternate baseline, or keep a hidden second export target. Existing safe Markdown parsing/sanitization and remote-resource suppression remain the rendering boundary.

The final-result header shows requested provider, actual origin, Detail when applicable, local-AI state/failure when applicable, size, source title, source URL, capture time, export mode, and language state. Copy and download use the final Markdown value rather than rendered HTML; source provenance and actual summary-origin metadata remain in that Markdown.

### Test provider transitions as observable UI behavior

Tests cover the popup capture-to-result transition without a tab/window creation, one rendered result container, None's complete unsummarized output, Custom's redundant-sentence avoidance, Browser success, and each Browser fallback. They also cover Detail inactivity for None, source order/fidelity, protected/removable exclusion, character-trigram fallback, source metadata, sanitized output, and exact copy/download bytes.

## Risks / Trade-offs

- **[A popup can close while work runs]** → keep the transient export record in session storage and reconstruct the result state when the popup reopens; no preview tab is needed.
- **[Browser selection may produce Custom fallback]** → display requested provider and actual result origin separately, including the Browser failure reason.
- **[None ignores Detail]** → visibly disable or label Detail as inactive so no-summary output is unsurprising.
- **[Lexical MMR misses paraphrases without shared material]** → state the limitation and retain character-trigram fallback only for segmentation-poor scripts.
- **[Character n-grams can overestimate short-string similarity]** → require a minimum n-gram population before applying their penalty.
- **[One result removes side-by-side comparison]** → the popup stays focused on the export artifact; the exact Markdown remains accessible through copy/download.
