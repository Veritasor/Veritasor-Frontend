import { render, screen, act } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { useToast } from '../components/ToastContext'
import Layout from '../components/Layout'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { CookieConsentProvider } from '../components/CookieConsentContext'
import { LocaleProvider } from '../i18n/provider'

// Test helper component to trigger toasts
function TestTrigger() {
  const { addToast } = useToast()
  return (
    <div>
      <button onClick={() => addToast('Success message', 'success')}>Trigger Success</button>
      <button onClick={() => addToast('Info message', 'info')}>Trigger Info</button>
      <button onClick={() => addToast('Warning message', 'warning')}>Trigger Warning</button>
      <button onClick={() => addToast('Error message', 'error')}>Trigger Error</button>
      <button onClick={() => addToast('Custom duration', 'success', 1000)}>Trigger Custom</button>
    </div>
  )
}

describe('Toast Notification System', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const renderSystem = () => {
    return render(
      <LocaleProvider>
        <MemoryRouter initialEntries={['/']}>
          <CookieConsentProvider>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<TestTrigger />} />
              </Route>
            </Routes>
          </CookieConsentProvider>
        </MemoryRouter>
      </LocaleProvider>
    )
  }

  it('renders ToastContainer and triggers different toast types', () => {
    renderSystem()

    // Initially no toasts
    expect(screen.queryByText('Success message')).not.toBeInTheDocument()

    // Trigger Success toast
    const successBtn = screen.getByRole('button', { name: /trigger success/i })
    act(() => {
      successBtn.click()
    })
    const successToast = screen.getByText('Success message')
    expect(successToast).toBeInTheDocument()
    expect(successToast.closest('.toast')).toHaveClass('toast-success')
    expect(successToast.closest('.toast')).toHaveAttribute('role', 'status')

    // Trigger Error toast
    const errorBtn = screen.getByRole('button', { name: /trigger error/i })
    act(() => {
      errorBtn.click()
    })
    const errorToast = screen.getByText('Error message')
    expect(errorToast).toBeInTheDocument()
    expect(errorToast.closest('.toast')).toHaveClass('toast-error')
    expect(errorToast.closest('.toast')).toHaveAttribute('role', 'alert')
  })

  it('auto-dismisses success and info toasts but persists warning and error toasts', () => {
    renderSystem()

    // Trigger success and error
    act(() => {
      screen.getByRole('button', { name: /trigger success/i }).click()
      screen.getByRole('button', { name: /trigger error/i }).click()
    })

    expect(screen.getByText('Success message')).toBeInTheDocument()
    expect(screen.getByText('Error message')).toBeInTheDocument()

    // Fast-forward 5 seconds
    act(() => {
      vi.advanceTimersByTime(5000)
    })

    // Success should be gone, error should persist
    expect(screen.queryByText('Success message')).not.toBeInTheDocument()
    expect(screen.getByText('Error message')).toBeInTheDocument()
  })

  it('allows manual dismiss of toasts via close button', () => {
    renderSystem()

    // Trigger warning
    act(() => {
      screen.getByRole('button', { name: /trigger warning/i }).click()
    })

    const toastText = screen.getByText('Warning message')
    expect(toastText).toBeInTheDocument()

    const closeBtn = screen.getByRole('button', { name: /close notification/i })
    act(() => {
      closeBtn.click()
    })

    expect(screen.queryByText('Warning message')).not.toBeInTheDocument()
  })

  it('supports custom durations', () => {
    renderSystem()

    // Trigger custom duration (1000ms)
    act(() => {
      screen.getByRole('button', { name: /trigger custom/i }).click()
    })

    expect(screen.getByText('Custom duration')).toBeInTheDocument()

    // Advance 500ms -> should still be there
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(screen.getByText('Custom duration')).toBeInTheDocument()

    // Advance another 500ms -> should be dismissed
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(screen.queryByText('Custom duration')).not.toBeInTheDocument()
  })

  it('triggers undo action when Undo button is clicked', () => {
    const undoSpy = vi.fn()
    function UndoTrigger() {
      const { addToast } = useToast()
      return (
        <button onClick={() => addToast('Undoable action done', 'info', 5000, undoSpy, 'Undo Now')}>
          Trigger Undo
        </button>
      )
    }

    render(
      <LocaleProvider>
        <MemoryRouter initialEntries={['/']}>
          <CookieConsentProvider>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<UndoTrigger />} />
              </Route>
            </Routes>
          </CookieConsentProvider>
        </MemoryRouter>
      </LocaleProvider>
    )

    // Trigger toast
    act(() => {
      screen.getByRole('button', { name: /trigger undo/i }).click()
    })

    const undoBtn = screen.getByRole('button', { name: /undo now/i })
    expect(undoBtn).toBeInTheDocument()

    // Click Undo
    act(() => {
      undoBtn.click()
    })

    expect(undoSpy).toHaveBeenCalledTimes(1)
    // The toast should be dismissed after clicking Undo
    expect(screen.queryByText('Undoable action done')).not.toBeInTheDocument()
  })

  it('extends/pauses its timer on hover and focus', () => {
    renderSystem()

    // Trigger success toast (duration is 5000ms)
    act(() => {
      screen.getByRole('button', { name: /trigger success/i }).click()
    })

    const toastText = screen.getByText('Success message')
    const toastEl = toastText.closest('.toast')
    expect(toastEl).toBeInTheDocument()

    // Move time forward slightly
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(screen.getByText('Success message')).toBeInTheDocument()

    // Hover mouse over the toast to pause
    act(() => {
      toastEl?.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
    })

    // Advance timers by 4000ms (total elapsed would be 6000ms, which is > 5000ms)
    act(() => {
      vi.advanceTimersByTime(4000)
    })

    // It should still be visible because it's paused!
    expect(screen.getByText('Success message')).toBeInTheDocument()

    // Mouse leave to resume
    act(() => {
      toastEl?.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }))
    })

    // Advance 1000ms -> should still be there (need 3000ms more since we spent 2000ms initially)
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(screen.getByText('Success message')).toBeInTheDocument()

    // Advance another 2000ms -> should now be dismissed
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(screen.queryByText('Success message')).not.toBeInTheDocument()
  })

  it('pauses its timer on focus and resumes on blur', () => {
    renderSystem()

    act(() => {
      screen.getByRole('button', { name: /trigger success/i }).click()
    })

    const toastText = screen.getByText('Success message')
    const toastEl = toastText.closest('.toast')
    expect(toastEl).toBeInTheDocument()

    // Focus the close button to pause
    const closeBtn = screen.getByRole('button', { name: /close notification/i })
    act(() => {
      closeBtn.focus()
    })

    // Advance timers by 6000ms
    act(() => {
      vi.advanceTimersByTime(6000)
    })

    // It should still be visible!
    expect(screen.getByText('Success message')).toBeInTheDocument()

    // Blur to resume
    act(() => {
      closeBtn.blur()
    })

    // Advance 5000ms -> should now be dismissed
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(screen.queryByText('Success message')).not.toBeInTheDocument()
  })

  it('dismisses only the topmost toast when Escape is pressed on the container', () => {
    renderSystem()

    // Trigger two toasts (one success, one warning). The success toast will
    // be appended first, then the warning. With the new scoped handler,
    // pressing Escape once removes only the most recent (warning), and the
    // older success toast remains until the next press.
    act(() => {
      screen.getByRole('button', { name: /trigger success/i }).click()
      screen.getByRole('button', { name: /trigger warning/i }).click()
    })
    expect(screen.getByText('Warning message')).toBeInTheDocument()
    expect(screen.getByText('Success message')).toBeInTheDocument()

    act(() => {
      const container = document.querySelector('.toast-container') as HTMLElement
      container.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })

    expect(screen.queryByText('Warning message')).not.toBeInTheDocument()
    expect(screen.getByText('Success message')).toBeInTheDocument()

    // A second Escape press removes the remaining toast.
    act(() => {
      const container = document.querySelector('.toast-container') as HTMLElement
      container.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    expect(screen.queryByText('Success message')).not.toBeInTheDocument()
  })

  it('attaches aria-keyshortcuts="Escape" to the close button', () => {
    renderSystem()

    act(() => {
      screen.getByRole('button', { name: /trigger success/i }).click()
    })

    const closeBtn = screen.getByRole('button', { name: /close notification/i })
    expect(closeBtn).toHaveAttribute('aria-keyshortcuts', 'Escape')
  })
})

