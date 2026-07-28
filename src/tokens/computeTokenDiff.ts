import type {
  Token,
  TokenDiffEntry,
  TokenDiffResult,
  ThemeVersion,
} from './types'

/**
 * Compute the diff between two theme versions.
 *
 * Tokens are matched by **name** (the CSS variable name). The comparison
 * intentionally does NOT normalize colour formats — `"#ff0000"` and
 * `"rgb(255, 0, 0)"` are treated as different values because a format change
 * is, itself, a meaningful token change in design systems.
 *
 * The output is stable: entries are sorted by status (added, removed, changed)
 * first, then alphabetically by name within each group.
 *
 * Whitespace at the edges is ignored (`trim()`) so trailing semicolons and
 * accidental line breaks do not produce false "changed" results.
 */
export function computeTokenDiff(
  versionA: ThemeVersion,
  versionB: ThemeVersion,
): TokenDiffResult {
  const mapA = new Map<string, Token>()
  for (const token of versionA.tokens) {
    mapA.set(token.name, token)
  }

  const mapB = new Map<string, Token>()
  for (const token of versionB.tokens) {
    mapB.set(token.name, token)
  }

  const entries: TokenDiffEntry[] = []

  // Tokens that exist in B (won't be missing from A → covers added + changed).
  for (const token of mapB.values()) {
    const counterpart = mapA.get(token.name)
    if (!counterpart) {
      entries.push({
        name: token.name,
        category: token.category,
        cssType: token.cssType,
        status: 'added',
        after: token,
      })
      continue
    }
    if (counterpart.value.trim() !== token.value.trim()) {
      entries.push({
        name: token.name,
        category: token.category,
        cssType: token.cssType,
        status: 'changed',
        before: counterpart,
        after: token,
      })
    }
  }

  // Tokens that exist only in A → removed.
  for (const token of mapA.values()) {
    if (mapB.has(token.name)) continue
    entries.push({
      name: token.name,
      category: token.category,
      cssType: token.cssType,
      status: 'removed',
      before: token,
    })
  }

  // Stable sort: by status group, then alphabetically by name.
  const statusOrder: Record<string, number> = { added: 0, removed: 1, changed: 2 }
  entries.sort((a, b) => {
    const groupDiff = statusOrder[a.status] - statusOrder[b.status]
    if (groupDiff !== 0) return groupDiff
    return a.name.localeCompare(b.name)
  })

  const summary = {
    added: entries.filter((e) => e.status === 'added').length,
    removed: entries.filter((e) => e.status === 'removed').length,
    changed: entries.filter((e) => e.status === 'changed').length,
  }

  return {
    versionA,
    versionB,
    entries,
    summary,
  }
}

/**
 * Filter a diff result by token category. Pass `'all'` to keep every entry.
 * The returned list preserves the input's order.
 */
export function filterDiffByCategory(
  diff: TokenDiffResult,
  category: 'all' | TokenDiffEntry['category'],
): TokenDiffEntry[] {
  if (category === 'all') return diff.entries
  return diff.entries.filter((entry) => entry.category === category)
}
