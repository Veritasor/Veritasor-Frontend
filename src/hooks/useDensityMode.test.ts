import { FunctionalConsentWrapper, grantFunctionalConsent } from '../test/functional-consent-fixture'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useDensityMode } from './useDensityMode'

const DENSITY_STORAGE_PREFIX = 'veritasor_density_'

describe('useDensityMode', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    localStorage.clear()
    grantFunctionalConsent()
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('defaults to comfortable and syncs from server on mount', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ density: 'compact' }),
    })

    const { result } = renderHook(() => useDensityMode('ws-1'), { wrapper: FunctionalConsentWrapper })
    expect(result.current.density).toBe('comfortable')

    await waitFor(() => {
      expect(result.current.density).toBe('compact')
    })
    expect(localStorage.getItem(`${DENSITY_STORAGE_PREFIX}ws-1`)).toBe('compact')
  })

  it('updates when another tab changes the preference (StorageEvent)', async () => {
    localStorage.setItem('veritasor_density_ws-x', 'comfortable')
    fetchMock.mockResolvedValue({ ok: false })
    const { result } = renderHook(() => useDensityMode('ws-x'))
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())

    localStorage.setItem('veritasor_density_ws-x', 'compact')
    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'veritasor_density_ws-x',
          newValue: 'compact',
          storageArea: localStorage,
        }),
      )
    })
    expect(result.current.density).toBe('compact')
  })

  it('ignores storage events for other workspaces', async () => {
    localStorage.setItem('veritasor_density_ws-y', 'comfortable')
    fetchMock.mockResolvedValue({ ok: false })
    const { result } = renderHook(() => useDensityMode('ws-y'))
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())

    localStorage.setItem('veritasor_density_ws-y', 'compact')
    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', { key: 'veritasor_density_other', newValue: 'compact' }),
      )
    })
    expect(result.current.density).toBe('comfortable')
  })

  it('reads initial value from localStorage when valid', async () => {
    localStorage.setItem(`${DENSITY_STORAGE_PREFIX}ws-2`, 'compact')
    fetchMock.mockResolvedValueOnce({ ok: false })

    const { result } = renderHook(() => useDensityMode('ws-2'), { wrapper: FunctionalConsentWrapper })
    expect(result.current.density).toBe('compact')
  })

  it('optimistically updates density and persists via PUT', async () => {
    let resolvePut: ((value: unknown) => void) | undefined
    fetchMock
      .mockResolvedValueOnce({ ok: false }) // initial GET
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolvePut = resolve
          }),
      ) // PUT

    const onPersistError = vi.fn()
    const { result } = renderHook(
      () => useDensityMode('ws-3', { onPersistError }),
      { wrapper: FunctionalConsentWrapper },
    )

    act(() => {
      result.current.setDensity('compact')
    })

    // Optimistic update is applied immediately before PUT resolves
    expect(result.current.density).toBe('compact')
    expect(localStorage.getItem(`${DENSITY_STORAGE_PREFIX}ws-3`)).toBe('compact')

    await act(async () => {
      resolvePut?.({ ok: true, status: 200 })
    })

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/v1/preferences/density',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ workspace: 'ws-3', density: 'compact' }),
        }),
      )
    })
    expect(result.current.density).toBe('compact')
    expect(localStorage.getItem(`${DENSITY_STORAGE_PREFIX}ws-3`)).toBe('compact')
    expect(onPersistError).not.toHaveBeenCalled()
  })

  it('reverts density and localStorage and calls onPersistError when PUT returns 500', async () => {
    localStorage.setItem(`${DENSITY_STORAGE_PREFIX}ws-4`, 'comfortable')
    let resolvePut: ((value: unknown) => void) | undefined
    fetchMock
      .mockResolvedValueOnce({ ok: false }) // initial GET
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolvePut = resolve
          }),
      ) // PUT failure

    const onPersistError = vi.fn()
    const { result } = renderHook(
      () => useDensityMode('ws-4', { onPersistError }),
      { wrapper: FunctionalConsentWrapper },
    )

    act(() => {
      result.current.setDensity('compact')
    })
    expect(result.current.density).toBe('compact')
    expect(localStorage.getItem(`${DENSITY_STORAGE_PREFIX}ws-4`)).toBe('compact')

    await act(async () => {
      resolvePut?.({ ok: false, status: 500 })
    })

    await waitFor(() => {
      expect(result.current.density).toBe('comfortable')
    })
    expect(localStorage.getItem(`${DENSITY_STORAGE_PREFIX}ws-4`)).toBe(
      'comfortable',
    )
    expect(onPersistError).toHaveBeenCalledTimes(1)
    expect(onPersistError).toHaveBeenCalledWith(
      'Could not save density preference. Changes reverted.',
    )
  })

  it('reverts density and localStorage and calls onPersistError on network failure', async () => {
    localStorage.setItem(`${DENSITY_STORAGE_PREFIX}ws-5`, 'compact')
    let rejectPut: ((reason?: unknown) => void) | undefined
    fetchMock
      .mockResolvedValueOnce({ ok: false }) // initial GET
      .mockImplementationOnce(
        () =>
          new Promise((_resolve, reject) => {
            rejectPut = reject
          }),
      ) // PUT network error

    const onPersistError = vi.fn()
    const { result } = renderHook(
      () => useDensityMode('ws-5', { onPersistError }),
      { wrapper: FunctionalConsentWrapper },
    )

    act(() => {
      result.current.setDensity('comfortable')
    })
    expect(result.current.density).toBe('comfortable')
    expect(localStorage.getItem(`${DENSITY_STORAGE_PREFIX}ws-5`)).toBe(
      'comfortable',
    )

    await act(async () => {
      rejectPut?.(new Error('Network down'))
    })

    await waitFor(() => {
      expect(result.current.density).toBe('compact')
    })
    expect(localStorage.getItem(`${DENSITY_STORAGE_PREFIX}ws-5`)).toBe('compact')
    expect(onPersistError).toHaveBeenCalledTimes(1)
    expect(onPersistError).toHaveBeenCalledWith(
      'Could not save density preference. Changes reverted.',
    )
  })

  it('aborts in-flight GET request on unmount without throwing', () => {
    const abortError = new DOMException('Aborted', 'AbortError')
    fetchMock.mockRejectedValueOnce(abortError)

    const { unmount } = renderHook(() => useDensityMode('ws-6'), { wrapper: FunctionalConsentWrapper })
    expect(() => unmount()).not.toThrow()
  })
})
