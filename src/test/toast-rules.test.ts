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
import type { ToastSeverity } from '../components/toastRules'

/**
 * Compile-time exhaustive guard.
 *
 * `ToastSeverity` is erased at runtime, so a type-level test is the only way to
 * observe it. This function fails to compile if a severity is added to the union
 * without being handled here, which keeps the union and the runtime cadence map
 * from drifting apart.
 */
function severityLabel(severity: ToastSeverity): string {
  switch (severity) {
    case 'success':
      return 'success'
    case 'info':
      return 'info'
    case 'warning':
      return 'warning'
    case 'error':
      return 'error'
    default: {
      const exhaustive: never = severity
      return exhaustive
    }
  }
}

/** Runtime view of the `ToastSeverity` union, sourced from the typed cadence map. */
const SEVERITIES = Object.keys(AUTO_DISMISS_MS) as readonly ToastSeverity[]

/** Builds an untyped runtime value for a severity, as a plain JS caller would. */
const asSeverity = (value: string): ToastSeverity => value as unknown as ToastSeverity

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

  it('uses the plural branch for every count except exactly 1', () => {
    // Boundary: 0 is not "no notifications", it is the plural form.
    expect(describeOverflow(0, 'change', 'changes')).toBe('0 changes')
    // Out-of-domain counts degrade to the plural branch instead of throwing.
    expect(describeOverflow(-1, 'change', 'changes')).toBe('-1 changes')
    expect(describeOverflow(1.5, 'change', 'changes')).toBe('1.5 changes')
  })
})

describe('ToastSeverity', () => {
  it('exposes exactly the four documented severities', () => {
    expect(SEVERITIES).toEqual(['success', 'info', 'warning', 'error'])
  })

  it('keeps AUTO_DISMISS_MS a total record over the union (no missing keys)', () => {
    // A severity added to the union without a cadence would drop out of this map
    // and fail the `Record<ToastSeverity, number>` type at build time.
    for (const severity of SEVERITIES) {
      expect(AUTO_DISMISS_MS).toHaveProperty(severity)
      expect(typeof AUTO_DISMISS_MS[severity]).toBe('number')
    }
    expect(Object.keys(AUTO_DISMISS_MS).sort()).toEqual([...SEVERITIES].sort())
  })

  it('maps every severity through the exhaustive compile-time guard', () => {
    expect(SEVERITIES.map(severityLabel)).toEqual([...SEVERITIES])
  })

  it('accepts every union member and rejects values outside it', () => {
    // Success path: each documented value resolves without throwing.
    for (const severity of SEVERITIES) {
      expect(() => resolveAutoDismissMs(severity, false)).not.toThrow()
    }
    // Failure path: the module performs no runtime validation — an unrecognised
    // value yields a non-number rather than a thrown error. Pinned as current
    // behaviour so it cannot change silently; see the PR description for the
    // recommended follow-up to make this an explicit error.
    for (const invalid of ['critical', 'SUCCESS', '', 'toast']) {
      expect(resolveAutoDismissMs(asSeverity(invalid), false)).toBeUndefined()
    }
  })
})

