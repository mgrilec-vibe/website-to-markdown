## Context

The repository has product vision and an archived local-AI assessment kit, but no production exporter. The archived kit verified that Chrome 150 could create an on-device Summarizer session in an extension and complete 18 local-AI-assisted fixture results without local-AI errors or failed structural checks. It intentionally used four coarse named profiles because Chrome's Summarizer exposes qualitative `short`, `medium`, and `long` settings, not an exact word budget.

This change turns that evidence into a Chrome active-tab export feature. It must retain the vision's local-first, user-controlled, provenance-preserving guarantee while letting users deliberately trade source detail for shorter LLM input. Deterministic extractive summarization is the universal compression path; Chrome Language Detector and Summarizer are optional enhancements, available only in document contexts and on qualifying devices. The MV3 service worker therefore orchestrates but does not own AI sessions.

## Goals / Non-Goals

**Goals:**
- Export an active visible Chrome tab to a reviewable deterministic Markdown baseline with provenance.
- Offer a 0–100 Detail control that has stable, documented compression behavior, combines deterministic removal/retention with deterministic extractive prose summaries, and reports actual output words and bytes.
- Keep source provenance, document hierarchy, link destinations, code, tables, and other protected structures out of both extractive and local-AI summary input and intact in every normal compressed export.
- Detect the primary language locally only to determine whether optional Summarizer enhancement is eligible; never require language detection for deterministic extraction.
- Keep all page processing, deterministic extraction, language detection, optional local AI, preview, copying, and download local to the browser.
- Make every unavailable, downloading, cancelled, failed, ambiguous-language, or model-capacity state recover to a usable deterministic extractive result.

**Non-Goals:**
- Guarantee an exact final word count, model determinism, or complete semantic fidelity in generated summaries.
- Translate content, change the summary language, summarize code/tables/links, or permit model-led whole-document rewriting.
- Send captured content, summaries, diagnostics, or telemetry to a service; add accounts, API keys, remote configuration, or a server.
- Support Firefox, Safari, mobile Chrome, or local AI execution from an MV3 service worker.
- Claim that an AI-assisted derivative is a verbatim source artifact.

## Decisions

### Build deterministic extraction before any local-AI step

The pipeline is `active-tab capture → semantic Markdown conversion → deterministic compression → deterministic extractive summary → optional local-AI enhancement → reviewable preview → copy/download`. The deterministic export and deterministic extractive result are both valid terminal outcomes. AI availability must never control whether the user can export or receive a summary.

A model-first HTML-to-Markdown conversion was rejected: it would be harder to preserve code, links, tables, provenance, and explain omissions.

### Use an extension-owned preview page for local AI

The action starts capture under `activeTab`; an extension preview page owns the Detail UI, capability checks, model download interaction, Language Detector session, and Summarizer session. The service worker coordinates messages and transient state only. Raw captured page HTML is never rendered by the extension UI.

An MV3 service-worker implementation was rejected because Chrome's built-in AI APIs are document-context APIs and service-worker lifetime is unsuitable for interactive download/progress/summary operations.

### Model compression as protected blocks plus eligible prose

The converter creates ordered Markdown blocks classified as:

- **provenance**: front matter, source URL/title/capture time;
- **protected**: headings, link destinations, code, tables, quotations explicitly designated as essential, and conversion-limit notices;
- **removable**: objectively non-content chrome, duplicate controls, empty/decorative material, and known repetitive boilerplate;
- **summarizable**: ordinary prose after deterministic selection.

Protected blocks are copied verbatim and are excluded from every summary input. Removable blocks are removed deterministically with a visible accounting in the preview. Only summarizable prose is eligible for either the deterministic extractor or the optional local model.

An unconstrained Markdown-string prompt was rejected because it can alter code, destinations, table cells, and document structure.

### Use deterministic extractive summaries as the universal fallback

The fallback segments eligible prose into sentences using the browser segmenter where available and a documented punctuation fallback otherwise. It scores source sentences deterministically from normalized token frequency, lead-sentence and section-position signals, then selects the Detail-policy budget of highest-scoring sentences and restores their original order. It emits only source sentences, never paraphrases, and records `summary_origin: deterministic-extractive`.

The extractor operates without model provisioning, language detection, or network access. It runs whenever compression selects prose for summary and local AI is unavailable, unsupported, declined, cancelled, or fails. A purely omission-based fallback was rejected because it makes low-detail exports less useful on ordinary devices.

### Interpret the detailed slider as detail, not an exact size budget

