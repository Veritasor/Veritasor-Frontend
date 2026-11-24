import { render, screen, act, within, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import DataExportPanel from '../components/data-export/DataExportPanel'

/**
 * The panel defaults to the "All attestations" scope, which is a large export and
 * is therefore guard-railed (#442): clicking "Generate export" opens the confirm
 * dialog instead of starting a job. The tests below cover the job lifecycle that
 * starts *after* that decision point, so they pick a small scope first — a small
 * scope starts immediately, and the lifecycle is identical.
 */
function chooseQuickScope() {
  fireEvent.change(screen.getByLabelText('Scope'), { target: { value: 'last-30-days' } })
}

describe('DataExportPanel', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('renders format options including Parquet and an empty downloads tray', () => {
    render(<DataExportPanel />)

    expect(screen.getByRole('radio', { name: /CSV/i })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /JSON/i })).toBeInTheDocument()
    // #261 — Parquet format added
    expect(screen.getByRole('radio', { name: /Parquet/i })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /PDF/i })).toBeInTheDocument()

    const tray = screen.getByRole('region', { name: /downloads/i })
    expect(within(tray).getByText(/exports you generate appear here/i)).toBeInTheDocument()
  })

  it('shows a Generate your first export CTA in the empty state', () => {
    render(<DataExportPanel />)

    const tray = screen.getByRole('region', { name: /downloads/i })
    expect(
      within(tray).getByRole('button', { name: /generate your first export/i }),
    ).toBeInTheDocument()
  })

  // #261 — sample snippet toggle
  it('expands a sample snippet for CSV when the Show sample button is clicked', () => {
    render(<DataExportPanel />)

    const toggleBtn = screen.getAllByRole('button', { name: /show sample/i })[0]
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(toggleBtn)

    expect(toggleBtn).toHaveAttribute('aria-expanded', 'true')
    // CSV sample contains this header line
    expect(screen.getByText(/id,source,amount/i)).toBeInTheDocument()
  })

  it('announces progress politely and reaches a ready, downloadable state', () => {
    render(<DataExportPanel tickMs={100} />)

    chooseQuickScope()
    act(() => {
      screen.getByRole('button', { name: /generate export/i }).click()
    })

    // Polite live region announces preparation.
    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-live', 'polite')
    expect(status).toHaveTextContent(/preparing csv export/i)

    // At least one determinate progressbar is present while processing
    // (table row + mobile card may each render one).
    expect(screen.getAllByRole('progressbar').length).toBeGreaterThan(0)

    // Advance through all ticks (0 -> 100 in steps of 20).
    act(() => {
      vi.advanceTimersByTime(100 * 6)
    })

    expect(status).toHaveTextContent(/ready to download/i)
    // Download buttons appear in both table and card list; at least one present.
    expect(screen.getAllByRole('button', { name: /download/i }).length).toBeGreaterThan(0)
  })

  it('allows downloading a ready export and announces it', () => {
    render(<DataExportPanel tickMs={100} />)

    chooseQuickScope()
    act(() => {
      screen.getByRole('button', { name: /generate export/i }).click()
      vi.advanceTimersByTime(100 * 6)
    })

    act(() => {
      screen.getAllByRole('button', { name: /download/i })[0].click()
    })
    expect(screen.getByRole('status')).toHaveTextContent(/downloading csv export/i)
  })

  // #260 — Re-run actions
  it('shows a Regenerate button (with confirm) for a ready export via re-run flow', () => {
    render(<DataExportPanel tickMs={100} />)

    chooseQuickScope()
    act(() => {
      screen.getByRole('button', { name: /generate export/i }).click()
      vi.advanceTimersByTime(100 * 6)
    })

    // After reaching ready, a Re-run-equivalent action exists
    // (for ready jobs it shows "Regenerate" or similar accessibility label)
    const rerunBtn = screen.queryAllByRole('button').find(
      (b) => /regenerate|re-run|retry/i.test(b.textContent ?? ''),
    )
    expect(rerunBtn).toBeDefined()
  })

  // #260 — Export history table structure
  it('renders an export history table with accessible headers after an export is created', () => {
    render(<DataExportPanel tickMs={100} />)

    chooseQuickScope()
    act(() => {
      screen.getByRole('button', { name: /generate export/i }).click()
    })

    // Table should be present (desktop layout)
    const table = screen.queryByRole('table')
    if (table) {
      // Has accessible column headers
      expect(within(table).getByRole('columnheader', { name: /format/i })).toBeInTheDocument()
      expect(within(table).getByRole('columnheader', { name: /status/i })).toBeInTheDocument()
      expect(within(table).getByRole('columnheader', { name: /created/i })).toBeInTheDocument()
    } else {
      // Mobile card layout — job cards are present
      expect(screen.getByRole('list', { name: /export history/i })).toBeInTheDocument()
    }
  })

  it('cancels an in-flight export and stops its progress', () => {
    render(<DataExportPanel tickMs={100} />)

    chooseQuickScope()
    act(() => {
      screen.getByRole('button', { name: /generate export/i }).click()
    })
    act(() => {
      vi.advanceTimersByTime(100)
    })

    expect(screen.getAllByRole('progressbar')[0]).toHaveAttribute('aria-valuenow', '20')

    act(() => {
      screen.getAllByRole('button', { name: /^Cancel CSV export$/i })[0].click()
    })

    expect(screen.getByRole('status')).toHaveTextContent(/csv export cancelled/i)
    expect(screen.getAllByText(/export cancelled/i).length).toBeGreaterThan(0)

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(screen.queryAllByRole('progressbar')).toHaveLength(0)
  })

  it('retries a failed export and reaches a ready state', () => {
    render(<DataExportPanel tickMs={100} failJobs={1} />)

    chooseQuickScope()
    act(() => {
      screen.getByRole('button', { name: /generate export/i }).click()
    })
    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(screen.getByRole('status')).toHaveTextContent(/csv export failed/i)
    expect(screen.getAllByRole('button', { name: /^Re-run CSV export$/ }).length).toBeGreaterThan(0)

    act(() => {
      screen.getAllByRole('button', { name: /^Re-run CSV export$/ })[0].click()
    })
    expect(screen.getByRole('status')).toHaveTextContent(/regenerating csv export/i)

    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(screen.getByRole('status')).toHaveTextContent(/ready to download/i)
  })

  it('downloads a ready export through an object URL', () => {
    const createObjectUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test-download')
    const revokeObjectUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    render(<DataExportPanel tickMs={100} />)

    chooseQuickScope()
    act(() => {
      screen.getByRole('button', { name: /generate export/i }).click()
      vi.advanceTimersByTime(500)
    })

    act(() => {
      screen.getAllByRole('button', { name: /^Download CSV export/ })[0].click()
    })

    expect(createObjectUrl).toHaveBeenCalledWith(expect.any(Blob))
    expect(anchorClick).toHaveBeenCalled()
    expect(screen.getByRole('status')).toHaveTextContent(/downloading csv export/i)

    createObjectUrl.mockRestore()
    revokeObjectUrl.mockRestore()
    anchorClick.mockRestore()
  })
})
