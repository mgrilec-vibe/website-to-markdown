import type { MarkdownBlock } from './export-domain';

export interface ExtractiveSummary {
  readonly block: MarkdownBlock;
  readonly markdown: string;
}

interface Section {
  readonly id: string;
  readonly heading: string;
  readonly sourceOrder: number;
  readonly blocks: readonly MarkdownBlock[];
}

interface Candidate {
  readonly block: MarkdownBlock;
  readonly section: Section;
  readonly sentence: string;
  readonly blockSentenceIndex: number;
  readonly sectionSentenceIndex: number;
  readonly wordCount: number;
  readonly vector: ReadonlyMap<string, number>;
  readonly informationDensity: number;
}

interface CandidateScore {
  readonly salience: number;
  readonly informationDensity: number;
  readonly distinctiveness: number;
}

interface SelectionOptions {
  readonly detail: number;
  readonly title?: string;
  readonly targetBlockIds: ReadonlySet<string>;
  readonly ensureEachSection: boolean;
  readonly wordBudgetOverride?: number;
}

const GRAPH_DAMPING = 0.85;
const GRAPH_ITERATIONS = 24;
const GRAPH_NEIGHBORS = 8;
const GRAPH_EDGE_THRESHOLD = 0.04;
const MAX_GRAPH_CANDIDATES = 600;
const MAX_SELECTION_CANDIDATES = 1_600;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

interface HeadingInfo {
  readonly level: number;
  readonly text: string;
}