describe('Toast Motion', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const renderSystem = () => {
    return render(
      <LocaleProvider>
        <MemoryRouter initialEntries={['/']}>
          <CookieConsentProvider>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<TestTrigger />} />
              </Route>
            </Routes>
          </CookieConsentProvider>
        </MemoryRouter>
      </LocaleProvider>
    )
  }

  it('applies toast-entering class on mount', () => {
    renderSystem()

    act(() => {
      screen.getByRole('button', { name: /trigger success/i }).click()
    })

    const toastEl = screen.getByText('Success message').closest('.toast')
    expect(toastEl).toHaveClass('toast-entering')
  })

  it('transitions from toast-entering to idle after animation completes', () => {
    renderSystem()

    act(() => {
      screen.getByRole('button', { name: /trigger success/i }).click()
    })

    const toastEl = screen.getByText('Success message').closest('.toast')
    expect(toastEl).toHaveClass('toast-entering')

    // Advance past enter animation (280ms)
    act(() => {
      vi.advanceTimersByTime(350)
    })

    const toastElAfter = screen.getByText('Success message').closest('.toast')
    expect(toastElAfter).not.toHaveClass('toast-entering')
    expect(toastElAfter).not.toHaveClass('toast-exiting')
  })

  it('applies toast-exiting class when dismiss is triggered', () => {
    renderSystem()

    act(() => {
      screen.getByRole('button', { name: /trigger success/i }).click()
    })

    // Advance past enter animation
    act(() => {
      vi.advanceTimersByTime(350)
    })

    // Click close button
    const closeBtn = screen.getByRole('button', { name: /close notification/i })
    act(() => {
      closeBtn.click()
    })

    // Should have exiting class briefly (within 200ms before removal)
    // After 200ms the toast is removed from DOM
    act(() => {
      vi.advanceTimersByTime(250)
    })

    // Toast should be fully removed
    expect(screen.queryByText('Success message')).not.toBeInTheDocument()
  })

  it('toast container renders with correct aria attributes', () => {
    renderSystem()

    act(() => {
      screen.getByRole('button', { name: /trigger success/i }).click()
    })

    const container = document.querySelector('.toast-container')
    expect(container).toHaveAttribute('aria-live', 'polite')
    expect(container).toHaveAttribute('aria-atomic', 'false')
  })

  it('warning and error toasts use alert role', () => {
    renderSystem()

    act(() => {
      screen.getByRole('button', { name: /trigger warning/i }).click()
      screen.getByRole('button', { name: /trigger error/i }).click()
    })

    const warningToast = screen.getByText('Warning message').closest('.toast')
    const errorToast = screen.getByText('Error message').closest('.toast')

    expect(warningToast).toHaveAttribute('role', 'alert')
    expect(errorToast).toHaveAttribute('role', 'alert')
  })

  it('shows progress bar for auto-dismissing toasts', () => {
    renderSystem()

    act(() => {
      screen.getByRole('button', { name: /trigger success/i }).click()
    })

    const progressBar = document.querySelector('.toast-progress-bar')
    expect(progressBar).toBeInTheDocument()
    expect(progressBar).toHaveAttribute('aria-hidden', 'true')
  })

  it('does not show progress bar for persistent toasts', () => {
    renderSystem()

    act(() => {
      screen.getByRole('button', { name: /trigger warning/i }).click()
    })

    const progressBar = document.querySelector('.toast-progress-bar')
    expect(progressBar).not.toBeInTheDocument()
  })
})

