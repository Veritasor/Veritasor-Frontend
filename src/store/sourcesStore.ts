/**
 * sourcesStore — shared, persisted revenue-source list.
 *
 * Backed by localStorage so the list survives navigation and page reload.
 * Uses useSyncExternalStore so any component subscribed re-renders on change.
 * Falls back to INITIAL_SOURCES on first load or on corrupt/missing storage.
 */

import { useSyncExternalStore } from 'react'
import { newId } from '../utils/secureRandom'

// ---------------------------------------------------------------------------
// Types (exported so pages don't need to re-declare them)
// ---------------------------------------------------------------------------

export type HealthStatus = 'healthy' | 'warning' | 'error'

export interface Source {
  id: string
  provider: string
  accountLabel: string
  status: HealthStatus
  lastSync: string | null
  /** ISO timestamp when the provider's OAuth token expired, if it has. */
  tokenExpiredAt?: string
}

// ---------------------------------------------------------------------------
// Seed data — used on first load and as fallback for corrupt storage
// ---------------------------------------------------------------------------

export const INITIAL_SOURCES: Source[] = [
  { id: 'src-001', provider: 'Stripe',     accountLabel: 'acct_1A2B3C4D',         status: 'healthy', lastSync: '2026-06-01T14:00:00Z' },
  { id: 'src-002', provider: 'Shopify',    accountLabel: 'my-store.myshopify.com', status: 'warning', lastSync: '2026-05-30T08:15:00Z', tokenExpiredAt: '2026-06-18T00:00:00Z' },
  { id: 'src-003', provider: 'QuickBooks', accountLabel: 'Acme Corp',              status: 'error',   lastSync: '2026-05-20T11:45:00Z', tokenExpiredAt: '2026-05-25T00:00:00Z' },
]

const STORAGE_KEY = 'veritasor-sources-v1'

/** Schema version of the persisted payload. Bump when the stored shape changes. */
export const SOURCES_SCHEMA_VERSION = 1

/** Shape written to localStorage — an envelope carrying the schema version. */
interface PersistedSources {
  version: number
  sources: Source[]
}

// ---------------------------------------------------------------------------
// Validation — rejects payloads that aren't a valid Source[]
// ---------------------------------------------------------------------------

function isValidSource(v: unknown): v is Source {
  if (!v || typeof v !== 'object') return false
  const s = v as Record<string, unknown>
  return (
    typeof s.id === 'string' &&
    typeof s.provider === 'string' &&
    typeof s.accountLabel === 'string' &&
    (s.status === 'healthy' || s.status === 'warning' || s.status === 'error') &&
    (s.lastSync === null || typeof s.lastSync === 'string') &&
    (s.tokenExpiredAt === undefined || typeof s.tokenExpiredAt === 'string')
  )
}

function isValidSources(v: unknown): v is Source[] {
  return Array.isArray(v) && v.every(isValidSource)
}

// ---------------------------------------------------------------------------
// Storage helpers — versioned payload, validated on load
// ---------------------------------------------------------------------------

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/**
 * Normalises a parsed payload to a Source[]:
 * - current-version envelope `{ version, sources }` → validated sources
 * - legacy bare `Source[]` (written before versioning) → validated sources,
 *   re-saved in the versioned envelope on the next write
 * - unknown version or malformed shape → INITIAL_SOURCES (fail closed)
 */
function migrate(parsed: unknown): Source[] {
  if (isRecord(parsed) && 'sources' in parsed) {
    if (parsed.version !== SOURCES_SCHEMA_VERSION) return INITIAL_SOURCES
    return isValidSources(parsed.sources) ? parsed.sources : INITIAL_SOURCES
  }
  // Legacy payload: a bare Source[] under the same key
  if (Array.isArray(parsed)) {
    return isValidSources(parsed) ? parsed : INITIAL_SOURCES
  }
  return INITIAL_SOURCES
}

function parseStored(raw: string): Source[] {
  try {
    return migrate(JSON.parse(raw))
  } catch {
    return INITIAL_SOURCES
  }
}

function readStorage(): Source[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw === null ? INITIAL_SOURCES : parseStored(raw)
  } catch {
    return INITIAL_SOURCES
  }
}

function writeStorage(sources: Source[]): void {
  try {
    const payload: PersistedSources = { version: SOURCES_SCHEMA_VERSION, sources }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // quota exceeded or private browsing — ignore
  }
}

// ---------------------------------------------------------------------------
// External store
// ---------------------------------------------------------------------------

let state: Source[] = readStorage()
const listeners = new Set<() => void>()

function getSnapshot(): Source[] {
  return state
}

function getServerSnapshot(): Source[] {
  return INITIAL_SOURCES
}

function notify(): void {
  for (const l of listeners) l()
}

function setState(next: Source[]): void {
  state = next
  writeStorage(next)
  notify()
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

/**
 * Cross-tab sync: when another tab writes to STORAGE_KEY the browser fires a
 * `storage` event here. Adopt the incoming payload (validated) so every open
 * tab converges on the same list.
 */
function handleStorageEvent(event: StorageEvent): void {
  if (event.key !== null && event.key !== STORAGE_KEY) return
  state = typeof event.newValue === 'string' ? parseStored(event.newValue) : readStorage()
  notify()
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', handleStorageEvent)
}

// ---------------------------------------------------------------------------
// Public store actions
// ---------------------------------------------------------------------------

export const sourcesStore = {
  /** Replace the entire list (used for reorder). */
  setAll(sources: Source[]): void {
    setState(sources)
  },

  /** Prepend a new source. Ignores duplicates (same id). */
  add(source: Source): void {
    if (state.some((s) => s.id === source.id)) return
    setState([source, ...state])
  },

  /** Remove a source by id. */
  remove(id: string): void {
    setState(state.filter((s) => s.id !== id))
  },

  /** Re-insert a previously removed source at its original index (undo support). */
  restore(source: Source, index?: number): void {
    if (state.some((s) => s.id === source.id)) return
    if (index !== undefined && index >= 0 && index <= state.length) {
      const next = [...state]
      next.splice(index, 0, source)
      setState(next)
      return
    }
    setState([...state, source])
  },

  /** Update a single source in-place. */
  update(id: string, patch: Partial<Source>): void {
    setState(state.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  },

  /** Reset to seed data (useful for testing). */
  reset(): void {
    setState(INITIAL_SOURCES)
  },

  /** Read current state without subscribing. */
  getAll(): Source[] {
    return state
  },
}

// ---------------------------------------------------------------------------
// React hook
// ---------------------------------------------------------------------------

export function useSources(): Source[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

// ---------------------------------------------------------------------------
// ID generation for new sources added by the wizard
// ---------------------------------------------------------------------------

export function generateSourceId(): string {
  return newId('src-')
}
