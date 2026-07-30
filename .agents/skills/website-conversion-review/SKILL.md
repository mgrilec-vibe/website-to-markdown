---
name: website-conversion-review
description: Reviews website-to-Markdown evaluation evidence, runs local fixture or public candidate capture, and assigns separate complete and focused fidelity grades. Use when judging a website conversion, inspecting evaluation output, or assessing complete/focused Markdown quality; do not use for implementation or ordinary Markdown editing.
---

# Website Conversion Review

Review conversion fidelity from the evaluation's frozen evidence. Do not treat a screenshot as a pixel-comparison oracle and do not re-fetch an approved fixture's origin.

## Inputs

Use one target:

- No target: the configured default approved fixture.
- `--fixture <id>`, `--category <category>`, or `--tag <tag>`: one approved local fixture.
- A public HTTP(S) URL: an explicit one-shot candidate capture. Never use credentials or a private/local URL.

Run:

```sh
npm run evaluate:website -- [URL | --fixture ID | --category CATEGORY | --tag TAG]
```

The command prints an output directory containing `source.html`, `source.png`, `complete.md`, `focused.md`, and `evaluation-report.json`.

## Procedure

1. Run the evaluation command. If capture is blocked, produces a bot challenge, or reports no meaningful source document, do not score it; use `not-gradeable`.
2. Read `evaluation-report.json` first. Record the target, provenance, expected focus behavior when a fixture manifest provides it, output hashes, and declared limitations.
3. Inspect `source.html` and `source.png`, then read `complete.md` and `focused.md`.
4. Judge **complete** output against accessible reading content from the source. Navigation and page chrome may remain when useful, but unexplained loss or distortion of material content is a defect.
5. Judge **focused** output against the documented primary content unit. Do not deduct for intentionally excluding navigation, subscription prompts, related-content modules, or unrelated page chrome.
6. Treat a declared limitation as a limitation only when it explains the observed discrepancy. Do not use a generic warning to excuse unrelated missing content.
7. Score each mode independently. Cite the source and Markdown evidence for every deduction.

## Rubric

Start each grade at 100 and deduct only evidence-backed points.

| Dimension | Points | What to inspect |
| --- | ---: | --- |
| Material content retention | 40 | Main claims, sections, lists, and primary thread/article content |
| Structure and reading order | 20 | Heading hierarchy, sequence, quotations, and grouped content |
| Links, media, code, tables, lists | 15 | Destinations, alt text, fences, table semantics, and task states |
| Markdown readability | 15 | Clear Markdown structure without malformed or misleading text |
| Appropriate inclusion/exclusion | 10 | Complete preserves useful context; focused removes non-primary chrome |

A score is an integer from 1 through 100. If the source's central content is canvas/WebGL, cross-origin media, inaccessible dynamic content, a login page, or a bot challenge, return `not-gradeable` with the specific reason instead of inventing a number.

## Required output

```text
## Website Conversion Review

Target: <fixture ID or source URL>
Evidence: <local evaluation output directory>

### Complete — <N>/100 | not-gradeable
- Material retention: <points>/40
- Structure and order: <points>/20
- Links/media/code/tables/lists: <points>/15
- Markdown readability: <points>/15
- Inclusion/exclusion: <points>/10
- Deductions:
  - -<points>: <reason>. Source: <excerpt/location>. Markdown: <excerpt/location>.
- Declared limitations: <list or none>

### Focused — <N>/100 | not-gradeable
<same fields; name the expected primary content unit>

### Verdict
<one concise conclusion and any recommended conversion fix>
```

## Boundaries

- A candidate capture is evidence only. Never approve it into the local corpus or overwrite a golden without an explicit fixture-admission review.
- Do not compare bytes or screenshots for visual identity.
- Do not report a single blended grade; complete and focused have different contracts.
- Do not claim full fidelity when source limitations prevent comparison.
