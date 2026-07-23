import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useSearchParams } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Pagination, { getPageWindow } from '../components/Pagination'
import { parsePaginationParams, usePagination } from '../hooks/usePagination'
import type { PaginationOptions } from '../hooks/usePagination'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Renders the current URL search params in the DOM so tests can assert on them. */
function ParamsDisplay() {
  const [params] = useSearchParams()
  return <div data-testid="params">{params.toString()}</div>
}

function params() {
  return screen.getByTestId('params').textContent ?? ''
}

/** Mocks window.matchMedia so `useIsMobile` reports `matches` for every query. */
function mockViewport(isMobile: boolean) {
  vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
    matches: isMobile,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}

type HarnessProps = {
  totalItems: number
  options?: PaginationOptions
  entityLabel?: string
  showPageSizeSelector?: boolean
}

function Harness({ totalItems, options, entityLabel, showPageSizeSelector }: HarnessProps) {
  const pagination = usePagination(totalItems, options)
  return (
    <>
      <Pagination
        pagination={pagination}
        totalItems={totalItems}
        entityLabel={entityLabel}
        showPageSizeSelector={showPageSizeSelector}
      />
      <ParamsDisplay />
    </>
  )
}

function renderHarness(props: HarnessProps, initialSearch = '') {
  return render(
    <MemoryRouter initialEntries={[`/${initialSearch ? `?${initialSearch}` : ''}`]}>
      <Routes>
        <Route path="/" element={<Harness {...props} />} />
      </Routes>
    </MemoryRouter>,
  )
}

// ─── parsePaginationParams ──────────────────────────────────────────────────

describe('parsePaginationParams', () => {
  it('defaults to page 1 and the default page size when params are absent', () => {
    expect(parsePaginationParams(new URLSearchParams())).toEqual({ page: 1, pageSize: 10 })
  })

  it('parses valid page and pageSize params', () => {
    expect(parsePaginationParams(new URLSearchParams('page=3&pageSize=25'))).toEqual({
      page: 3,
      pageSize: 25,
    })
  })

  it('falls back to page 1 for non-numeric page', () => {
    expect(parsePaginationParams(new URLSearchParams('page=abc')).page).toBe(1)
  })

  it('falls back to page 1 for a fractional page', () => {
    expect(parsePaginationParams(new URLSearchParams('page=2.5')).page).toBe(1)
  })

  it('falls back to page 1 for a page below 1', () => {
    expect(parsePaginationParams(new URLSearchParams('page=0')).page).toBe(1)
    expect(parsePaginationParams(new URLSearchParams('page=-3')).page).toBe(1)
  })

  it('falls back to defaultPageSize for a pageSize not in pageSizeOptions', () => {
    expect(parsePaginationParams(new URLSearchParams('pageSize=999')).pageSize).toBe(10)
  })

  it('respects a custom defaultPageSize and pageSizeOptions', () => {
    const result = parsePaginationParams(new URLSearchParams(), {
      defaultPageSize: 20,
      pageSizeOptions: [20, 40],
    })
    expect(result).toEqual({ page: 1, pageSize: 20 })
  })
})

// ─── getPageWindow ──────────────────────────────────────────────────────────

