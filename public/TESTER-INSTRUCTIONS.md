# Local AI Assessment Kit: Tester Instructions

1. In Chrome, open `chrome://extensions` and enable **Developer mode**.
2. Choose **Load unpacked** and select this directory.
3. Open the **Chrome Local AI Assessment Kit** extension action.
4. Click **Check local AI**.
5. If Chrome shows `downloadable`, click **Download and enable**. If it shows `downloading`, click **Finish download and enable** to attach a monitor to the in-progress download.
6. Run a selected fixture/profile or **Run full suite**.
7. Review deterministic-only and local-AI output. Generated summaries are visibly marked.
8. Save reviewer findings and click **Download JSON report**.

Open **Detailed provisioning log** while the model downloads. It records unique event IDs, elapsed times, monitor setup, raw progress values, create parameters, and the final resolution or error; those diagnostics are included in the report.

The assessment uses bundled synthetic fixtures only. It has no user-page capture, account, API-key, or report-upload feature. The JSON report includes generated outputs for the bundled fixtures so reviewers can inspect omissions and quality directly.

`unavailable` is a valid result: deterministic-only checks should still run. For local-AI results, use a qualifying Chrome desktop profile and follow Chrome's on-device model requirements.
