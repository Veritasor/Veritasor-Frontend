/**
 * useSavedFilters — workspace-namespaced persistence hook for the
 * audit-log saved-filters feature (issue #236).
 *
 * Persistence model:
 *   - Per-workspace localStorage key: `veritasor.savedAuditFilters.<id>`
 *   - Storage is *only* read/written in the browser.
 *   - We hydrate synchronously inside a lazy initializer so the first
 *     render already reflects the user's list (avoids a flash of empty).
 *   - On rename, we enforce case-insensitive uniqueness within the same
 *     workspace (but do not compare across workspaces).
 *   - On save, we cap the workspace at MAX_FILTERS_PER_WORKSPACE items,
 *     dropping the oldest entry first.
 *
 * The hook returns a stable object with both *data* and *actions*. React
 * callers should depend on the action identities (they are stable) and
 * when in doubt wrap consumers in `useMemo`.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  MAX_FILTERS_PER_WORKSPACE,
  makeSavedFilterId,
  savedFilterStorageKey,
  validateFilterName,
  type SavedFilter,
  type ValidationResult,
} from '../utils/auditLogFilters'

export interface UseSavedFiltersReturn {
  filters: SavedFilter[]
  /** True once the hook has finished reading from localStorage. */
  isHydrated: boolean
  /** Validate and persist a new filter. */
  save: (rawName: string, searchParams: string) => ValidationResult
  rename: (id: string, rawName: string) => ValidationResult
  remove: (id: string) => void
  getById: (id: string) => SavedFilter | undefined
  /** Whether the workspace has hit the per-workspace cap. */
  isFull: boolean
  /** Maximum number of filters allowed in this workspace. */
  maxFilters: number
  /** Maximum name length. */
  maxNameLength: number
}

function readFromStorage(key: string): SavedFilter[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    // Drop malformed entries silently — never throw on user storage.
    return parsed.filter(
      (entry): entry is SavedFilter =>
        Boolean(entry) &&
        typeof entry === 'object' &&
        typeof (entry as SavedFilter).id === 'string' &&
        typeof (entry as SavedFilter).name === 'string' &&
        typeof (entry as SavedFilter).searchParams === 'string',
    )
  } catch {
    return []
  }
}

function writeToStorage(key: string, value: SavedFilter[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Quota or privacy mode — silently drop the write.
  }
}

export function useSavedFilters(workspaceId: string): UseSavedFiltersReturn {
  const key = savedFilterStorageKey(workspaceId)
  // Lazy initializer → first render already has persisted data.
  const [filters, setFilters] = useState<SavedFilter[]>(() => readFromStorage(key))
  const [isHydrated, setIsHydrated] = useState(true)
  const previousEntriesRef = useRef<SavedFilter[]>(filters)

  // Re-hydrate when the workspace key changes (e.g. user switches tenant).
  useEffect(() => {
    const next = readFromStorage(key)
    setFilters(next)
    previousEntriesRef.current = next
    setIsHydrated(true)
  }, [key])

  // Persist whenever the list changes — runs after every mutation as well
  // as on hydration (no-op write is fine; we gate it via a shallow check).
  useEffect(() => {
    if (previousEntriesRef.current === filters) return
    previousEntriesRef.current = filters
    writeToStorage(key, filters)
  }, [filters, key])

  const getById = useCallback(
    (id: string) => filters.find((f) => f.id === id),
    [filters],
  )

  const save = useCallback(
    (rawName: string, searchParams: string): ValidationResult => {
      const existingNames = filters.map((f) => f.name)
      const result = validateFilterName(rawName, existingNames)
      if (!result.ok) return result
      const now = new Date().toISOString()
      const newEntry: SavedFilter = {
        id: makeSavedFilterId(),
        name: result.name,
        searchParams,
        createdAt: now,
        updatedAt: now,
      }
      setFilters((prev) => {
        const next = [
          newEntry,
          ...prev,
        ]
        return next.length > MAX_FILTERS_PER_WORKSPACE
          ? next.slice(0, MAX_FILTERS_PER_WORKSPACE)
          : next
      })
      return { ok: true, name: result.name }
    },
    [filters],
  )

  const rename = useCallback(
    (id: string, rawName: string): ValidationResult => {
      const target = filters.find((f) => f.id === id)
      if (!target) return { ok: false, reason: 'empty' }
      // Exclude the current id from "existing names" so the user can keep
      // the same name during an in-place rename.
      const others = filters.filter((f) => f.id !== id).map((f) => f.name)
      const result = validateFilterName(rawName, others)
      if (!result.ok) return result
      const now = new Date().toISOString()
      setFilters((prev) =>
        prev.map((f) =>
          f.id === id
            ? { ...f, name: result.name, updatedAt: now }
            : f,
        ),
      )
      return { ok: true, name: result.name }
    },
    [filters],
  )

  const remove = useCallback((id: string) => {
    setFilters((prev) => prev.filter((f) => f.id !== id))
  }, [])

  return {
    filters,
    isHydrated,
    save,
    rename,
    remove,
    getById,
    isFull: filters.length >= MAX_FILTERS_PER_WORKSPACE,
    maxFilters: MAX_FILTERS_PER_WORKSPACE,
    maxNameLength: 50,
  }
}