function plainInlineMarkdown(markdown: string): string {
  return markdown
    .replace(/!\[([^\]]*)\]\([^)]*\)/gu, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/gu, '$1')
    .replace(/`([^`]+)`/gu, '$1')
    .replace(/[*_~]+/gu, '')
    .replace(/\s+/gu, ' ')
    .trim();
}

function headingInfo(block: MarkdownBlock): HeadingInfo | undefined {
  const match = /^(#{1,6})\s+(.+)$/mu.exec(block.markdown.trim());
  const hashes = match?.[1];
  const text = match?.[2];
  return hashes && text ? { level: hashes.length, text: plainInlineMarkdown(text) } : undefined;
}

function inferredHeading(block: MarkdownBlock): string {
  const lines = block.markdown.split('\n').map((line) => plainInlineMarkdown(line)).filter(Boolean);
  const first = lines[0] ?? '';
  const firstWordCount = words(first).length;
  return lines.length > 1 && firstWordCount > 0 && firstWordCount <= 12 && !/[.!?]$/u.test(first) ? first : '';
}

function buildSections(blocks: readonly MarkdownBlock[]): readonly Section[] {
  const hasHeadings = blocks.some((block) => headingInfo(block) !== undefined);
  const mutable: { id: string; heading: string; sourceOrder: number; blocks: MarkdownBlock[] }[] = [];
  const headingStack: string[] = [];
  let current: { id: string; heading: string; sourceOrder: number; blocks: MarkdownBlock[] } | undefined;
  let sectionIndex = 0;

  const startSection = (heading: string, sourceOrder: number): void => {
    sectionIndex += 1;
    current = { id: `extractive-section-${sectionIndex}`, heading, sourceOrder, blocks: [] };
    mutable.push(current);
  };

  for (const block of [...blocks].sort((left, right) => left.sourceOrder - right.sourceOrder)) {
    const heading = headingInfo(block);
    if (heading !== undefined) {
      headingStack.length = heading.level - 1;
      headingStack[heading.level - 1] = heading.text;
      startSection(headingStack.filter(Boolean).join(' › '), block.sourceOrder);
      continue;
    }
    if (block.kind !== 'summarizable') continue;
    if (!current || (!hasHeadings && current.blocks.length > 0)) startSection(inferredHeading(block), block.sourceOrder);
    current!.blocks.push(block);
  }

  return mutable
    .filter((section) => section.blocks.length > 0)
    .map((section) => ({ ...section, blocks: section.blocks }));
}

function splitSentences(text: string): readonly string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const segmenter = typeof Intl.Segmenter === 'function'
    ? new Intl.Segmenter(undefined, { granularity: 'sentence' })
    : undefined;
  const segments = segmenter
    ? [...segmenter.segment(trimmed)].map(({ segment }) => segment)
    : trimmed.split(/(?<=[.!?])\s+/u);
  return segments.map((sentence) => sentence.trim()).filter(Boolean);
}

function words(text: string): readonly string[] {
  return text.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
}

function uniqueWords(text: string): readonly string[] {
  return [...new Set(words(text))];
}

function characterTrigrams(sentence: string): readonly string[] {
  const normalized = sentence.toLocaleLowerCase().replace(/\s+/gu, ' ').trim();
  if (normalized.length < 3) return [];
  const trigrams = new Set<string>();
  for (let index = 0; index <= normalized.length - 3; index += 1) trigrams.add(normalized.slice(index, index + 3));
  return [...trigrams];
}

function jaccard(left: readonly string[], right: readonly string[]): number {
  if (!left.length || !right.length) return 0;
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  let shared = 0;
  for (const token of leftSet) if (rightSet.has(token)) shared += 1;
  return shared / Math.max(1, leftSet.size + rightSet.size - shared);
}

export function sentenceSimilarity(left: string, right: string): number {
  const leftTokens = uniqueWords(left);
  const rightTokens = uniqueWords(right);
  if (leftTokens.length >= 2 && rightTokens.length >= 2) return jaccard(leftTokens, rightTokens);
  const leftTrigrams = characterTrigrams(left);
  const rightTrigrams = characterTrigrams(right);
  return leftTrigrams.length >= 3 && rightTrigrams.length >= 3 ? jaccard(leftTrigrams, rightTrigrams) : 0;
}

function documentFrequency(sentences: readonly string[]): ReadonlyMap<string, number> {
  const result = new Map<string, number>();
  for (const sentence of sentences) {
    for (const token of uniqueWords(sentence)) result.set(token, (result.get(token) ?? 0) + 1);
  }
  return result;
}

function inverseDocumentFrequency(token: string, sentenceCount: number, frequency: ReadonlyMap<string, number>): number {
  return Math.log((sentenceCount + 1) / ((frequency.get(token) ?? 0) + 1)) + 1;
}

function vectorForText(
  text: string,
  sentenceCount: number,
  frequency: ReadonlyMap<string, number>,
): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();
  for (const token of words(text)) counts.set(token, (counts.get(token) ?? 0) + 1);
  return new Map([...counts].map(([token, count]) => [
    token,
    (1 + Math.log(count)) * inverseDocumentFrequency(token, sentenceCount, frequency),
  ]));
}

function cosineSimilarity(left: ReadonlyMap<string, number>, right: ReadonlyMap<string, number>): number {
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (const weight of left.values()) leftNorm += weight * weight;
  for (const weight of right.values()) rightNorm += weight * weight;
  for (const [token, weight] of left) dot += weight * (right.get(token) ?? 0);
  return leftNorm > 0 && rightNorm > 0 ? dot / Math.sqrt(leftNorm * rightNorm) : 0;
}

function centroid(vectors: readonly ReadonlyMap<string, number>[]): ReadonlyMap<string, number> {
  const result = new Map<string, number>();
  if (vectors.length === 0) return result;
  for (const vector of vectors) {
    for (const [token, weight] of vector) result.set(token, (result.get(token) ?? 0) + weight / vectors.length);
  }
  return result;
}

function informationDensity(sentence: string, wordCount: number): number {
  const numericFacts = sentence.match(/\b\d+(?:[.,]\d+)*(?:%|[\p{L}]+)?\b/gu)?.length ?? 0;
  const identifiers = sentence.match(/\b(?:[\p{L}_][\p{L}\p{N}_]*\(\)|[\p{Ll}]+[\p{Lu}][\p{L}\p{N}]*|[\p{Lu}]{2,}[\p{Lu}\p{N}_-]*)\b/gu)?.length ?? 0;
  return clamp((numericFacts * 2 + identifiers) / Math.max(6, wordCount), 0, 1);
}

function createCandidates(sections: readonly Section[]): readonly Candidate[] {
  const sentenceRecords: {
    block: MarkdownBlock;
    section: Section;
    sentence: string;
    blockSentenceIndex: number;
    sectionSentenceIndex: number;
  }[] = [];
  for (const section of sections) {
    let sectionSentenceIndex = 0;
    for (const block of section.blocks) {
      for (const [blockSentenceIndex, sentence] of splitSentences(block.markdown).entries()) {
        sentenceRecords.push({ block, section, sentence, blockSentenceIndex, sectionSentenceIndex });
        sectionSentenceIndex += 1;
      }
    }
  }
  const frequency = documentFrequency(sentenceRecords.map(({ sentence }) => sentence));
  const sentenceCount = sentenceRecords.length;
  return sentenceRecords.map((record) => {
    const tokens = words(record.sentence);
    return {
      ...record,
      wordCount: tokens.length,
      vector: vectorForText(record.sentence, sentenceCount, frequency),
      informationDensity: informationDensity(record.sentence, tokens.length),
    };
  });
}

function lexRank(candidates: readonly Candidate[]): ReadonlyMap<Candidate, number> {
  if (candidates.length === 0) return new Map();
  if (candidates.length === 1) return new Map([[candidates[0]!, 1]]);

  const outgoing: { target: number; weight: number }[][] = candidates.map((candidate, index) => {
    const neighbors = candidates
      .map((other, otherIndex) => ({ target: otherIndex, weight: index === otherIndex ? 0 : cosineSimilarity(candidate.vector, other.vector) }))
      .filter(({ weight }) => weight >= GRAPH_EDGE_THRESHOLD)
      .sort((left, right) => right.weight - left.weight || left.target - right.target)
      .slice(0, GRAPH_NEIGHBORS);
    if (neighbors.length === 0) return [{ target: index, weight: 1 }];
    const total = neighbors.reduce((sum, neighbor) => sum + neighbor.weight, 0);
    return neighbors.map((neighbor) => ({ ...neighbor, weight: neighbor.weight / Math.max(total, 1) }));
  });

  let ranks = new Array<number>(candidates.length).fill(1 / candidates.length);
  for (let iteration = 0; iteration < GRAPH_ITERATIONS; iteration += 1) {
    const next = new Array<number>(candidates.length).fill((1 - GRAPH_DAMPING) / candidates.length);
    for (const [source, edges] of outgoing.entries()) {
      for (const edge of edges) next[edge.target] = (next[edge.target] ?? 0) + GRAPH_DAMPING * (ranks[source] ?? 0) * edge.weight;
    }
    ranks = next;
  }
  const minimum = Math.min(...ranks);
  const maximum = Math.max(...ranks);
  return new Map(candidates.map((candidate, index) => [
    candidate,
    maximum === minimum ? 1 : ((ranks[index] ?? minimum) - minimum) / (maximum - minimum),
  ]));
}

function evenlySample<T>(items: readonly T[], limit: number): readonly T[] {
  if (items.length <= limit) return items;
  if (limit <= 1) return items.length ? [items[Math.floor(items.length / 2)]!] : [];
  const result: T[] = [];
  const selected = new Set<number>();
  for (let index = 0; index < limit; index += 1) {
    const position = Math.round((index * (items.length - 1)) / (limit - 1));
    if (!selected.has(position)) {
      result.push(items[position]!);
      selected.add(position);
    }
  }
  return result;
}

function graphSample(candidates: readonly Candidate[]): readonly Candidate[] {
  if (candidates.length <= MAX_GRAPH_CANDIDATES) return candidates;
  const bySection = new Map<string, Candidate[]>();
  for (const candidate of candidates) {
    const section = bySection.get(candidate.section.id) ?? [];
    section.push(candidate);
    bySection.set(candidate.section.id, section);
  }
  const sections = [...bySection.values()];
  const representedSections = evenlySample(sections, Math.min(sections.length, MAX_GRAPH_CANDIDATES));
  const perSection = Math.max(1, Math.floor(MAX_GRAPH_CANDIDATES / representedSections.length));
  const result = representedSections.flatMap((section) => evenlySample(section, perSection));
  if (result.length >= MAX_GRAPH_CANDIDATES) return result.slice(0, MAX_GRAPH_CANDIDATES);
  const selected = new Set(result);
  const remainder = candidates.filter((candidate) => !selected.has(candidate));
  return [...result, ...evenlySample(remainder, MAX_GRAPH_CANDIDATES - result.length)];
}

function normalizedSentenceKey(sentence: string): string {
  return words(sentence).join(' ');
}

function lengthQuality(wordCount: number): number {
  if (wordCount < 4) return 0.15;
  if (wordCount < 7) return 0.55;
  if (wordCount <= 36) return 1;
  if (wordCount <= 55) return 0.7;
  return 0.4;
}

function candidateScores(
  candidates: readonly Candidate[],
  title: string | undefined,
): ReadonlyMap<Candidate, CandidateScore> {
  const sampledCandidates = graphSample(candidates);
  const graphCentrality = lexRank(sampledCandidates);
  const globalCentroid = centroid(candidates.map((candidate) => candidate.vector));
  const bySection = new Map<string, Candidate[]>();
  for (const candidate of candidates) {
    const list = bySection.get(candidate.section.id) ?? [];
    list.push(candidate);
    bySection.set(candidate.section.id, list);
  }
  const sectionCentroids = new Map([...bySection].map(([sectionId, sectionCandidates]) => [
    sectionId,
    centroid(sectionCandidates.map((candidate) => candidate.vector)),
  ]));
  const frequency = documentFrequency(candidates.map(({ sentence }) => sentence));
  const contextVectors = new Map([...bySection].map(([sectionId, sectionCandidates]) => {
    const section = sectionCandidates[0]?.section;
    const contextText = [title, section?.heading].filter(Boolean).join(' ');
    return [sectionId, contextText ? vectorForText(contextText, candidates.length, frequency) : new Map<string, number>()] as const;
  }));
  const sentenceSections = new Map<string, Set<string>>();
  const tokenSections = new Map<string, Set<string>>();
  for (const candidate of candidates) {
    const sentenceKey = normalizedSentenceKey(candidate.sentence);
    const sentenceSet = sentenceSections.get(sentenceKey) ?? new Set<string>();
    sentenceSet.add(candidate.section.id);
    sentenceSections.set(sentenceKey, sentenceSet);
    for (const token of candidate.vector.keys()) {
      const tokenSet = tokenSections.get(token) ?? new Set<string>();
      tokenSet.add(candidate.section.id);
      tokenSections.set(token, tokenSet);
    }
  }
  const sectionCount = Math.max(1, bySection.size);
  const maximumIdfWeight = Math.max(1, ...candidates.flatMap((candidate) => [...candidate.vector.values()]));

  return new Map(candidates.map((candidate) => {
    const sectionCentrality = cosineSimilarity(candidate.vector, sectionCentroids.get(candidate.section.id) ?? new Map());
    const documentCentrality = cosineSimilarity(candidate.vector, globalCentroid);
    const contextRelevance = cosineSimilarity(candidate.vector, contextVectors.get(candidate.section.id) ?? new Map());
    const distinctiveness = [...candidate.vector.values()].reduce((sum, weight) => sum + weight / maximumIdfWeight, 0)
      / Math.max(1, candidate.vector.size);
    const exactSectionFrequency = sentenceSections.get(normalizedSentenceKey(candidate.sentence))?.size ?? 1;
    const exactRepetition = sectionCount <= 1 ? 0 : (exactSectionFrequency - 1) / (sectionCount - 1);
    const repeatedTokenRatio = candidate.vector.size === 0 || sectionCount <= 1
      ? 0
      : [...candidate.vector.keys()].reduce((sum, token) => {
        const tokenSectionCount = tokenSections.get(token)?.size ?? 1;
        return sum + (tokenSectionCount - 1) / (sectionCount - 1);
      }, 0) / candidate.vector.size;
    const crossSectionRepetition = 0.72 * exactRepetition + 0.28 * repeatedTokenRatio;
    const position = 1 / (1 + candidate.sectionSentenceIndex);
    const salience =
      0.12 * (graphCentrality.get(candidate) ?? 0)
      + 0.08 * documentCentrality
      + 0.22 * sectionCentrality
      + 0.22 * distinctiveness
      + 0.12 * contextRelevance
      + 0.12 * candidate.informationDensity
      + 0.07 * lengthQuality(candidate.wordCount)
      + 0.05 * position
      - 0.22 * crossSectionRepetition;
    return [candidate, { salience, informationDensity: candidate.informationDensity, distinctiveness }] as const;
  }));
}

function summaryRatio(detail: number): number {
  const normalized = clamp(Math.round(detail), 0, 99) / 100;
  return 0.08 + 0.42 * normalized;
}

function conceptNovelty(candidate: Candidate, coveredTokens: ReadonlySet<string>): number {
  const weights = [...candidate.vector];
  const total = weights.reduce((sum, [, weight]) => sum + weight, 0);
  const novel = weights.reduce((sum, [token, weight]) => sum + (coveredTokens.has(token) ? 0 : weight), 0);
  return total > 0 ? novel / total : 0;
}

function candidateSimilarity(left: Candidate, right: Candidate): number {
  const vectorSimilarity = cosineSimilarity(left.vector, right.vector);
  return left.vector.size >= 2 && right.vector.size >= 2
    ? vectorSimilarity
    : Math.max(vectorSimilarity, sentenceSimilarity(left.sentence, right.sentence));
}

function selectionScore(
  candidate: Candidate,
  score: CandidateScore,
  redundancy: number,
  coveredTokens: ReadonlySet<string>,
  representedSections: ReadonlySet<string>,
  sectionSalience: ReadonlyMap<string, number>,
): number {
  const novelty = conceptNovelty(candidate, coveredTokens);
  const sectionNovelty = representedSections.has(candidate.section.id) ? 0 : (sectionSalience.get(candidate.section.id) ?? 0);
  const objective =
    0.36 * score.salience
    + 0.32 * novelty * (0.5 + 0.5 * score.distinctiveness)
    + 0.20 * sectionNovelty
    + 0.12 * score.informationDensity
    - 0.38 * redundancy;
  const cost = 0.65 + 0.35 * Math.sqrt(Math.max(1, candidate.wordCount) / 20);
  return objective / cost;
}

function boundedSelectionPool(
  candidates: readonly Candidate[],
  scores: ReadonlyMap<Candidate, CandidateScore>,
): readonly Candidate[] {
  if (candidates.length <= MAX_SELECTION_CANDIDATES) return candidates;
  const bySection = new Map<string, Candidate[]>();
  for (const candidate of candidates) {
    const section = bySection.get(candidate.section.id) ?? [];
    section.push(candidate);
    bySection.set(candidate.section.id, section);
  }
  const sections = [...bySection.values()];
  const perSection = Math.max(1, Math.floor(MAX_SELECTION_CANDIDATES / Math.max(1, sections.length)));
  const selected = new Set<Candidate>();
  for (const section of sections) {
    const ranked = [...section].sort((left, right) =>
      (scores.get(right)?.salience ?? 0) - (scores.get(left)?.salience ?? 0)
      || left.block.sourceOrder - right.block.sourceOrder
      || left.blockSentenceIndex - right.blockSentenceIndex);
    for (const candidate of ranked.slice(0, perSection)) selected.add(candidate);
  }
  if (selected.size < MAX_SELECTION_CANDIDATES) {
    const remainder = candidates
      .filter((candidate) => !selected.has(candidate))
      .sort((left, right) => (scores.get(right)?.salience ?? 0) - (scores.get(left)?.salience ?? 0));
    for (const candidate of remainder.slice(0, MAX_SELECTION_CANDIDATES - selected.size)) selected.add(candidate);
  }
  return [...selected];
}

function selectCandidates(
  allCandidates: readonly Candidate[],
  options: SelectionOptions,
): readonly Candidate[] {
  const selectable = allCandidates.filter((candidate) => options.targetBlockIds.has(candidate.block.id));
  if (selectable.length === 0) return [];
  const scores = candidateScores(allCandidates, options.title);
  const selectionPool = boundedSelectionPool(selectable, scores);
  const sectionSalience = new Map<string, number>();
  for (const candidate of selectionPool) {
    const salience = scores.get(candidate)?.salience ?? 0;
    sectionSalience.set(candidate.section.id, Math.max(sectionSalience.get(candidate.section.id) ?? 0, salience));
  }
  const totalWords = selectable.reduce((sum, candidate) => sum + candidate.wordCount, 0);
  const smallestSentence = Math.min(...selectable.map((candidate) => candidate.wordCount));
  const wordBudget = Math.max(
    smallestSentence,
    Math.round(options.wordBudgetOverride ?? Math.ceil(totalWords * summaryRatio(options.detail))),
  );
  const maximumSelections = Math.min(
    selectionPool.length,
    320,
    Math.max(24, Math.ceil(Math.sqrt(selectable.length) * 6)),
  );
  const selected: Candidate[] = [];
  const selectedSet = new Set<Candidate>();
  const redundancy = new Map<Candidate, number>();
  const coveredTokens = new Set<string>();
  const representedSections = new Set<string>();
  let selectedWords = 0;

  const add = (candidate: Candidate): void => {
    selected.push(candidate);
    selectedSet.add(candidate);
    selectedWords += candidate.wordCount;
    representedSections.add(candidate.section.id);
    for (const token of candidate.vector.keys()) coveredTokens.add(token);
    for (const other of selectionPool) {
      if (selectedSet.has(other)) continue;
      redundancy.set(other, Math.max(redundancy.get(other) ?? 0, candidateSimilarity(candidate, other)));
    }
  };

  const bestFrom = (pool: readonly Candidate[], allowOverflow: boolean): { candidate: Candidate; score: number } | undefined => {
    let best: { candidate: Candidate; score: number } | undefined;
    for (const candidate of pool) {
      if (selectedSet.has(candidate)) continue;
      if (!allowOverflow && selectedWords + candidate.wordCount > wordBudget) continue;
      const score = selectionScore(
        candidate,
        scores.get(candidate) ?? { salience: 0, informationDensity: 0, distinctiveness: 0 },
        redundancy.get(candidate) ?? 0,
        coveredTokens,
        representedSections,
        sectionSalience,
      );
      if (!best
        || score > best.score
        || (score === best.score && (candidate.block.sourceOrder < best.candidate.block.sourceOrder
          || (candidate.block.sourceOrder === best.candidate.block.sourceOrder
            && candidate.blockSentenceIndex < best.candidate.blockSentenceIndex)))) {
        best = { candidate, score };
      }
    }
    return best;
  };

  if (options.ensureEachSection) {
    const sections = [...new Set(selectionPool.map((candidate) => candidate.section.id))];
    for (const sectionId of sections) {
      if (selected.length >= maximumSelections) break;
      const next = bestFrom(selectionPool.filter((candidate) => candidate.section.id === sectionId), true);
      if (next) add(next.candidate);
    }
  }

  while (selected.length < maximumSelections && selectedWords < wordBudget) {
    const next = bestFrom(selectionPool, selected.length === 0);
    if (!next || (selected.length > 0 && next.score <= 0)) break;
    add(next.candidate);
  }

  if (selected.length === 0) {
    const first = bestFrom(selectionPool, true);
    if (first) add(first.candidate);
  }

  return selected.sort((left, right) => left.block.sourceOrder - right.block.sourceOrder || left.blockSentenceIndex - right.blockSentenceIndex);
}

function planSummaries(blocks: readonly MarkdownBlock[], options: SelectionOptions): readonly ExtractiveSummary[] {
  const sections = buildSections(blocks);
  const candidates = createCandidates(sections);
  const selected = selectCandidates(candidates, options);
  const bySection = new Map<string, Candidate[]>();
  for (const candidate of selected) {
    const list = bySection.get(candidate.section.id) ?? [];
    list.push(candidate);
    bySection.set(candidate.section.id, list);
  }
  return sections.flatMap((section) => {
    const sectionCandidates = bySection.get(section.id);
    if (!sectionCandidates?.length) return [];
    const anchor = section.blocks.find((block) => options.targetBlockIds.has(block.id)) ?? sectionCandidates[0]?.block;
    if (!anchor) return [];
    return [{
      block: anchor,
      markdown: sectionCandidates
        .sort((left, right) => left.block.sourceOrder - right.block.sourceOrder || left.blockSentenceIndex - right.blockSentenceIndex)
        .map((candidate) => candidate.sentence)
        .join(' '),
    }];
  });
}

function perBlockSummaries(
  blocks: readonly MarkdownBlock[],
  targetBlockIds: ReadonlySet<string>,
  detail: number,
  title?: string,
): readonly ExtractiveSummary[] {
  const sections = buildSections(blocks);
  const candidates = createCandidates(sections);
  const scores = candidateScores(candidates, title);
  const normalizedDetail = clamp(Math.round(detail), 0, 99) / 100;
  return blocks
    .filter((block) => block.kind === 'summarizable' && targetBlockIds.has(block.id))
    .flatMap((block) => {
      const blockCandidates = candidates.filter((candidate) => candidate.block.id === block.id);
      if (blockCandidates.length === 0) return [];
      const selectionCount = Math.max(1, Math.ceil(blockCandidates.length * normalizedDetail));
      const selected: Candidate[] = [];
      while (selected.length < selectionCount && selected.length < blockCandidates.length) {
        const next = blockCandidates
          .filter((candidate) => !selected.includes(candidate))
          .sort((left, right) => {
            const rank = (candidate: Candidate): number => {
              const staticScore = scores.get(candidate) ?? { salience: 0, informationDensity: 0, distinctiveness: 0 };
              return 0.72 * staticScore.salience
                + 0.12 * staticScore.informationDensity
                + 0.10 * lengthQuality(candidate.wordCount)
                - 0.42 * Math.max(0, ...selected.map((chosen) => candidateSimilarity(candidate, chosen)));
            };
            return rank(right) - rank(left) || left.blockSentenceIndex - right.blockSentenceIndex;
          })[0];
        if (!next) break;
        selected.push(next);
      }
      return selected.length
        ? [{
          block,
          markdown: selected
            .sort((left, right) => left.blockSentenceIndex - right.blockSentenceIndex)
            .map((candidate) => candidate.sentence)
            .join(' '),
        }]
        : [];
    });
}

export function extractiveSummaries(
  blocks: readonly MarkdownBlock[],
  detail: number,
): readonly ExtractiveSummary[] {
  const targetBlockIds = new Set(blocks.filter((block) => block.kind === 'summarizable').map((block) => block.id));
  if (detail >= 100 || targetBlockIds.size === 0) return [];
  return perBlockSummaries(blocks, targetBlockIds, detail);
}

export function createStructureAwareExtractiveSummaries(
  blocks: readonly MarkdownBlock[],
  targetBlockIds: ReadonlySet<string>,
  detail: number,
  title?: string,
): readonly ExtractiveSummary[] {
  if (detail >= 100 || targetBlockIds.size === 0) return [];
  if (targetBlockIds.size <= 2 && detail <= 15) return perBlockSummaries(blocks, targetBlockIds, detail, title);
  return planSummaries(blocks, {
    detail,
    targetBlockIds,
    ensureEachSection: false,
    ...(title === undefined ? {} : { title }),
  });
}

export function createGroundingEvidence(
  blocks: readonly MarkdownBlock[],
  maxWords = 140,
  title?: string,
): string {
  const targetBlockIds = new Set(blocks.filter((block) => block.kind === 'summarizable').map((block) => block.id));
  if (targetBlockIds.size === 0 || maxWords <= 0) return '';
  const sections = buildSections(blocks);
  const candidates = createCandidates(sections);
  const selected = selectCandidates(candidates, {
    detail: 0,
    targetBlockIds,
    ensureEachSection: false,
    wordBudgetOverride: maxWords,
    ...(title === undefined ? {} : { title }),
  });
  return selected.map((candidate) => `- [${candidate.block.id}] ${candidate.sentence}`).join('\n');
}
