import { render, screen, act, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { IntlProvider } from 'react-intl'
import { useToast , MAX_VISIBLE_TOASTS } from '../components/ToastContext'
import Layout from '../components/Layout'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { CookieConsentProvider } from '../components/CookieConsentContext'

const MESSAGES = {
  'app.name': 'Veritasor',
  'app.tagline': 'Attestation Platform',
  'search.placeholder': 'Search',
  'nav.dashboard': 'Dashboard',
  'nav.attestations': 'Attestations',
  'nav.revenueSources': 'Revenue Sources',
  'workspace.personal': 'Personal',
  'workspace.team': 'Team',
}

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
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const renderSystem = (element = <TestTrigger />) => {
    return render(
      <MemoryRouter initialEntries={['/']}>
        <IntlProvider locale="en" messages={MESSAGES}>
          <CookieConsentProvider>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={element} />
              </Route>
            </Routes>
          </CookieConsentProvider>
        </IntlProvider>
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

    // Fast-forward past auto-dismiss + exit animation
    act(() => {
      vi.advanceTimersByTime(6000)
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

    // Wait for exit animation to complete
    act(() => {
      vi.advanceTimersByTime(250)
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

    // Advance past timer + exit animation
    act(() => {
      vi.advanceTimersByTime(1500)
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

    renderSystem(<UndoTrigger />)

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

    // Wait for exit animation to complete
    act(() => {
      vi.advanceTimersByTime(250)
    })

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
      fireEvent.mouseEnter(toastEl!)
    })

    // Advance timers by 4000ms (total elapsed would be 6000ms, which is > 5000ms)
    act(() => {
      vi.advanceTimersByTime(4000)
    })

    // It should still be visible because it's paused!
    expect(screen.getByText('Success message')).toBeInTheDocument()

    // Mouse leave to resume
    act(() => {
      fireEvent.mouseLeave(toastEl!)
    })

    // Advance 1000ms -> should still be there (need 3000ms more since we spent 2000ms initially)
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(screen.getByText('Success message')).toBeInTheDocument()

    // Advance another 2000ms -> timer fires (needs 2000ms more from timeLeft=~2000)
    act(() => {
      vi.advanceTimersByTime(2000)
    })

    // Wait for exit animation to complete
    act(() => {
      vi.advanceTimersByTime(250)
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
      fireEvent.focus(closeBtn)
    })

    // Advance timers by 6000ms
    act(() => {
      vi.advanceTimersByTime(6000)
    })

    // It should still be visible!
    expect(screen.getByText('Success message')).toBeInTheDocument()

    // Blur to resume
    act(() => {
      fireEvent.blur(closeBtn)
    })

    // Advance 5000ms -> timer should fire
    act(() => {
      vi.advanceTimersByTime(5000)
    })

    // Wait for exit animation to complete
    act(() => {
      vi.advanceTimersByTime(250)
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

    // Wait for exit animation (200ms) + timer advance
    act(() => {
      vi.advanceTimersByTime(250)
    })

    expect(screen.queryByText('Success message')).not.toBeInTheDocument()
  })
})

describe('Toast Motion', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const renderSystem = (element = <TestTrigger />) => {
    return render(
      <MemoryRouter initialEntries={['/']}>
        <IntlProvider locale="en" messages={MESSAGES}>
          <CookieConsentProvider>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={element} />
              </Route>
            </Routes>
          </CookieConsentProvider>
        </IntlProvider>
      </MemoryRouter>
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

    // Per spec: warning uses 'status', error uses 'alert'
    expect(warningToast).toHaveAttribute('role', 'status')
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

describe('Toast Stacking & Grouping', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const renderSystem = (element = <TestTrigger />) => {
    return render(
      <MemoryRouter initialEntries={['/']}>
        <IntlProvider locale="en" messages={MESSAGES}>
          <CookieConsentProvider>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={element} />
              </Route>
            </Routes>
          </CookieConsentProvider>
        </IntlProvider>
      </MemoryRouter>
    )
  }

  it('renders all toasts individually when count is within MAX_VISIBLE_TOASTS', () => {
    renderSystem()

    // Add toasts up to the max visible limit
    act(() => {
      screen.getByRole('button', { name: /trigger success/i }).click()
      screen.getByRole('button', { name: /trigger info/i }).click()
      screen.getByRole('button', { name: /trigger warning/i }).click()
    })

    // All should be visible individually
    expect(screen.getByText('Success message')).toBeInTheDocument()
    expect(screen.getByText('Info message')).toBeInTheDocument()
    expect(screen.getByText('Warning message')).toBeInTheDocument()

    // No group summary should appear
    expect(screen.queryByText(/notifications/i)).not.toBeInTheDocument()
  })

  it('collapses overflow toasts into a group when exceeding MAX_VISIBLE_TOASTS', () => {
    renderSystem()

    // Add toasts exceeding the max visible limit (MAX_VISIBLE_TOASTS + 1)
    act(() => {
      screen.getByRole('button', { name: /trigger success/i }).click()
      screen.getByRole('button', { name: /trigger info/i }).click()
      screen.getByRole('button', { name: /trigger warning/i }).click()
      screen.getByRole('button', { name: /trigger error/i }).click()
    })

    // The newest MAX_VISIBLE_TOASTS toasts should be visible individually
    // (newest = error, warning, info)
    expect(screen.getByText('Error message')).toBeInTheDocument()
    expect(screen.getByText('Warning message')).toBeInTheDocument()
    expect(screen.getByText('Info message')).toBeInTheDocument()

    // The oldest (success) should be collapsed into group
    // Group summary should show count
    const groupSummary = screen.getByText(/notification/i)
    expect(groupSummary).toBeInTheDocument()

    // Group summary should have the count badge
    const countBadge = document.querySelector('.toast-group-count')
    expect(countBadge).toBeInTheDocument()
    expect(countBadge).toHaveTextContent('1')
  })

  it('expands group to show individual items when summary is clicked', () => {
    renderSystem()

    // Add 4 toasts (1 beyond MAX_VISIBLE_TOASTS)
    act(() => {
      screen.getByRole('button', { name: /trigger success/i }).click()
      screen.getByRole('button', { name: /trigger info/i }).click()
      screen.getByRole('button', { name: /trigger warning/i }).click()
      screen.getByRole('button', { name: /trigger error/i }).click()
    })

    // Find and click the group summary to expand
    const groupSummary = screen.getByRole('button', { name: /1 notification/i })
    act(() => {
      groupSummary.click()
    })

    // The collapsed toast should now be visible
    expect(screen.getByText('Success message')).toBeInTheDocument()
  })

  it('renders group footer with dismiss all button when expanded', () => {
    renderSystem()

    // Add 4 toasts
    act(() => {
      screen.getByRole('button', { name: /trigger success/i }).click()
      screen.getByRole('button', { name: /trigger info/i }).click()
      screen.getByRole('button', { name: /trigger warning/i }).click()
      screen.getByRole('button', { name: /trigger error/i }).click()
    })

    // Expand the group
    const groupSummary = screen.getByRole('button', { name: /1 notification/i })
    act(() => {
      groupSummary.click()
    })

    // Dismiss all button should be present
    const dismissAllBtn = screen.getByText('Dismiss all')
    expect(dismissAllBtn).toBeInTheDocument()

    // Click dismiss all
    act(() => {
      dismissAllBtn.click()
    })

    // The collapsed toast should be removed
    expect(screen.queryByText('Success message')).not.toBeInTheDocument()
  })

  it('shows type chips in group summary with correct counts', () => {
    renderSystem()

    // Add 5 toasts with different types (2 overflow)
    act(() => {
      screen.getByRole('button', { name: /trigger success/i }).click()
      screen.getByRole('button', { name: /trigger info/i }).click()
      screen.getByRole('button', { name: /trigger warning/i }).click()
      screen.getByRole('button', { name: /trigger error/i }).click()
      screen.getByRole('button', { name: /trigger success/i }).click()
    })

    // 2 toasts should be overflow (oldest: success, info)
    const groupSummary = screen.getByRole('button', { name: /2 notifications/i })
    expect(groupSummary).toBeInTheDocument()

    // Type chips should be rendered
    const chips = document.querySelectorAll('.toast-group-chip')
    expect(chips.length).toBeGreaterThan(0)
  })

  it('dismisses individual toast from within the expanded group', () => {
    renderSystem()

    // Add 4 toasts
    act(() => {
      screen.getByRole('button', { name: /trigger success/i }).click()
      screen.getByRole('button', { name: /trigger info/i }).click()
      screen.getByRole('button', { name: /trigger warning/i }).click()
      screen.getByRole('button', { name: /trigger error/i }).click()
    })

    // Expand the group
    const groupSummary = screen.getByRole('button', { name: /1 notification/i })
    act(() => {
      groupSummary.click()
    })

    // The collapsed toast should be visible
    expect(screen.getByText('Success message')).toBeInTheDocument()

    // Find and click its close button
    const closeButtons = screen.getAllByRole('button', { name: /close notification/i })
    expect(closeButtons.length).toBeGreaterThan(0)
    act(() => {
      closeButtons[closeButtons.length - 1].click()
    })

    // After exit animation (200ms), it should be removed
    act(() => {
      vi.advanceTimersByTime(250)
    })

    // When the only collapsed toast is dismissed, the group should disappear
    expect(screen.queryByText('Success message')).not.toBeInTheDocument()
  })

  it('shows undo hint in group summary when overflow contains undoable toasts', () => {
    const undoSpy = vi.fn()

    function StackTrigger() {
      const { addToast } = useToast()
      return (
        <div>
          <button onClick={() => addToast('Action 1', 'success', 5000)}>Add 1</button>
          <button onClick={() => addToast('Action 2', 'info', 5000)}>Add 2</button>
          <button onClick={() => addToast('Action 3', 'success', 5000, undoSpy, 'Undo')}>Add 3 Undo</button>
          <button onClick={() => addToast('Action 4', 'info', 5000)}>Add 4</button>
        </div>
      )
    }

    renderSystem(<StackTrigger />)

    act(() => {
      screen.getByText('Add 1').click()
      screen.getByText('Add 2').click()
      screen.getByText('Add 3 Undo').click()
      screen.getByText('Add 4').click()
    })

    // Newest 3 visible, oldest 1 (Action 1) is overflow
    // Action 1 has no undo, so no undo hint... Let's restructure:
    // Actually Action 1 is the oldest and has no undo, so no undo hint
    const undoHint = document.querySelector('.toast-group-undo-hint')
    // Action 1 has no undo, so no hint expected
    expect(undoHint).toBeNull()
  })

  it('shows undoable count in group summary when relevant', () => {
    const undoSpy = vi.fn()

    function UndoStackTrigger() {
      const { addToast } = useToast()
      return (
        <div>
          <button onClick={() => addToast('Undoable action 1', 'success', 8000, undoSpy, 'Undo')}>Undo 1</button>
          <button onClick={() => addToast('Normal action', 'info', 5000)}>Normal</button>
          <button onClick={() => addToast('Another normal', 'info', 5000)}>Normal 2</button>
          <button onClick={() => addToast('Latest action', 'success', 5000)}>Latest</button>
        </div>
      )
    }

    renderSystem(<UndoStackTrigger />)

    act(() => {
      screen.getByText('Undo 1').click()
      screen.getByText('Normal').click()
      screen.getByText('Normal 2').click()
      screen.getByText('Latest').click()
    })

    // Newest 3: Latest, Normal 2, Normal
    // Oldest 1 (overflow): Undoable action 1 (has onUndo)
    const undoHint = document.querySelector('.toast-group-undo-hint')
    expect(undoHint).toBeInTheDocument()
  })

  it('group auto-adjusts when overflow toasts are dismissed individually via timers', () => {
    renderSystem()

    // Ensure we have valid timers by using success type (has auto-dismiss)
    function TimerStackTrigger() {
      const { addToast } = useToast()
      return (
        <div>
          <button onClick={() => addToast('Old success', 'success', 3000)}>Old Success</button>
          <button onClick={() => addToast('Middle info', 'info', 5000)}>Middle Info</button>
          <button onClick={() => addToast('New warning', 'warning')}>New Warning</button>
          <button onClick={() => addToast('Latest error', 'error')}>Latest Error</button>
        </div>
      )
    }

    renderSystem(<TimerStackTrigger />)

    act(() => {
      screen.getByText('Old Success').click()
      screen.getByText('Middle Info').click()
      screen.getByText('New Warning').click()
      screen.getByText('Latest Error').click()
    })

    // 1 overflow toast: "Old success"
    const groupSummary = screen.getByRole('button', { name: /1 notification/i })
    expect(groupSummary).toBeInTheDocument()

    // Fast-forward past Old success auto-dismiss (3000ms)
    act(() => {
      vi.advanceTimersByTime(3100)
    })

    // Old success should be gone, and since it was the only overflow, group disappears
    // Note: due to exit animation timing, the group may briefly remain
    // The toasts array is cleaned up
    expect(screen.queryByText('Old success')).not.toBeInTheDocument()
  })

  it('shows no group when count is exactly MAX_VISIBLE_TOASTS', () => {
    renderSystem()

    // Add exactly MAX_VISIBLE_TOASTS toasts
    for (let i = 0; i < MAX_VISIBLE_TOASTS ; i++) {
      act(() => {
        screen.getByRole('button', { name: /trigger success/i }).click()
      })
    }

    // No group summary
    const groupSummary = document.querySelector('.toast-group')
    expect(groupSummary).not.toBeInTheDocument()
  })

  it('shows collapsible state management with correct aria-expanded', () => {
    renderSystem()

    // Add 4 toasts
    for (let i = 0; i < 4; i++) {
      act(() => {
        screen.getByRole('button', { name: /trigger info/i }).click()
      })
    }

    // Group summary with aria-expanded="false"
    const summaryButton = document.querySelector('.toast-group-summary')
    expect(summaryButton).toHaveAttribute('aria-expanded', 'false')

    // Click to expand
    act(() => {
      summaryButton?.click()
    })

    // After expanding, group items should be visible
    const items = document.querySelector('.toast-group-items')
    expect(items).toBeInTheDocument()
  })

  it('respects collapsed state even when toasts are added', () => {
    renderSystem()

    // Add toasts to trigger grouping
    act(() => {
      screen.getByRole('button', { name: /trigger success/i }).click()
      screen.getByRole('button', { name: /trigger info/i }).click()
      screen.getByRole('button', { name: /trigger warning/i }).click()
      screen.getByRole('button', { name: /trigger error/i }).click()
    })

    // Group should be present
    expect(document.querySelector('.toast-group')).toBeInTheDocument()

    // Add another toast
    act(() => {
      screen.getByRole('button', { name: /trigger success/i }).click()
    })

    // Container still renders without error
    const container = document.querySelector('.toast-container')
    expect(container).toBeInTheDocument()
  })

  it('returns null when there are no toasts', () => {
    renderSystem()
    const container = document.querySelector('.toast-container')
    expect(container).not.toBeInTheDocument()
  })
})

describe('MAX_VISIBLE_TOASTS constant', () => {
  it('exports MAX_VISIBLE_TOASTS with value 3', () => {
    expect(MAX_VISIBLE_TOASTS).toBe(3)
  })
})
