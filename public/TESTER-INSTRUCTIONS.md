# Website to Markdown: Tester Instructions

1. In Chrome, open `chrome://extensions` and enable **Developer mode**.
2. Choose **Load unpacked** and select this directory.
3. Open an accessible `http:` or `https:` page in the active tab.
4. Open the **Website to Markdown** extension action. It captures and converts the active tab using the saved preferences.
5. Review the single rendered Markdown result. It shows the requested provider, actual result origin, Detail level when active, measured output size, source URL, and capture time.
6. Choose **Copy Markdown** or **Download .md**. The copied or downloaded bytes must match the displayed result.
7. Open **Settings** from the result screen or the extension action menu to choose focused or complete export, **None**, **Browser local AI**, or **Custom extractive** summarization, Detail, and automatic copying.

Browser local AI runs only when **Browser local AI** is selected and an export is started. Chrome may need supported hardware, storage, or a local model download. If it is unavailable or fails, the extension completes the export with deterministic custom extraction and identifies that fallback in the result.

The extension processes page content locally. It does not use accounts, API keys, remote configuration, telemetry, or content-bearing network requests. Canvas-only content, inaccessible pages, and cross-origin or protected frames may be incomplete; conversion notices appear in the output when detected.
