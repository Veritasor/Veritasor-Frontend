import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AttestationProgress from './AttestationProgress'

const STEP_MS = 1100

function renderFlow() {
  return render(
    <MemoryRouter>
      <AttestationProgress />
    </MemoryRouter>,
  )
}

/**
 * Advances the fake clock one step at a time so React flushes between each
 * timer callback — each step's `useEffect` schedules the next timeout, which
 * only exists after the previous render has flushed.
 */
function runToCompletion() {
  for (let i = 0; i < 5; i++) {
    act(() => {
      vi.advanceTimersByTime(STEP_MS)
    })
  }
}

describe('AttestationProgress — result animation (#529)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('renders the idle state without a result animation', () => {
    renderFlow()
    expect(
      screen.getAllByText(/ready to generate a new revenue attestation/i).length,
    ).toBeGreaterThan(0)
    expect(document.querySelector('.va-result-animation')).toBeNull()
  })

  it('shows the success result animation after the run completes', () => {
    renderFlow()
    fireEvent.click(screen.getByRole('button', { name: /start attestation/i }))
    runToCompletion()
    expect(
      screen.getAllByText(/attestation successfully published on stellar/i).length,
    ).toBeGreaterThan(0)
    const animation = document.querySelector('.va-result-animation')
    expect(animation).toBeInTheDocument()
    expect(animation).toHaveAttribute('data-outcome', 'success')
    // Fully-drawn static frame is present even while the animation plays.
    expect(animation!.querySelector('.va-result-stroke')).toBeInTheDocument()
  })

  it('does not show a result animation when canceled mid-run', () => {
    renderFlow()
    fireEvent.click(screen.getByRole('button', { name: /start attestation/i }))
    fireEvent.click(
      screen.getByRole('button', { name: /cancel attestation/i }),
    )
    expect(
      screen.getAllByText(/attestation processing was canceled/i).length,
    ).toBeGreaterThan(0)
    expect(document.querySelector('.va-result-animation')).toBeNull()
  })

  it('replays the animation across repeated runs', () => {
    renderFlow()
    fireEvent.click(screen.getByRole('button', { name: /start attestation/i }))
    runToCompletion()
    expect(document.querySelector('.va-result-animation')).toBeInTheDocument()

    // Run it again — the animation must remount and replay.
    fireEvent.click(
      screen.getByRole('button', { name: /start another attestation/i }),
    )
    expect(document.querySelector('.va-result-animation')).toBeNull()
    runToCompletion()
    expect(document.querySelector('.va-result-animation')).toBeInTheDocument()
    expect(
      document.querySelector('.va-result-animation'),
    ).toHaveAttribute('data-outcome', 'success')
  })

  it('renders the animation static frame under prefers-reduced-motion', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: true,
        media: '(prefers-reduced-motion: reduce)',
        onchange: null,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
      }),
    )
    renderFlow()
    fireEvent.click(screen.getByRole('button', { name: /start attestation/i }))
    runToCompletion()
    const animation = document.querySelector('.va-result-animation')
    expect(animation).toBeInTheDocument()
    expect(animation).toHaveAttribute('data-reduced-motion', 'true')
    // No animation class → static fallback frame.
    expect(animation!.querySelector('svg')).not.toHaveClass('va-result-animate')
    expect(animation!.querySelector('.va-result-stroke')).toBeInTheDocument()
  })

  it('keeps the result animation out of the tab order', () => {
    renderFlow()
    fireEvent.click(screen.getByRole('button', { name: /start attestation/i }))
    runToCompletion()
    const animation = document.querySelector('.va-result-animation')!
    expect(animation.querySelector('svg')).toHaveAttribute('focusable', 'false')
    expect(animation.querySelector('[tabindex]')).toBeNull()
    // Focus stays with the interactive controls; nothing new grabs it.
    expect(
      screen.getByRole('button', { name: /start another attestation/i }),
    ).toBeInTheDocument()
  })
})
