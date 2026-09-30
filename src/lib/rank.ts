/**
 * Pure ranking core for hybrid search.
 *
 * No I/O lives here so both the memory search and the engine search can share
 * one set of rules, and so those rules can be tested without a database.
 */

/** Hits scoring below this are dropped from every result set. */
export const SCORE_FLOOR = 0.25;

export type SearchMode = "hybrid" | "semantic" | "keyword";

/**
 * Score a keyword hit. `query` must already be trimmed and lowercased.
 * Returns 0 when the query is absent so callers can filter non-matches out.
 */
export function keywordScore(content: string, query: string): number {
  if (!query) return 0;
  const text = content.toLowerCase();
  if (text === query) return 1;
  return text.includes(query) ? 0.9 : 0;
}

/**
 * Collapse duplicate hits keeping the highest score per key, sorted descending.
 */
export function mergeByBestScore<T>(
  hits: Iterable<T>,
  keyOf: (hit: T) => string,
  scoreOf: (hit: T) => number
): T[] {
  const byKey = new Map<string, T>();
  for (const hit of hits) {
    const key = keyOf(hit);
    const prev = byKey.get(key);
    if (!prev || scoreOf(hit) > scoreOf(prev)) byKey.set(key, hit);
  }
  return [...byKey.values()].sort((a, b) => scoreOf(b) - scoreOf(a));
}

/**
 * Report which retrieval paths actually contributed to the final results.
 * A path that ran but whose hits all got outscored is not reported, so the
 * mode describes the response rather than the attempt.
 */
export function resolveMode(
  mergedKeys: Iterable<string>,
  keywordKeys: ReadonlySet<string>,
  semanticKeys: ReadonlySet<string>
): SearchMode {
  let usedKeyword = false;
  let usedSemantic = false;

  for (const key of mergedKeys) {
    if (keywordKeys.has(key)) usedKeyword = true;
    if (semanticKeys.has(key)) usedSemantic = true;
  }

  if (usedKeyword && usedSemantic) return "hybrid";
  return usedSemantic ? "semantic" : "keyword";
}
