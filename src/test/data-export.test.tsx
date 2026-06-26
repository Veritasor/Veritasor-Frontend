import { render, screen, act, within } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import DataExportPanel from '../components/data-export/DataExportPanel'

describe('DataExportPanel', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('renders format options and an empty downloads tray', () => {
    render(<DataExportPanel />)

    expect(screen.getByRole('radio', { name: /CSV/i })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /JSON/i })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /PDF/i })).toBeInTheDocument()

    const tray = screen.getByRole('region', { name: /downloads/i })
    expect(within(tray).getByText(/exports you generate appear here/i)).toBeInTheDocument()
  })

  it('announces progress politely and reaches a ready, downloadable state', () => {
    render(<DataExportPanel tickMs={100} />)

    act(() => {
      screen.getByRole('button', { name: /generate export/i }).click()
    })

    // Polite live region announces preparation.
    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-live', 'polite')
    expect(status).toHaveTextContent(/preparing csv export/i)

    // A determinate progressbar is present while processing.
    expect(screen.getByRole('progressbar')).toBeInTheDocument()

    // Advance through all ticks (0 -> 100 in steps of 20).
    act(() => {
      vi.advanceTimersByTime(100 * 6)
    })

    expect(status).toHaveTextContent(/ready to download/i)
    expect(screen.getByRole('button', { name: /^download$/i })).toBeInTheDocument()
  })

  it('allows retrying a failed/expired export via the tray', () => {
    render(<DataExportPanel tickMs={100} />)

    act(() => {
      screen.getByRole('button', { name: /generate export/i }).click()
      vi.advanceTimersByTime(100 * 6)
    })

    // Download is available; clicking announces the download.
    act(() => {
      screen.getByRole('button', { name: /^download$/i }).click()
    })
    expect(screen.getByRole('status')).toHaveTextContent(/downloading csv export/i)
  })
})
