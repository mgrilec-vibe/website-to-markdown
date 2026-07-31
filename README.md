# Website to Markdown

A local-first Chrome extension that converts the active tab into reviewable Markdown. It captures, converts, summarizes, previews, copies, and downloads content on-device; it does not send page content to a server.

## Features

- Capture the active `http:` or `https:` page with source title, URL, and capture time.
- Export either focused article content or the complete page.
- Choose **None**, **Custom extractive**, or **Browser local AI** summarization. Browser local AI falls back to the deterministic custom extractor when unavailable.
- Set a Detail level from 0–100 for summarized exports. Detail 100 preserves eligible prose without generating a summary.
- Review one sanitized Markdown preview, then copy or download the exact Markdown result.
- Save export mode, summarization provider, Detail level, and automatic-copy preference in extension settings.

Protected Markdown structures—source provenance, headings, link destinations, code, tables, quotations, and conversion notices—remain verbatim in summarized exports. Canvas content, protected or cross-origin frames, and inaccessible browser pages may not be represented completely.

## Install an unpacked build

Requirements: Chrome and Node.js 24+ with npm.

```sh
npm ci
npm run build
```

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Select **Load unpacked**.
4. Choose `.output/chrome-mv3`.
5. Open **Website to Markdown** from the Chrome toolbar.

The extension converts the current tab immediately using the saved settings. Use the extension action's **Settings** menu to choose focused or complete mode, a summarization provider, Detail, and automatic copy behavior.

## Production popup smoke procedure

Use the production build—not the corpus benchmark—to verify the active-tab boundary:

1. Load `.output/chrome-mv3` as an unpacked extension.
2. Open an accessible `http:` or `https:` page and make that tab active.
3. Open the extension action and wait for the single Markdown result.
4. Confirm the source URL, capture time, requested provider, and actual result origin are displayed.
5. Copy or download the Markdown and confirm the copied/downloaded UTF-8 bytes match the displayed result.

This smoke exercises `activeTab`, `chrome.scripting`, popup rendering, and export delivery. It does not replace the static-corpus benchmark.

## Local AI behavior

Browser summarization uses Chrome's built-in local Summarizer API only after you select it and start an export. Chrome may require supported hardware, sufficient storage, or an explicit model download. If Chrome cannot provide a local summary, Website to Markdown completes the export with its deterministic custom extractor and labels the actual result origin.

The extension has no host permissions and does not use accounts, API keys, remote configuration, telemetry, or content-bearing network requests.

## Development

```sh
npm test
npm run typecheck
npm run build
npm run zip
```

`npm run zip` writes the Chrome release archive to `.output/website-to-markdown-<version>-chrome.zip`.

## Run the static corpus benchmark

Build the self-contained benchmark extension on a machine with a qualifying Chrome profile:

```sh
npm run build:benchmark
```

Load `.output/benchmark-mv3` through `chrome://extensions`, open the extension action, then choose **Open benchmark**. The benchmark processes only its bundled approved static fixtures; it does not navigate to their source URLs. Check or provision Chrome local AI explicitly, run either the diagnostic fixture or the complete 260-cell matrix, then download the local evidence ZIP for review.

## Conversion evaluation

The local evaluation harness writes inspectable Markdown and machine-readable evidence under `.output/website-evaluation/`.

```sh
# Evaluate the default approved fixture
npm run evaluate:website

# Capture and evaluate a public candidate page
npm run evaluate:website -- https://example.com/

# Evaluate an approved fixture by ID, category, or tag
npm run evaluate:website -- --fixture fixture-id
npm run evaluate:website -- --category documentation
npm run evaluate:website -- --tag tables
```