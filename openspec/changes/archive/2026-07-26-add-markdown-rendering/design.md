## Context

The active-tab exporter produces deterministic Markdown and compressed Markdown derivatives, but the extension-owned preview displays both as raw readonly textareas. The existing `local-ai-markdown-compression` contract requires reviewable results, source provenance, explicit summary-origin boundaries, and local-only processing. Rendering that Markdown makes structural quality review practical, but every Markdown string originates in an arbitrary captured page and is therefore untrusted.

The existing conversion path removes scripts and event attributes before Turndown conversion, but that is not a sufficient security boundary for a Markdown renderer. A renderer must be safe for hostile Markdown even when it contains raw HTML, dangerous link destinations, image syntax, or malformed markup.

## Goals / Non-Goals

**Goals:**
- Replace both raw Markdown textareas with rendered deterministic and derivative Markdown views.
- Keep copy and UTF-8 `.md` download actions faithful to the generated Markdown bytes.
- Parse Markdown without interpreting embedded HTML.
- Render only `http:`, `https:`, and `mailto:` destinations as links, with opener isolation for newly opened pages.
- Prevent the rendered preview from loading images, video, audio, embeds, or any other remote resource.
- Preserve visible source-preserved, deterministic-extractive, and local-AI-assisted boundaries in the rendered result.

**Non-Goals:**
- Render captured source HTML, inline styles, SVG, mathematical markup, or arbitrary HTML embedded in Markdown.
- Add a Raw/Preview toggle or retain raw Markdown textareas in the preview.
- Change Markdown conversion, compression policy, summary provenance, or the bytes copied/downloaded.
- Implement an HTML renderer, proxy image resources, or add remote content processing.

## Decisions

### Use a maintained Markdown parser plus defense-in-depth sanitization

The preview will use `marked` to parse the generated Markdown and DOMPurify to sanitize its generated HTML before insertion into the extension DOM. Marked's raw-HTML renderer will escape tokens instead of passing them through, and its renderer will emit only the DOM shapes needed for the exporter’s supported Markdown structures. DOMPurify will use an explicit Markdown-oriented tag/attribute allowlist and an exact URI allowlist rather than its wider defaults.

A hand-written renderer was rejected because the existing exporter emits headings, paragraphs, lists, tables, blockquotes, fenced code, task checkboxes, and links. Maintaining a compatible parser while also defending against malformed or adversarial input would duplicate mature parser and sanitizer work.

Sanitization remains required even with raw HTML disabled: Markdown parser output and future configuration changes must not become a direct `innerHTML` trust boundary.

### Enforce the preview link and resource policy at rendering time

Every parsed link destination will be validated with URL parsing. Only absolute `http:`, `https:`, and `mailto:` URLs will receive an `href`; invalid, relative, and all other schemes render as non-link text. Rendered web links open with `target="_blank"` and `rel="noopener noreferrer"`.

Markdown image tokens will render as accessible non-fetching text derived from their alt text, not an `<img>` element or source URL. The sanitizer allowlist will exclude image, media, frame, form, style, SVG, MathML, and embedding elements. This policy applies even where the conversion pipeline previously accepted an image source URL: allowing it in exported Markdown does not authorize preview-time network access.

Relying only on the converter’s `safeUrl` policy was rejected. That policy supports `tel:` for export and does not control a future renderer’s DOM behavior; preview rendering requires its own narrower, explicit contract.

### Render both results directly and retain exact Markdown as actions

The preview will replace `textarea` elements with semantic rendered containers for the deterministic baseline and current derivative. Their existing headings, metrics, notices, and summary-origin markers remain adjacent to their respective rendered output. The UI exposes no raw Markdown view or selection model.

Copy and download continue to use the current derivative Markdown string, not HTML generated for the preview. Their label becomes explicit—such as “Copy compressed Markdown”—because no reviewed result is selected in a textarea. This keeps rendered presentation separate from export fidelity.

A Raw/Preview toggle was rejected because the decided user experience is rendered-only review; retaining textareas would preserve the original usability problem and expand UI state without changing export behavior.

### Test the renderer as an untrusted-content boundary

The renderer will be isolated behind a testable function that accepts Markdown and returns sanitized preview DOM/HTML. Tests will cover normal exported structures plus hostile raw HTML, event attributes, `javascript:`, `data:`, `tel:`, relative links, image/media/embed attempts, and safe links. Browser-level preview tests will verify that raw textareas are absent, visual provenance boundaries remain present, and copy/download use the original Markdown bytes.

Testing only the conversion pipeline was rejected because Markdown can be hostile independently of whether it passed through Turndown and because preview resource loading is a DOM behavior.

## Risks / Trade-offs

- **[Parser and sanitizer increase bundle size]** → Use browser-native ESM builds, limit configuration to the emitted Markdown subset, and reject handwritten parsing as the higher security-maintenance cost.
- **[Strict resource suppression makes image-heavy exports less visually faithful]** → Display image alt text/non-fetching placeholders and preserve the original image Markdown in copy/download output.
- **[Strict link handling makes non-HTTP destinations non-clickable]** → Preserve their Markdown text in exports; only preview interaction is constrained.
- **[Sanitizer configuration can drift]** → Centralize allowlists and test attack cases as observable contract tests.
- **[Rendered output can conceal the exact Markdown syntax]** → Copy/download remain byte-faithful and deterministic; raw source remains intentionally outside the review UI.
