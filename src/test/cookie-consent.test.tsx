import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import CookieBanner from '../components/CookieBanner'
import {
  CookieConsentContext,
  CookieConsentProvider,
  STORAGE_KEY,
  useCookieConsent,
  useConsent,
} from '../components/CookieConsentContext'
import { useDensityMode } from '../hooks/useDensityMode'
import { useSavedFilters } from '../hooks/useSavedFilters'
import { savedFilterStorageKey } from '../utils/auditLogFilters'
import type { ConsentState } from '../components/CookieConsentContext'

// ─── Helpers ─────────────────────────────────────────────────────────────────

afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.restoreAllMocks()
})


/** Helper component that exercises the context API */
function ConsentConsumer() {
  const { hasDecided, consent, bannerVisible, openSettings } = useCookieConsent()
  const essential = useConsent('essential')
  const functional = useConsent('functional')
  const productCommunications = useConsent('productCommunications')
  return (
    <div>
      <span data-testid="essential">{String(essential)}</span>
      <span data-testid="functional">{String(functional)}</span>
      <span data-testid="product-communications">{String(productCommunications)}</span>
      <span data-testid="decided">{String(hasDecided)}</span>
      <span data-testid="analytics">{String(consent.analytics)}</span>
      <span data-testid="marketing">{String(consent.marketing)}</span>
      <span data-testid="visible">{String(bannerVisible)}</span>
      <button onClick={openSettings}>Open settings</button>
    </div>
  )
}

function renderConsumer(initialStorage?: Partial<ConsentState> | null) {
  if (initialStorage !== undefined) {
    if (initialStorage === null) {
      localStorage.removeItem(STORAGE_KEY)
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialStorage))
    }
  }
  return render(
    <MemoryRouter>
      <CookieConsentProvider>
        <ConsentConsumer />
        <CookieBanner />
      </CookieConsentProvider>
    </MemoryRouter>,
  )
}

// ─── CookieConsentContext ─────────────────────────────────────────────────────

describe('CookieConsentContext — first visit', () => {
  it('defaults hasDecided to false when no storage', () => {
    renderConsumer(null)
    expect(screen.getByTestId('decided')).toHaveTextContent('false')
    expect(screen.getByTestId('essential')).toHaveTextContent('true')
    expect(screen.getByTestId('functional')).toHaveTextContent('false')
  })

  it('defaults consent to analytics=false, marketing=false', () => {
    renderConsumer(null)
    expect(screen.getByTestId('analytics')).toHaveTextContent('false')
    expect(screen.getByTestId('marketing')).toHaveTextContent('false')
  })

  it('bannerVisible is true on first visit', () => {
    renderConsumer(null)
    expect(screen.getByTestId('visible')).toHaveTextContent('true')
  })
})

describe('CookieConsentContext — returning visit', () => {
  it('reads hasDecided=true from localStorage', () => {
    renderConsumer({ analytics: true, marketing: false })
    expect(screen.getByTestId('decided')).toHaveTextContent('true')
    expect(screen.getByTestId('functional')).toHaveTextContent('false')
  })

  it('reads stored analytics value', () => {
    renderConsumer({ analytics: true, marketing: false })
    expect(screen.getByTestId('analytics')).toHaveTextContent('true')
  })

  it('reads stored marketing value', () => {
    renderConsumer({ analytics: false, marketing: true })
    expect(screen.getByTestId('marketing')).toHaveTextContent('true')
  })

  it('bannerVisible is false when consent already stored', () => {
    renderConsumer({ analytics: true, marketing: true })
    expect(screen.getByTestId('visible')).toHaveTextContent('false')
  })
})

describe('CookieConsentContext — openSettings', () => {
  it('setting bannerVisible to true via openSettings', () => {
    renderConsumer({ analytics: false, marketing: false })
    expect(screen.getByTestId('visible')).toHaveTextContent('false')
    fireEvent.click(screen.getByRole('button', { name: /open settings/i }))
    expect(screen.getByTestId('visible')).toHaveTextContent('true')
  })
})

describe('CookieConsentContext — invalid localStorage', () => {
  it('treats corrupt storage as first visit', () => {
    localStorage.setItem(STORAGE_KEY, 'not-json{{{')
    renderConsumer()
    expect(screen.getByTestId('decided')).toHaveTextContent('false')
    expect(screen.getByTestId('visible')).toHaveTextContent('true')
  })
})

describe('useCookieConsent — guard', () => {
  it('throws when used outside provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() =>
      render(
        <MemoryRouter>
          <ConsentConsumer />
        </MemoryRouter>,
      ),
    ).toThrow('useCookieConsent must be used within CookieConsentProvider')
    spy.mockRestore()
  })
})

// ─── CookieBanner — initial render ───────────────────────────────────────────

// ─── CookieConsentContext — context value access via exported context ──────────

