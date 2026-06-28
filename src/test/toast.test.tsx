import { render, screen, act } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { useToast } from '../components/ToastContext'
import Layout from '../components/Layout'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { CookieConsentProvider } from '../components/CookieConsentContext'

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
      <MemoryRouter initialEntries={['/']}>
        <CookieConsentProvider>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<TestTrigger />} />
            </Route>
          </Routes>
        </CookieConsentProvider>
      </MemoryRouter>
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
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<UndoTrigger />} />
          </Route>
        </Routes>
      </MemoryRouter>
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

  it('dismisses when global Escape key is pressed', () => {
    renderSystem()

    act(() => {
      screen.getByRole('button', { name: /trigger success/i }).click()
    })

    expect(screen.getByText('Success message')).toBeInTheDocument()

    // Press Escape key
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    })

    expect(screen.queryByText('Success message')).not.toBeInTheDocument()
  })
})
