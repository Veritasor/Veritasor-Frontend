import { render, screen, act } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { useToast } from '../components/ToastContext'
import Layout from '../components/Layout'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

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
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<TestTrigger />} />
          </Route>
        </Routes>
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
})
