/**
 * Unit tests for the toast stacking rules module.
 *
 * These cover the pure selectors and constants in `src/components/toastRules.ts`
 * without relying on React's render tree. They complement the integration
 * tests in `src/test/toast.test.tsx`.
 */

import { describe, expect, it } from 'vitest'
import {
  AUTO_DISMISS_MS,
  MAX_VISIBLE_DESKTOP,
  MAX_VISIBLE_MOBILE,
  MOBILE_BREAKPOINT_QUERY,
  UNDO_EXTRA_MS,
  describeOverflow,
  resolveAutoDismissMs,
  splitStack,
} from '../components/toastRules'

describe('toastRules constants', () => {
  it('exposes the documented stack limits', () => {
    expect(MAX_VISIBLE_DESKTOP).toBe(3)
    expect(MAX_VISIBLE_MOBILE).toBe(1)
    expect(MOBILE_BREAKPOINT_QUERY).toBe('(max-width: 480px)')
  })

  it('exposes the documented auto-dismiss cadence per severity', () => {
    expect(AUTO_DISMISS_MS.success).toBe(5000)
    expect(AUTO_DISMISS_MS.info).toBe(5000)
    expect(AUTO_DISMISS_MS.warning).toBe(0)
    expect(AUTO_DISMISS_MS.error).toBe(0)
  })

  it('undo toasts extend the cadence by UNDO_EXTRA_MS', () => {
    expect(UNDO_EXTRA_MS).toBeGreaterThan(0)
  })
})

describe('resolveAutoDismissMs', () => {
  it('uses success and info 5s default when no undo', () => {
    expect(resolveAutoDismissMs('success', false)).toBe(5000)
    expect(resolveAutoDismissMs('info', false)).toBe(5000)
  })

  it('extends success and info cadence when undo is present', () => {
    expect(resolveAutoDismissMs('success', true)).toBe(5000 + UNDO_EXTRA_MS)
    expect(resolveAutoDismissMs('info', true)).toBe(5000 + UNDO_EXTRA_MS)
  })

  it('keeps warning and error persistent regardless of undo', () => {
    expect(resolveAutoDismissMs('warning', false)).toBe(0)
    expect(resolveAutoDismissMs('warning', true)).toBe(0)
    expect(resolveAutoDismissMs('error', false)).toBe(0)
    expect(resolveAutoDismissMs('error', true)).toBe(0)
  })

  it('honours an explicit duration override', () => {
    expect(resolveAutoDismissMs('success', false, 1234)).toBe(1234)
    expect(resolveAutoDismissMs('warning', false, 0)).toBe(0)
  })
})

describe('splitStack', () => {
  it('returns every item in the visible set when count is within the cap', () => {
    const items = ['a', 'b']
    const result = splitStack(items, 3)
    expect(result.visible).toEqual(['a', 'b'])
    expect(result.overflow).toEqual([])
  })

  it('keeps the newest N visible when overflowing', () => {
    const items = ['a', 'b', 'c', 'd']
    const result = splitStack(items, 3)
    expect(result.visible).toEqual(['b', 'c', 'd'])
    expect(result.overflow).toEqual(['a'])
  })

  it('collapses the entire stack into overflow when cap is zero or negative', () => {
    const items = ['a', 'b']
    expect(splitStack(items, 0)).toEqual({ visible: [], overflow: ['a', 'b'] })
    expect(splitStack(items, -1)).toEqual({ visible: [], overflow: ['a', 'b'] })
  })

  it('coerces to empty arrays when no items', () => {
    expect(splitStack([], 3)).toEqual({ visible: [], overflow: [] })
  })

  it('does not mutate the input array', () => {
    const items = ['a', 'b', 'c', 'd']
    const snapshot = [...items]
    splitStack(items, 3)
    expect(items).toEqual(snapshot)
  })
})

describe('describeOverflow', () => {
  it('produces singular copy for count === 1', () => {
    expect(describeOverflow(1, 'previous notification', 'previous notifications'))
      .toBe('1 previous notification')
  })

  it('produces plural copy for count > 1', () => {
    expect(describeOverflow(2, 'previous notification', 'previous notifications'))
      .toBe('2 previous notifications')
    expect(describeOverflow(7, 'undoable change', 'undoable changes'))
      .toBe('7 undoable changes')
  })
})
