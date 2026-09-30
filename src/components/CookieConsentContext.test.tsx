import { useContext } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  CookieConsentContext,
  CookieConsentProvider,
  STORAGE_KEY,
  useCookieConsent,
} from './CookieConsentContext'
import type { ConsentState } from './CookieConsentContext'

// ─── Helpers ─────────────────────────────────────────────────────────────────

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

function seedStorage(value: string) {
  localStorage.setItem(STORAGE_KEY, value)
}

function seedConsent(consent: ConsentState) {
  seedStorage(JSON.stringify(consent))
}

/** Surfaces the full context contract, including the third ConsentState key. */
function ConsentProbe() {
  const { hasDecided, consent, bannerVisible, acceptAll, rejectAll, savePreferences, closeBanner } =
    useCookieConsent()
  return (
    <div>
      <span data-testid="decided">{String(hasDecided)}</span>
      <span data-testid="visible">{String(bannerVisible)}</span>
      <span data-testid="analytics">{String(consent.analytics)}</span>
      <span data-testid="marketing">{String(consent.marketing)}</span>
      <span data-testid="product">{String(consent.productCommunications)}</span>
      <button onClick={acceptAll}>Accept all</button>
      <button onClick={rejectAll}>Reject all</button>
      <button
        onClick={() =>
          savePreferences({ analytics: false, marketing: true, productCommunications: false })
        }
      >
        Save custom
      </button>
      <button onClick={closeBanner}>Close banner</button>
    </div>
  )
}

function renderProbe() {
  return render(
    <CookieConsentProvider>
      <ConsentProbe />
    </CookieConsentProvider>,
  )
}

/** Reads the context directly, without going through the hook guard. */
function RawContextReader() {
  return <span data-testid="raw">{String(useContext(CookieConsentContext))}</span>
}

// ─── useCookieConsent — failure contract ─────────────────────────────────────

describe('useCookieConsent — failure contract', () => {
  it('context default is undefined, which is the condition the guard checks', () => {
    render(<RawContextReader />)
    expect(screen.getByTestId('raw')).toHaveTextContent('undefined')
  })

  it('throws an Error with the documented message when used outside the provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    let thrown: unknown
    try {
      render(<ConsentProbe />)
    } catch (error) {
      thrown = error
    }
    expect(thrown).toBeInstanceOf(Error)
    expect((thrown as Error).message).toBe(
      'useCookieConsent must be used within CookieConsentProvider',
    )
    spy.mockRestore()
  })

  it('returns the context value when used inside the provider', () => {
    renderProbe()
    expect(screen.getByTestId('decided')).toHaveTextContent('false')
    expect(screen.getByTestId('visible')).toHaveTextContent('true')
  })
})

// ─── readStorage — failure handling ──────────────────────────────────────────

describe('readStorage — failure handling', () => {
  it('falls back to undecided defaults when localStorage.getItem throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage blocked')
    })
    renderProbe()
    expect(screen.getByTestId('decided')).toHaveTextContent('false')
    expect(screen.getByTestId('visible')).toHaveTextContent('true')
    expect(screen.getByTestId('analytics')).toHaveTextContent('false')
    expect(screen.getByTestId('marketing')).toHaveTextContent('false')
    expect(screen.getByTestId('product')).toHaveTextContent('false')
  })

  it('keeps the banner visible after a read failure so consent can still be given', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage blocked')
    })
    renderProbe()
    fireEvent.click(screen.getByRole('button', { name: /accept all/i }))
    expect(screen.getByTestId('visible')).toHaveTextContent('false')
    expect(screen.getByTestId('decided')).toHaveTextContent('true')
  })
})

// ─── readStorage — boundary inputs ───────────────────────────────────────────

describe('readStorage — boundary inputs', () => {
  it('treats an empty string payload as no decision', () => {
    seedStorage('')
    renderProbe()
    expect(screen.getByTestId('decided')).toHaveTextContent('false')
    expect(screen.getByTestId('visible')).toHaveTextContent('true')
    expect(screen.getByTestId('analytics')).toHaveTextContent('false')
  })

  it('treats a whitespace-only payload as no decision', () => {
    seedStorage('   ')
    renderProbe()
    expect(screen.getByTestId('decided')).toHaveTextContent('false')
    expect(screen.getByTestId('visible')).toHaveTextContent('true')
    expect(screen.getByTestId('marketing')).toHaveTextContent('false')
  })

  it('does not normalise a partial payload: stored keys survive, absent keys stay unset', () => {
    seedStorage(JSON.stringify({ analytics: true }))
    renderProbe()
    expect(screen.getByTestId('decided')).toHaveTextContent('true')
    expect(screen.getByTestId('visible')).toHaveTextContent('false')
    expect(screen.getByTestId('analytics')).toHaveTextContent('true')
    expect(screen.getByTestId('marketing')).toHaveTextContent('undefined')
    expect(screen.getByTestId('product')).toHaveTextContent('undefined')
  })
})

