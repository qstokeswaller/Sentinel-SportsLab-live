/**
 * Client-side fuzzy search for small collections (programs, templates, etc.)
 * Mimics the smart search experience: exact match first, fuzzy fallback, "Did you mean?" suggestions.
 */

/** Simple trigram similarity (same concept as pg_trgm) */
function trigrams(s: string): Set<string> {
  const padded = `  ${s.toLowerCase()} `;
  const set = new Set<string>();
  for (let i = 0; i < padded.length - 2; i++) {
    set.add(padded.slice(i, i + 3));
  }
  return set;
}

function trigramSimilarity(a: string, b: string): number {
  const tA = trigrams(a);
  const tB = trigrams(b);
  let intersection = 0;
  tA.forEach(t => { if (tB.has(t)) intersection++; });
  const union = tA.size + tB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Match the query against each individual word in the searchable text and
 * return the highest per-word similarity. Without this, a 5-char query like
 * "swuat" gets compared against an 80+ char text ("FMS: Deep Squat — Tests …")
 * and the trigram overlap gets drowned by the long text's unrelated trigrams,
 * pushing the score below threshold. Per-word matching gives "swuat" a chance
 * to score directly against the word "squat" and find it.
 */
function bestWordSimilarity(query: string, text: string): number {
  // Whole-text similarity is still useful for longer multi-word queries
  // ("deep squat"), so we keep it as the baseline and only let per-word
  // matching push the score higher.
  const wholeText = trigramSimilarity(query, text);
  const words = text.toLowerCase().split(/[\s\-_:,.()/]+/).filter(w => w.length > 1);
  let best = wholeText;
  for (const w of words) {
    const sim = trigramSimilarity(query, w);
    if (sim > best) best = sim;
  }
  return best;
}

export interface FuzzyResult<T> {
  item: T;
  matchType: 'exact' | 'fuzzy';
  score: number;
}

export interface FuzzySearchResult<T> {
  results: T[];
  hasFuzzyResults: boolean;
  suggestions: { name: string; score: number }[];
}

/**
 * Search items with exact-first, fuzzy-fallback logic.
 * @param items - Array of items to search
 * @param query - Search string
 * @param getSearchText - Function to extract searchable text (can include tags, overview, etc.)
 * @param getDisplayName - Function to extract display name for suggestions (defaults to getSearchText)
 * @param threshold - Minimum trigram similarity to include in fuzzy results (default 0.15)
 */
export function fuzzySearch<T>(
  items: T[],
  query: string,
  getSearchText: (item: T) => string,
  getDisplayName?: (item: T) => string,
  threshold = 0.15,
): FuzzySearchResult<T> {
  const displayFn = getDisplayName ?? getSearchText;

  if (!query || !query.trim()) {
    return { results: items, hasFuzzyResults: false, suggestions: [] };
  }

  const q = query.toLowerCase().trim();

  // Phase 1: exact substring matches
  const exact = items.filter(item => getSearchText(item).toLowerCase().includes(q));

  if (exact.length > 0) {
    return { results: exact, hasFuzzyResults: false, suggestions: [] };
  }

  // Phase 2: fuzzy trigram matching, scored per-word so single-token typos
  // ("swuat" → "squat") don't get diluted by surrounding text in the
  // searchable string. See bestWordSimilarity above for the rationale.
  const scored: FuzzyResult<T>[] = items
    .map(item => ({
      item,
      matchType: 'fuzzy' as const,
      score: bestWordSimilarity(q, getSearchText(item)),
    }))
    .filter(r => r.score >= threshold)
    .sort((a, b) => b.score - a.score);

  const suggestions = scored
    .slice(0, 3)
    .filter(r => r.score > 0.2)
    .map(r => ({ name: displayFn(r.item), score: r.score }));

  return {
    results: scored.map(r => r.item),
    hasFuzzyResults: scored.length > 0,
    suggestions,
  };
}
