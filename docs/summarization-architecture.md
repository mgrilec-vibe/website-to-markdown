# Summarization architecture

Website to Markdown uses two local summarization paths:

- **Custom extractive**: deterministic, dependency-free, and available on every supported page.
- **Browser local AI**: Chrome's on-device Summarizer API, with Custom extractive as the fallback.

Both paths preserve protected Markdown structures verbatim. Summarization only operates on eligible prose.

## Design goals

The summarizer is optimized for web documents rather than isolated paragraphs. Its priorities are:

1. preserve distinct facts, conditions, results, errors, and cautions;
2. cover important sections without repeating boilerplate;
3. remain deterministic and language-independent;
4. operate entirely on-device without new runtime dependencies;
5. degrade safely when Browser local AI is unavailable, over quota, or insufficiently grounded.

## Custom extractive pipeline

The version 3 Custom summarizer builds a hierarchical representation of the converted Markdown:

```text
Markdown blocks
  -> heading-aware sections
  -> Unicode sentence segmentation
  -> BM25-style lexical features
  -> sparse sentence and section graphs
  -> personalized PageRank salience
  -> global coverage + redundancy selection
  -> source-ordered extractive summaries
```

### Features and graph ranking

Each sentence is represented by weighted Unicode word unigrams, word bigrams, and character trigrams for sparse or no-space scripts. Smoothed inverse document frequency reduces the influence of repeated document vocabulary. Sparse similarity graphs connect lexically related sentences and sections, while local adjacency edges retain structural continuity.

Personalized PageRank combines graph centrality with source-independent quality priors: information density, heading relevance, sentence length, numeric/version evidence, duplicate suppression, and secondary-section penalties.

### Retention and summary selection

Source retention and summary selection share the same document analysis:

- retained prose is selected by salience, section diversity, and redundancy rather than evenly spaced block positions;
- omitted prose is summarized with a document-wide word budget;
- submodular feature coverage rewards new information;
- maximum-marginal-relevance penalties suppress repeated sentences;
- mandatory section coverage is bounded for very large documents;
- selected sentences are emitted verbatim and restored to source order.

The graph is sparse and redundancy state is updated incrementally, avoiding cubic selection behavior on long pages.

## Browser local-AI pipeline

The Browser provider receives focused, heading-labeled primary content. When the complete source exceeds the model quota, the same graph selector progressively compacts the source before chunking. This preserves high-centrality facts and section coverage instead of truncating the document or relying only on source order.

For multi-chunk documents, reduction prompts contain both draft summaries and source-grounded evidence. Every map-stage and reduction-stage output is checked against its supporting source. The final summary is checked again against the complete focused source before export.

Grounding checks reject:

- summaries longer than their substantive source;
- unsupported numeric or version facts, with common unit normalization;
- fabricated links;
- fabricated inline-code identifiers;
- output with insufficient source-vocabulary overlap.

A failed check triggers the deterministic Custom fallback; unsupported Browser output is never silently exported.

## Quality gates

The test suite verifies:

- repeated glue loses to section-specific evidence;
- informative blocks are retained before repeated framing;
- multiple important sections remain represented at low Detail;
- word counts remain monotonic across the Detail range;
- output is deterministic;
- Browser compaction preserves section evidence;
- fabricated numbers, links, and code identifiers are rejected;
- legacy quota and reduction behavior remains compatible.

CI runs the complete test suite, typecheck, production build, and benchmark build for every pull request.

## Research basis

The architecture is informed by recent work on graph-based long-document summarization and structure-aware hierarchical summarization, including:

- GraphLSS: graph-based extractive selection for long scientific documents (NAACL 2025).
- StrucSum: explicit discourse-structure modeling for long-document summarization.
- Structure-aware hierarchical merging for long-document summaries (ACL 2025).
- Chrome's on-device Summarizer API and documented input-quota behavior.

This implementation does not claim benchmark parity with large hosted language models. It applies current structure-aware and graph-based ideas within the extension's stricter local-first, deterministic, zero-runtime-dependency boundary.
