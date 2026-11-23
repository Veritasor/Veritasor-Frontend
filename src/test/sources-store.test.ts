/**
 * sourcesStore unit tests
 *
 * Tests the store's add / reorder / remove / restore / update actions,
 * localStorage persistence, and corrupt-storage fallback.
 */

import { beforeEach, describe, it, expect, vi } from 'vitest'
import {
  sourcesStore,
  INITIAL_SOURCES,
  SOURCES_SCHEMA_VERSION,
  type Source,
} from '../store/sourcesStore'

const STORAGE_KEY = 'veritasor-sources-v1'

interface PersistedPayload {
  version: number
  sources: Source[]
}

function makeSource(overrides: Partial<Source> = {}): Source {
  return {
    id: 'test-id',
    provider: 'TestPay',
    accountLabel: 'test@example.com',
    status: 'healthy',
    lastSync: null,
    ...overrides,
  }
}

function readPersisted(): PersistedPayload {
  return JSON.parse(localStorage.getItem(STORAGE_KEY)!)
}

beforeEach(() => {
  // Reset store and storage before every test
  localStorage.clear()
  sourcesStore.reset()
})

// ─── Initial state ─────────────────────────────────────────────────────────

describe('sourcesStore — initial state', () => {
  it('returns INITIAL_SOURCES when localStorage is empty', () => {
    expect(sourcesStore.getAll()).toEqual(INITIAL_SOURCES)
  })

  it('INITIAL_SOURCES contains three seeds', () => {
    expect(INITIAL_SOURCES).toHaveLength(3)
  })

  it('seed sources have valid shape', () => {
    for (const s of INITIAL_SOURCES) {
      expect(typeof s.id).toBe('string')
      expect(typeof s.provider).toBe('string')
      expect(['healthy', 'warning', 'error']).toContain(s.status)
    }
  })
})

// ─── add ───────────────────────────────────────────────────────────────────

describe('sourcesStore — add', () => {
  it('prepends a new source to the list', () => {
    const source = makeSource({ id: 'new-1', provider: 'Razorpay' })
    sourcesStore.add(source)
    const all = sourcesStore.getAll()
    expect(all[0]).toEqual(source)
    expect(all).toHaveLength(INITIAL_SOURCES.length + 1)
  })

  it('ignores duplicate ids', () => {
    const source = makeSource({ id: INITIAL_SOURCES[0].id })
    sourcesStore.add(source)
    expect(sourcesStore.getAll()).toHaveLength(INITIAL_SOURCES.length)
  })

  it('persists the new source to localStorage', () => {
    const source = makeSource({ id: 'persist-1' })
    sourcesStore.add(source)
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull()
    expect(readPersisted().sources[0].id).toBe('persist-1')
  })
})

// ─── remove ────────────────────────────────────────────────────────────────

describe('sourcesStore — remove', () => {
  it('removes a source by id', () => {
    const id = INITIAL_SOURCES[0].id
    sourcesStore.remove(id)
    expect(sourcesStore.getAll().find((s) => s.id === id)).toBeUndefined()
  })

  it('does nothing for an unknown id', () => {
    sourcesStore.remove('non-existent')
    expect(sourcesStore.getAll()).toHaveLength(INITIAL_SOURCES.length)
  })

  it('persists removal to localStorage', () => {
    const id = INITIAL_SOURCES[0].id
    sourcesStore.remove(id)
    expect(readPersisted().sources.find((s) => s.id === id)).toBeUndefined()
  })
})

// ─── restore ───────────────────────────────────────────────────────────────

describe('sourcesStore — restore', () => {
  it('appends a previously removed source back', () => {
    const removed = INITIAL_SOURCES[0]
    sourcesStore.remove(removed.id)
    sourcesStore.restore(removed)
    expect(sourcesStore.getAll().find((s) => s.id === removed.id)).toEqual(removed)
  })

  it('ignores restore if source already present', () => {
    const existing = INITIAL_SOURCES[0]
    sourcesStore.restore(existing)
    expect(sourcesStore.getAll()).toHaveLength(INITIAL_SOURCES.length)
  })
})

// ─── update ────────────────────────────────────────────────────────────────

describe('sourcesStore — update', () => {
  it('patches status and lastSync for a known id', () => {
    const id = INITIAL_SOURCES[1].id
    sourcesStore.update(id, { status: 'healthy', lastSync: '2026-07-01T00:00:00Z' })
    const updated = sourcesStore.getAll().find((s) => s.id === id)
    expect(updated?.status).toBe('healthy')
    expect(updated?.lastSync).toBe('2026-07-01T00:00:00Z')
  })

  it('leaves other fields untouched', () => {
    const original = INITIAL_SOURCES[0]
    sourcesStore.update(original.id, { status: 'warning' })
    const updated = sourcesStore.getAll().find((s) => s.id === original.id)
    expect(updated?.provider).toBe(original.provider)
    expect(updated?.accountLabel).toBe(original.accountLabel)
  })
})

// ─── setAll (reorder) ──────────────────────────────────────────────────────

