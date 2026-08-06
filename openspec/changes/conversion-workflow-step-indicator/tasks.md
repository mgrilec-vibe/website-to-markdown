## 1. Step indicator rendering

- [ ] 1.1 Add a popup-side `currentStep` value in `src/popup-app.ts` updated at the existing phase-change call sites (capture, converting, summarizing, copying).
- [ ] 1.2 Render a compact step trail in `renderProcessing` showing completed, active, and remaining steps for the canonical capturing, converting, optional locally summarizing, and copying steps.
- [ ] 1.3 Include the locally summarizing step only when the export path invokes Chrome's local summarizer; otherwise render the three-step shape.
- [ ] 1.4 Add step-trail styles in `src/export-styles.css` that fit the fixed 22rem popup width and preserve the existing 22rem width contract.

## 2. Accessibility and contract preservation

- [ ] 2.1 Keep the existing `#status` live region as the accessible announcement; derive both the indicator and the status text from the same `currentStep` value so they cannot disagree.
- [ ] 2.2 Confirm no `FinalExportProgress` contract change is needed and capture/copy remain popup-owned phases.

## 3. Test coverage and verification

- [ ] 3.1 Add popup tests asserting the current step advances from capturing to converting to copying, with completed steps visibly distinct.
- [ ] 3.2 Add a popup test pinning the three-step shape when local summarization is not invoked.
- [ ] 3.3 Add a popup test pinning the summarizing step when the export reports `summarizing`.
- [ ] 3.4 Run `npm run typecheck` and `npm test`; fix regressions before completing the change.
