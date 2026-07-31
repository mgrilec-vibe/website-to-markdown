# Website to Markdown Benchmark: Tester Instructions

1. In Chrome, open `chrome://extensions` and enable **Developer mode**.
2. Choose **Load unpacked** and select this benchmark build directory.
3. Open the **Website to Markdown Benchmark** action and choose **Open benchmark**.
4. The benchmark page processes its bundled approved static fixtures only; it does not visit or recapture the source URLs in fixture provenance.
5. Choose **Check readiness**. If Chrome reports a downloadable model, select **Provision downloadable model**; this action intentionally requires a user click.
6. Choose **Run quick benchmark** for a six-cell representative matrix (complete/focused × None@100, Custom@40, Browser@40) or **Run full benchmark** for all 260 cells. Runs are serial and may take substantial time when local AI is active. The live status names the current conversion or local-AI stage.
7. Browser provider results may be `local-ai` or deterministic fallback. Review requested provider, actual origin, and diagnostics; fallback is evidence of model availability or execution state, not a fabricated AI result.
8. When at least one run completes, choose **Download benchmark ZIP**. The archive contains result Markdown, conversion snapshots, fixture evidence, per-run metadata, and an aggregate report for offline review.

The benchmark runs entirely locally and does not require accounts, API keys, a server, Playwright, URL interception, or live-page navigation.
