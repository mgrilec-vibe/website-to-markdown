## Why

Users need to fit a captured web page into a chosen amount of LLM context without manually deleting boilerplate or rewriting prose. Every device needs a useful local shortening path, so deterministic extractive summarization must work even where Chrome's optional on-device model cannot be provisioned.

## What Changes

- Add an active-tab Chrome export workflow that produces deterministic Markdown as the baseline and a separately identified compressed preview.
- Add a detailed Detail slider that combines deterministic removal/retention with a deterministic extractive summary; it reports measured output size and must not promise an exact word count.
- Use local AI only as an optional enhancement over the deterministic extractive path when Chrome's Summarizer is available and the detected language is supported.
- Preserve source provenance, headings, link destinations, code, tables, and other protected structures while summarizing only eligible prose.
- Detect language and warn about unsupported, mixed, ambiguous, or undetectable content only for optional local-AI enhancement; deterministic extraction remains available for all language states.
- Add explicit on-device model capability, download, cancellation, and failure UX without allowing any state to block deterministic extractive compression.
- Add fixture-based tests for deterministic extraction, slider-policy mapping, language-independent fallback behavior, local-AI enhancement, and summary-origin boundaries.

## Capabilities

### New Capabilities
- `local-ai-markdown-compression`: Exports active-tab content as deterministic Markdown and produces a detail-controlled deterministic extractive derivative, optionally enhanced by local AI when supported.

### Modified Capabilities
- None.

## Impact

- Adds a TypeScript Manifest V3 Chrome extension, active-tab capture/conversion pipeline, extension preview UI, deterministic extractive summarizer, and optional local built-in-AI adapters.
- Uses deterministic extraction on every supported browser/device; Chrome's on-device Language Detector and Summarizer APIs enhance this path only on qualifying desktop profiles.
- Requires explicit user-initiated local model provisioning only for optional local AI. The extension does not use accounts, API keys, remote configuration, server processing, or content-bearing network requests.
- Chrome 138+ is required only for optional local-AI enhancement; base conversion and deterministic extractive compression remain usable on unsupported devices and browsers.