// ─── readStorage — success path ──────────────────────────────────────────────

describe('readStorage — success path', () => {
  it('restores a fully-specified stored ConsentState', () => {
    seedConsent({ analytics: true, marketing: false, productCommunications: true })
    renderProbe()
    expect(screen.getByTestId('decided')).toHaveTextContent('true')
    expect(screen.getByTestId('visible')).toHaveTextContent('false')
    expect(screen.getByTestId('analytics')).toHaveTextContent('true')
    expect(screen.getByTestId('marketing')).toHaveTextContent('false')
    expect(screen.getByTestId('product')).toHaveTextContent('true')
  })

  it('restores the all-false stored ConsentState', () => {
    seedConsent({ analytics: false, marketing: false, productCommunications: false })
    renderProbe()
    expect(screen.getByTestId('decided')).toHaveTextContent('true')
    expect(screen.getByTestId('visible')).toHaveTextContent('false')
    expect(screen.getByTestId('product')).toHaveTextContent('false')
  })
})

// ─── decide — success path ───────────────────────────────────────────────────

describe('decide — success path', () => {
  it('acceptAll commits all three keys, hides the banner and persists', () => {
    renderProbe()
    fireEvent.click(screen.getByRole('button', { name: /accept all/i }))
    expect(screen.getByTestId('decided')).toHaveTextContent('true')
    expect(screen.getByTestId('visible')).toHaveTextContent('false')
    expect(screen.getByTestId('analytics')).toHaveTextContent('true')
    expect(screen.getByTestId('marketing')).toHaveTextContent('true')
    expect(screen.getByTestId('product')).toHaveTextContent('true')
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual({
      analytics: true,
      marketing: true,
      productCommunications: true,
    })
  })

  it('rejectAll commits all three keys as false and persists', () => {
    seedConsent({ analytics: true, marketing: true, productCommunications: true })
    renderProbe()
    fireEvent.click(screen.getByRole('button', { name: /reject all/i }))
    expect(screen.getByTestId('analytics')).toHaveTextContent('false')
    expect(screen.getByTestId('marketing')).toHaveTextContent('false')
    expect(screen.getByTestId('product')).toHaveTextContent('false')
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual({
      analytics: false,
      marketing: false,
      productCommunications: false,
    })
  })

  it('savePreferences persists the exact three-key object it is given', () => {
    renderProbe()
    fireEvent.click(screen.getByRole('button', { name: /save custom/i }))
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual({
      analytics: false,
      marketing: true,
      productCommunications: false,
    })
    expect(screen.getByTestId('marketing')).toHaveTextContent('true')
    expect(screen.getByTestId('visible')).toHaveTextContent('false')
  })
})

// ─── writeStorage — failure handling ─────────────────────────────────────────

describe('writeStorage — failure handling', () => {
  it('still commits the decision in memory when localStorage.setItem throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded')
    })
    renderProbe()
    fireEvent.click(screen.getByRole('button', { name: /accept all/i }))
    expect(screen.getByTestId('decided')).toHaveTextContent('true')
    expect(screen.getByTestId('visible')).toHaveTextContent('false')
    expect(screen.getByTestId('analytics')).toHaveTextContent('true')
    expect(screen.getByTestId('marketing')).toHaveTextContent('true')
    expect(screen.getByTestId('product')).toHaveTextContent('true')
  })

  it('persists nothing when localStorage.setItem throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded')
    })
    renderProbe()
    fireEvent.click(screen.getByRole('button', { name: /accept all/i }))
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('a failed write does not leave a prior decision stuck on screen', () => {
    seedConsent({ analytics: true, marketing: false, productCommunications: false })
    renderProbe()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded')
    })
    fireEvent.click(screen.getByRole('button', { name: /accept all/i }))
    expect(screen.getByTestId('analytics')).toHaveTextContent('true')
    expect(screen.getByTestId('marketing')).toHaveTextContent('true')
    expect(screen.getByTestId('visible')).toHaveTextContent('false')
  })
})

// ─── closeBanner — boundary ──────────────────────────────────────────────────

describe('closeBanner — boundary', () => {
  it('is a no-op while the visitor has not decided', () => {
    renderProbe()
    expect(screen.getByTestId('visible')).toHaveTextContent('true')
    fireEvent.click(screen.getByRole('button', { name: /close banner/i }))
    expect(screen.getByTestId('visible')).toHaveTextContent('true')
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('hides the banner once the visitor has decided', () => {
    seedConsent({ analytics: false, marketing: false, productCommunications: false })
    renderProbe()
    fireEvent.click(screen.getByRole('button', { name: /close banner/i }))
    expect(screen.getByTestId('visible')).toHaveTextContent('false')
    expect(screen.getByTestId('decided')).toHaveTextContent('true')
  })
})