import type { SearchResult } from '@/types/search'

const DEFAULT_LIMIT = 8

/** 0 = exact label match, 1 = label starts with, 2 = label contains,
 * 3 = only the keyword blob (alt names, catalog id, ...) matched,
 * -1 = no match at all. */
function matchTier(label: string, keywords: string, query: string): number {
  if (label === query) return 0
  if (label.startsWith(query)) return 1
  if (label.includes(query)) return 2
  if (keywords.includes(query)) return 3
  return -1
}

/**
 * Ranks by match quality first (exact > prefix > substring > keyword-
 * only), then by each result's own `rank` within a tier. A plain
 * substring scan over a few thousand entries on every keystroke is
 * trivial — nowhere near the scale (40,000+ stars recomputed on a
 * timer) that needed a worker elsewhere in this app.
 */
export function searchObjects(
  index: SearchResult[],
  query: string,
  limit = DEFAULT_LIMIT,
): SearchResult[] {
  const trimmed = query.trim().toLowerCase()
  if (!trimmed) return []

  const matches: Array<{ result: SearchResult; tier: number }> = []
  for (const result of index) {
    const tier = matchTier(result.label.toLowerCase(), result.keywords, trimmed)
    if (tier >= 0) matches.push({ result, tier })
  }

  matches.sort((a, b) => a.tier - b.tier || a.result.rank - b.result.rank)
  return matches.slice(0, limit).map((match) => match.result)
}
