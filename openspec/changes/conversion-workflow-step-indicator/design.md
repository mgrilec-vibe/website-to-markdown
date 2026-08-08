## Context

The export popup (PR #8, merged) renders a READY configuration surface, transitions to a processing state on Build Markdown, and completes with a receipt. During processing, `src/popup-app.ts` renders a single `#status` message whose text is replaced as the workflow advances: "Capturing the active page locally…", "Converting to Markdown…", "Summarizing locally…", then copy states. The workflow contract (`FinalExportProgress` in `src/export-workflow.ts`) emits only `converting` and `summarizing`; capture and copy are popup-side phases. The lifecycle `capturing → converting → [summarizing] → copying` is documented in the quick-export spec and the archived streamline-export-popup design.

The change adds a persistent step indicator so the user can see both the current step and the completed trail. The popup is fixed at 22rem wide, and page-derived content must stay out of the popup DOM, so the indicator must be compact and derive only from workflow phase, never from page content.

## Goals / Non-Goals

**Goals:**
- Present the current workflow step visibly during processing.
- Distinguish completed, active, and remaining steps.
- Reuse the existing capture → convert → [summarize] → copy lifecycle without a new state machine.
- Keep the accessible live status message and local-only contract intact.

**Non-Goals:**
- A new conversion state machine, background job, or job queue.
- Changing conversion, compression, summarization, storage, or manifest permissions.
- Persistent progress across popup close; the existing popup lifecycle is unchanged.
- Page-derived text inside the indicator (privacy contract preserved).

## Decisions

### 1. Render a compact step trail inside the processing state
Extend `renderProcessing` in `src/popup-app.ts` to render a fixed ordered step trail (capturing, converting, optional locally summarizing, copying) above the existing `#status` message. Each step carries active/completed/remaining state, and the trail rerenders on every phase change. Alternatives considered: a progress bar (conveys no step identity), a single bolded current-step label (loses the completed trail). A labeled trail best satisfies "present at which step" plus the spec's completed/active distinction in the fixed 22rem width.

### 2. Drive the trail from the popup's own phase knowledge
Capture and copy are already popup-owned: `renderProcessing` messages "Capturing…" and "Converting…" frame the `createFinalExport` `onProgress` callback, which supplies `converting`/`summarizing`. The indicator derives each step's state from a single popup-side `currentStep` value updated at the same call sites that already choose the status text. No `FinalExportProgress` contract change is needed; capture → converting is an existing message transition. Alternatives considered: widening `FinalExportProgress` to include `capturing`/`copying`. Rejected because capture and copy are popup responsibilities, and the contract change would ripple through tests and the benchmark runner for no behavioral gain.

### 3. Summarize step shown only when local summarization actually runs
The summarizing step is included in the trail only when the export path invokes Chrome's local summarizer (the same condition under which "Summarizing locally…" is shown). None, Custom, Detail 100, and fallback paths present only capturing, converting, and copying. This matches the lifecycle `[summarizing]` optionality and the existing spec.

### 4. Keep the accessible live region unchanged
The `#status` element remains `role="status" aria-live="polite"` and continues to announce each phase change. The step trail is a static `aria-hidden`-free list of small text labels; the active step's label matches the status message so the live announcement and the visual indicator agree. No new live region is added.

## Risks / Trade-offs

- [Popup width is fixed at 22rem] → A four-step compact trail fits by using short labels (Capture, Convert, Summarize, Copy) with tight spacing; verified visually in the popup tests.
- [Step text duplication between indicator and status message] → Deliberate: the indicator is visual identity, the status message is the accessible announcement; both derive from the same `currentStep` value so they cannot disagree.
- [Summarizing step appears only sometimes] → Intended optionality; the trail re-renders with three or four steps depending on the path, and tests pin both shapes.
- [Chrome action popup remeasurement during state swap] → Reuses the existing 22rem width contract (inline widths plus static popup bootstrap CSS); adding the trail must not introduce a wider state.

## Migration Plan

1. Add a `currentStep` value and step-trail rendering in `src/popup-app.ts`'s processing state.
2. Add step-trail styles in `src/export-styles.css` inside the fixed popup width.
3. Update popup tests to assert the current step, completed-step trail, and the three-step shape when local summarization is absent.

Rollback: remove the indicator rendering and styles; the status message and workflow remain unchanged.

## Open Questions

None blocking. The exploration issue's visual-treatment question (stepper vs. progress bar vs. stronger label) is resolved to a compact labeled step trail by this design.