describe('sourcesStore — setAll (reorder)', () => {
  it('replaces the list in the given order', () => {
    const reversed = [...INITIAL_SOURCES].reverse()
    sourcesStore.setAll(reversed)
    expect(sourcesStore.getAll().map((s) => s.id)).toEqual(reversed.map((s) => s.id))
  })

  it('persists the new order to localStorage', () => {
    const reversed = [...INITIAL_SOURCES].reverse()
    sourcesStore.setAll(reversed)
    expect(readPersisted().sources.map((s) => s.id)).toEqual(reversed.map((s) => s.id))
  })
})

// ─── localStorage persistence ──────────────────────────────────────────────

/** Re-import the module so its module-level `readStorage()` runs again. */
async function loadFreshStore() {
  vi.resetModules()
  return import('../store/sourcesStore')
}

describe('sourcesStore — persistence', () => {
  it('writes a versioned envelope to localStorage', () => {
    sourcesStore.add(makeSource({ id: 'persisted-1' }))
    const payload = readPersisted()
    expect(payload.version).toBe(SOURCES_SCHEMA_VERSION)
    expect(payload.sources[0].id).toBe('persisted-1')
  })

  it('rehydrates the persisted list on a fresh module load (survives reload)', async () => {
    sourcesStore.add(makeSource({ id: 'reload-1' }))
    const fresh = await loadFreshStore()
    expect(fresh.sourcesStore.getAll().map((s) => s.id)).toEqual([
      'reload-1',
      ...INITIAL_SOURCES.map((s) => s.id),
    ])
  })

  it('rehydrates an empty list without re-seeding', async () => {
    sourcesStore.setAll([])
    const fresh = await loadFreshStore()
    expect(fresh.sourcesStore.getAll()).toEqual([])
  })
})

// ─── corrupt / missing storage fallback ───────────────────────────────────

describe('sourcesStore — corrupt storage fallback', () => {
  it('falls back to INITIAL_SOURCES when storage contains invalid JSON', async () => {
    localStorage.setItem(STORAGE_KEY, '{ this is not json }')
    const fresh = await loadFreshStore()
    expect(fresh.sourcesStore.getAll()).toEqual(fresh.INITIAL_SOURCES)
  })

  it('falls back to INITIAL_SOURCES when storage holds a non-array', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ not: 'a list' }))
    const fresh = await loadFreshStore()
    expect(fresh.sourcesStore.getAll()).toEqual(fresh.INITIAL_SOURCES)
  })

  it('falls back when an item is missing required fields', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: SOURCES_SCHEMA_VERSION, sources: [{ id: 'x' }] }),
    )
    const fresh = await loadFreshStore()
    expect(fresh.sourcesStore.getAll()).toEqual(fresh.INITIAL_SOURCES)
  })

  it('falls back when an item has an invalid status', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: SOURCES_SCHEMA_VERSION,
        sources: [makeSource({ status: 'bogus' as never })],
      }),
    )
    const fresh = await loadFreshStore()
    expect(fresh.sourcesStore.getAll()).toEqual(fresh.INITIAL_SOURCES)
  })

  it('migrates a legacy bare-array payload', async () => {
    const legacy = [makeSource({ id: 'legacy-1' })]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy))
    const fresh = await loadFreshStore()
    expect(fresh.sourcesStore.getAll()).toEqual(legacy)
  })

  it('falls back when the persisted version is unknown', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 999, sources: [makeSource({ id: 'future-1' })] }),
    )
    const fresh = await loadFreshStore()
    expect(fresh.sourcesStore.getAll()).toEqual(fresh.INITIAL_SOURCES)
  })

  it('does not crash when reading storage throws', async () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage blocked')
    })
    const fresh = await loadFreshStore()
    expect(fresh.sourcesStore.getAll()).toEqual(fresh.INITIAL_SOURCES)
    spy.mockRestore()
  })
})

// ─── cross-tab sync (storage event) ───────────────────────────────────────

describe('sourcesStore — cross-tab storage event sync', () => {
  function dispatchStorage(newValue: string | null, key: string = STORAGE_KEY) {
    window.dispatchEvent(new StorageEvent('storage', { key, newValue }))
  }

  it('adopts a valid payload pushed from another tab', () => {
    const incoming = [makeSource({ id: 'other-tab-1', provider: 'PayPal' })]
    dispatchStorage(JSON.stringify({ version: SOURCES_SCHEMA_VERSION, sources: incoming }))
    expect(sourcesStore.getAll()).toEqual(incoming)
  })

  it('ignores storage events for unrelated keys', () => {
    const before = sourcesStore.getAll()
    dispatchStorage(JSON.stringify({ version: SOURCES_SCHEMA_VERSION, sources: [] }), 'other-key')
    expect(sourcesStore.getAll()).toBe(before)
  })

  it('falls back to INITIAL_SOURCES when the incoming payload is corrupt', () => {
    dispatchStorage('{ broken json')
    expect(sourcesStore.getAll()).toEqual(INITIAL_SOURCES)
  })

  it('re-reads storage when the key is removed (newValue null)', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: SOURCES_SCHEMA_VERSION, sources: [makeSource({ id: 'from-storage' })] }),
    )
    dispatchStorage(null)
    expect(sourcesStore.getAll().map((s) => s.id)).toEqual(['from-storage'])
  })
})
