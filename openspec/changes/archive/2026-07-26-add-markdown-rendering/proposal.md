## Why

The export preview currently exposes both deterministic and compressed results only as raw Markdown textareas. Users cannot assess document hierarchy, tables, code, link presentation, or compression quality in the form their Markdown will take without copying it into another application.

## What Changes

- Replace raw Markdown result textareas in the extension preview with rendered Markdown views for the deterministic baseline and compressed derivative.
- Retain explicit copy and UTF-8 `.md` download actions so the exact source Markdown remains exportable without making raw Markdown an in-preview surface.
- Establish a strict rendering trust boundary for captured, untrusted content: Markdown is parsed without HTML pass-through; rendered links are restricted to `http:`, `https:`, and `mailto:`; and images, media, embeds, and other remote resources never load in the preview.
- Preserve visible distinctions between source-preserved, deterministic-extractive, and locally AI-assisted content in the rendered preview.
- Add regression coverage for rendered Markdown structure, safe link handling, raw-HTML suppression, and no-remote-resource behavior.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `local-ai-markdown-compression`: Render the existing deterministic and compressed Markdown results securely in the extension-owned review UI while retaining copy/download export behavior.

## Impact

- Affects `entrypoints/preview/main.ts` and `src/export-styles.css`.
- Adds a Markdown rendering and sanitization dependency or an equivalently maintained rendering boundary; no captured page HTML or remote media may be rendered directly.
- Updates the existing local-AI Markdown compression specification and its preview/export regression coverage.
