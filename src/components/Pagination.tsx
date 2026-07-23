import { useId } from 'react'
import type { PaginationResult } from '../hooks/usePagination'
import { useIsMobile } from '../hooks/useIsMobile'

// ─── Public types ──────────────────────────────────────────────────────────

export type PaginationProps = {
  /** Return value of usePagination(totalItems, options) — shared with the caller's data slicing. */
  pagination: PaginationResult
  /** Total unfiltered/unsliced item count — used for the aria-live announcement. */
  totalItems: number
  /** Singular noun for the entity being paginated, e.g. "attestation". */
  entityLabel?: string
  /** Hide the "Items per page" selector (numbered variant only). Default: true */
  showPageSizeSelector?: boolean
}

// ─── Page-number windowing ─────────────────────────────────────────────────

/**
 * Windowed list of page numbers with '…' gap markers, e.g.
 * total=20, current=10, siblingCount=1 -> [1, '…', 9, 10, 11, '…', 20].
 * Falls back to the full sequential list once it already fits without gaps.
 */
export function getPageWindow(current: number, total: number, siblingCount = 1): (number | '…')[] {
  const totalNumbers = siblingCount * 2 + 5 // first + last + current + 2 siblings + 2 ellipses worth of slack
  if (total <= totalNumbers) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  const left = Math.max(current - siblingCount, 2)
  const right = Math.min(current + siblingCount, total - 1)
  const showLeftEllipsis = left > 2
  const showRightEllipsis = right < total - 1

  const pages: (number | '…')[] = [1]
  if (showLeftEllipsis) pages.push('…')
  for (let i = left; i <= right; i++) pages.push(i)
  if (showRightEllipsis) pages.push('…')
  pages.push(total)
  return pages
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function Pagination({
  pagination,
  totalItems,
  entityLabel = 'result',
  showPageSizeSelector = true,
}: PaginationProps) {
  const isMobile = useIsMobile()
  const pageSizeId = useId()
  const {
    page,
    pageSize,
    pageSizeOptions,
    totalPages,
    startIndex,
    endIndex,
    cumulativeEndIndex,
    hasMore,
    setPage,
    setPageSize,
    loadMore,
  } = pagination

  const plural = `${entityLabel}s`
  const singlePage = totalPages <= 1

  let statusText: string
  if (totalItems === 0) {
    statusText = `No ${plural}`
  } else if (isMobile) {
    statusText = hasMore
      ? `Showing ${cumulativeEndIndex} of ${totalItems} ${plural}`
      : `Showing all ${totalItems} ${plural}`
  } else if (singlePage) {
    statusText = `Showing all ${totalItems} ${plural}`
  } else {
    statusText = `Showing ${startIndex + 1}–${endIndex} of ${totalItems} ${plural}`
  }

  return (
    <div className="pg-root">
      {/* Single shared live region — always mounted so screen readers pick up
          text changes, regardless of which variant below is rendered. */}
      <p role="status" aria-live="polite" aria-atomic="true" className="pg-status">
        {statusText}
      </p>

      {!singlePage && isMobile && (
        <div className="pg-loadmore">
          {hasMore && (
            <button type="button" className="pg-loadmore-btn" onClick={loadMore}>
              Load more
            </button>
          )}
        </div>
      )}

      {!singlePage && !isMobile && (
        <nav aria-label="Pagination" className="pg-numbered">
          <button
            type="button"
            className="pg-nav-btn"
            onClick={() => setPage(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
          >
            <span aria-hidden="true">‹</span> Prev
          </button>

          <ul className="pg-pages">
            {getPageWindow(page, totalPages).map((entry, index) =>
              entry === '…' ? (
                <li key={`ellipsis-${index}`} className="pg-ellipsis" aria-hidden="true">
                  …
                </li>
              ) : (
                <li key={entry}>
                  <button
                    type="button"
                    className={`pg-page-btn${entry === page ? ' pg-page-btn-active' : ''}`}
                    aria-current={entry === page ? 'page' : undefined}
                    aria-label={`Page ${entry}`}
                    onClick={() => setPage(entry)}
                  >
                    {entry}
                  </button>
                </li>
              ),
            )}
          </ul>

          <button
            type="button"
            className="pg-nav-btn"
            onClick={() => setPage(page + 1)}
            disabled={page >= totalPages}
            aria-label="Next page"
          >
            Next <span aria-hidden="true">›</span>
          </button>

          {showPageSizeSelector && (
            <div className="pg-page-size">
              <label htmlFor={pageSizeId}>Items per page</label>
              <select
                id={pageSizeId}
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
              >
                {pageSizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
          )}
        </nav>
      )}
    </div>
  )
}
