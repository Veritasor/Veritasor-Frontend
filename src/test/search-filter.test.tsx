import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useSearchParams } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SearchFilter, { parseFilterState } from '../components/SearchFilter'
import type { ChipDef, SearchFilterProps } from '../components/SearchFilter'

afterEach(() => cleanup())

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Renders the current URL search params in the DOM so tests can assert on them. */
function ParamsDisplay() {
  const [params] = useSearchParams()
  return <div data-testid="params">{params.toString()}</div>
}

const DEFAULT_CHIPS: ChipDef[] = [
  { id: 'verified', label: 'Verified', color: 'success' },
  { id: 'pending', label: 'Pending', color: 'warning' },
  { id: 'failed', label: 'Failed', color: 'danger' },
]

function renderFilter(
  props: Partial<SearchFilterProps> = {},
  initialSearch = '',
) {
  return render(
    <MemoryRouter initialEntries={[`/${initialSearch ? `?${initialSearch}` : ''}`]}>
      <Routes>
        <Route
          path="/"
          element={
            <>
              <SearchFilter
                resultCount={props.resultCount ?? 6}
                totalCount={props.totalCount ?? 6}
                chips={props.chips ?? DEFAULT_CHIPS}
                placeholder={props.placeholder ?? 'Search…'}
                showDateRange={props.showDateRange ?? false}
                entityLabel={props.entityLabel ?? 'attestation'}
              />
              <ParamsDisplay />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  )
}

function params() {
  return screen.getByTestId('params').textContent ?? ''
}

// ─── parseFilterState ────────────────────────────────────────────────────────

describe('parseFilterState', () => {
  it('returns empty defaults when no params are present', () => {
    const result = parseFilterState(new URLSearchParams())
    expect(result).toEqual({
      query: '',
      activeChips: [],
      dateFrom: '',
      dateTo: '',
    })
  })

  it('parses q param as query', () => {
    expect(parseFilterState(new URLSearchParams('q=hello')).query).toBe('hello')
  })

  it('parses comma-separated status param into activeChips array', () => {
    const result = parseFilterState(new URLSearchParams('status=verified,pending'))
    expect(result.activeChips).toEqual(['verified', 'pending'])
  })

  it('filters out empty strings from status param', () => {
    const result = parseFilterState(new URLSearchParams('status='))
    expect(result.activeChips).toEqual([])
  })

  it('parses from and to date params', () => {
    const result = parseFilterState(new URLSearchParams('from=2026-01-01&to=2026-06-30'))
    expect(result.dateFrom).toBe('2026-01-01')
    expect(result.dateTo).toBe('2026-06-30')
  })
})

// ─── SearchFilter rendering ──────────────────────────────────────────────────

describe('SearchFilter — initial render', () => {
  it('renders a search input with the given placeholder', () => {
    renderFilter({ placeholder: 'Search by ID…' })
    expect(screen.getByRole('searchbox', { name: 'Search by ID…' })).toBeInTheDocument()
  })

  it('renders All chip and all configured status chips', () => {
    renderFilter()
    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Verified' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pending' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Failed' })).toBeInTheDocument()
  })

  it('"All" chip is pressed when no status filter is active', () => {
    renderFilter()
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Verified' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('shows result count when resultCount equals totalCount', () => {
    renderFilter({ resultCount: 6, totalCount: 6 })
    expect(screen.getByRole('status')).toHaveTextContent('Showing all 6 attestations')
  })

  it('shows filtered count when resultCount is less than totalCount', () => {
    renderFilter({ resultCount: 2, totalCount: 6 })
    expect(screen.getByRole('status')).toHaveTextContent('Showing 2 of 6 attestations')
  })

  it('shows "No Xs" when totalCount is 0', () => {
    renderFilter({ resultCount: 0, totalCount: 0 })
    expect(screen.getByRole('status')).toHaveTextContent('No attestations')
  })

  it('uses entityLabel in the count message', () => {
    renderFilter({ resultCount: 3, totalCount: 5, entityLabel: 'source' })
    expect(screen.getByRole('status')).toHaveTextContent('Showing 3 of 5 sources')
  })

  it('does not show Clear all when no filters are active', () => {
    renderFilter()
    expect(screen.queryByRole('button', { name: /clear all/i })).not.toBeInTheDocument()
  })

  it('does not show the date-range panel when showDateRange is false', () => {
    renderFilter()
    expect(screen.queryByRole('button', { name: /date range/i })).not.toBeInTheDocument()
  })

  it('shows the Date range toggle when showDateRange is true', () => {
    renderFilter({ showDateRange: true })
    expect(screen.getByRole('button', { name: /date range/i })).toBeInTheDocument()
  })

  it('does not show the clear-search button when query is empty', () => {
    renderFilter()
    expect(screen.queryByRole('button', { name: /clear search/i })).not.toBeInTheDocument()
  })
})

// ─── URL state on mount ────────────────────────────────────────────────────

describe('SearchFilter — restores state from URL on mount', () => {
  it('populates search input from ?q param', () => {
    renderFilter({}, 'q=merkle123')
    expect(screen.getByRole('searchbox')).toHaveValue('merkle123')
  })

  it('marks the matching status chip as pressed when ?status is set', () => {
    renderFilter({}, 'status=verified')
    expect(screen.getByRole('button', { name: 'Verified' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('shows Clear all when filters are active on load', () => {
    renderFilter({}, 'q=test')
    expect(screen.getByRole('button', { name: /clear all/i })).toBeInTheDocument()
  })
})

// ─── Search input interactions ────────────────────────────────────────────

describe('SearchFilter — search input', () => {
  it('updates ?q URL param when user types', () => {
    renderFilter()
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '0x3a7b' } })
    expect(params()).toContain('q=0x3a7b')
  })

  it('shows clear-search button when query is non-empty', () => {
    renderFilter()
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'test' } })
    expect(screen.getByRole('button', { name: /clear search/i })).toBeInTheDocument()
  })

  it('clears ?q param when clear-search button is clicked', () => {
    renderFilter({}, 'q=hello')
    fireEvent.click(screen.getByRole('button', { name: /clear search/i }))
    expect(params()).not.toContain('q=')
    expect(screen.getByRole('searchbox')).toHaveValue('')
  })

  it('removes clear-search button after clearing', () => {
    renderFilter({}, 'q=hello')
    fireEvent.click(screen.getByRole('button', { name: /clear search/i }))
    expect(screen.queryByRole('button', { name: /clear search/i })).not.toBeInTheDocument()
  })
})

