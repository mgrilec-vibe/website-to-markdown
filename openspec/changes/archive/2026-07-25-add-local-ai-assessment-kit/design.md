## Context

The repository currently contains product vision only. Chrome 138+ exposes a local Summarizer API backed by an on-device model on eligible desktop devices, but availability depends on the Chrome profile, platform, hardware, storage, model download, and API evolution. The assessment must therefore run in a real Chrome extension context on another machine, distinguish an unavailable model from a failed product path, and create evidence that compares deterministic compression against local-AI-assisted compression.

## Goals / Non-Goals

**Goals:**
- Provide a self-contained unpacked Manifest V3 extension that runs bundled, non-private fixtures without accounts, keys, servers, or user-page capture.
- Establish explicit deterministic removal and protected-content rules before applying local summarization.
- Execute paired deterministic-only and deterministic-plus-Summarizer runs for each fixture and compression profile.
- Produce a portable report containing capability/provisioning evidence, measurements, generated fixture summaries, structural results, and reviewer decisions.
- Keep the assessment usable when Chrome's local model is absent, unsupported, downloading, cancelled, or fails.

**Non-Goals:**
- Build the Website to Markdown production exporter or process real user pages.
- Claim that local AI output is a faithful source artifact or guarantee exact word counts.
- Bypass Chrome eligibility checks, model-download requirements, or user activation.
- Upload fixture text, generated summaries, machine diagnostics, or reports to any service.
- Support Firefox, Safari, mobile Chrome, or model execution from the MV3 service worker.

## Decisions

### Use an unpacked MV3 diagnostic extension with a top-level assessment page

The package will be a load-unpacked Chrome extension containing the runner, fixtures, expected outcomes, and report exporter. The assessment page will own user actions and local-model sessions; the MV3 service worker will only coordinate extension lifecycle work if needed.

This gives the test the same extension-origin and user-activation context as the intended feature. It avoids relying on OMP's headless browser, which is useful for automated fallback checks but not representative of a provisioned on-device-model Chrome profile. A standalone web page was considered but would not exercise extension behavior; a service-worker runner was rejected because Chrome documents the Summarizer API as unavailable in Web Workers.

### Make deterministic compression the controlled baseline

Fixtures will divide content into protected, removable, and summarizable blocks. Protected content includes provenance, headings, links, code, tables, and designated quotations; removable content is explicitly identified fixture chrome; only eligible prose reaches the Summarizer.

Every compression profile will run deterministic-only first and then repeat with the same deterministic selection plus local summaries. This isolates the measurable contribution of AI from ordinary boilerplate removal. A model-led full-document rewrite was rejected because it cannot establish whether output quality comes from selection, summary quality, or accidental loss.

### Expose named compression policies rather than exact length promises

The runner will assess Full source, Compact, Brief, and Outline policies. Each policy maps to documented deterministic selection plus a Summarizer configuration (`type`, `length`, `format`, and preference), and reports actual bytes/words. The product must not claim exact output length because the built-in API exposes qualitative short/medium/long settings and can return shorter output.

A continuous word-count slider was rejected for the assessment because it would imply a precision the API does not provide. It can be reconsidered only if later experiments demonstrate a dependable controller and acceptable semantic loss.

### Chunk prose only and make progressive summarization visible

The runner will preserve protected blocks outside model input. When eligible prose exceeds a session's usable context, it will use bounded chunks and a documented summary-of-summaries strategy, recording chunking and failures in the report. This enables large-document assessment while surfacing compounding-loss risk.

Sending raw HTML, code, tables, or full source documents to the model was rejected because it increases ambiguity and makes fidelity failures difficult to diagnose.

### Export a self-contained, content-bearing report for bundled fixtures

The downloaded JSON report will include generated summaries and final outputs for bundled fixtures by default, alongside input/output measurements, capability state, errors, structural checks, and human review fields. This makes results independently diagnosable; hashes alone cannot reveal omission or hallucination. The report will exclude user-supplied page content because the kit does not process it.

An opaque telemetry-only report was rejected because it prevents independent review. Server submission was rejected to preserve the local-only test boundary.

## Risks / Trade-offs

- **[Hardware and provisioning coverage is limited]** → Record Chrome's `availability()` state and model-download outcome; treat unavailable as a supported test result rather than a failure of the kit.
- **[Summaries vary between runs]** → Assert structural invariants and output-size bands, record generated outputs, and use human review instead of byte-for-byte golden assertions.
- **[Deterministic “unimportant” rules are biased]** → Version fixture classifications, require protected-content assertions, and compare paired runs at every profile.
- **[Context limits make long documents lossy]** → Chunk only eligible prose, record chunk boundaries and reduction stages, and require reviewers to assess omissions.
- **[Chrome API behavior changes]** → Feature-detect APIs, version the report schema and suite, record browser version, and keep deterministic-only execution independent of the model.
- **[Reports could become sensitive if the kit expands to real pages]** → Bundle only non-private fixtures in this change; prohibit user-page capture and make any future diagnostic capture a separately scoped change.

## Migration Plan

The assessment kit is additive. A tester loads the unpacked extension in a qualifying Chrome profile, explicitly initiates the model download when prompted, runs the bundled suite, and downloads its report. Rollback consists of removing the unpacked extension and deleting its downloaded reports; no persistent service, account, or production data migration exists.

## Open Questions

- What measured quality threshold—beyond structural invariants and reviewer ratings—will justify carrying local summarization into the production exporter?
- Which fixture classes best represent the intended users' documentation and research pages without embedding copyrighted or private source material?