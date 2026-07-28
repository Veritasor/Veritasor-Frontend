import { render, screen, act, fireEvent, within } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  ToastProvider,
  useToast,
  MAX_VISIBLE_TOASTS,
  COLLAPSE_THRESHOLD,
  DEFAULT_CADENCE_MS,
  UNDO_EXTENDED_CADENCE_MS,
  resolveDuration,
} from '../components/ToastContext'
import ToastContainer from '../components/ToastContainer'
import { MemoryRouter } from 'react-router-dom'
import { CookieConsentProvider } from '../components/CookieConsentContext'

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function TestTrigger() {
  const { addToast } = useToast()
  return (
    <div>
      <button onClick={() => addToast('Success message', 'success')}>Trigger Success</button>
      <button onClick={() => addToast('Info message', 'info')}>Trigger Info</button>
      <button onClick={() => addToast('Warning message', 'warning')}>Trigger Warning</button>
      <button onClick={() => addToast('Error message', 'error')}>Trigger Error</button>
      <button onClick={() => addToast('Custom duration', 'success', 1000)}>Trigger Custom</button>
      <button onClick={() => addToast('Stack 1', 'success')}>Stack 1</button>
      <button onClick={() => addToast('Stack 2', 'success')}>Stack 2</button>
      <button onClick={() => addToast('Stack 3', 'success')}>Stack 3</button>
      <button onClick={() => addToast('Stack 4', 'success')}>Stack 4</button>
      <button onClick={() => addToast('Stack 5', 'success')}>Stack 5</button>
      <button onClick={() => addToast('Stack 6', 'success')}>Stack 6</button>
    </div>
  )
}

function UndoableTrigger({ onUndo }: { onUndo: () => void }) {
  const { addToast } = useToast()
  return (
    <button
      onClick={() =>
        addToast('Undoable action', 'info', undefined, onUndo, 'Undo Now')
      }
    >
      Trigger Undo
    </button>
  )
}

function renderSystem() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <ToastProvider>
        <CookieConsentProvider>
          <TestTrigger />
          <ToastContainer />
        </CookieConsentProvider>
      </ToastProvider>
    </MemoryRouter>,
  )
}

function renderUndoable(onUndo: () => void) {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <ToastProvider>
        <CookieConsentProvider>
          <UndoableTrigger onUndo={onUndo} />
          <ToastContainer />
        </CookieConsentProvider>
      </ToastProvider>
    </MemoryRouter>,
  )
}

// ---------------------------------------------------------------------------
// Pure helper coverage
// ---------------------------------------------------------------------------

