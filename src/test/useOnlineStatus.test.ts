import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { useOnlineStatus } from '../hooks/useOnlineStatus'

describe('useOnlineStatus', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('initialises with navigator.onLine = true', () => {
    vi.stubGlobal('navigator', { onLine: true })
    const { result } = renderHook(() => useOnlineStatus())
    expect(result.current.isOnline).toBe(true)
  })

  it('initialises with navigator.onLine = false', () => {
    vi.stubGlobal('navigator', { onLine: false })
    const { result } = renderHook(() => useOnlineStatus())
    expect(result.current.isOnline).toBe(false)
  })

  it('sets isOnline to false when the offline event fires', () => {
    vi.stubGlobal('navigator', { onLine: true })
    const { result } = renderHook(() => useOnlineStatus())

    act(() => {
      window.dispatchEvent(new Event('offline'))
    })

    expect(result.current.isOnline).toBe(false)
  })

  it('sets isOnline to true when the online event fires', () => {
    vi.stubGlobal('navigator', { onLine: false })
    const { result } = renderHook(() => useOnlineStatus())

    act(() => {
      window.dispatchEvent(new Event('online'))
    })

    expect(result.current.isOnline).toBe(true)
  })

  it('cleans up event listeners on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    const { unmount } = renderHook(() => useOnlineStatus())

    unmount()

    expect(removeSpy).toHaveBeenCalledWith('online', expect.any(Function))
    expect(removeSpy).toHaveBeenCalledWith('offline', expect.any(Function))
  })

  describe('retry', () => {
    it('sets online to true when HEAD probe succeeds', async () => {
      vi.stubGlobal('navigator', { onLine: false })
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({ ok: true }),
      )
      const { result } = renderHook(() => useOnlineStatus('https://api.example.com'))

      await act(async () => {
        await result.current.retry()
      })

      expect(result.current.isOnline).toBe(true)
    })

    it('sets online to false when HEAD probe fails', async () => {
      vi.stubGlobal('navigator', { onLine: true })
      vi.stubGlobal(
        'fetch',
        vi.fn().mockRejectedValue(new Error('network error')),
      )
      const { result } = renderHook(() => useOnlineStatus('https://api.example.com'))

      await act(async () => {
        await result.current.retry()
      })

      expect(result.current.isOnline).toBe(false)
    })

    it('sets online to false when HEAD probe returns non-OK', async () => {
      vi.stubGlobal('navigator', { onLine: true })
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({ ok: false }),
      )
      const { result } = renderHook(() => useOnlineStatus('https://api.example.com'))

      await act(async () => {
        await result.current.retry()
      })

      expect(result.current.isOnline).toBe(false)
    })

    it('falls back to navigator.onLine when no apiBaseUrl is provided', async () => {
      vi.stubGlobal('navigator', { onLine: true })
      const { result } = renderHook(() => useOnlineStatus())

      await act(async () => {
        await result.current.retry()
      })

      expect(result.current.isOnline).toBe(true)
    })

    it('sends HEAD with no-store cache and timeout', async () => {
      vi.stubGlobal('navigator', { onLine: false })
      const fetchMock = vi.fn().mockResolvedValue({ ok: true })
      vi.stubGlobal('fetch', fetchMock)
      const { result } = renderHook(() => useOnlineStatus('https://api.example.com'))

      await act(async () => {
        await result.current.retry()
      })

      expect(fetchMock).toHaveBeenCalledWith('https://api.example.com', {
        method: 'HEAD',
        cache: 'no-store',
        signal: expect.any(AbortSignal),
      })
    })
  })
})
