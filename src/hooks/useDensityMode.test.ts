import { FunctionalConsentWrapper, grantFunctionalConsent } from '../test/functional-consent-fixture'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useDensityMode } from './useDensityMode'

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
    expect(localStorage.getItem('veritasor_density_ws-1')).toBe('compact')
  })

  it('reads initial value from localStorage when valid', async () => {
    localStorage.setItem('veritasor_density_ws-2', 'compact')
    fetchMock.mockResolvedValueOnce({ ok: false })

    const { result } = renderHook(() => useDensityMode('ws-2'), { wrapper: FunctionalConsentWrapper })
    expect(result.current.density).toBe('compact')
  })

  it('optimistically updates density and persists via PUT', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: false }) // initial GET
      .mockResolvedValueOnce({ ok: true }) // PUT

    const onPersistError = vi.fn()
    const { result } = renderHook(
      () => useDensityMode('ws-3', { onPersistError }),
      { wrapper: FunctionalConsentWrapper },
    )

    act(() => {
      result.current.setDensity('compact')
    })

    expect(result.current.density).toBe('compact')
    expect(localStorage.getItem('veritasor_density_ws-3')).toBe('compact')

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/v1/preferences/density',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ workspace: 'ws-3', density: 'compact' }),
        }),
      )
    })
    expect(onPersistError).not.toHaveBeenCalled()
  })

  it('reverts density and calls onPersistError when PUT returns non-ok', async () => {
    localStorage.setItem('veritasor_density_ws-4', 'comfortable')
    fetchMock
      .mockResolvedValueOnce({ ok: false }) // initial GET
      .mockResolvedValueOnce({ ok: false, status: 500 }) // PUT failure

    const onPersistError = vi.fn()
    const { result } = renderHook(
      () => useDensityMode('ws-4', { onPersistError }),
      { wrapper: FunctionalConsentWrapper },
    )

    act(() => {
      result.current.setDensity('compact')
    })
    expect(result.current.density).toBe('compact')

    await waitFor(() => {
      expect(result.current.density).toBe('comfortable')
    })
    expect(localStorage.getItem('veritasor_density_ws-4')).toBe('comfortable')
    expect(onPersistError).toHaveBeenCalledWith(
      'Could not save density preference. Changes reverted.',
    )
  })

  it('reverts density and calls onPersistError on network failure', async () => {
    localStorage.setItem('veritasor_density_ws-5', 'compact')
    fetchMock
      .mockResolvedValueOnce({ ok: false }) // initial GET
      .mockRejectedValueOnce(new Error('Network down')) // PUT network error

    const onPersistError = vi.fn()
    const { result } = renderHook(
      () => useDensityMode('ws-5', { onPersistError }),
      { wrapper: FunctionalConsentWrapper },
    )

    act(() => {
      result.current.setDensity('comfortable')
    })
    expect(result.current.density).toBe('comfortable')

    await waitFor(() => {
      expect(result.current.density).toBe('compact')
    })
    expect(localStorage.getItem('veritasor_density_ws-5')).toBe('compact')
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