describe('resolveDuration', () => {
  it('returns the explicit duration when provided', () => {
    expect(resolveDuration('success', 1234, false)).toBe(1234)
    expect(resolveDuration('error', 0, false)).toBe(0)
  })

  it('clamps negative durations to zero (persist behavior)', () => {
    expect(resolveDuration('warning', -50, false)).toBe(0)
  })

  it('uses default cadence for success/info when duration is undefined', () => {
    expect(resolveDuration('success', undefined, false)).toBe(DEFAULT_CADENCE_MS.success)
    expect(resolveDuration('info', undefined, false)).toBe(DEFAULT_CADENCE_MS.info)
  })

  it('extends info cadence when toast has an undo callback', () => {
    expect(resolveDuration('info', undefined, true)).toBe(UNDO_EXTENDED_CADENCE_MS)
  })

  it('does not extend non-info severities with undo', () => {
    expect(resolveDuration('success', undefined, true)).toBe(DEFAULT_CADENCE_MS.success)
  })

  it('persists warning and error toasts', () => {
    expect(resolveDuration('warning', undefined, false)).toBe(0)
    expect(resolveDuration('warning', undefined, true)).toBe(0)
    expect(resolveDuration('error', undefined, false)).toBe(0)
    expect(resolveDuration('error', undefined, true)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Core toast behavior
// ---------------------------------------------------------------------------

describe('Toast Notification System', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders ToastContainer and triggers different toast types', () => {
    renderSystem()

    expect(screen.queryByText('Success message')).not.toBeInTheDocument()

    const successBtn = screen.getByRole('button', { name: /trigger success/i })
    act(() => successBtn.click())
    const successToast = screen.getByText('Success message')
    expect(successToast).toBeInTheDocument()
    expect(successToast.closest('.toast')).toHaveClass('toast-success')
    expect(successToast.closest('.toast')).toHaveAttribute('role', 'status')

    const errorBtn = screen.getByRole('button', { name: /trigger error/i })
    act(() => errorBtn.click())
    const errorToast = screen.getByText('Error message')
    expect(errorToast).toBeInTheDocument()
    expect(errorToast.closest('.toast')).toHaveClass('toast-error')
    expect(errorToast.closest('.toast')).toHaveAttribute('role', 'alert')
  })

  it('auto-dismisses success and info toasts but persists warning and error toasts', () => {
    renderSystem()

    act(() => {
      screen.getByRole('button', { name: /trigger success/i }).click()
      screen.getByRole('button', { name: /trigger error/i }).click()
    })

    expect(screen.getByText('Success message')).toBeInTheDocument()
    expect(screen.getByText('Error message')).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(5000))
    expect(screen.queryByText('Success message')).not.toBeInTheDocument()
    expect(screen.getByText('Error message')).toBeInTheDocument()
  })

  it('allows manual dismiss of toasts via close button', () => {
    renderSystem()

    act(() => screen.getByRole('button', { name: /trigger warning/i }).click())
    expect(screen.getByText('Warning message')).toBeInTheDocument()

    const closeBtn = screen.getByRole('button', { name: /close notification/i })
    act(() => closeBtn.click())
    expect(screen.queryByText('Warning message')).not.toBeInTheDocument()
  })

  it('supports custom durations', () => {
    renderSystem()

    act(() => screen.getByRole('button', { name: /trigger custom/i }).click())
    expect(screen.getByText('Custom duration')).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(500))
    expect(screen.getByText('Custom duration')).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(500))
    expect(screen.queryByText('Custom duration')).not.toBeInTheDocument()
  })

  it('triggers undo action when Undo button is clicked and dismisses toast', () => {
    const undoSpy = vi.fn()
    renderUndoable(undoSpy)

    act(() => screen.getByRole('button', { name: /trigger undo/i }).click())

    const undoBtn = screen.getByRole('button', { name: /undo now/i })
    expect(undoBtn).toBeInTheDocument()

    act(() => undoBtn.click())
    expect(undoSpy).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('Undoable action')).not.toBeInTheDocument()
  })

  it('extends timer on hover and resumes on leave', () => {
    renderSystem()

    act(() => screen.getByRole('button', { name: /trigger success/i }).click())

    const toastEl = screen.getByText('Success message').closest('.toast') as HTMLElement
    expect(toastEl).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(2000))
    expect(screen.getByText('Success message')).toBeInTheDocument()

    act(() => fireEvent.mouseEnter(toastEl))
    act(() => vi.advanceTimersByTime(4000))
    expect(screen.getByText('Success message')).toBeInTheDocument()

    act(() => fireEvent.mouseLeave(toastEl))
    act(() => vi.advanceTimersByTime(1000))
    expect(screen.getByText('Success message')).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(2000))
    expect(screen.queryByText('Success message')).not.toBeInTheDocument()
  })

  it('pauses timer on focus and resumes on blur', () => {
    renderSystem()

    act(() => screen.getByRole('button', { name: /trigger success/i }).click())

    const closeBtn = screen.getByRole('button', { name: /close notification/i })
    act(() => closeBtn.focus())
    act(() => vi.advanceTimersByTime(6000))
    expect(screen.getByText('Success message')).toBeInTheDocument()

    act(() => closeBtn.blur())
    act(() => vi.advanceTimersByTime(5000))
    expect(screen.queryByText('Success message')).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Escape dismisses only the topmost toast
// ---------------------------------------------------------------------------

describe('Escape keystroke behavior (#292 stacking)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('dismisses only the topmost toast on Escape, leaving earlier ones untouched', () => {
    renderSystem()

    act(() => {
      screen.getByRole('button', { name: /trigger success/i }).click()
      screen.getByRole('button', { name: /trigger info/i }).click()
    })

    expect(screen.getByText('Success message')).toBeInTheDocument()
    expect(screen.getByText('Info message')).toBeInTheDocument()

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      // Allow exit animation (200ms) to complete before checking removal
      vi.advanceTimersByTime(250)
    })

    // Topmost (last inserted → Info) should be removed
    expect(screen.queryByText('Info message')).not.toBeInTheDocument()
    // Earlier toast (Success) survives
    expect(screen.getByText('Success message')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Stacking thresholds
// ---------------------------------------------------------------------------

describe('Toast stacking and collapse-to-group (#292)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders individually below the collapse threshold', () => {
    renderSystem()

    act(() => {
      screen.getByRole('button', { name: /^Stack 1$/i }).click()
      screen.getByRole('button', { name: /^Stack 2$/i }).click()
      screen.getByRole('button', { name: /^Stack 3$/i }).click()
    })

    expect(screen.queryByTestId('toast-group-summary')).not.toBeInTheDocument()
    expect(screen.getByText('Stack 1')).toBeInTheDocument()
    expect(screen.getByText('Stack 2')).toBeInTheDocument()
    expect(screen.getByText('Stack 3')).toBeInTheDocument()
  })

  it('collapses the oldest entry into a group summary once threshold is exceeded', () => {
    renderSystem()

    act(() => {
      for (let i = 1; i <= COLLAPSE_THRESHOLD; i += 1) {
        screen.getByRole('button', { name: new RegExp(`^Stack ${i}$`, 'i') }).click()
      }
    })

    const summary = screen.getByTestId('toast-group-summary')
    expect(summary).toBeInTheDocument()
    expect(summary).toHaveAttribute('data-count', '1')
    expect(summary).toHaveAttribute('aria-label', '1 more notification')

    // "Stack 1" should be collapsed (not individually rendered)
    expect(screen.queryByText('Stack 1')).not.toBeInTheDocument()
    // Newest 3 still visible
    expect(screen.getByText('Stack 2')).toBeInTheDocument()
    expect(screen.getByText('Stack 3')).toBeInTheDocument()
    expect(screen.getByText('Stack 4')).toBeInTheDocument()
  })

  it('keeps the count at MAX_VISIBLE_TOASTS for new inserts after collapse', () => {
    renderSystem()

    act(() => {
      for (let i = 1; i <= COLLAPSE_THRESHOLD + 2; i += 1) {
        screen.getByRole('button', { name: new RegExp(`^Stack ${i}$`, 'i') }).click()
      }
    })

    // With 6 toasts queued and MAX_VISIBLE_TOASTS=3, overflow = 6 - 3 = 3.
    const summary = screen.getByTestId('toast-group-summary')
    expect(summary).toHaveAttribute(
      'data-count',
      String(COLLAPSE_THRESHOLD + 2 - MAX_VISIBLE_TOASTS),
    )
    const individuallyRenderedToastCount =
      document.querySelectorAll('.toast[data-testid^="toast-item-"]').length
    expect(individuallyRenderedToastCount).toBe(MAX_VISIBLE_TOASTS)
  })

  it('renders the group summary with polite live-region attributes', () => {
    renderSystem()

    act(() => {
      for (let i = 1; i <= COLLAPSE_THRESHOLD; i += 1) {
        screen.getByRole('button', { name: new RegExp(`^Stack ${i}$`, 'i') }).click()
      }
    })

    const summary = screen.getByTestId('toast-group-summary')
    expect(summary).toHaveClass('toast-group')
    expect(summary).toHaveAttribute('role', 'status')
  })

  it('expands the group on "Show all" and reveals individual items', () => {
    renderSystem()

    act(() => {
      for (let i = 1; i <= COLLAPSE_THRESHOLD; i += 1) {
        screen.getByRole('button', { name: new RegExp(`^Stack ${i}$`, 'i') }).click()
      }
    })

    const showAll = screen.getByTestId('toast-group-show-all')
    act(() => showAll.click())

    expect(screen.getByText('Stack 1')).toBeInTheDocument()
    expect(screen.getByTestId('toast-group-list')).toBeInTheDocument()
    expect(showAll).toHaveAttribute('aria-expanded', 'true')
  })

  it('clears every toast when "Clear all" is clicked', () => {
    renderSystem()

    act(() => {
      for (let i = 1; i <= COLLAPSE_THRESHOLD; i += 1) {
        screen.getByRole('button', { name: new RegExp(`^Stack ${i}$`, 'i') }).click()
      }
    })

    const clear = screen.getByTestId('toast-group-clear')
    act(() => clear.click())
    // Allow dismissal exit animation
    act(() => vi.advanceTimersByTime(250))

    expect(screen.queryByTestId('toast-group-summary')).not.toBeInTheDocument()
    expect(screen.queryByText('Stack 4')).not.toBeInTheDocument()
    expect(document.querySelectorAll('[data-testid^="toast-item-"]').length).toBe(0)
  })

  it('individual list items can be dismissed from the expanded group', () => {
    renderSystem()

    act(() => {
      for (let i = 1; i <= COLLAPSE_THRESHOLD; i += 1) {
        screen.getByRole('button', { name: new RegExp(`^Stack ${i}$`, 'i') }).click()
      }
    })

    act(() => screen.getByTestId('toast-group-show-all').click())

    const list = screen.getByTestId('toast-group-list')
    const dismissButton = within(list)
      .getByRole('button', { name: /dismiss stack 1/i })
    act(() => dismissButton.click())

    expect(screen.queryByText('Stack 1')).not.toBeInTheDocument()
    expect(screen.getByText('Stack 2')).toBeInTheDocument()
  })

  it('promotes overflow items back into the visible stack when the topmost is dismissed', () => {
    renderSystem()

    act(() => {
      for (let i = 1; i <= COLLAPSE_THRESHOLD + 1; i += 1) {
        screen.getByRole('button', { name: new RegExp(`^Stack ${i}$`, 'i') }).click()
      }
    })

    const summaryBefore = screen.getByTestId('toast-group-summary')
    expect(summaryBefore).toHaveAttribute('data-count', '2')

    // Close the topmost-visible toast manually (Stack 5). queue drops to 4
    // (= COLLAPSE_THRESHOLD) so the strict-less-than check no longer applies
    // and overflow shrinks to 1 (Stack 1). Stack 3 was previously in overflow
    // and is now promoted back into the individually-rendered visible stack.
    const closeButtons = screen.getAllByRole('button', { name: /close notification/i })
    act(() => closeButtons[0].click())
    act(() => vi.advanceTimersByTime(250))

    expect(screen.queryByText('Stack 5')).not.toBeInTheDocument()
    const summaryAfter = screen.getByTestId('toast-group-summary')
    expect(summaryAfter).toHaveAttribute('data-count', '1')
    expect(screen.getByText('Stack 3')).toBeInTheDocument()
    expect(screen.queryByText('Stack 1')).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Undoable toasts default cadence extension
// ---------------------------------------------------------------------------

describe('Undoable toast default duration (#292)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('extends info toast duration when an undo callback is present', () => {
    renderUndoable(vi.fn())

    act(() => screen.getByRole('button', { name: /trigger undo/i }).click())

    // Should still be visible past default info window (5000ms).
    act(() => vi.advanceTimersByTime(6000))
    expect(screen.getByText('Undoable action')).toBeInTheDocument()

    // And gone after extended window (8000ms).
    act(() => vi.advanceTimersByTime(2200))
    expect(screen.queryByText('Undoable action')).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Motion
// ---------------------------------------------------------------------------

describe('Toast Motion', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('applies toast-entering class on mount', () => {
    renderSystem()
    act(() => screen.getByRole('button', { name: /trigger success/i }).click())
    expect(screen.getByText('Success message').closest('.toast')).toHaveClass('toast-entering')
  })

  it('transitions from toast-entering to idle after animation', () => {
    renderSystem()
    act(() => screen.getByRole('button', { name: /trigger success/i }).click())
    expect(screen.getByText('Success message').closest('.toast')).toHaveClass('toast-entering')
    act(() => vi.advanceTimersByTime(350))
    const idle = screen.getByText('Success message').closest('.toast')
    expect(idle).not.toHaveClass('toast-entering')
    expect(idle).not.toHaveClass('toast-exiting')
  })

  it('container renders with polite aria-live region', () => {
    renderSystem()
    act(() => screen.getByRole('button', { name: /trigger success/i }).click())
    const container = document.querySelector('.toast-container') as HTMLElement
    expect(container).toHaveAttribute('aria-live', 'polite')
    expect(container).toHaveAttribute('aria-atomic', 'false')
  })

  it('warning and error toasts use alert role', () => {
    renderSystem()
    act(() => {
      screen.getByRole('button', { name: /trigger warning/i }).click()
      screen.getByRole('button', { name: /trigger error/i }).click()
    })

    expect(screen.getByText('Warning message').closest('.toast')).toHaveAttribute('role', 'alert')
    expect(screen.getByText('Error message').closest('.toast')).toHaveAttribute('role', 'alert')
  })

  it('shows progress bar for auto-dismissing toasts', () => {
    renderSystem()
    act(() => screen.getByRole('button', { name: /trigger success/i }).click())
    expect(document.querySelector('.toast-progress-bar')).toBeInTheDocument()
  })

  it('does not show progress bar for persistent toasts', () => {
    renderSystem()
    act(() => screen.getByRole('button', { name: /trigger warning/i }).click())
    expect(document.querySelector('.toast-progress-bar')).not.toBeInTheDocument()
  })
})

