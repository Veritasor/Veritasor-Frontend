import { useCallback, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'

// ─── Public types ──────────────────────────────────────────────────────────

export const DEFAULT_PAGE_SIZE_OPTIONS = [10, 25, 50] as const

export type PaginationOptions = {
  /** Default items per page when ?pageSize is absent or invalid. Default: 10 */
  defaultPageSize?: number
  /** Allowed page sizes — an invalid ?pageSize value falls back to defaultPageSize. */
  pageSizeOptions?: readonly number[]
}

export type PaginationResult = {
  page: number
  pageSize: number
  pageSizeOptions: readonly number[]
  totalPages: number
  /** 0-based, inclusive — start of the current numbered-page window. */
  startIndex: number
  /** 0-based, exclusive — end of the current numbered-page window. */
  endIndex: number
  /** 0-based, exclusive — end of the cumulative range for progressive ("load more") rendering. */
  cumulativeEndIndex: number
  /** Whether more items exist beyond cumulativeEndIndex. */
  hasMore: boolean
  setPage: (page: number) => void
  setPageSize: (size: number) => void
  loadMore: () => void
}

// ─── URL ↔ state bridge ─────────────────────────────────────────────────────

/**
 * URL contract:
 *   ?page=<1-based int>   numbered variant: which page window is shown.
 *                         progressive variant: how many pages have been loaded so far.
 *   ?pageSize=<int>       items per page — must be one of `pageSizeOptions`.
 *
 * Both default silently (page 1 / defaultPageSize) when absent, non-numeric, or
 * out of range — a hand-edited or stale URL never throws or shows a broken state.
 */
export function parsePaginationParams(
  params: URLSearchParams,
  { defaultPageSize = 10, pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS }: PaginationOptions = {},
): { page: number; pageSize: number } {
  const rawPageSize = Number(params.get('pageSize'))
  const pageSize = pageSizeOptions.includes(rawPageSize) ? rawPageSize : defaultPageSize

  const rawPage = Number(params.get('page'))
  const page = Number.isInteger(rawPage) && rawPage >= 1 ? rawPage : 1

  return { page, pageSize }
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function usePagination(totalItems: number, options: PaginationOptions = {}): PaginationResult {
  const { defaultPageSize = 10, pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS } = options
  const [searchParams, setSearchParams] = useSearchParams()

  const { page: requestedPage, pageSize } = parsePaginationParams(searchParams, {
    defaultPageSize,
    pageSizeOptions,
  })

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const page = Math.min(requestedPage, totalPages)

  // If the requested page is out of range (e.g. totalItems shrank), clamp the
  // URL back to the last valid page rather than showing an empty page silently.
  useEffect(() => {
    if (requestedPage !== page) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.set('page', String(page))
          return next
        },
        { replace: true },
      )
    }
  }, [requestedPage, page, setSearchParams])

  const startIndex = (page - 1) * pageSize
  const endIndex = Math.min(page * pageSize, totalItems)
  const cumulativeEndIndex = Math.min(page * pageSize, totalItems)
  const hasMore = cumulativeEndIndex < totalItems

  const setPage = useCallback(
    (next: number) => {
      const clamped = Math.min(Math.max(1, Math.round(next)), totalPages)
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev)
          p.set('page', String(clamped))
          return p
        },
        { replace: true },
      )
    },
    [setSearchParams, totalPages],
  )

  const setPageSize = useCallback(
    (size: number) => {
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev)
          p.set('pageSize', String(size))
          p.set('page', '1')
          return p
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const loadMore = useCallback(() => {
    setPage(page + 1)
  }, [page, setPage])

  return {
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
  }
}