describe('getPageWindow', () => {
  it('returns the full sequential list when total fits without gaps', () => {
    expect(getPageWindow(1, 1)).toEqual([1])
    expect(getPageWindow(1, 2)).toEqual([1, 2])
    expect(getPageWindow(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  it('shows a right ellipsis only when current is near the start', () => {
    expect(getPageWindow(1, 10)).toEqual([1, 2, '…', 10])
  })

  it('shows a left ellipsis only when current is near the end', () => {
    expect(getPageWindow(10, 10)).toEqual([1, '…', 9, 10])
  })

  it('shows both ellipses when current is in the middle of a long list', () => {
    expect(getPageWindow(5, 10)).toEqual([1, '…', 4, 5, 6, '…', 10])
  })

  it('always includes the first and last page', () => {
    const window_ = getPageWindow(50, 100)
    expect(window_[0]).toBe(1)
    expect(window_[window_.length - 1]).toBe(100)
  })
})

// ─── Pagination — rendering ─────────────────────────────────────────────────

describe('Pagination — single page', () => {
  it('shows "Showing all N" and hides page controls when everything fits on one page', () => {
    renderHarness({ totalItems: 5, options: { defaultPageSize: 10 } })
    expect(screen.getByRole('status')).toHaveTextContent('Showing all 5 results')
    expect(screen.queryByRole('navigation', { name: 'Pagination' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument()
  })

  it('shows "No results" when totalItems is 0', () => {
    renderHarness({ totalItems: 0 })
    expect(screen.getByRole('status')).toHaveTextContent('No results')
  })

  it('uses entityLabel in the announcement', () => {
    renderHarness({ totalItems: 3, entityLabel: 'attestation' })
    expect(screen.getByRole('status')).toHaveTextContent('Showing all 3 attestations')
  })
})

describe('Pagination — numbered (desktop) variant', () => {
  it('announces the current page range', () => {
    renderHarness({ totalItems: 47, options: { defaultPageSize: 10 } })
    expect(screen.getByRole('status')).toHaveTextContent('Showing 1–10 of 47 results')
  })

  it('renders a labelled navigation landmark', () => {
    renderHarness({ totalItems: 47, options: { defaultPageSize: 10 } })
    expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeInTheDocument()
  })

  it('marks the current page with aria-current', () => {
    renderHarness({ totalItems: 47, options: { defaultPageSize: 10 } })
    expect(screen.getByRole('button', { name: 'Page 1' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: 'Page 2' })).not.toHaveAttribute('aria-current')
  })

  it('disables Previous on the first page', () => {
    renderHarness({ totalItems: 47, options: { defaultPageSize: 10 } })
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next page' })).not.toBeDisabled()
  })

  it('disables Next on the last page', () => {
    renderHarness({ totalItems: 47, options: { defaultPageSize: 10 } }, 'page=5')
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Previous page' })).not.toBeDisabled()
  })

  it('clicking Next advances the ?page param', () => {
    renderHarness({ totalItems: 47, options: { defaultPageSize: 10 } })
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }))
    expect(params()).toContain('page=2')
  })

  it('clicking Previous goes back a page', () => {
    renderHarness({ totalItems: 47, options: { defaultPageSize: 10 } }, 'page=3')
    fireEvent.click(screen.getByRole('button', { name: 'Previous page' }))
    expect(params()).toContain('page=2')
  })

  it('clicking a page number jumps directly to it', () => {
    renderHarness({ totalItems: 47, options: { defaultPageSize: 10 } })
    fireEvent.click(screen.getByRole('button', { name: 'Page 3' }))
    expect(params()).toContain('page=3')
  })

  it('renders ellipses for a page count large enough to need windowing', () => {
    renderHarness({ totalItems: 500, options: { defaultPageSize: 10 } }, 'page=25')
    // 500 items / 10 per page = 50 pages; current=25 should show both gaps.
    const list = screen.getByRole('navigation', { name: 'Pagination' })
    expect(list.textContent).toContain('…')
    expect(screen.getByRole('button', { name: 'Page 1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Page 50' })).toBeInTheDocument()
  })

  it('shows an "Items per page" selector by default', () => {
    renderHarness({ totalItems: 47, options: { defaultPageSize: 10 } })
    expect(screen.getByLabelText('Items per page')).toBeInTheDocument()
  })

  it('hides the page-size selector when showPageSizeSelector is false', () => {
    renderHarness({ totalItems: 47, options: { defaultPageSize: 10 }, showPageSizeSelector: false })
    expect(screen.queryByLabelText('Items per page')).not.toBeInTheDocument()
  })

  it('changing the page size updates ?pageSize and resets ?page to 1', () => {
    renderHarness({ totalItems: 47, options: { defaultPageSize: 10 } }, 'page=3')
    fireEvent.change(screen.getByLabelText('Items per page'), { target: { value: '25' } })
    expect(params()).toContain('pageSize=25')
    expect(params()).toContain('page=1')
  })

  it('clamps an out-of-range ?page back to the last valid page', async () => {
    renderHarness({ totalItems: 47, options: { defaultPageSize: 10 } }, 'page=999')
    await act(async () => {})
    expect(params()).toContain('page=5')
    expect(screen.getByRole('button', { name: 'Page 5' })).toHaveAttribute('aria-current', 'page')
  })
})

describe('Pagination — progressive (mobile) variant', () => {
  it('shows a Load more button instead of numbered controls', () => {
    mockViewport(true)
    renderHarness({ totalItems: 47, options: { defaultPageSize: 10 } })
    expect(screen.getByRole('button', { name: 'Load more' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Pagination' })).not.toBeInTheDocument()
  })

  it('announces the cumulative count so far', () => {
    mockViewport(true)
    renderHarness({ totalItems: 47, options: { defaultPageSize: 10 } })
    expect(screen.getByRole('status')).toHaveTextContent('Showing 10 of 47 results')
  })

  it('clicking Load more increases the cumulative count', () => {
    mockViewport(true)
    renderHarness({ totalItems: 47, options: { defaultPageSize: 10 } })
    fireEvent.click(screen.getByRole('button', { name: 'Load more' }))
    expect(params()).toContain('page=2')
    expect(screen.getByRole('status')).toHaveTextContent('Showing 20 of 47 results')
  })

  it('hides the Load more button once everything is loaded', () => {
    mockViewport(true)
    renderHarness({ totalItems: 47, options: { defaultPageSize: 10 } }, 'page=5')
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Showing all 47 results')
  })

  it('does not render a page-size selector', () => {
    mockViewport(true)
    renderHarness({ totalItems: 47, options: { defaultPageSize: 10 } })
    expect(screen.queryByLabelText('Items per page')).not.toBeInTheDocument()
  })
})

// ─── Accessibility ──────────────────────────────────────────────────────────

describe('Pagination — accessibility', () => {
  it('the live region exists before any interaction (not conditionally mounted)', () => {
    renderHarness({ totalItems: 0 })
    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-live', 'polite')
    expect(status).toHaveAttribute('aria-atomic', 'true')
  })

  it('ellipsis markers are hidden from assistive tech', () => {
    renderHarness({ totalItems: 500, options: { defaultPageSize: 10 } }, 'page=25')
    const nav = screen.getByRole('navigation', { name: 'Pagination' })
    const ellipses = nav.querySelectorAll('[aria-hidden="true"]')
    expect(Array.from(ellipses).some((el) => el.textContent === '…')).toBe(true)
  })

  it('Previous/Next buttons use disabled rather than aria-disabled', () => {
    renderHarness({ totalItems: 47, options: { defaultPageSize: 10 } })
    const prev = screen.getByRole('button', { name: 'Previous page' })
    expect(prev).toHaveProperty('disabled', true)
    expect(prev).not.toHaveAttribute('aria-disabled')
  })
})
