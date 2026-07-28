## 1. Custom deterministic provider

- [x] 1.1 Replace deterministic strategy state with requested summarization provider and actual summary-origin types, metadata, and labels for None, Browser, Custom, and Browser fallback.
- [x] 1.2 Implement per-block greedy Custom extraction with version-1 `0.7` relevance and `0.3` redundancy MMR scoring, retaining the existing Detail-policy sentence budget and source order.
- [x] 1.3 Implement local token-Jaccard similarity with the bounded character-trigram fallback for insufficiently granular word tokens, without a dependency or model path.
- [x] 1.4 Produce complete converted Markdown for None and at Detail 100; make Detail inactive for None and prevent Browser model invocation at Detail 100.

## 2. Popup summary-provider workflow

- [x] 2.1 Keep capture-to-result transport in transient extension storage and return control to the popup without creating or navigating to a preview tab or window.
- [x] 2.2 Add a None / Browser / Custom Summarization control to the popup, retain Detail for Browser and Custom, and visibly disable or mark Detail inactive for None.
- [x] 2.3 Gate Browser capability checks, provisioning, and generation on explicit Browser selection; route unsupported, unavailable, declined, cancelled, and failed outcomes to the Custom derivative with requested-provider and actual-origin provenance.
- [x] 2.4 Replace the dual preview with one safe rendered final-Markdown result in the popup, including provider/origin, applicable Detail, model state/failure, size, and source metadata.
- [x] 2.5 Update popup copy and download so both use exactly the sole final Markdown bytes and preserve source-provenance and actual-origin metadata.

## 3. Verification

- [x] 3.1 Add deterministic fixtures proving Custom extraction selects an orthogonal source sentence over a near-duplicate at the relevant Detail budget.
- [x] 3.2 Add compression tests for Custom source fidelity/order, protected and removable block exclusion, repeated-run determinism, character-trigram fallback, None output, Detail 100, provider/origin metadata, and Browser fallback.
- [x] 3.3 Add popup tests for provider selection, inactive Detail under None, explicit Browser flow and fallback messaging, no tab/window creation, one rendered result, absent raw/dual-preview UI, and byte-faithful copy/download.
- [x] 3.4 Run targeted compression and popup tests, then run `npm test`, `npm run typecheck`, and `npm run build`.
