/**
 * Tests for `computeTokenDiff` and `filterDiffByCategory`.
 *
 * The diff function is the heart of the tokens-diff-viewer feature; it must
 * accurately classify every exit state and produce a stable ordering.
 */

import { describe, it, expect } from 'vitest'
import type { ThemeVersion, Token } from './types'
import { computeTokenDiff, filterDiffByCategory } from './computeTokenDiff'
import { VERSION_A, VERSION_B } from './themeTokens'

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeToken(name: string, value: string, category: Token['category'] = 'background'): Token {
  return { name, value, category, cssType: 'color' }
}

function makeVersion(id: string, tokens: Token[]): ThemeVersion {
  return {
    id,
    name: id,
    description: '',
    releasedAt: '2026-01-01',
    tokens,
  }
}

// ─── Summary counts ─────────────────────────────────────────────────────────

describe('computeTokenDiff — summary', () => {
  it('reports zero counts for identical versions', () => {
    const v = makeVersion('v', [makeToken('--bg', '#000'), makeToken('--text', '#fff')])
    const diff = computeTokenDiff(v, v)
    expect(diff.summary).toEqual({ added: 0, removed: 0, changed: 0 })
    expect(diff.entries).toEqual([])
  })

  it('reports ADDED count when B contains tokens not in A', () => {
    const a = makeVersion('a', [makeToken('--bg', '#000')])
    const b = makeVersion('b', [makeToken('--bg', '#000'), makeToken('--accent', '#0f0')])
    const diff = computeTokenDiff(a, b)
    expect(diff.summary.added).toBe(1)
    expect(diff.summary.removed).toBe(0)
    expect(diff.summary.changed).toBe(0)
  })

  it('reports REMOVED count when A contains tokens not in B', () => {
    const a = makeVersion('a', [makeToken('--bg', '#000'), makeToken('--legacy', '#abc')])
    const b = makeVersion('b', [makeToken('--bg', '#000')])
    const diff = computeTokenDiff(a, b)
    expect(diff.summary.removed).toBe(1)
    expect(diff.summary.added).toBe(0)
    expect(diff.summary.changed).toBe(0)
  })

  it('reports CHANGED count when same-named tokens have different values', () => {
    const a = makeVersion('a', [makeToken('--bg', '#000'), makeToken('--accent', '#0f0')])
    const b = makeVersion('b', [makeToken('--bg', '#fff'), makeToken('--accent', '#0f0')])
    const diff = computeTokenDiff(a, b)
    expect(diff.summary.changed).toBe(1)
    expect(diff.summary.added).toBe(0)
    expect(diff.summary.removed).toBe(0)
  })
})

// ─── Entry classification ────────────────────────────────────────────────────

describe('computeTokenDiff — entry data', () => {
  it('marks an ADDED entry with no `before` and a populated `after`', () => {
    const a = makeVersion('a', [])
    const b = makeVersion('b', [makeToken('--accent', '#5eead4', 'accent')])
    const diff = computeTokenDiff(a, b)
    expect(diff.entries).toHaveLength(1)
    const entry = diff.entries[0]
    expect(entry.status).toBe('added')
    expect(entry.before).toBeUndefined()
    expect(entry.after).toEqual(makeToken('--accent', '#5eead4', 'accent'))
    expect(entry.category).toBe('accent')
  })

  it('marks a REMOVED entry with a populated `before` and no `after`', () => {
    const a = makeVersion('a', [makeToken('--legacy', '#abc', 'background')])
    const b = makeVersion('b', [])
    const diff = computeTokenDiff(a, b)
    expect(diff.entries).toHaveLength(1)
    const entry = diff.entries[0]
    expect(entry.status).toBe('removed')
    expect(entry.before).toEqual(makeToken('--legacy', '#abc', 'background'))
    expect(entry.after).toBeUndefined()
  })

  it('marks a CHANGED entry with both `before` and `after` populated', () => {
    const a = makeVersion('a', [makeToken('--bg', '#07111f', 'background')])
    const b = makeVersion('b', [makeToken('--bg', '#082340', 'background')])
    const diff = computeTokenDiff(a, b)
    expect(diff.entries).toHaveLength(1)
    const entry = diff.entries[0]
    expect(entry.status).toBe('changed')
    expect(entry.before).toEqual(makeToken('--bg', '#07111f', 'background'))
    expect(entry.after).toEqual(makeToken('--bg', '#082340', 'background'))
  })

  it('propagates category and cssType on every entry', () => {
    const tokenRem: Token = { name: '--rem', value: '1rem', category: 'spacing', cssType: 'length' }
    const tokenAdd: Token = { name: '--add', value: '2rem', category: 'spacing', cssType: 'length' }
    const a = makeVersion('a', [tokenRem])
    const b = makeVersion('b', [tokenAdd])
    const diff = computeTokenDiff(a, b)
    const rem = diff.entries.find((e) => e.status === 'removed')!
    const add = diff.entries.find((e) => e.status === 'added')!
    expect(rem.category).toBe('spacing')
    expect(rem.cssType).toBe('length')
    expect(add.category).toBe('spacing')
    expect(add.cssType).toBe('length')
  })
})

// ─── Sorting ────────────────────────────────────────────────────────────────

