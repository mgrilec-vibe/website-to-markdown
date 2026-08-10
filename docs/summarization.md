# Summarization architecture

Website to Markdown has two local summarization paths with the same safety boundary: page content remains on the device and protected Markdown is never rewritten.

## Design goals

1. Preserve source facts, qualifiers, numbers, links, and code identifiers.
2. Rank information at document scope rather than treating every paragraph as equally important.
3. Retain section coverage without repeating boilerplate or near-duplicate claims.
4. Make Detail a predictable compression budget.
5. Keep the deterministic fallback dependency-free, multilingual, bounded, and reproducible.
6. Fail closed from Browser local AI to the deterministic extractor when output is not grounded.

## Custom extractive pipeline

The Custom provider is a structure-aware extractive summarizer. It never generates new prose.

```text
Markdown blocks
  -> heading hierarchy / sections
  -> sentence segmentation
  -> TF-IDF sentence vectors
  -> bounded LexRank graph centrality
  -> section and document centroids
  -> title / heading relevance
  -> boilerplate and repetition penalties
  -> fact-density features
  -> submodular MMR selection under a word budget
  -> source-ordered section summaries
```

### Salience

Candidate salience combines:

- graph centrality among semantically related sentences;
- similarity to the section and document centroids;
- title and heading relevance;
- TF-IDF distinctiveness;
- exact-fact density, including numbers and identifiers;
- a small source-position prior;
- penalties for sentences repeated across sections.

No language-specific stop-word list is required. Unicode word segmentation is used where available, with character-trigram similarity for text that is not usefully represented by word tokens.

### Selection

A greedy submodular objective rewards new concepts and previously uncovered sections while penalizing redundancy. Sentence cost is included in the objective so the selector spends its Detail-derived word budget on information rather than sentence count.

The graph and greedy pool are bounded and sampled across sections. This keeps very long pages responsive while preserving representation from across the document.

Every Custom sentence is copied verbatim from an eligible source block. Protected headings, links, code, tables, quotations, provenance, and conversion notices remain outside the summarizer.

## Browser local AI pipeline

The Browser provider uses Chrome's local Language Detector and Summarizer APIs when available.

```text
focused sections
  -> quota-aware source chunks
  -> local chunk summaries
  -> draft-summary groups + selected source evidence
  -> bounded hierarchical reduction
  -> grounding validation
  -> final Summary section
```

Reduction inputs include both draft summaries and structure-aware extractive evidence from their original source blocks. The final output is checked before export:

- it must be non-empty and shorter than its source;
- every numeric fact must occur in the source;
- links must come from the source;
- inline-code identifiers must occur in the source;
- the summary must retain a minimum lexical or character-level grounding signal.

A failed capability check, unsupported language, quota error, model error, or grounding check returns the Custom extractive result and records the Browser failure. Ungrounded output is never silently exported as a Browser summary.

## Quality gates

The automated suite covers:

- repeated boilerplate versus block-specific facts;
- global selection under a document word budget;
- section coverage and redundancy;
- exclusion of retained and protected blocks;
- exact-source extractiveness;
- deterministic output;
- monotonic output size across Detail levels;
- source-evidence inclusion during hierarchical reduction;
- rejection of unsupported numbers, links, and code identifiers;
- Browser-to-Custom fallback on grounding failure.

CI runs the complete test suite rather than a two-file smoke subset so summarization regressions cannot pass unnoticed.

## Evaluation limits

Automatic grounding checks catch important classes of factual error but do not prove semantic entailment. A release-quality evaluation should also include a versioned, human-reviewed corpus with claim-level coverage and factuality annotations, plus paired preference judgments for coherence and usefulness. The deterministic path provides exact sentence traceability; the Browser path deliberately falls back when its lightweight local checks find unsupported output.
