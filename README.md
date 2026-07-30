# Chrome Local AI Assessment Kit

A self-contained, unpacked Chrome extension for assessing Chrome's local Summarizer API against deterministic Markdown compression. It processes only bundled synthetic fixtures and makes no request containing fixture or report content.

## Prerequisites

- Chrome 138 or later on a supported desktop platform.
- For local AI runs, a Chrome profile that satisfies Chrome's current on-device-model hardware, storage, and initial-download requirements. An unavailable model is a valid assessment result.
- Node.js 24+ and npm only when building the package from source.

## Build the unpacked extension

```sh
npm install
npm run build
```

Load `.output/chrome-mv3` through `chrome://extensions`:

1. Enable **Developer mode**.
2. Choose **Load unpacked**.
3. Select the `.output/chrome-mv3` directory.
4. Open the **Chrome Local AI Assessment Kit** extension action.

## Run the assessment

1. Click **Check local AI**.
2. If Chrome reports `downloadable`, click **Download and enable**. If it reports `downloading`, click **Finish download and enable** to attach the session monitor. Both are explicit user actions because Chrome may download the local model.
3. Run one fixture/profile pair with **Run selected**, or run every bundled fixture and profile with **Run full suite**.
4. Inspect deterministic-only and local-AI output. Generated summaries are marked with a Markdown comment boundary.
5. Complete the reviewer fields for any result you want to evaluate.
6. Click **Download JSON report**.

The report includes local capability/provisioning diagnostics, policies, measurements, structural checks, generated outputs, final fixture outputs, errors, and reviewer decisions. It contains only bundled synthetic fixture content; the extension has no user-page capture feature.

While provisioning, open **Detailed provisioning log**. It records ordered event IDs, elapsed time, monitor attachment/listener registration, each raw and normalized download-progress value, session-create parameters, and session resolution or rejection. The same evidence is included in the downloaded report.

## Compression policies

| Policy | Deterministic behavior | Local AI behavior |
| --- | --- | --- |
| Full source | Removes only designated chrome | None |
| Compact | Preserves protected source structure | Medium key-point summary of eligible prose |
| Brief | Preserves protected source structure | Short TL;DR of eligible prose |
| Outline | Preserves protected source structure | Short headline-style summary of eligible prose |

Protected blocks include provenance, headings, links, code, tables, and quotations. Only fixture blocks explicitly classified as summarizable prose reach Chrome's local model.

## Interpreting results

- `unavailable` means Chrome cannot currently supply the local API for that profile or device; deterministic-only checks should still complete.
- `downloadable` means the tester must explicitly initiate model provisioning.
- `downloading` means provisioning is still in progress.
- `available` allows paired deterministic and local-AI runs.

Do not compare AI output byte-for-byte across machines or runs. Compare output size, structural checks, generated output, and reviewer findings. In particular, compare deterministic-only and AI-assisted output at the same policy to determine whether AI adds value beyond deterministic content selection.

## Browser capture setup

Public-page candidate capture uses Playwright Chromium and is opt-in. Install its browser binary only when you need to capture a URL or run the explicit browser integration test:

```sh
npm run browser:install
```

Ordinary unit tests and approved-fixture evaluation use local snapshots and do not download or launch Chromium.

## Verification commands

```sh
npm run typecheck
npm test
npm run build
```

For a real qualifying-device run, keep Chrome DevTools Network open while operating the assessment. Initial Chrome model provisioning can use the network; assessment fixture text and downloaded report content must not appear in any request.
<!-- ci/dummy-pr-test: transient marker for workflow verification -->
