import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  ApiError,
  DEFAULT_TIMEOUT_MS,
  getApiBaseUrl,
  request,
  resolveRequestUrl,
} from './apiClient'

describe('apiClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('URL resolution', () => {
    it('returns relative path as-is when VITE_API_BASE_URL is unset', () => {
      vi.stubEnv('VITE_API_BASE_URL', '')
      expect(getApiBaseUrl()).toBe('')
      expect(resolveRequestUrl('/api/test')).toBe('/api/test')
    })

    it('prefixes relative path with VITE_API_BASE_URL and normalizes slashes', () => {
      vi.stubEnv('VITE_API_BASE_URL', 'https://api.veritasor.dev///')
      expect(getApiBaseUrl()).toBe('https://api.veritasor.dev')
      expect(resolveRequestUrl('/api/test')).toBe('https://api.veritasor.dev/api/test')
      expect(resolveRequestUrl('api/test')).toBe('https://api.veritasor.dev/api/test')
    })

    it('allows explicit baseUrl override and preserves absolute URLs', () => {
      expect(resolveRequestUrl('/health', 'https://override.example.com/')).toBe(
        'https://override.example.com/health',
      )
      expect(resolveRequestUrl('https://other.example.com/ping', 'https://override.example.com')).toBe(
        'https://other.example.com/ping',
      )
    })
  })

  describe('successful requests', () => {
    it('parses JSON response on GET', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: true, items: [1, 2] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      vi.stubGlobal('fetch', mockFetch)

      const data = await request<{ ok: boolean; items: number[] }>('/api/items')

      expect(data).toEqual({ ok: true, items: [1, 2] })
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/items',
        expect.objectContaining({
          method: 'GET',
          signal: expect.any(AbortSignal),
        }),
      )
      const init = mockFetch.mock.calls[0][1] as RequestInit
      expect(init.headers).toBeUndefined()
    })

    it('serializes JSON body and sets Content-Type header', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ saved: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      vi.stubGlobal('fetch', mockFetch)

      const data = await request('/api/v1/preferences/density', {
        method: 'PUT',
        body: { workspace: 'acme', density: 'compact' },
      })

      expect(data).toEqual({ saved: true })
      const init = mockFetch.mock.calls[0][1] as RequestInit
      expect(init.body).toBe(JSON.stringify({ workspace: 'acme', density: 'compact' }))
      expect(init.headers).toEqual({ 'Content-Type': 'application/json' })
    })

    it('preserves caller Content-Type header when provided', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      vi.stubGlobal('fetch', mockFetch)

      await request('/api/custom', {
        method: 'POST',
        headers: { 'content-type': 'application/merge-patch+json', 'X-Trace': '1' },
        body: { a: 1 },
      })

      const init = mockFetch.mock.calls[0][1] as RequestInit
      expect(init.headers).toEqual({
        'content-type': 'application/merge-patch+json',
        'X-Trace': '1',
      })
    })

    it('sends FormData without setting Content-Type header', async () => {
      const formData = new FormData()
      formData.append('name', 'acme')

      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ id: '123' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      vi.stubGlobal('fetch', mockFetch)

      const data = await request('/api/upload', {
        method: 'POST',
        body: formData,
      })

      expect(data).toEqual({ id: '123' })
      const init = mockFetch.mock.calls[0][1] as RequestInit
      expect(init.body).toBe(formData)
      expect(init.headers).toBeUndefined()
    })

    it('sends string body as-is and forwards cache and credentials', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response('hello', {
          status: 200,
          headers: { 'Content-Type': 'text/plain' },
        }),
      )
      vi.stubGlobal('fetch', mockFetch)

      const text = await request<string>('/api/raw', {
        method: 'POST',
        body: 'raw-payload',
        cache: 'no-store',
        credentials: 'include',
        parseAs: 'text',
      })

      expect(text).toBe('hello')
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/raw',
        expect.objectContaining({
          method: 'POST',
          body: 'raw-payload',
          cache: 'no-store',
          credentials: 'include',
        }),
      )
    })

    it('returns undefined for HEAD and 204 No Content responses', async () => {
      const headFetch = vi.fn().mockResolvedValue({ ok: true })
      vi.stubGlobal('fetch', headFetch)

      const headResult = await request('https://api.example.com', { method: 'HEAD' })
      expect(headResult).toBeUndefined()

      const noContentFetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
      vi.stubGlobal('fetch', noContentFetch)

      const noContentResult = await request('/api/item/1', { method: 'DELETE' })
      expect(noContentResult).toBeUndefined()
    })
  })

  describe('HTTP error responses (4xx and 5xx)', () => {
    it('throws non-retryable ApiError for 4xx with JSON error body', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          new Response(JSON.stringify({ code: 'INVALID_INPUT', message: 'Workspace is required' }), {
            status: 400,
            statusText: 'Bad Request',
            headers: { 'Content-Type': 'application/json' },
          }),
        ),
      )

      await expect(request('/api/test')).rejects.toMatchObject({
        name: 'ApiError',
        status: 400,
        code: 'INVALID_INPUT',
        message: 'Workspace is required',
        retryable: false,
      })
    })

    it('extracts error field from JSON error body when message is absent', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          new Response(JSON.stringify({ error: 'Unauthorized access' }), {
            status: 401,
            statusText: 'Unauthorized',
            headers: { 'Content-Type': 'application/json' },
          }),
        ),
      )

      await expect(request('/api/test')).rejects.toMatchObject({
        status: 401,
        code: 'HTTP_401',
        message: 'Unauthorized access',
        retryable: false,
      })
    })

    it('falls back to statusText when JSON error body is malformed or empty', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          new Response('not-json', {
            status: 422,
            statusText: 'Unprocessable Entity',
            headers: { 'Content-Type': 'application/json' },
          }),
        ),
      )

      await expect(request('/api/test')).rejects.toMatchObject({
        status: 422,
        code: 'HTTP_422',
        message: 'Unprocessable Entity',
        retryable: false,
      })
    })

    it('parses plain text error body and marks 429/408 as retryable', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          new Response('Too many requests, slow down', {
            status: 429,
            statusText: 'Too Many Requests',
            headers: { 'Content-Type': 'text/plain' },
          }),
        ),
      )

      await expect(request('/api/test')).rejects.toMatchObject({
        status: 429,
        code: 'HTTP_429',
        message: 'Too many requests, slow down',
        retryable: true,
      })
    })

    it('throws retryable ApiError for 5xx responses', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          new Response('Internal Server Error', {
            status: 500,
            statusText: 'Internal Server Error',
            headers: { 'Content-Type': 'text/plain' },
          }),
        ),
      )

      try {
        await request('/api/test')
        expect.unreachable('should have thrown')
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError)
        const apiErr = err as ApiError
        expect(apiErr.status).toBe(500)
        expect(apiErr.code).toBe('HTTP_500')
        expect(apiErr.retryable).toBe(true)
      }
    })

    it('handles minimal non-OK response objects gracefully', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))

      await expect(request('/api/test')).rejects.toMatchObject({
        status: 0,
        code: 'HTTP_0',
        retryable: false,
      })
    })
  })

  describe('invalid response payloads', () => {
    it('throws INVALID_RESPONSE when content-type is not JSON', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          new Response('<html><body>SPA</body></html>', {
            status: 200,
            headers: { 'Content-Type': 'text/html' },
          }),
        ),
      )

      await expect(request('/api/test')).rejects.toMatchObject({
        status: 200,
        code: 'INVALID_RESPONSE',
        message: 'Invalid response from server: expected JSON response.',
        retryable: false,
      })
    })

    it('throws INVALID_RESPONSE when JSON parsing fails', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          new Response('{broken-json', {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        ),
      )

      await expect(request('/api/test')).rejects.toMatchObject({
        status: 200,
        code: 'INVALID_RESPONSE',
        message: 'Invalid response from server: failed to parse JSON response.',
        retryable: false,
      })
    })
  })

  describe('network failure, timeout, and abort', () => {
    it('throws retryable NETWORK_ERROR when fetch rejects with TypeError', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

      await expect(request('/api/test')).rejects.toMatchObject({
        status: 0,
        code: 'NETWORK_ERROR',
        message: 'Failed to fetch',
        retryable: true,
      })
    })

    it('throws retryable NETWORK_ERROR when fetch rejects with a non-Error value', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue('offline'))

      await expect(request('/api/test')).rejects.toMatchObject({
        status: 0,
        code: 'NETWORK_ERROR',
        message: 'Network error',
        retryable: true,
      })
    })

    it('throws retryable TIMEOUT when request exceeds timeoutMs', async () => {
      vi.useFakeTimers()

      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
          return new Promise((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => {
              const abortErr = new Error('The operation was aborted')
              abortErr.name = 'AbortError'
              reject(abortErr)
            })
          })
        }),
      )

      const promise = request('/api/slow', { timeoutMs: 250 })
      const expectation = expect(promise).rejects.toMatchObject({
        status: 0,
        code: 'TIMEOUT',
        message: 'Request timed out after 250ms',
        retryable: true,
      })

      await vi.advanceTimersByTimeAsync(250)
      await expectation
    })

    it('uses 15s default timeout', () => {
      expect(DEFAULT_TIMEOUT_MS).toBe(15_000)
    })

    it('throws non-retryable ABORTED immediately when caller signal is already aborted', async () => {
      const controller = new AbortController()
      controller.abort()
      const mockFetch = vi.fn()
      vi.stubGlobal('fetch', mockFetch)

      await expect(request('/api/test', { signal: controller.signal })).rejects.toMatchObject({
        status: 0,
        code: 'ABORTED',
        message: 'Request was aborted',
        retryable: false,
      })
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('throws non-retryable ABORTED when caller aborts mid-flight', async () => {
      const controller = new AbortController()

      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
          return new Promise((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => {
              const abortErr = new Error('Aborted')
              abortErr.name = 'AbortError'
              reject(abortErr)
            })
          })
        }),
      )

      const promise = request('/api/cancel-me', { signal: controller.signal, timeoutMs: 0 })
      controller.abort()

      await expect(promise).rejects.toMatchObject({
        status: 0,
        code: 'ABORTED',
        message: 'Request was aborted',
        retryable: false,
      })
    })
  })
})
