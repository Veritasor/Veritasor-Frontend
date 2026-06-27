import { useId, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

// ─── Public types ──────────────────────────────────────────────────────────

export type ChipDef = {
  id: string
  label: string
  /** Maps to a semantic color variant on the active chip */
  color?: 'success' | 'warning' | 'danger'
}

export type FilterState = {
  query: string
  activeChips: string[]
  dateFrom: string
  dateTo: string
}

export type SearchFilterProps = {
  placeholder?: string
  chips?: ChipDef[]
  /** Enables the collapsible date-range panel */
  showDateRange?: boolean
  /** Filtered count — used for the aria-live announcement */
  resultCount: number
  /** Total unfiltered count */
  totalCount: number
  /** Singular noun for the entity being filtered, e.g. "attestation" */
  entityLabel?: string
}

// ─── URL ↔ FilterState bridge ─────────────────────────────────────────────

/**
 * Parses the current URLSearchParams into a typed FilterState.
 * Export this so parent pages can derive the same state to filter their data.
 *
 * URL contract:
 *   ?q=<text>                       text search
 *   ?status=verified,pending        comma-separated chip IDs
 *   ?from=YYYY-MM-DD                date-range start (inclusive)
 *   ?to=YYYY-MM-DD                  date-range end (inclusive)
 */
export function parseFilterState(params: URLSearchParams): FilterState {
  return {
    query: params.get('q') ?? '',
    activeChips: (params.get('status') ?? '').split(',').filter(Boolean),
    dateFrom: params.get('from') ?? '',
    dateTo: params.get('to') ?? '',
  }
}

// ─── Component ────────────────────────────────────────────────────────────

export default function SearchFilter({
  placeholder = 'Search…',
  chips = [],
  showDateRange = false,
  resultCount,
  totalCount,
  entityLabel = 'result',
}: SearchFilterProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [viewCopied, setViewCopied] = useState(false)
  const panelId = useId()

  const filters = parseFilterState(searchParams)
  const hasActive =
    filters.query !== '' ||
    filters.activeChips.length > 0 ||
    filters.dateFrom !== '' ||
    filters.dateTo !== ''

  // ── URL writers ──────────────────────────────────────────────────────────

  function setParam(key: string, value: string) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value) next.set(key, value)
        else next.delete(key)
        return next
      },
      { replace: true },
    )
  }

  function toggleChip(chipId: string) {
    const next = filters.activeChips.includes(chipId)
      ? filters.activeChips.filter((c) => c !== chipId)
      : [...filters.activeChips, chipId]
    setParam('status', next.join(','))
  }

  function clearAll() {
    setSearchParams({}, { replace: true })
    setAdvancedOpen(false)
  }

  async function saveView() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setViewCopied(true)
      setTimeout(() => setViewCopied(false), 2000)
    } catch {
      // clipboard unavailable — silently ignore
    }
  }

  // ── Derived labels ────────────────────────────────────────────────────────

  const plural = `${entityLabel}s`
  const resultLabel =
    totalCount === 0
      ? `No ${plural}`
      : resultCount === totalCount
        ? `Showing all ${totalCount} ${plural}`
        : `Showing ${resultCount} of ${totalCount} ${plural}`

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="sf-root">
      {/* ── Search input ─────────────────────────────────────────────────── */}
      <div className="sf-search-wrap">
        <span aria-hidden="true" className="sf-search-icon">⌕</span>
        <input
          type="search"
          className="sf-search-input"
          placeholder={placeholder}
          value={filters.query}
          onChange={(e) => setParam('q', e.target.value)}
          aria-label={placeholder}
        />
        {filters.query && (
          <button
            type="button"
            className="sf-search-clear"
            aria-label="Clear search"
            onClick={() => setParam('q', '')}
          >
            <span aria-hidden="true">✕</span>
          </button>
        )}
      </div>

      {/* ── Chips row ────────────────────────────────────────────────────── */}
      <div className="sf-chips-row">
        <div className="sf-chips" role="group" aria-label="Filter by status">
          {/* "All" chip — active when no chips are selected */}
          <button
            type="button"
            className={`sf-chip${filters.activeChips.length === 0 ? ' sf-chip-active' : ''}`}
            aria-pressed={filters.activeChips.length === 0}
            onClick={() => setParam('status', '')}
          >
            All
          </button>

          {chips.map((chip) => {
            const active = filters.activeChips.includes(chip.id)
            const colorClass = chip.color ? ` sf-chip-${chip.color}` : ''
            return (
              <button
                key={chip.id}
                type="button"
                className={`sf-chip${colorClass}${active ? ' sf-chip-active' : ''}`}
                aria-pressed={active}
                onClick={() => toggleChip(chip.id)}
              >
                {chip.label}
              </button>
            )
          })}
        </div>

        {/* ── Right-side actions ───────────────────────────────────────── */}
        <div className="sf-chips-actions">
          {showDateRange && (
            <button
              type="button"
              className="sf-advanced-toggle"
              aria-expanded={advancedOpen}
              aria-controls={panelId}
              onClick={() => setAdvancedOpen((o) => !o)}
            >
              Date range
              <span aria-hidden="true" className="sf-chevron">
                {advancedOpen ? '▲' : '▼'}
              </span>
            </button>
          )}

          {hasActive && (
            <button type="button" className="sf-clear-all" onClick={clearAll}>
              Clear all
            </button>
          )}

          <button
            type="button"
            className="sf-save-view"
            onClick={saveView}
            aria-label={
              viewCopied
                ? 'Link copied to clipboard'
                : 'Save current view — copies shareable link to clipboard'
            }
          >
            {viewCopied ? 'Copied!' : 'Save view'}
          </button>
        </div>
      </div>

      {/* ── Advanced date-range panel ─────────────────────────────────── */}
      {showDateRange && advancedOpen && (
        <div id={panelId} className="sf-advanced">
          <div className="sf-date-grid">
            <div className="sf-date-field">
              <label className="sf-date-label" htmlFor="sf-date-from">
                From
              </label>
              <input
                id="sf-date-from"
                type="date"
                className="sf-date-input"
                value={filters.dateFrom}
                onChange={(e) => setParam('from', e.target.value)}
              />
            </div>
            <div className="sf-date-field">
              <label className="sf-date-label" htmlFor="sf-date-to">
                To
              </label>
              <input
                id="sf-date-to"
                type="date"
                className="sf-date-input"
                value={filters.dateTo}
                onChange={(e) => setParam('to', e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Result count — announced to screen readers ────────────────── */}
      <p
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sf-results"
      >
        {resultLabel}
      </p>
    </div>
  )
}
