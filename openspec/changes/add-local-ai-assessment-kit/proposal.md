## Why

Chrome's on-device Summarizer API may enable private, adjustable-length Markdown exports, but availability, first-use provisioning, latency, and semantic quality depend on the user's hardware and browser. A portable assessment kit is needed to produce comparable evidence on qualifying machines before the product adopts local AI compression.

## What Changes

- Add a self-contained unpacked Chrome extension assessment kit for Chrome's local Summarizer API.
- Bundle non-private document fixtures, explicit deterministic compression policies, and protected-content expectations.
- Run paired deterministic-only and deterministic-plus-local-summary compression profiles, then record capability, provisioning, performance, structural, and reviewer results.
- Generate a portable report package containing machine-readable diagnostics, generated fixture outputs by default, and optional debugging artifacts without collecting user-page content.
- Preserve a usable deterministic fallback when the local model is unavailable, downloading, cancelled, or errors.

## Capabilities

### New Capabilities
- `local-ai-assessment-kit`: Provides a self-contained Chrome extension diagnostic suite that evaluates local AI Markdown compression against deterministic-only baselines and exports reviewable results.

### Modified Capabilities

None.

## Impact

- Adds a new TypeScript/Manifest V3 Chrome extension assessment package, bundled fixtures, expected outcomes, report schema, and test documentation.
- Depends on Chrome 138+ built-in AI APIs and a qualifying desktop Chrome profile for successful local-model runs; unavailable environments remain testable for fallback behavior.
- Does not process real user pages, require accounts or API keys, or transmit fixture or result content to a service.