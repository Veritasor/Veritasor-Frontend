/**
 * useSavedFilters — workspace-namespaced persistence hook for the
 * audit-log saved-filters feature (issue #236).
 *
 * Persistence model:
 *   - Per-workspace localStorage key: `veritasor.savedAuditFilters.<id>`
 *   - Storage is only read or written with Functional consent.
 *   - We hydrate synchronously inside a lazy initializer so the first
 *     render already reflects the user's list (avoids a flash of empty).
 *   - On rename, we enforce case-insensitive uniqueness within the same
 *     workspace (but do not compare across workspaces).
 *   - On save, we cap the workspace at MAX_FILTERS_PER_WORKSPACE items,
 *     dropping the oldest entry first.
 *
 */

import { useCallback, useEffect, useState } from 'react'
import { useFunctionalConsentGrant } from '../state/cookieConsent'
import { readConsentStorage, writeConsentStorage } from '../utils/consentStorage'
import {
  MAX_FILTERS_PER_WORKSPACE,
  makeSavedFilterId,
  savedFilterStorageKey,
  validateFilterName,
  type SavedFilter,
  type ValidationResult,
} from '../utils/auditLogFilters'
import { useOptionalWorkspace } from '../state/workspace'

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

function readFromStorage(key: string, grant?: AbortSignal): SavedFilter[] {
  try {
    const raw = readConsentStorage(key, grant)
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

export function useSavedFilters(workspaceId?: string): UseSavedFiltersReturn {
  const grant = useFunctionalConsentGrant()
  const workspaceCtx = useOptionalWorkspace()
  const effectiveWorkspaceId = workspaceId ?? workspaceCtx?.activeWorkspaceId ?? 'default'
  const key = savedFilterStorageKey(effectiveWorkspaceId)
  const [list, setList] = useState(() => ({
    key,
    grant,
    filters: readFromStorage(key, grant),
    edited: false,
  }))

  // Reset before committing a render in a different workspace or consent state.
  if (list.key !== key || list.grant !== grant) {
    setList({ key, grant, filters: readFromStorage(key, grant), edited: false })
  }

  const { filters } = list
  const updateFilters = useCallback((update: (prev: SavedFilter[]) => SavedFilter[]) => {
    setList((prev) => {
      if (prev.key !== key || prev.grant !== grant || grant?.aborted) return prev
      return { ...prev, filters: update(prev.filters), edited: true }
    })
  }, [key, grant])

  useEffect(() => {
    if (list.edited && list.grant && !list.grant.aborted) {
      writeConsentStorage(list.key, JSON.stringify(list.filters), list.grant)
    }
  }, [list])

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
      updateFilters((prev) => {
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
    [filters, updateFilters],
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
      updateFilters((prev) =>
        prev.map((f) =>
          f.id === id
            ? { ...f, name: result.name, updatedAt: now }
            : f,
        ),
      )
      return { ok: true, name: result.name }
    },
    [filters, updateFilters],
  )

  const remove = useCallback((id: string) => {
    updateFilters((prev) => prev.filter((f) => f.id !== id))
  }, [updateFilters])

  return {
    filters,
    isHydrated: true,
    save,
    rename,
    remove,
    getById,
    isFull: filters.length >= MAX_FILTERS_PER_WORKSPACE,
    maxFilters: MAX_FILTERS_PER_WORKSPACE,
    maxNameLength: 50,
  }
}
