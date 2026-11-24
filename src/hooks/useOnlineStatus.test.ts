import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useOnlineStatus } from './useOnlineStatus'

describe('useOnlineStatus', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('tracks online and offline window events', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    const { result } = renderHook(() => useOnlineStatus())
    expect(result.current.isOnline).toBe(true)

    act(() => {
      window.dispatchEvent(new Event('offline'))
    })
    expect(result.current.isOnline).toBe(false)

    act(() => {
      window.dispatchEvent(new Event('online'))
    })
    expect(result.current.isOnline).toBe(true)
  })

  it('retry without apiBaseUrl reads navigator.onLine', async () => {
    const onLineSpy = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const { result } = renderHook(() => useOnlineStatus())
    expect(result.current.isOnline).toBe(false)

    onLineSpy.mockReturnValue(true)
    await act(async () => {
      await result.current.retry()
    })
    expect(result.current.isOnline).toBe(true)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('retry with apiBaseUrl sets online on ok HEAD response and offline on error', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const { result } = renderHook(() => useOnlineStatus('/api/health'))

    fetchMock.mockResolvedValueOnce({ ok: true })
    await act(async () => {
      await result.current.retry()
    })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/health',
      expect.objectContaining({ method: 'HEAD', cache: 'no-store' }),
    )
    expect(result.current.isOnline).toBe(true)

    fetchMock.mockResolvedValueOnce({ ok: false })
    await act(async () => {
      await result.current.retry()
    })
    expect(result.current.isOnline).toBe(false)

    fetchMock.mockRejectedValueOnce(new Error('timeout'))
    await act(async () => {
      await result.current.retry()
    })
    expect(result.current.isOnline).toBe(false)
  })
})
