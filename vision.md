# Website to Markdown — Product Vision

## Purpose

Website to Markdown is a Chrome extension that turns the page a person is viewing into a clean, portable Markdown document for use with large language models (LLMs). It preserves the page's meaning and provenance while removing the navigation, advertising, and layout noise that makes raw web pages poor LLM input.

The extension gives users a dependable answer to a simple need: **take this web page and give me Markdown I can trust an LLM to read.**

## Problem

People routinely give web content to LLMs for summarization, analysis, comparison, drafting, research, and coding. Existing paths are unnecessarily lossy or laborious:

- Copying from a browser captures menus, cookie banners, repeated controls, and broken line structure.
- Sending a URL assumes an LLM can fetch the page and see the same version the user sees.
- Reader modes improve readability but do not provide a portable, transparent Markdown artifact.
- Generic HTML-to-Markdown converters often retain presentation markup or discard important content such as headings, tables, code, links, and image context.

Users need a local, inspectable export that accurately represents the meaningful content of the page at the moment they chose it.

## Users and Jobs

### Primary users

- Researchers collecting sources for synthesis or comparison.
- Knowledge workers preparing reference material for chat-based LLMs.
- Developers exporting documentation, issue pages, API references, and error reports.
- Writers and analysts turning articles and reports into source material.

### Core job

> When I am reading a web page, I want to export its useful content as clean Markdown with source context, so I can provide reliable input to an LLM without manually cleaning the page.

## Product Principles

1. **Faithful meaning over visual fidelity.** Headings, prose, lists, quotations, code, tables, links, image descriptions, and document order matter. Pixels, layout containers, and decoration do not.
2. **User control before automation.** The user explicitly configures and initiates each export before any capture or conversion happens.
3. **Provenance is part of the document.** Every export identifies its source URL, title, and capture time so downstream LLM output can be traced back to the original page.
4. **Local by default.** Page content is processed in the browser and is not sent to a service by the extension.
5. **Useful beats exhaustive.** Remove page chrome and repetitive boilerplate while retaining content that changes the meaning of the page.
6. **Predictable output.** The same captured page should produce a stable Markdown structure, making exports easy to review, diff, store, and reuse.

## Product Experience

From any supported page, the user opens the extension and chooses export options for one page—**Focused article** or **Complete page**, a summarization provider, and a Detail level—then activates **Build Markdown**. The extension captures the current page, derives its main content, converts that content into Markdown, and applies the saved automatic-copy preference.

The completion receipt lets the user:

- Confirm the immutable source title, URL, and capture time.
- See measured words, Markdown size, an approximate token estimate, the selected mode, and the actual summary origin.
- Copy the Markdown to the clipboard or download it as a `.md` file with a safe, descriptive filename.

The downloaded document begins with lightweight front matter that records the source title, canonical URL when available, capture timestamp, and export mode. The body is readable Markdown suitable for pasting into an LLM or storing in a notes repository.

## Output Contract

An export MUST:

- Preserve the source title and source URL.
- Preserve the meaningful reading order of the captured content.
- Use semantic Markdown for headings, paragraphs, lists, task lists where represented, blockquotes, code blocks, horizontal rules, links, images with usable alternative text, and tables when their structure can be represented safely.
- Preserve link destinations in Markdown rather than replacing them with unlinked text.
- Preserve code as code and avoid reflowing it into prose.
- Include a capture timestamp and the selected export mode in front matter.
- Be valid UTF-8 Markdown that can be copied or downloaded without an account.

An export SHOULD:

- Prefer the page's canonical URL over a tracking-heavy address when one is declared.
- Omit navigation, ads, cookie notices, consent banners, sidebars, related-content modules, and repeated site chrome from focused exports.
- Retain captions and accessible descriptions that give images, tables, and embedded content meaning.
- Clearly represent content that cannot be converted faithfully instead of silently inventing or dropping its meaning.

## Scope

### In scope

- Chrome extension support for the active, user-visible tab.
- Extraction of main article or document content with a complete-page fallback.
- Copy and `.md` download workflows with an explicit per-export mode choice.
- Clean conversion of common document structures: prose, headings, lists, tables, quotations, links, images, and code.
- Source metadata and an explicit, human-readable notice for conversion limitations.
- Clear handling of logged-in and dynamically rendered pages using the content available in the current tab.

### Out of scope for the initial product

- Crawling sites, exporting multiple pages, or building a website archival system.
- Fetching pages remotely, bypassing paywalls, access controls, browser protections, or site restrictions.
- Calling an LLM, summarizing content, rewriting content, or offering a chat interface.
- Cloud accounts, synchronization, telemetry that includes page content, or server-side processing.
- Reproducing a page's visual design, interactive behavior, audio/video, or embedded applications.
- Guaranteeing complete capture of cross-origin frames, protected viewers, canvas-only content, or browser-restricted pages.

## Privacy and Trust

Website content can include private dashboards, customer data, and authenticated documentation. The extension must operate locally by default and request only the browser permissions required to process the page the user explicitly exports.

The interface must make the following clear:

- The extension processes the visible page content locally.
- Copying or downloading is a user-directed action.
- Pasting an exported document into an LLM may disclose its content to that LLM provider; this decision belongs to the user.
- Pages or elements the browser does not permit the extension to read cannot be exported completely.

## Quality Bar

The product succeeds when a user can export a typical article, documentation page, or internal knowledge page and immediately paste the result into an LLM without first deleting navigation, repairing headings, reconstructing lists, or recovering source links.

A high-quality export is:

- **Clean:** page chrome and layout noise are absent or minimal.
- **Faithful:** the document retains the content and structure that affect interpretation.
- **Traceable:** a reviewer can identify exactly where and when the content was captured.
- **Legible:** the Markdown reads naturally in plain text and renders cleanly.
- **Safe:** private page contents never leave the browser unless the user intentionally copies or downloads them.

## Success Measures

Initial success is demonstrated by:

- Users completing an export from the active page in a short, obvious flow.
- Markdown exports retaining the expected document hierarchy and link destinations on representative articles, docs, tables, and code-heavy pages.
- Focused exports excluding obvious page chrome while the complete-page mode remains available for edge cases.
- No page content transmitted off-device by the extension during conversion.
- Users treating the downloaded file as a trustworthy source artifact for LLM workflows.

## Future Direction

Once the core export is reliable, the product may add user-selected cleanup controls, configurable metadata, reusable export profiles, and integrations that deliver the same Markdown artifact to the user's chosen local or third-party workflow. Those additions must preserve the foundational guarantees: local-first processing, explicit user control, semantic fidelity, and traceable output.
