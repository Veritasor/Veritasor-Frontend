import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import {
  INITIAL_SOURCES,
  sourcesStore,
  useSources,
  generateSourceId,
  type Source,
} from './sourcesStore'

describe('sourcesStore', () => {
  beforeEach(() => {
    localStorage.clear()
    sourcesStore.reset()
  })

  it('notifies useSources subscribers on add, update, remove, and setAll', () => {
    const { result } = renderHook(() => useSources())
    expect(result.current).toEqual(INITIAL_SOURCES)

    const added: Source = {
      id: 'src-new',
      provider: 'Square',
      accountLabel: 'sq_123',
      status: 'healthy',
      lastSync: null,
    }

    act(() => {
      sourcesStore.add(added)
    })
    expect(result.current[0]).toEqual(added)

    // Duplicate add is ignored
    act(() => {
      sourcesStore.add(added)
    })
    expect(result.current.filter((s) => s.id === 'src-new')).toHaveLength(1)

    act(() => {
      sourcesStore.update('src-new', { status: 'warning' })
    })
    expect(result.current[0].status).toBe('warning')

    act(() => {
      sourcesStore.remove('src-new')
    })
    expect(result.current.find((s) => s.id === 'src-new')).toBeUndefined()

    act(() => {
      sourcesStore.setAll([added])
    })
    expect(result.current).toEqual([added])
    expect(sourcesStore.getAll()).toEqual([added])
  })

  it('restores a removed source at its original index or appends when out of range', () => {
    const removed = INITIAL_SOURCES[1]
    sourcesStore.remove(removed.id)
    expect(sourcesStore.getAll().map((s) => s.id)).toEqual([
      'src-001',
      'src-003',
    ])

    sourcesStore.restore(removed, 1)
    expect(sourcesStore.getAll().map((s) => s.id)).toEqual([
      'src-001',
      'src-002',
      'src-003',
    ])

    // Restoring duplicate id is ignored
    sourcesStore.restore(removed, 0)
    expect(sourcesStore.getAll()).toHaveLength(3)

    // Restoring without index appends to the end
    const extra: Source = {
      id: 'src-extra',
      provider: 'PayPal',
      accountLabel: 'pp_1',
      status: 'healthy',
      lastSync: null,
    }
    sourcesStore.restore(extra)
    expect(sourcesStore.getAll().at(-1)).toEqual(extra)
  })

  it('generates unique source ids with src- prefix', () => {
    const id = generateSourceId()
    expect(id).toMatch(/^src-[a-z0-9]+-[a-z0-9]+$/)
  })
})
