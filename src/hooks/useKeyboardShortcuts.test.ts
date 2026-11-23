import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useKeyboardShortcuts } from './useKeyboardShortcuts'

function fireKey(
  key: string,
  init: KeyboardEventInit = {},
  target: EventTarget = document,
) {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...init,
  })
  target.dispatchEvent(event)
  return event
}

describe('useKeyboardShortcuts', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('triggers modifier shortcuts: Shift+?, Ctrl/Cmd+H, Ctrl/Cmd+K, and Escape', () => {
    const onToggleShortcuts = vi.fn()
    const onOpenHelpSearch = vi.fn()
    const onOpenCommandPalette = vi.fn()
    const onCloseOverlay = vi.fn()

    renderHook(() =>
      useKeyboardShortcuts({
        onToggleShortcuts,
        onOpenHelpSearch,
        onOpenCommandPalette,
        onCloseOverlay,
      }),
    )

    act(() => {
      fireKey('?', { shiftKey: true })
      fireKey('h', { ctrlKey: true })
      fireKey('k', { metaKey: true })
      fireKey('Escape')
    })

    expect(onToggleShortcuts).toHaveBeenCalledTimes(1)
    expect(onOpenHelpSearch).toHaveBeenCalledTimes(1)
    expect(onOpenCommandPalette).toHaveBeenCalledTimes(1)
    expect(onCloseOverlay).toHaveBeenCalledTimes(1)
  })

  it('suppresses shortcuts when target is an input, textarea, select, or contentEditable', () => {
    const onToggleShortcuts = vi.fn()
    const onOpenCommandPalette = vi.fn()

    renderHook(() =>
      useKeyboardShortcuts({
        onToggleShortcuts,
        onOpenCommandPalette,
      }),
    )

    const input = document.createElement('input')
    const textarea = document.createElement('textarea')
    const select = document.createElement('select')
    const editable = document.createElement('div')
    editable.setAttribute('contenteditable', 'true')
    document.body.append(input, textarea, select, editable)

    act(() => {
      fireKey('?', { shiftKey: true }, input)
      fireKey('k', { ctrlKey: true }, textarea)
      fireKey('?', { shiftKey: true }, select)
      fireKey('k', { ctrlKey: true }, editable)
    })

    expect(onToggleShortcuts).not.toHaveBeenCalled()
    expect(onOpenCommandPalette).not.toHaveBeenCalled()

    input.remove()
    textarea.remove()
    select.remove()
    editable.remove()
  })

  it('handles Ctrl+K then W chord and resets on invalid follow-up or timeout', () => {
    const onOpenCommandPalette = vi.fn()
    const onWorkspaceJump = vi.fn()

    renderHook(() =>
      useKeyboardShortcuts(
        { onOpenCommandPalette, onWorkspaceJump },
        { timeoutMs: 500 },
      ),
    )

    act(() => {
      fireKey('k', { ctrlKey: true })
      fireKey('w')
    })
    expect(onOpenCommandPalette).toHaveBeenCalledTimes(1)
    expect(onWorkspaceJump).toHaveBeenCalledTimes(1)

    // Invalid follow-up resets chord
    act(() => {
      fireKey('k', { ctrlKey: true })
      fireKey('x')
      fireKey('w')
    })
    expect(onWorkspaceJump).toHaveBeenCalledTimes(1)

    // Timeout resets chord
    act(() => {
      fireKey('k', { ctrlKey: true })
      vi.advanceTimersByTime(600)
      fireKey('w')
    })
    expect(onWorkspaceJump).toHaveBeenCalledTimes(1)
  })

  it('handles sequential chords and resets when modifier is pressed or timer expires', () => {
    const onGoDashboard = vi.fn()

    renderHook(() =>
      useKeyboardShortcuts(
        { onGoDashboard },
        {
          timeoutMs: 500,
          registry: [
            {
              id: 'go-dashboard',
              label: 'Go to Dashboard',
              category: 'Navigation',
              keys: ['g', 'd'],
              type: 'sequence',
              sequence: ['g', 'd'],
              actionKey: 'onGoDashboard',
            },
          ],
        },
      ),
    )

    act(() => {
      fireKey('g')
      fireKey('d')
    })
    expect(onGoDashboard).toHaveBeenCalledTimes(1)

    // Modifier key cancels pending chord
    act(() => {
      fireKey('g')
      fireKey('d', { altKey: true })
      fireKey('d')
    })
    expect(onGoDashboard).toHaveBeenCalledTimes(1)

    // Invalid second key cancels pending chord
    act(() => {
      fireKey('g')
      fireKey('z')
    })
    expect(onGoDashboard).toHaveBeenCalledTimes(1)

    // Timeout cancels pending chord
    act(() => {
      fireKey('g')
      vi.advanceTimersByTime(600)
      fireKey('d')
    })
    expect(onGoDashboard).toHaveBeenCalledTimes(1)
  })

  it('does nothing when enabled is false', () => {
    const onCloseOverlay = vi.fn()
    renderHook(() =>
      useKeyboardShortcuts({ onCloseOverlay }, { enabled: false }),
    )

    act(() => {
      fireKey('Escape')
    })
    expect(onCloseOverlay).not.toHaveBeenCalled()
  })
})
