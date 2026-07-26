## 1. Rendering boundary

- [x] 1.1 Add the maintained Markdown parser and DOM sanitizer dependencies required by the extension preview.
- [x] 1.2 Create a testable Markdown-to-preview rendering module that disables raw HTML, applies explicit element/attribute allowlists, and sanitizes before DOM insertion.
- [x] 1.3 Implement renderer-level link validation for absolute `http:`, `https:`, and `mailto:` URLs only, including opener isolation for newly opened web links.
- [x] 1.4 Render image, media, and embed Markdown as accessible non-fetching replacement content and exclude remote-resource DOM elements from the sanitization allowlist.

## 2. Preview integration

- [x] 2.1 Replace deterministic and derivative Markdown textareas with semantic rendered-result containers in the extension preview.
- [x] 2.2 Render both result containers whenever the baseline or derivative changes while retaining metrics, provenance, and source/extractive/local-AI boundary indicators.
- [x] 2.3 Keep copy and download sourced from the derivative Markdown string, rename the copy action to identify the compressed Markdown artifact, and remove textarea-selection assumptions.
- [x] 2.4 Add preview styles for rendered headings, lists, tables, code, blockquotes, links, non-fetching resource replacements, and responsive overflow handling.

## 3. Verification

- [x] 3.1 Add renderer contract tests for supported Markdown structures, raw-HTML suppression, event/style removal, and sanitizer allowlist enforcement.
- [x] 3.2 Add renderer security tests for safe-link isolation; unsupported `javascript:`, `data:`, `tel:`, relative, and malformed destinations; and image/media/embed non-fetching behavior.
- [x] 3.3 Update preview/export tests to verify rendered baseline and derivative output, visible provenance boundaries, absent raw textareas, and copy/download Markdown-byte fidelity.
- [x] 3.4 Run the targeted rendering and export tests, then run `npm test`, `npm run typecheck`, and `npm run build`.