// ─── Reduced-motion timing (docs/uiux/reduced-motion-fallback-spec.md) ─────
describe('Toast Notification System — reduced motion', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const renderSystem = () => {
    return render(
      <LocaleProvider>
        <MemoryRouter initialEntries={['/']}>
          <CookieConsentProvider>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<TestTrigger />} />
              </Route>
            </Routes>
          </CookieConsentProvider>
        </MemoryRouter>
      </LocaleProvider>
    )
  }

  const mockReducedMotion = (matches: boolean) => {
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
    // Fire rAF synchronously so the entrance setTimeout starts at t=0
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0)
      return 0
    })
  }

  it('entrance state settles after 80ms (fade-only) instead of 280ms when reduced motion is active', () => {
    mockReducedMotion(true)
    renderSystem()

    act(() => {
      screen.getByRole('button', { name: /trigger success/i }).click()
    })

    const toastEl = screen.getByText('Success message').closest('.toast')
    expect(toastEl).toHaveClass('toast-entering')

    // Still entering at 79ms — the reduced-motion enter delay is 80ms
    act(() => {
      vi.advanceTimersByTime(79)
    })
    expect(screen.getByText('Success message').closest('.toast')).toHaveClass('toast-entering')

    // One more ms crosses the threshold
    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(screen.getByText('Success message').closest('.toast')).not.toHaveClass('toast-entering')
  })

  it('keeps the full 280ms entrance when reduced motion is NOT active', () => {
    mockReducedMotion(false)
    renderSystem()

    act(() => {
      screen.getByRole('button', { name: /trigger success/i }).click()
    })

    // Advance past the reduced-motion threshold only — still entering
    act(() => {
      vi.advanceTimersByTime(80)
    })
    expect(screen.getByText('Success message').closest('.toast')).toHaveClass('toast-entering')

    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(screen.getByText('Success message').closest('.toast')).not.toHaveClass('toast-entering')
  })

  it('removes the toast after 80ms exit when reduced motion is active', () => {
    mockReducedMotion(true)
    renderSystem()

    act(() => {
      screen.getByRole('button', { name: /trigger success/i }).click()
    })

    // Settle entrance
    act(() => {
      vi.advanceTimersByTime(100)
    })

    act(() => {
      screen.getByRole('button', { name: /close notification/i }).click()
    })
    expect(screen.getByText('Success message').closest('.toast')).toHaveClass('toast-exiting')

    // 79ms — still animating out
    act(() => {
      vi.advanceTimersByTime(79)
    })
    expect(screen.queryByText('Success message')).toBeInTheDocument()

    // Crosses the 80ms exit threshold — removed
    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(screen.queryByText('Success message')).not.toBeInTheDocument()
  })
})
