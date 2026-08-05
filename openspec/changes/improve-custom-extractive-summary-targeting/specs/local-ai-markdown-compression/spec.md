## MODIFIED Requirements

### Requirement: Deterministic extractive summary fallback
The system SHALL offer a single-choice **Summarization** setting with **None**, **Browser**, and **Custom** options for an exported page. **None** SHALL produce the complete converted Markdown without summary generation and SHALL make Detail inactive. **Custom** SHALL produce a language-independent deterministic extractive derivative for eligible prose when Detail is below 100. **Browser** SHALL invoke Chrome's local Summarizer only after the user explicitly selected Browser and initiated conversion; if the capability is unavailable, unsupported, declined, cancelled, or fails, the system SHALL produce the Custom derivative instead.

Custom extraction SHALL use the Detail-policy sentence budget and relevance signals, then select source sentences greedily with version-2 MMR scoring of `0.7 × normalized relevance − 0.3 × maximum lexical similarity to a selected sentence` within the same source block, where normalized relevance applies a position-aware decay that penalizes sentences after the first sentence in a block has already been selected and a monotonic non-increasing function of `detail`. It MUST segment only summarizable prose into source sentences, preserve selected sentences verbatim in source order, exclude provenance, protected, and removable blocks, and retain a source-anchored representation for each non-retained prose block. Custom extraction MUST use no model, dependency, content-bearing network request, language detector, or model provisioning. It MUST use lexical similarity locally, with a character n-gram fallback when word-token overlap is insufficient.

When Detail is 100, Browser and Custom SHALL retain eligible prose verbatim and SHALL not invoke a model or add a summary. The system SHALL record the requested provider separately from the actual summary origin: `none`, `deterministic-diverse-extractive`, or `local-ai`. A Browser fallback MUST identify `browser` as requested and `deterministic-diverse-extractive` as actual; it MUST NOT be presented as Browser output.

The Custom extractive output for a non-retained prose block SHALL be presented as a bare `>` blockquote carrying the selected sentence(s). The Custom extractive output MUST NOT repeat the application label `Custom extractive summary`, the requested provider, or any other application-internal identifier inside the block body. Noticeable summarization is conveyed by the blockquote marker, the YAML `compression_mode: custom-extractive` and `summary_origin: deterministic-diverse-extractive` frontmatter fields, and the visible popup metadata.

The per-block Custom summary sentence count SHALL be a monotonic non-increasing function of `detail` for `detail ∈ [0, 100]` and SHALL always be at least one when `detail < 100`. The Custom export's measured bytes and words for a fixed focused input SHALL be a monotonic non-increasing function of `detail` over the same range.

#### Scenario: None retains converted source without a summary
- **WHEN** the user selects None at any Detail value
- **THEN** the system SHALL produce complete converted Markdown without summary generation, SHALL make Detail inactive, and SHALL record `none` as the actual summary origin

#### Scenario: Custom extraction avoids redundant sentences
- **WHEN** a non-retained prose block contains near-duplicate high-relevance sentences and an orthogonal source sentence within its Detail-policy budget
- **THEN** Custom extraction SHALL select no more than one of the near-duplicate sentences when an orthogonal candidate adds greater non-redundant coverage

#### Scenario: Custom extraction de-prioritises first-sentence glue in a multi-sentence block
- **WHEN** a non-retained prose block contains a high-frequency transitional first sentence followed by one or more signal-rich sentences
- **THEN** Custom extraction SHALL NOT preferentially select the first sentence across multiple Detail values when a downstream candidate carries greater non-redundant information

#### Scenario: Custom extraction de-prioritises position-based glue
- **WHEN** a non-retained prose block contains a high-frequency transitional sentence at the start of the block and a stronger sentence later in the same block
- **THEN** Custom extraction SHALL prefer the stronger sentence when the position-aware decay reduces the first sentence's relevance below the later candidate

#### Scenario: Custom extraction never repeats the application label
- **WHEN** the Custom provider emits a focused summary across any number of non-retained prose blocks
- **THEN** the exported Markdown SHALL contain zero occurrences of the literal phrase `Custom extractive summary` and SHALL emit each per-block summary as a bare `>` blockquote

#### Scenario: Browser falls back to Custom
- **WHEN** the user selects Browser below Detail 100 and Chrome Summarizer is unavailable, unsupported, declined, cancelled, or fails
- **THEN** the system SHALL create the Detail-policy Custom derivative without requiring a model or network request and SHALL retain the Browser failure state beside its actual Custom origin

#### Scenario: Custom extraction uses lexical fallback
- **WHEN** a Custom candidate sentence lacks sufficiently granular word tokens for lexical overlap
- **THEN** Custom extraction SHALL use its deterministic local character n-gram similarity fallback without changing the source text

#### Scenario: Maximum Detail does not summarize
- **WHEN** the user selects Browser or Custom at Detail 100
- **THEN** the system SHALL retain eligible prose verbatim, SHALL not invoke Chrome Summarizer, and SHALL record no generated summary

#### Scenario: Lower Detail never grows the Custom export
- **WHEN** a user re-exports the same focused input at two different Detail values both below 100
- **THEN** the Custom export's measured bytes and words at the lower Detail SHALL be less than or equal to the measured bytes and words at the higher Detail for the same fixed input

#### Scenario: Detail always summarises something
- **WHEN** a user exports any focused input with the Custom provider at any Detail below 100 and at least one non-retained summarizable block exists
- **THEN** the Custom export SHALL contain at least one `>` blockquote summary line