describe('computeTokenDiff — ordering', () => {
  it('orders entries by status group then alphabetically by name', () => {
    const a = makeVersion('a', [
      makeToken('--zeta', '#1', 'accent'),
      makeToken('--alpha', '#2', 'accent'),
      makeToken('--mike', '#3', 'accent'),
    ])
    const b = makeVersion('b', [
      makeToken('--alpha', '#2', 'accent'), // unchanged
      makeToken('+delta', '#4', 'accent'), // added
      makeToken('+bravo', '#5', 'accent'), // added
      makeToken('~mike', '#33', 'accent'), // changed
    ])
    const diff = computeTokenDiff(a, b)
    const names = diff.entries.map((e) => e.name)
    // added group first: bravo, delta
    // removed group: zeta
    // changed group: mike
    expect(names).toEqual(['bravo', 'delta', 'zeta', 'mike'])
  })
})

// ─── Value comparison edge cases ────────────────────────────────────────────

describe('computeTokenDiff — value comparison edge cases', () => {
  it('treats trimmed-but-equal values as unchanged', () => {
    const a = makeVersion('a', [makeToken('--text', '#fff')])
    const b = makeVersion('b', [makeToken('--text', '  #fff  ')])
    const diff = computeTokenDiff(a, b)
    expect(diff.summary.changed).toBe(0)
    expect(diff.summary.added).toBe(0)
    expect(diff.summary.removed).toBe(0)
  })

  it('treats semantically-similar but lexically-different colours as CHANGED', () => {
    const a = makeVersion('a', [makeToken('--bg', '#ff0000')])
    const b = makeVersion('b', [makeToken('--bg', 'rgb(255, 0, 0)')])
    const diff = computeTokenDiff(a, b)
    expect(diff.summary.changed).toBe(1)
  })

  it('correctly diffs when both versions have multiple changed tokens', () => {
    const a = makeVersion('a', [
      makeToken('--space-1', '0.25rem', 'spacing'),
      makeToken('--space-2', '0.5rem', 'spacing'),
      makeToken('--space-4', '1rem', 'spacing'),
    ])
    const b = makeVersion('b', [
      makeToken('--space-1', '0.25rem', 'spacing'), // unchanged
      makeToken('--space-2', '0.4rem', 'spacing'), // changed
      makeToken('--space-4', '1.25rem', 'spacing'), // changed
    ])
    const diff = computeTokenDiff(a, b)
    expect(diff.summary).toEqual({ added: 0, removed: 0, changed: 2 })
    expect(diff.entries.map((e) => e.name).sort()).toEqual(['--space-2', '--space-4'])
  })
})

// ─── Mixed scenario from real data ───────────────────────────────────────────

describe('computeTokenDiff — mixed real-world scenario', () => {
  it('classifies the demo VERSION_A → VERSION_B correctly', () => {
    const diff = computeTokenDiff(VERSION_A, VERSION_B)

    // Spot-check counts (derived manually from the fixture):
    //   added:    --focus-ring, --shadow-glow, --caution
    //   removed:  --accent-warm-strong, --warning, --density-comfortable-padding, --density-comfortable-gap
    //   changed:  --surface, --surface-strong, --surface-soft, --border, --border-strong,
    //             --text, --muted, --accent-strong, --accent-warm, --danger-soft,
    //             --text-xs, --text-sm, --leading-normal, --radius-sm, --radius-md,
    //             --density-badge-font, --shadow-lg
    expect(diff.summary.added).toBe(3)
    expect(diff.summary.removed).toBe(4)
    expect(diff.summary.changed).toBe(17)

    // All entries have valid statuses.
    for (const entry of diff.entries) {
      expect(['added', 'removed', 'changed']).toContain(entry.status)
      if (entry.status === 'added') {
        expect(entry.before).toBeUndefined()
        expect(entry.after).toBeDefined()
      }
      if (entry.status === 'removed') {
        expect(entry.before).toBeDefined()
        expect(entry.after).toBeUndefined()
      }
      if (entry.status === 'changed') {
        expect(entry.before).toBeDefined()
        expect(entry.after).toBeDefined()
      }
    }
  })
})

// ─── filterDiffByCategory ────────────────────────────────────────────────────

describe('filterDiffByCategory', () => {
  it('returns all entries when category is "all"', () => {
    const a = makeVersion('a', [makeToken('--bg', '#000', 'background'), makeToken('--accent', '#0f0', 'accent')])
    const b = makeVersion('b', [
      makeToken('--bg', '#fff', 'background'),
      makeToken('--accent', '#0f0', 'accent'),
      makeToken('--legacy', '#abc', 'background'), // added
    ])
    const diff = computeTokenDiff(a, b)
    expect(filterDiffByCategory(diff, 'all')).toHaveLength(diff.entries.length)
  })

  it('keeps only entries whose category matches', () => {
    const a = makeVersion('a', [makeToken('--bg', '#000', 'background'), makeToken('--accent', '#0f0', 'accent')])
    const b = makeVersion('b', [makeToken('--bg', '#fff', 'background'), makeToken('--accent', '#0f0', 'accent')])
    const diff = computeTokenDiff(a, b)
    const backgroundOnly = filterDiffByCategory(diff, 'background')
    expect(backgroundOnly).toHaveLength(1)
    expect(backgroundOnly[0].name).toBe('--bg')
    expect(backgroundOnly[0].status).toBe('changed')
  })

  it('returns an empty array when no entry in the diff matches the category', () => {
    const a = makeVersion('a', [makeToken('--bg', '#000', 'background')])
    const b = makeVersion('b', [makeToken('--bg', '#fff', 'background')])
    const diff = computeTokenDiff(a, b)
    const radiusOnly = filterDiffByCategory(diff, 'radius')
    expect(radiusOnly).toEqual([])
  })
})
