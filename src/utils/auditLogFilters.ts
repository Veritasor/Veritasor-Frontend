/**
 * auditLogFilters — Pure types and URL contract for the audit-log
 * saved-filters feature (issue #236).
 *
 * This module is intentionally free of React, DOM, browser-storage, and
 * i18n imports so that it is trivially unit-testable and can be reused by
 * the modal, dropdown, hook, and tests.
 *
 * ─── URL contract ─────────────────────────────────────────────────────
 * The URL is the single source of truth for the *active* filter state.
 * Saved filters are persisted to localStorage but applied by writing
 * their `searchParams` string back into the URL.
 *
 *   ?q=<text>                       text search (case-insensitive substring)
 *   ?status=verified,failed         comma-separated chip IDs (sorted, deduped)
 *   ?from=YYYY-MM-DD                inclusive range start
 *   ?to=YYYY-MM-DD                  inclusive range end
 *
 * Notes:
 *   - `serializeFilterState` sorts multi-value fields so two equivalent
 *     selections always produce the same URL string (deep equality).
 *   - Malformed values (trash dates, unknown chips) are tolerated and
 *     stripped on parse — it must never throw on user-controlled input.
 *   - Workspace namespacing happens *outside* the URL — see
 *     `savedFilterStorageKey`.
 */

export interface FilterState {
  query: string
  activeChips: string[]
  dateFrom: string
  dateTo: string
}

export const EMPTY_FILTER_STATE: FilterState = Object.freeze({
  query: '',
  activeChips: [],
  dateFrom: '',
  dateTo: '',
})

export interface SavedFilter {
  id: string
  /** Lower-cased id used for case-insensitive dup detection. */
  name: string
  /** Canonical, pre-serialized URL query string (with leading "?"). */
  searchParams: string
  /** ISO timestamp of when the filter was first saved. */
  createdAt: string
  /** ISO timestamp updated whenever rename() is called. */
  updatedAt: string
}

// ─── Constants ────────────────────────────────────────────────────────────

export const MAX_FILTER_NAME_LENGTH = 50
export const MAX_FILTERS_PER_WORKSPACE = 50

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

// ─── Pure helpers ─────────────────────────────────────────────────────────

function dedupeSorted(items: string[]): string[] {
  return Array.from(new Set(items.filter(Boolean))).sort((a, b) =>
    a < b ? -1 : a > b ? 1 : 0,
  )
}

/** Returns true iff `date` looks like a valid `YYYY-MM-DD` string. */
export function isValidIsoDate(date: string): boolean {
  if (!DATE_RE.test(date)) return false
  const parsed = new Date(`${date}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(date)
}

/** Returns true iff the given filter state represents "no filter at all". */
export function isFilterEmpty(state: FilterState): boolean {
  return (
    state.query === '' &&
    state.activeChips.length === 0 &&
    state.dateFrom === '' &&
    state.dateTo === ''
  )
}

// ─── URL ↔ FilterState bridge ─────────────────────────────────────────────

/**
 * Serializes a FilterState into a *canonical* URL query string.
 * Sorts multi-value fields so equivalent states always round-trip to
 * the same string. Comma is a reserved character in URLs but is
 * *safe* within the query component, so we hand-format the string
 * to keep the output human-readable (otherwise `URLSearchParams` would
 * percent-encode the comma to `%2C`, which is harder to read in tests
 * and in the address bar).
 */
export function serializeFilterState(state: FilterState): string {
  const pairs: string[] = []
  if (state.query.trim()) pairs.push(`q=${encodeURIComponent(state.query.trim())}`)
  if (state.activeChips.length > 0) {
    pairs.push(
      `status=${dedupeSorted(state.activeChips).map(encodeURIComponent).join(',')}`,
    )
  }
  if (isValidIsoDate(state.dateFrom)) pairs.push(`from=${state.dateFrom}`)
  if (isValidIsoDate(state.dateTo)) pairs.push(`to=${state.dateTo}`)
  return pairs.length ? `?${pairs.join('&')}` : ''
}

/**
 * Parses URL search params into a typed FilterState.
 * Malformed values are silently dropped; never throws.
 */
export function parseFilterUrl(searchParams: URLSearchParams): FilterState {
  const safeGet = (key: string) => {
    try {
      return searchParams.get(key) ?? ''
    } catch {
      return ''
    }
  }

  const query = safeGet('q').trim()
  const chipsRaw = safeGet('status')
  const activeChips = chipsRaw
    ? dedupeSorted(
        chipsRaw
          .split(',')
          .map((c) => c.trim())
          .filter(Boolean),
      )
    : []
  const dateFrom = isValidIsoDate(safeGet('from')) ? safeGet('from') : ''
  const dateTo = isValidIsoDate(safeGet('to')) ? safeGet('to') : ''

  return { query, activeChips, dateFrom, dateTo }
}

/** Returns the FilterState parsed from the current URL. (Browser only.) */
export function readFilterStateFromLocation(): FilterState {
  if (typeof window === 'undefined') return { ...EMPTY_FILTER_STATE }
  return parseFilterUrl(new URL(window.location.href).searchParams)
}

// ─── Saved filter id & namespacing ────────────────────────────────────────

/**
 * Produces a URL-safe, collision-resistant id from a millisecond clock
 * and 6 random base36 chars.
 *
 * This is *not* intended to be cryptographically secure — saved filters
 * live in localStorage and are not security-sensitive.
 */
export function makeSavedFilterId(): string {
  const time = Date.now().toString(36)
  const rand = Math.floor(Math.random() * 36 ** 6)
    .toString(36)
    .padStart(6, '0')
  return `flt_${time}_${rand}`
}

/**
 * Returns the localStorage key used to persist saved filters for the
 * given workspace. Centralised so every read/write is consistent.
 */
export function savedFilterStorageKey(workspaceId: string): string {
  const safeId = workspaceId.replace(/[^a-zA-Z0-9_-]/g, '') || 'default'
  return `veritasor.savedAuditFilters.${safeId}`
}

// ─── Validation ───────────────────────────────────────────────────────────

export type ValidationResult =
  | { ok: true; name: string }
  | { ok: false; reason: 'empty' | 'too_long' | 'duplicate' | 'invalid_chars' }

/**
 * Validates a user-supplied saved-filter name. Trims whitespace and
 * collapses internal runs of whitespace. Returns the canonical name
 * on success.
 */
export function validateFilterName(
  raw: string,
  existingNames: readonly string[],
): ValidationResult {
  const collapsed = raw.trim().replace(/\s+/g, ' ')
  if (collapsed.length === 0) return { ok: false, reason: 'empty' }
  if (collapsed.length > MAX_FILTER_NAME_LENGTH)
    return { ok: false, reason: 'too_long' }
  // Disallow control characters and characters that break URL/dropdown rendering.
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(collapsed))
    return { ok: false, reason: 'invalid_chars' }
  const lower = collapsed.toLowerCase()
  if (existingNames.some((n) => n.toLowerCase() === lower))
    return { ok: false, reason: 'duplicate' }
  return { ok: true, name: collapsed }
}

/**
 * Filters a list of saved filters against a target FilterState,
 * returning the matching filter if one exists. Used for the
 * "applied saved filter" affordance.
 */
export function findMatchingSavedFilter(
  saved: readonly SavedFilter[],
  state: FilterState,
): SavedFilter | undefined {
  const target = serializeFilterState(state)
  if (!target) return undefined
  return saved.find((f) => f.searchParams === target)
}
