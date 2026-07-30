## Why

The converter is currently validated only against a synthetic fixture and reports binary golden/structural checks. It cannot turn a public page into reviewable Markdown evidence, assess complete and focused output against the same captured source, or exercise a representative, stable corpus of real website structures.

## What Changes

- Add a public-website evaluation workflow that captures a supplied HTTP(S) page once or evaluates a default local dataset fixture when no URL is supplied, then writes complete and focused Markdown plus machine-readable evidence.
- Add a curated, snapshot-based conversion dataset with queryable fixture metadata, source evidence, expected focus behavior, Markdown goldens, and explicit limitations. Normal dataset evaluation will be network-free.
- Add an agent skill that runs the workflow and grades complete and focused Markdown from 1–100 against frozen source evidence, with cited deductions and a `not-gradeable` outcome for inaccessible or non-representable source content.
- Preserve capture provenance and enforce corpus diversity: each category slot uses a distinct publisher/domain and distinct markup platform, rather than repeated templates from one source.

## Capabilities

### New Capabilities
- `website-conversion-evaluation`: Capture or select a public page fixture, convert both export modes, and emit inspectable Markdown and evaluation evidence.
- `conversion-evaluation-dataset`: Provide a curated, queryable, browser-captured fixture corpus for deterministic conversion evaluation.
- `website-conversion-review-skill`: Guide an agent through evidence-based quality review and separate complete/focused 1–100 grading.

### Modified Capabilities

- None.

## Impact

- New evaluation CLI/module, fixture manifest and source-evidence format, offline dataset test coverage, and output reports under local generated-output paths.
- New reusable agent skill and its installed skill-target artifacts.
- Existing capture, focused extraction, conversion, fixture-loading, benchmark-report, and test conventions are integration points; their browser-independent conversion contract remains intact.
- A one-shot public capture introduces network, redirect, content-size, and unsafe-address handling requirements. It is never a regular CI dependency; approved snapshots are the deterministic regression inputs.
