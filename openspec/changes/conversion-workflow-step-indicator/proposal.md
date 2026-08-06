## Why

During conversion the popup shows only a single live status message, so the user cannot see which step of the workflow is active or which steps are completed. The quick-export lifecycle already defines capturing, converting, optional local summarization, and copying; presenting that position explicitly makes the local export flow easier to follow.

## What Changes

- Add a persistent workflow step indicator to the export popup's processing state that visibly presents the current step of the conversion workflow.
- Show the canonical steps capturing, converting, optional locally summarizing, and copying, marking the active step and reflecting completed steps.
- Keep the existing accessible live status message, READY/processing/result state machine, and local-only processing behavior unchanged.

## Capabilities

### New Capabilities
- `conversion-workflow-step-indicator`: A visible step indicator in the export popup that presents the current position in the capture → convert → optional summarize → copy workflow during processing.

### Modified Capabilities
<!-- None; the existing extension-quick-export-flow lifecycle requirement already covers phase visibility and this change only sharpens its presentation. -->

## Impact

- `src/popup-app.ts`: processing-state rendering gains the step indicator; the existing `FinalExportProgress` contract continues to drive phase changes.
- `src/export-styles.css`: styles for the step indicator within the fixed 22rem popup.
- `tests/popup-app.test.ts`: coverage for the visible current step and completed-step trail during processing.
- No changes to conversion, compression, summarization, storage, manifest permissions, or the completion receipt.
