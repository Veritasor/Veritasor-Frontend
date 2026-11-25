export const DENSITY_STORAGE_PREFIX = 'veritasor_density_'
export const SAVED_FILTER_STORAGE_PREFIX = 'veritasor.savedAuditFilters.'

// Essential storage is always permitted. Optional consumers pass their
// category's grant, which can be revoked even in callbacks from older renders.
type StoragePermission = true | AbortSignal | undefined

function isAllowed(permission: StoragePermission): boolean {
  return permission === true || permission?.aborted === false
}

export function readConsentStorage(key: string, permission: StoragePermission): string | null {
  if (!isAllowed(permission)) return null
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeConsentStorage(key: string, value: string, permission: StoragePermission): void {
  if (!isAllowed(permission)) return
  try {
    localStorage.setItem(key, value)
  } catch {
    // Storage may be restricted or full.
  }
}

function removeConsentStorage(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    // Cleanup is best effort when the browser restricts storage.
  }
}

export function clearFunctionalStorage(): void {
  try {
    // Walk backwards so removing a key cannot shift an unvisited index.
    for (let index = localStorage.length - 1; index >= 0; index--) {
      const key = localStorage.key(index)
      if (key?.startsWith(DENSITY_STORAGE_PREFIX) || key?.startsWith(SAVED_FILTER_STORAGE_PREFIX)) {
        removeConsentStorage(key)
      }
    }
  } catch {
    // Storage enumeration may be restricted.
  }
}
