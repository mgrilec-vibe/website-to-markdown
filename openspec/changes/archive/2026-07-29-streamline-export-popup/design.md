## Context

The popup currently presents mode, provider, and Detail controls, captures the active tab through the background service worker, converts the stored capture in the popup, renders a safe Markdown preview, and waits for the user to choose Copy Markdown. The background service worker has no conversion-job state; temporary captures are stored in `chrome.storage.session`. The extension already has `storage`, `activeTab`, `scripting`, and `downloads` permissions, but not the context-menu permission required for an extension action settings command.

The desired primary interaction is quicker: opening the extension action should immediately convert using saved defaults, show a compact loader while it runs, try to copy the completed exact Markdown, and report the result. This remains an extension-action popup, not a durable window or a background-managed job. If the popup closes, the operation is not resumed; reopening the action begins a new export. This keeps browser-only AI in the extension document context, where it already runs.

## Goals / Non-Goals

**Goals:**
- Make quick export the default action using persistent local preferences.
- Render explicit progress and result states in the popup.
- Copy exact completed Markdown automatically when enabled, with an explicit retry-copy action after clipboard failure.
- Show exact word/byte counts and a stable, clearly estimated token count.
- Provide an extension action context-menu path to an extension-owned settings surface.
- Preserve safe rendering, source provenance, local-only processing, deterministic fallback, and download.

**Non-Goals:**
- Add an export-validity or semantic-content gate before copying.
- Create a dedicated window, side panel, background-owned conversion queue, progress notifications, cancellation, or resume-after-popup-close behavior.
- Change conversion, compression, summarization policies, Markdown bytes, or fallback semantics.
- Bundle a model-specific tokenizer, promise exact token counts, or send text to a token-counting service.
- Add cloud synchronization, telemetry, profiles beyond one set of defaults, or arbitrary right-click behavior inside popup content.

## Decisions

### 1. Use the extension action popup as the quick-export surface

The extension action opens the existing popup, whose initial state is a compact progress card rather than a configuration form. It starts capture immediately using saved preferences and transitions through `capturing`, `converting`, optional `summarizing`, and `copying`.

A dedicated extension window would survive focus changes but requires durable job ownership and a more complex lifecycle. The popup is selected because conversion is local and the existing Browser AI API must execute in an extension-owned document context. Closing it intentionally abandons the visual workflow; no new background state machine is introduced.

### 2. Preserve the final result after every post-conversion outcome

The popup controller will hold the exact `FinalExport` after generation. It will always render the existing safe preview, provider/origin metadata, model warnings, and download action. The final state is determined by the clipboard write:

```text
open action
  → capturing → converting → [summarizing] → copying
                                              ├─ success → copied
                                              └─ failure → copy-failed
capture/conversion failure → failed
```

The controller must not add an output-validity check. A successful final export proceeds to the configured clipboard attempt, even if it contains limitations or minimal captured content. Summarizer failure remains a completed fallback result, not a failed conversion.

For `failed`, the popup shows the capture/conversion error and an `Try again` action. For `copy-failed`, it retains the result and offers `Copy Markdown` to repeat the same clipboard write. Copy success and fallback completion retain a copy-again action. The UI catches clipboard and download rejections so an unhandled event listener rejection cannot discard a completed export.

### 3. Make automatic copying an explicit persisted default

`autoCopy` defaults to `true` for a new install, matching the quick-export purpose. It can be disabled in settings, in which case the flow completes at the rendered result with `Copy Markdown` instead of invoking the clipboard automatically. The default is deliberate: the user action that opens the extension is the explicit request to export/copy, while the persisted setting preserves a preview-first alternative.

The clipboard adapter remains popup-owned (`navigator.clipboard`) rather than moving to the MV3 service worker. The adapter returns its promise to the state controller, which reports success/failure. This preserves the existing testable boundary and avoids assuming clipboard access in a background context.

### 4. Store durable preferences separately from transient exports

Create a typed preference record in `chrome.storage.local`; leave captured export records in `chrome.storage.session`. The record contains only primitive defaults: export mode, summarization provider, Detail integer, and auto-copy flag. Reads normalize missing or malformed stored values to the documented defaults; writes enforce the supported enums and Detail range. This prevents stale session cleanup from affecting preferences.

The popup loads preferences before starting quick export. The settings surface reads and writes this same module. A `chrome.contextMenus` item for the extension action opens the settings document without sending an export capture request. This is the supported interpretation of “right-click settings”; it does not rely on right-click events inside the ephemeral popup.

### 5. Use a deterministic token estimate with no new dependency

The UI derives `estimatedTokens` from the final exact Markdown using `Math.ceil(UTF-8 byte length / 4)`. It displays it as `~N tokens estimated`. The number is an intentionally model-agnostic size heuristic, not an API token count. Bytes are already exact output metadata; reusing UTF-8 bytes makes the rule portable, deterministic, and testable without bundling a tokenizer.

### 6. Keep controls in settings, not the quick-export path

The popup should expose only progress, completion metadata, warnings, copy-again, download, retry, and a settings link. Mode/provider/Detail editing moves to the settings surface. This favors the stated one-action flow while retaining user control through durable, inspectable defaults.

## Risks / Trade-offs

- **Popup closes before completion** → The work is intentionally not resumed. The next action starts over; a durable-job solution is deferred rather than partially simulated.
- **Clipboard access can reject** → Result state retains the exact final Markdown and presents retry-copy; no result is lost.
- **Automatic copy may surprise preview-first users** → It is an explicit default with a settings toggle, and completion still shows a safe preview plus copy-again/download actions.
- **Token estimate differs from a target model's tokenizer** → The UI labels it estimated and uses no exact-looking model claim.
- **Malformed stored settings** → Preference normalization restores safe defaults before quick export.
- **Context-menu permission broadens manifest surface** → Add only `contextMenus`; the item performs no page capture and opens only extension-owned settings.
- **Existing vision describes inspection before sharing** → Quick export changes the default interaction; retained preview and the auto-copy preference provide an explicit preview-first alternative.

## Migration Plan

1. Add the preference model, defaults, local storage adapter, and tests.
2. Add the settings entrypoint and extension-action context-menu command, including the minimal manifest permission.
3. Refactor popup rendering to load preferences and implement the quick-export state machine while reusing existing capture, conversion, preview, clipboard, and download boundaries.
4. Add deterministic token-estimate and state-transition coverage, then run the extension's normal typecheck and test commands.

Rollback is removing the settings entrypoint/context-menu integration and restoring the existing configuration-first popup. No stored page content or Markdown format changes require data migration; obsolete preference keys can be ignored safely.