The UI exposes integer values 0–100 labeled **Detail**. It shows an estimated proportion before generation and measured words/bytes after generation, never a promised output length.

The slider maps to three stable policies:

1. a deterministic retention budget deciding how much eligible prose remains verbatim after removable blocks are dropped;
2. a deterministic extractive-sentence budget for eligible prose not retained verbatim; and
3. where local AI is eligible, a qualitative Summarizer configuration that may replace the extractive summary.

Values within every band vary deterministic prose and sentence budgets. Detail 100 retains all selected prose and produces no summary. Values below 100 always have a language-independent deterministic extractive path; Chrome's short/medium/long settings affect only the optional enhancement.

Code, tables, links, provenance, and headings remain protected across normal slider values. An aggressive mode that allows their omission is excluded from this change.

A continuous exact-word slider was rejected because the API only offers qualitative length settings and may emit less than its documented maxima.

### Make summary origin and provenance visible

The preview identifies each summary section as source-preserved, deterministic-extractive, or locally AI-assisted. Compressed output records `compression_mode`, `summary_origin`, selected Detail, measured words/bytes, and local-AI usage when applicable. The original title, observed/canonical source URL, capture time, and export mode remain immutable.

A visually identical replacement export was rejected because users and downstream readers could not tell source-preserved, extractive, and model-generated content apart.

### Gate optional local AI conservatively without gating extraction

The extension uses the page's declared language only as a hint, then runs Chrome Language Detector on eligible prose when users enable the optional enhancement. Summarizer support is limited to Chrome's currently supported input/output codes: `en`, `es`, `ja`, `de`, and `fr`.

Automatic local-AI enhancement requires a confidently detected supported primary language. An unsupported primary language, low confidence, materially mixed language result, unavailable detector, or failed detector provisioning produces a clear warning and selects deterministic extraction instead. The preview must state whether the displayed language is detected, page-declared only, mixed, unknown, or not needed for deterministic extraction.

The product does not silently choose English for unrecognized text. Automatic translation was rejected because it changes the source-language contract.

### Respect capability, provisioning, capacity, and cancellation

The preview feature-detects Language Detector and Summarizer, calls `availability()`, and starts a download only from an explicit user action. It displays available, downloadable, downloading, unavailable, cancelled, and failed states. These controls enhance but do not gate the deterministic extractor.

For long eligible prose, the deterministic extractor processes bounded sentence groups. Optional local AI chunks only eligible prose at deterministic block boundaries, then performs bounded summary-of-summaries processing when required. If an AI summary is cancelled, over capacity, or errors, the extension discards only that enhancement and returns the deterministic extractive result unchanged.

## Risks / Trade-offs

- **[Qualitative model lengths produce non-monotonic output sizes]** → label the control Detail, display actual size, test policy bands across fixtures, and keep deterministic extraction as the size-reduction baseline.
- **[Extractive summaries are less fluent than model summaries]** → preserve sentence order, label their origin, and allow optional local-AI enhancement without making it necessary.
- **[Local language detection is probabilistic and text may be mixed]** → show confidence/provenance of the language label, gate only AI enhancement, and never block deterministic extraction.
- **[Summaries can omit important prose]** → protect structural blocks, maintain visible summary boundaries, keep the baseline preview, and require fixtures/review for central-claim preservation.
- **[Chunked local-AI summarization compounds loss]** → chunk only eligible prose at block boundaries, bound hierarchy depth, surface chunking, and fall back to extraction rather than silently truncate.
- **[Many Chrome installations are ineligible or need a download]** → deterministic extraction is universal; capability-gate only local-AI enhancement.
- **[Chrome model/API behavior changes]** → feature-detect APIs, pin policy/schema versions in metadata, record capability state, and test adapters behind controlled fakes.

## Migration Plan

This is a new extension workflow with no existing users or persisted product data. Users load/install the extension, export a page, and can opt into local model download from the preview only when their Chrome profile reports the required local capability. Unsupported devices continue with deterministic export. Rollback removes the extension and any user-downloaded Markdown files; no server-side state or data migration exists.

## Open Questions

- What fixture-based confidence and mixed-language thresholds produce useful warnings without unnecessarily disabling supported summaries?
- Should the initial preview expose only a single Detail slider, or also an advanced selector for `key-points` versus `tldr` once the default policy has been validated?
- What semantic-quality and size-reduction thresholds from multilingual fixture evaluation are sufficient to enable the feature by default on capable Chrome profiles?