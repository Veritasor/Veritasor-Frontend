import { renderHook, act } from '@testing-library/react'
import { describe, expect, it, vi, afterEach } from 'vitest'
import { useReducedMotion } from '../hooks/useReducedMotion'

function mockMatchMedia(matches: boolean) {
  vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
    matches: query === '(prefers-reduced-motion: reduce)' ? matches : false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as MediaQueryList)
}

describe('useReducedMotion', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns false when prefers-reduced-motion does not match', () => {
    mockMatchMedia(false)
    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(false)
  })

  it('returns true when prefers-reduced-motion matches', () => {
    mockMatchMedia(true)
    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(true)
  })

  it('updates when the preference changes at runtime', () => {
    let matches = false
    let changeListener: ((e: { matches: boolean }) => void) | null = null
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
      matches: query === '(prefers-reduced-motion: reduce)' ? matches : false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: (_type: string, cb: (e: { matches: boolean }) => void) => {
        changeListener = cb
      },
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList)

    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(false)

    matches = true
    act(() => {
      changeListener?.({ matches: true })
    })
    expect(result.current).toBe(true)
  })

  it('falls back to false when matchMedia is unavailable', () => {
    const original = window.matchMedia
    // @ts-expect-error — simulating an environment without matchMedia
    delete window.matchMedia
    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(false)
    window.matchMedia = original
  })
})