// ─── Chip interactions ────────────────────────────────────────────────────

describe('SearchFilter — status chips', () => {
  it('sets ?status param when a chip is clicked', () => {
    renderFilter()
    fireEvent.click(screen.getByRole('button', { name: 'Verified' }))
    expect(params()).toContain('status=verified')
  })

  it('marks clicked chip as pressed', () => {
    renderFilter()
    fireEvent.click(screen.getByRole('button', { name: 'Pending' }))
    expect(screen.getByRole('button', { name: 'Pending' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('accumulates multiple active chips with comma separation', () => {
    renderFilter({}, 'status=verified')
    fireEvent.click(screen.getByRole('button', { name: 'Pending' }))
    const p = params()
    expect(p).toContain('verified')
    expect(p).toContain('pending')
  })

  it('removes a chip from ?status when clicked while active', () => {
    renderFilter({}, 'status=verified,pending')
    fireEvent.click(screen.getByRole('button', { name: 'Verified' }))
    expect(params()).not.toContain('verified')
    expect(params()).toContain('pending')
  })

  it('"All" chip click clears the ?status param', () => {
    renderFilter({}, 'status=verified')
    fireEvent.click(screen.getByRole('button', { name: 'All' }))
    expect(params()).not.toContain('status=')
  })

  it('"All" chip becomes pressed after clicking it', () => {
    renderFilter({}, 'status=failed')
    fireEvent.click(screen.getByRole('button', { name: 'All' }))
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('shows Clear all button when a chip is active', () => {
    renderFilter()
    fireEvent.click(screen.getByRole('button', { name: 'Failed' }))
    expect(screen.getByRole('button', { name: /clear all/i })).toBeInTheDocument()
  })
})

// ─── Clear all ───────────────────────────────────────────────────────────

describe('SearchFilter — Clear all', () => {
  it('removes all URL params when Clear all is clicked', () => {
    renderFilter({}, 'q=test&status=verified')
    fireEvent.click(screen.getByRole('button', { name: /clear all/i }))
    expect(params()).toBe('')
  })

  it('resets search input to empty after Clear all', () => {
    renderFilter({}, 'q=hello')
    fireEvent.click(screen.getByRole('button', { name: /clear all/i }))
    expect(screen.getByRole('searchbox')).toHaveValue('')
  })

  it('hides Clear all button after clearing', () => {
    renderFilter({}, 'q=test')
    fireEvent.click(screen.getByRole('button', { name: /clear all/i }))
    expect(screen.queryByRole('button', { name: /clear all/i })).not.toBeInTheDocument()
  })
})

// ─── Date-range panel ─────────────────────────────────────────────────────

describe('SearchFilter — date-range panel', () => {
  it('panel is hidden by default', () => {
    renderFilter({ showDateRange: true })
    expect(screen.queryByLabelText(/from/i)).not.toBeInTheDocument()
  })

  it('panel is revealed when toggle is clicked', () => {
    renderFilter({ showDateRange: true })
    fireEvent.click(screen.getByRole('button', { name: /date range/i }))
    expect(screen.getByLabelText('From')).toBeInTheDocument()
    expect(screen.getByLabelText('To')).toBeInTheDocument()
  })

  it('toggle has aria-expanded=false initially', () => {
    renderFilter({ showDateRange: true })
    expect(screen.getByRole('button', { name: /date range/i })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
  })

  it('toggle has aria-expanded=true after opening', () => {
    renderFilter({ showDateRange: true })
    fireEvent.click(screen.getByRole('button', { name: /date range/i }))
    expect(screen.getByRole('button', { name: /date range/i })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
  })

  it('sets ?from param when From date is changed', () => {
    renderFilter({ showDateRange: true })
    fireEvent.click(screen.getByRole('button', { name: /date range/i }))
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-01-01' } })
    expect(params()).toContain('from=2026-01-01')
  })

  it('sets ?to param when To date is changed', () => {
    renderFilter({ showDateRange: true })
    fireEvent.click(screen.getByRole('button', { name: /date range/i }))
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-06-30' } })
    expect(params()).toContain('to=2026-06-30')
  })

  it('shows Clear all when date filter is active', () => {
    renderFilter({ showDateRange: true }, 'from=2026-01-01')
    expect(screen.getByRole('button', { name: /clear all/i })).toBeInTheDocument()
  })

  it('Clear all closes the advanced panel', () => {
    renderFilter({ showDateRange: true }, 'from=2026-01-01')
    fireEvent.click(screen.getByRole('button', { name: /date range/i }))
    fireEvent.click(screen.getByRole('button', { name: /clear all/i }))
    expect(screen.queryByLabelText('From')).not.toBeInTheDocument()
  })
})

// ─── Save view (clipboard) ────────────────────────────────────────────────

describe('SearchFilter — Save view', () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    })
  })

  afterEach(() => vi.useRealTimers())

  it('copies the current URL to clipboard', async () => {
    renderFilter()
    fireEvent.click(screen.getByRole('button', { name: /save current view/i }))
    await act(async () => {})
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('http'),
    )
  })

  it('shows "Copied!" feedback after click', async () => {
    renderFilter()
    fireEvent.click(screen.getByRole('button', { name: /save current view/i }))
    await act(async () => {})
    expect(screen.getByRole('button', { name: /link copied/i })).toBeInTheDocument()
  })

  it('reverts to "Save view" label after 2 s', async () => {
    vi.useFakeTimers()
    renderFilter()
    fireEvent.click(screen.getByRole('button', { name: /save current view/i }))
    // Flush the resolved clipboard promise and the resulting React state update
    await act(async () => {})
    expect(screen.getByRole('button', { name: /link copied/i })).toBeInTheDocument()
    // Advance past the 2-second reset timeout
    act(() => { vi.advanceTimersByTime(2100) })
    expect(screen.getByRole('button', { name: /save current view/i })).toBeInTheDocument()
  })

  it('handles clipboard failure gracefully without throwing', async () => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    })
    renderFilter()
    fireEvent.click(screen.getByRole('button', { name: /save current view/i }))
    // Let the rejected promise be caught silently by saveView
    await act(async () => {})
    expect(screen.getByRole('button', { name: /save current view/i })).toBeInTheDocument()
  })
})

// ─── Accessibility attributes ─────────────────────────────────────────────

describe('SearchFilter — accessibility', () => {
  it('chips group has an accessible label', () => {
    renderFilter()
    expect(screen.getByRole('group', { name: /filter by status/i })).toBeInTheDocument()
  })

  it('result count uses role=status for aria-live', () => {
    renderFilter()
    const el = screen.getByRole('status')
    expect(el).toHaveAttribute('aria-live', 'polite')
    expect(el).toHaveAttribute('aria-atomic', 'true')
  })

  it('advanced toggle references panel via aria-controls', () => {
    renderFilter({ showDateRange: true })
    const toggle = screen.getByRole('button', { name: /date range/i })
    const panelId = toggle.getAttribute('aria-controls')
    expect(panelId).toBeTruthy()
    fireEvent.click(toggle)
    const panel = document.getElementById(panelId!)
    expect(panel).toBeInTheDocument()
  })
})