describe('CookieConsentContext — direct context value', () => {
  it('CookieConsentContext is exported and not undefined initially', () => {
    expect(CookieConsentContext).toBeDefined()
  })

  it('acceptAll updates consent to all-true', () => {
    let capturedAcceptAll: (() => void) | undefined
    function Capture() {
      const { acceptAll } = useCookieConsent()
      capturedAcceptAll = acceptAll
      return null
    }
    render(
      <MemoryRouter>
        <CookieConsentProvider>
          <Capture />
          <ConsentConsumer />
        </CookieConsentProvider>
      </MemoryRouter>,
    )
    act(() => { capturedAcceptAll!() })
    expect(screen.getByTestId('functional')).toHaveTextContent('true')
    expect(screen.getByTestId('product-communications')).toHaveTextContent('true')
    expect(screen.getByTestId('analytics')).toHaveTextContent('true')
    expect(screen.getByTestId('marketing')).toHaveTextContent('true')
  })

  it('rejectAll updates consent to all-false', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ functional: true, analytics: true, marketing: true, productCommunications: true }))
    let capturedRejectAll: (() => void) | undefined
    function Capture() {
      const { rejectAll } = useCookieConsent()
      capturedRejectAll = rejectAll
      return null
    }
    render(
      <MemoryRouter>
        <CookieConsentProvider>
          <Capture />
          <ConsentConsumer />
        </CookieConsentProvider>
      </MemoryRouter>,
    )
    expect(screen.getByTestId('functional')).toHaveTextContent('true')
    act(() => { capturedRejectAll!() })
    expect(screen.getByTestId('functional')).toHaveTextContent('false')
    expect(screen.getByTestId('essential')).toHaveTextContent('true')
    expect(screen.getByTestId('product-communications')).toHaveTextContent('false')
    expect(screen.getByTestId('analytics')).toHaveTextContent('false')
    expect(screen.getByTestId('marketing')).toHaveTextContent('false')
  })

  it('savePreferences persists custom state', () => {
    let capturedSave: ((s: ConsentState) => void) | undefined
    function Capture() {
      const { savePreferences } = useCookieConsent()
      capturedSave = savePreferences
      return null
    }
    render(
      <MemoryRouter>
        <CookieConsentProvider>
          <Capture />
          <ConsentConsumer />
        </CookieConsentProvider>
      </MemoryRouter>,
    )
    act(() => { capturedSave!({ functional: true, analytics: true, marketing: false, productCommunications: false }) })
    expect(screen.getByTestId('analytics')).toHaveTextContent('true')
    expect(screen.getByTestId('marketing')).toHaveTextContent('false')
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!) as ConsentState
    expect(stored).toEqual({ functional: true, analytics: true, marketing: false, productCommunications: false })
  })

  it('closeBanner only closes when hasDecided=true', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ analytics: false, marketing: false }))
    let capturedClose: (() => void) | undefined
    function Capture() {
      const { closeBanner } = useCookieConsent()
      capturedClose = closeBanner
      return null
    }
    render(
      <MemoryRouter>
        <CookieConsentProvider>
          <Capture />
          <ConsentConsumer />
          <CookieBanner />
        </CookieConsentProvider>
      </MemoryRouter>,
    )
    // Banner is hidden initially (hasDecided=true but bannerVisible=false)
    // Re-open it
    fireEvent.click(screen.getByRole('button', { name: /open settings/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    act(() => { capturedClose!() })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})


describe('Functional preference storage', () => {
  afterEach(() => vi.unstubAllGlobals())

  it.each(['null', '[]', '{}', '{"analytics":true,"marketing":false,"functional":"true"}',
    '{"analytics":"true","marketing":false,"functional":true}'])(
    'fails closed for malformed consent %s',
    (raw) => {
      localStorage.setItem(STORAGE_KEY, raw)
      renderConsumer()
      expect(screen.getByTestId('functional')).toHaveTextContent('false')
      expect(screen.getByTestId('analytics')).toHaveTextContent('false')
      expect(screen.getByTestId('decided')).toHaveTextContent('false')
    },
  )

  it('gates hydration and writes, then clears all workspace keys and blocks late responses', async () => {
    const densityA = 'veritasor_density_ws-a'
    const densityB = 'veritasor_density_ws-b'
    const filtersA = savedFilterStorageKey('ws-a')
    const filtersB = savedFilterStorageKey('ws-b')
    const storedFilter = { id: 'old', name: 'Stored', searchParams: '?q=old' }
    for (const key of [densityA, densityB]) localStorage.setItem(key, 'compact')
    for (const key of [filtersA, filtersB]) localStorage.setItem(key, JSON.stringify([storedFilter]))
    localStorage.setItem('essential-session', 'keep')

    let finishGet!: (response: Response) => void
    let finishPut!: (response: Response) => void
    const fetchMock = vi.fn((_url: string, options: RequestInit) =>
      new Promise<Response>((resolve) => {
        if (options.method === 'GET') finishGet = resolve
        else finishPut = resolve
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const { result, rerender } = renderHook(({ workspace }) => ({
      consent: useCookieConsent(),
      density: useDensityMode(workspace),
      saved: useSavedFilters(workspace),
    }), { wrapper: CookieConsentProvider, initialProps: { workspace: 'ws-a' } })

    expect(result.current.density.density).toBe('comfortable')
    expect(result.current.saved.filters).toEqual([])
    act(() => {
      result.current.density.setDensity('comfortable')
      result.current.saved.save('Session filter', '?q=session')
    })
    const id = result.current.saved.filters[0].id
    act(() => { result.current.saved.rename(id, 'Renamed') })
    expect(result.current.saved.getById(id)?.name).toBe('Renamed')
    act(() => { result.current.saved.remove(id) })
    expect(result.current.saved.filters).toEqual([])
    expect(localStorage.getItem(densityA)).toBe('compact')
    expect(localStorage.getItem(filtersA)).toBe(JSON.stringify([storedFilter]))
    expect(fetchMock).not.toHaveBeenCalled()

    act(() => { result.current.consent.acceptAll() })
    expect(result.current.density.density).toBe('compact')
    expect(result.current.saved.filters).toEqual([storedFilter])
    act(() => {
      result.current.density.setDensity('comfortable')
      result.current.saved.save('Persisted', '?q=persisted')
    })
    expect(localStorage.getItem(densityA)).toBe('comfortable')
    expect(localStorage.getItem(filtersA)).toContain('Persisted')
    expect(fetchMock.mock.calls.map(([, options]) => options.method)).toEqual(['GET', 'PUT'])

    act(() => { result.current.consent.rejectAll() })
    expect(fetchMock.mock.calls.every(([, options]) => options.signal?.aborted)).toBe(true)
    await act(async () => {
      finishGet(new Response(JSON.stringify({ density: 'compact' })))
      finishPut(new Response(null, { status: 500 }))
    })
    expect(result.current.density.density).toBe('comfortable')
    rerender({ workspace: 'ws-b' })
    expect(result.current.saved.filters).toEqual([])
    act(() => {
      result.current.density.setDensity('compact')
      result.current.saved.save('Private', '?q=private')
    })
    expect(result.current.density.density).toBe('compact')
    expect(result.current.saved.filters[0].name).toBe('Private')
    for (const key of [densityA, densityB, filtersA, filtersB]) {
      expect(localStorage.getItem(key)).toBeNull()
    }
    expect(localStorage.getItem('essential-session')).toBe('keep')
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).functional).toBe(false)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('ignores actions retained by a previous workspace', () => {
    const fetchMock = vi.fn((_url: string, _options: RequestInit) =>
      Promise.resolve(new Response(null, { status: 404 })),
    )
    vi.stubGlobal('fetch', fetchMock)
    const { result, rerender } = renderHook(({ workspace }) => ({
      consent: useCookieConsent(),
      density: useDensityMode(workspace),
      saved: useSavedFilters(workspace),
    }), { wrapper: CookieConsentProvider, initialProps: { workspace: 'ws-a' } })
    act(() => { result.current.consent.acceptAll() })
    const { setDensity } = result.current.density
    const { save } = result.current.saved

    rerender({ workspace: 'ws-b' })
    act(() => {
      setDensity('compact')
      save('Previous workspace', '?q=old')
    })
    expect(result.current.density.density).toBe('comfortable')
    expect(result.current.saved.filters).toEqual([])
    expect(localStorage.getItem('veritasor_density_ws-a')).toBeNull()
    expect(localStorage.getItem(savedFilterStorageKey('ws-b'))).toBeNull()
    expect(fetchMock.mock.calls.map(([, options]) => options.method)).toEqual(['GET', 'GET'])
  })

  it('keeps denied preferences usable when the browser blocks storage', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const storage = vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('Storage blocked', 'SecurityError')
    })
    try {
      const { result } = renderHook(() => ({
        consent: useCookieConsent(),
        density: useDensityMode(),
        saved: useSavedFilters(),
      }), { wrapper: CookieConsentProvider })
      act(() => { result.current.consent.rejectAll() })
      act(() => {
        result.current.density.setDensity('compact')
        result.current.saved.save('Session filter', '?q=session')
      })
      expect(result.current.consent.consent.functional).toBe(false)
      expect(result.current.density.density).toBe('compact')
      expect(result.current.saved.filters[0].name).toBe('Session filter')
      expect(fetchMock).not.toHaveBeenCalled()
    } finally {
      storage.mockRestore()
    }
  })

  it('honors withdrawal from another tab', () => {
    renderConsumer({ functional: true, analytics: false, marketing: false })
    localStorage.setItem('veritasor_density_ws-a', 'compact')
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      functional: false, analytics: false, marketing: false,
    }))
    act(() => { window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY })) })
    expect(screen.getByTestId('functional')).toHaveTextContent('false')
    expect(localStorage.getItem('veritasor_density_ws-a')).toBeNull()
  })
})
