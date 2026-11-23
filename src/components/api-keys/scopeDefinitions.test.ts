/**
 * Test suite for scope definition utilities
 *
 * Tests for:
 *  - getScopeChangeType - broadening vs narrowing detection
 *  - getScopeLabels - human-readable scope label conversion
 *  - groupTriState - tri-state checkbox logic
 */

import { describe, expect, it } from 'vitest'
import {
  getScopeChangeType,
  getScopeLabels,
  groupTriState,
  SCOPE_GROUPS,
} from './scopeDefinitions'

// ─── getScopeChangeType ─────────────────────────────────────────────────────

describe('getScopeChangeType', () => {
  it('returns neutral when scopes are identical', () => {
    const result = getScopeChangeType(['read:attestations'], ['read:attestations'])
    expect(result).toBe('neutral')
  })

  it('returns broaden when adding write scope to read-only key', () => {
    const result = getScopeChangeType(['read:attestations'], ['read:attestations', 'write:attestations'])
    expect(result).toBe('broaden')
  })

  it('returns narrow when removing write scope from read-write key', () => {
    const result = getScopeChangeType(['read:attestations', 'write:attestations'], ['read:attestations'])
    expect(result).toBe('narrow')
  })

  it('returns broaden when adding write:keys (admin scope)', () => {
    const result = getScopeChangeType(['read:attestations'], ['read:attestations', 'write:keys'])
    expect(result).toBe('broaden')
  })

  it('returns narrow when removing write:keys from admin key', () => {
    const result = getScopeChangeType(['read:attestations', 'write:keys'], ['read:attestations'])
    expect(result).toBe('narrow')
  })

  it('returns broaden when only adding scopes', () => {
    const result = getScopeChangeType(['read:attestations'], ['read:attestations', 'read:sources', 'read:webhooks'])
    expect(result).toBe('broaden')
  })

  it('returns narrow when only removing scopes', () => {
    const result = getScopeChangeType(['read:attestations', 'read:sources', 'read:webhooks'], ['read:attestations'])
    expect(result).toBe('narrow')
  })

  it('returns neutral when swapping scopes of same privilege level', () => {
    const result = getScopeChangeType(['read:attestations'], ['read:sources'])
    expect(result).toBe('neutral')
  })

  it('returns broaden when adding higher privilege scope while removing lower', () => {
    const result = getScopeChangeType(['read:attestations'], ['write:attestations'])
    expect(result).toBe('broaden')
  })

  it('returns narrow when removing higher privilege scope while adding lower', () => {
    const result = getScopeChangeType(['write:attestations'], ['read:attestations'])
    expect(result).toBe('narrow')
  })

  it('handles empty arrays', () => {
    const result = getScopeChangeType([], ['read:attestations'])
    expect(result).toBe('broaden')
  })

  it('handles going to empty array', () => {
    const result = getScopeChangeType(['read:attestations'], [])
    expect(result).toBe('narrow')
  })
})

// ─── getScopeLabels ─────────────────────────────────────────────────────────

describe('getScopeLabels', () => {
  it('returns human-readable labels for scope IDs', () => {
    const result = getScopeLabels(['read:attestations', 'write:attestations'])
    expect(result).toEqual(['Read attestations', 'Write attestations'])
  })

  it('returns IDs for unknown scopes', () => {
    const result = getScopeLabels(['unknown:scope'])
    expect(result).toEqual(['unknown:scope'])
  })

  it('filters out empty strings', () => {
    const result = getScopeLabels(['read:attestations', ''])
    expect(result).toEqual(['Read attestations'])
  })

  it('handles empty array', () => {
    const result = getScopeLabels([])
    expect(result).toEqual([])
  })

  it('preserves order of input scope IDs', () => {
    const result = getScopeLabels(['write:attestations', 'read:attestations'])
    expect(result).toEqual(['Write attestations', 'Read attestations'])
  })
})

// ─── groupTriState ─────────────────────────────────────────────────────────

describe('groupTriState', () => {
  const attestationsGroup = SCOPE_GROUPS.find((g) => g.id === 'attestations')!

  it('returns none when no scopes selected', () => {
    const result = groupTriState(attestationsGroup, [])
    expect(result).toBe('none')
  })

  it('returns all when all scopes selected', () => {
    const result = groupTriState(attestationsGroup, ['read:attestations', 'write:attestations'])
    expect(result).toBe('all')
  })

  it('returns some when some scopes selected', () => {
    const result = groupTriState(attestationsGroup, ['read:attestations'])
    expect(result).toBe('some')
  })

  it('returns some when exactly half selected', () => {
    const result = groupTriState(attestationsGroup, ['write:attestations'])
    expect(result).toBe('some')
  })

  it('ignores scopes not in the group', () => {
    const result = groupTriState(attestationsGroup, ['read:sources'])
    expect(result).toBe('none')
  })

  it('returns all when group has extra scopes from other groups', () => {
    const result = groupTriState(attestationsGroup, ['read:attestations', 'write:attestations', 'read:sources'])
    expect(result).toBe('all')
  })
})