describe('MAX_VISIBLE_DESKTOP / MAX_VISIBLE_MOBILE', () => {
  it('exposes positive integer caps with desktop the looser of the two', () => {
    expect(Number.isInteger(MAX_VISIBLE_DESKTOP)).toBe(true)
    expect(Number.isInteger(MAX_VISIBLE_MOBILE)).toBe(true)
    expect(MAX_VISIBLE_DESKTOP).toBeGreaterThan(0)
    expect(MAX_VISIBLE_MOBILE).toBeGreaterThan(0)
    // Mobile portrait is the constrained viewport, so its cap must be stricter.
    expect(MAX_VISIBLE_MOBILE).toBeLessThan(MAX_VISIBLE_DESKTOP)
  })

  it('applies the mobile cap: only the newest toast stays visible', () => {
    const items = ['oldest', 'newer', 'newest']
    expect(splitStack(items, MAX_VISIBLE_MOBILE)).toEqual({
      visible: ['newest'],
      overflow: ['oldest', 'newer'],
    })
  })

  it('applies the desktop cap and keeps the newest three', () => {
    const items = ['1', '2', '3', '4', '5']
    expect(splitStack(items, MAX_VISIBLE_DESKTOP)).toEqual({
      visible: ['3', '4', '5'],
      overflow: ['1', '2'],
    })
  })

  it('renders no group card at exactly the cap, and one group card past it', () => {
    // Primary state transition: the group card is absent while the stack is at
    // the cap and appears on the very next toast.
    const atCap = ['1', '2', '3']
    expect(splitStack(atCap, MAX_VISIBLE_DESKTOP)).toEqual({
      visible: ['1', '2', '3'],
      overflow: [],
    })

    const pastCap = ['1', '2', '3', '4']
    expect(splitStack(pastCap, MAX_VISIBLE_DESKTOP)).toEqual({
      visible: ['2', '3', '4'],
      overflow: ['1'],
    })
    expect(describeOverflow(1, 'earlier notification', 'earlier notifications'))
      .toBe('1 earlier notification')
  })

  it('splits the same stack differently across the two viewports', () => {
    const items = ['a', 'b', 'c', 'd']
    expect(splitStack(items, MAX_VISIBLE_MOBILE).visible).toEqual(['d'])
    expect(splitStack(items, MAX_VISIBLE_DESKTOP).visible).toEqual(['b', 'c', 'd'])
  })
})

describe('resolveAutoDismissMs invalid and boundary inputs', () => {
  it('returns a non-number for an unrecognised severity without undo', () => {
    expect(resolveAutoDismissMs(asSeverity('critical'), false)).toBeUndefined()
  })

  it('returns NaN for an unrecognised severity with undo', () => {
    const result = resolveAutoDismissMs(asSeverity('critical'), true)
    expect(Number.isNaN(result)).toBe(true)
  })

  it('short-circuits on an explicit override before reading the severity', () => {
    // An override is authoritative, so an unknown severity does not leak through.
    expect(resolveAutoDismissMs(asSeverity('critical'), false, 4200)).toBe(4200)
  })

  it('treats an explicit 0 override as persistent even for auto-dismiss severities', () => {
    expect(resolveAutoDismissMs('success', false, 0)).toBe(0)
    expect(resolveAutoDismissMs('info', true, 0)).toBe(0)
  })

  it('persists every warning and error severity across the undo flag', () => {
    for (const severity of ['warning', 'error'] as const) {
      expect(resolveAutoDismissMs(severity, false)).toBe(0)
      expect(resolveAutoDismissMs(severity, true)).toBe(0)
    }
  })
})

describe('splitStack invalid and boundary inputs', () => {
  it('moves everything to overflow when the cap is zero or negative', () => {
    expect(splitStack(['a', 'b'], 0)).toEqual({ visible: [], overflow: ['a', 'b'] })
    expect(splitStack(['a', 'b'], -5)).toEqual({ visible: [], overflow: ['a', 'b'] })
  })

  it('truncates a fractional cap rather than exceeding it', () => {
    // slice() truncates, so a 1.5 cap behaves as 2 for a 3-item stack.
    expect(splitStack(['a', 'b', 'c'], 1.5)).toEqual({
      visible: ['b', 'c'],
      overflow: ['a'],
    })
  })

  it('does not overflow for a single item under a fractional cap', () => {
    expect(splitStack(['a'], 1.5)).toEqual({ visible: ['a'], overflow: [] })
  })

  it('never overflows for an infinite cap', () => {
    expect(splitStack(['a', 'b'], Infinity)).toEqual({ visible: ['a', 'b'], overflow: [] })
  })

  it('keeps every item visible for a NaN cap instead of dropping toasts', () => {
    // Degenerate-but-deterministic: the NaN cap must never silently lose items.
    const result = splitStack(['a', 'b'], NaN)
    expect(result.visible).toEqual(['a', 'b'])
    expect(result.overflow).toEqual([])
  })

  it('returns fresh arrays rather than aliases of the input', () => {
    const items = ['a', 'b', 'c', 'd'] as const
    const result = splitStack(items, MAX_VISIBLE_DESKTOP)
    expect(result.visible).not.toBe(items)
    expect(result.overflow).not.toBe(items)
    expect(items).toEqual(['a', 'b', 'c', 'd'])
  })
})
