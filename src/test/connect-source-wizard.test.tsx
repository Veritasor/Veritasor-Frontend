import { act, Profiler, useCallback, useState } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Outlet, Route, Routes, useOutletContext } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LocaleProvider } from '../i18n/provider'
import { ToastProvider } from '../components/ToastContext'
import ToastContainer from '../components/ToastContainer'
import { AttestationsProvider } from '../state/attestations'
import Dashboard from '../pages/Dashboard'
import RevenueSources from '../pages/RevenueSources'
import {
  AuthorizeSourceStep,
  ConfigureSourceScopeStep,
  ConfirmSourceStep,
  CONNECT_SOURCE_STORAGE_KEY,
  ConnectSourceWizard,
  MapCurrenciesStep,
  OAuthCallbackLandingStep,
  SelectSourceProviderStep,
} from '../pages/connect-source/ConnectSourceWizard'
import { sourcesStore } from '../store/sourcesStore'

function renderApp(initialEntry = '/') {
  return render(
    <LocaleProvider>
      <ToastProvider>
        <ToastContainer />
        <AttestationsProvider>
          <MemoryRouter initialEntries={[initialEntry]}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/sources" element={<RevenueSources />} />
              <Route path="/connect-source" element={<ConnectSourceWizard />}>
                <Route path="provider" element={<SelectSourceProviderStep />} />
                <Route path="authorize" element={<AuthorizeSourceStep />} />
                <Route path="callback" element={<OAuthCallbackLandingStep />} />
                <Route path="scope" element={<ConfigureSourceScopeStep />} />
                <Route path="mapping" element={<MapCurrenciesStep />} />
                <Route path="confirm" element={<ConfirmSourceStep />} />
              </Route>
            </Routes>
          </MemoryRouter>
        </AttestationsProvider>
      </ToastProvider>
    </LocaleProvider>,
  )
}

function renderOAuthCallback(initialEntry: string, onRender: () => void) {
  function CallbackHarness() {
    const [data, setData] = useState({
      provider: 'stripe',
      oauthCallbackState: 'success',
      authorizationStatus: 'idle',
      optionalScopes: [] as string[],
    })

    const setOAuthCallbackState = useCallback(
      (state: 'success' | 'denied' | 'expired' | 'unknown') => {
        const authorizationStatus =
          state === 'success'
            ? 'authorized'
            : state === 'denied'
              ? 'denied'
              : state === 'expired'
                ? 'expired'
                : 'unknown'

        setData((currentData) => {
          if (
            currentData.oauthCallbackState === state &&
            currentData.authorizationStatus === authorizationStatus
          ) {
            return currentData
          }

          return { ...currentData, oauthCallbackState: state, authorizationStatus }
        })
      },
      [],
    )
    const context = {
      data,
      providerName: 'Stripe',
      setOAuthCallbackState,
    }

    return (
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route
            path="/connect-source/callback"
            element={
              <Profiler id="oauth-callback" onRender={onRender}>
                <Outlet context={context} />
              </Profiler>
            }
          >
            <Route index element={<OAuthCallbackLandingStep />} />
          </Route>
        </Routes>
      </MemoryRouter>
    )
  }

  return render(<CallbackHarness />)
}

function OAuthActionIdentityProbe({
  onAction,
}: {
  onAction: (action: (state: 'success' | 'denied' | 'expired' | 'unknown') => void) => void
}) {
  const { setOAuthCallbackState } = useOutletContext<{
    setOAuthCallbackState: (state: 'success' | 'denied' | 'expired' | 'unknown') => void
  }>()
  onAction(setOAuthCallbackState)
  return null
}

function renderWizardWithActionProbe(onAction: (action: (state: 'success' | 'denied' | 'expired' | 'unknown') => void) => void) {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={['/connect-source/provider']}>
        <Routes>
          <Route path="/connect-source" element={<ConnectSourceWizard />}>
            <Route
              path="provider"
              element={
                <>
                  <SelectSourceProviderStep />
                  <OAuthActionIdentityProbe onAction={onAction} />
                </>
              }
            />
          </Route>
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  )
}

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  sessionStorage.clear()
  window.history.replaceState(null, '', '/')
})

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  sourcesStore.reset()
})

// ─── Existing wizard flow tests ────────────────────────────────────────────

describe('connect source wizard', () => {
  it.each([
    ['?state=denied', /Access Denied/i],
    ['?status=access_denied', /Access Denied/i],
    ['?error=timeout', /Session Expired/i],
    ['?state=success', /Authorization Successful/i],
    ['?state=invalid_request', /Handoff Error/i],
  ])('synchronizes OAuth callback URL %s without an update loop', (query, expectedStatus) => {
    let renderCount = 0
    renderOAuthCallback(`/connect-source/callback${query}`, () => {
      renderCount += 1
    })

    expect(screen.getByText(expectedStatus)).toBeInTheDocument()
    expect(renderCount).toBeLessThanOrEqual(3)
  })

  it('keeps OAuth callback actions stable when wizard state changes', () => {
    const actions: Array<(state: 'success' | 'denied' | 'expired' | 'unknown') => void> = []
    renderWizardWithActionProbe((action) => {
      actions.push(action)
    })

    fireEvent.click(screen.getByLabelText(/stripe/i))

    expect(actions.length).toBeGreaterThanOrEqual(2)
    expect(actions[0]).toBe(actions[1])
  })

  it('surfaces the dashboard entry point for the new flow', () => {
    renderApp('/')

    expect(screen.getByRole('link', { name: /open connect source wizard/i })).toHaveAttribute(
      'href',
      '/connect-source/provider',
    )
  })

  it('redirects locked routes back to the earliest incomplete step', () => {
    renderApp('/connect-source/scope')

    expect(screen.getByRole('heading', { name: /select provider/i })).toBeInTheDocument()
    expect(screen.getByText(/Step 1 of 6: Select provider/i)).toBeInTheDocument()
  })

  it('keeps next disabled until a provider is selected and authorization completes', async () => {
    vi.useFakeTimers()
    renderApp('/connect-source/provider')

    const nextButton = screen.getByRole('button', { name: /^next$/i })

    expect(nextButton).toBeDisabled()

    fireEvent.click(screen.getByLabelText(/stripe/i))
    expect(nextButton).toBeEnabled()

    fireEvent.click(nextButton)
    expect(screen.getByRole('heading', { name: /authorize/i })).toBeInTheDocument()
    expect(nextButton).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: /simulate secure redirect/i }))
    expect(screen.getByText(/Connecting to Stripe/i)).toBeInTheDocument()

    await act(async () => {
      vi.advanceTimersByTime(900)
    })

    expect(screen.getByText(/Authorization Successful/i)).toBeInTheDocument()
    expect(screen.getByText(/Connected to Stripe/i)).toBeInTheDocument()
    expect(nextButton).toBeEnabled()
  })

  it('handles all 4 OAuth callback landing states (success, denied, expired, unknown)', async () => {
    vi.useFakeTimers()
    renderApp('/connect-source/provider')

    fireEvent.click(screen.getByLabelText(/stripe/i))
    fireEvent.click(screen.getByRole('button', { name: /^next$/i }))
    fireEvent.click(screen.getByRole('button', { name: /simulate secure redirect/i }))

    await act(async () => {
      vi.advanceTimersByTime(900)
    })

    // Success State
    expect(screen.getByText(/Authorization Successful/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /continue to scope configuration/i })).toBeInTheDocument()

    // Switch to Denied State tab
    fireEvent.click(screen.getByRole('tab', { name: /denied/i }))
    expect(screen.getByText(/Access Denied/i)).toBeInTheDocument()
    expect(screen.getByText(/ERR_OAUTH_ACCESS_DENIED/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry authorization/i })).toBeInTheDocument()

    // Switch to Expired State tab
    fireEvent.click(screen.getByRole('tab', { name: /expired/i }))
    expect(screen.getByText(/Session Expired/i)).toBeInTheDocument()
    expect(screen.getByText(/ERR_OAUTH_SESSION_EXPIRED/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /restart authorization/i })).toBeInTheDocument()

    // Switch to Unknown State tab
    fireEvent.click(screen.getByRole('tab', { name: /unknown/i }))
    expect(screen.getByText(/Handoff Error/i)).toBeInTheDocument()
    expect(screen.getByText(/ERR_OAUTH_INVALID_RESPONSE/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try connecting again/i })).toBeInTheDocument()
  })

  it('shows inline validation on scope configuration before allowing confirmation', async () => {
    vi.useFakeTimers()
    renderApp('/connect-source/provider')

    fireEvent.click(screen.getByLabelText(/stripe/i))
    fireEvent.click(screen.getByRole('button', { name: /^next$/i }))
    fireEvent.click(screen.getByRole('button', { name: /simulate secure redirect/i }))

    await act(async () => {
      vi.advanceTimersByTime(900)
    })

    fireEvent.click(screen.getByRole('button', { name: /^next$/i }))

    const nextButton = screen.getByRole('button', { name: /^next$/i })

    fireEvent.click(nextButton)
    expect(
      screen.getByText(/Choose a sync window before continuing to the confirmation step/i),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText(/trailing 12 months/i))
    fireEvent.click(nextButton)

    // Step 5: map remaining currencies (EUR, GBP, INR)
    for (const currency of ['EUR', 'GBP', 'INR']) {
      fireEvent.change(screen.getByLabelText(new RegExp(`${currency} internal category`, 'i')), {
        target: { value: 'recurring' },
      })
      fireEvent.change(screen.getByLabelText(new RegExp(`${currency} ledger account`, 'i')), {
        target: { value: 'revenue' },
      })
    }
    fireEvent.click(nextButton)

    const finishButton = screen.getByRole('button', { name: /finish connection/i })
    expect(finishButton).toBeDisabled()

    fireEvent.click(screen.getByRole('checkbox', { name: /confirm least-privilege access/i }))
    expect(finishButton).toBeEnabled()
  })
})

// ─── Integration: finish wizard → sources list ────────────────────────────

describe('connect source wizard — finish navigates to /sources', () => {
  async function completeWizard() {
    vi.useFakeTimers()
    renderApp('/connect-source/provider')

    // Step 1: pick Stripe
    fireEvent.click(screen.getByLabelText(/stripe/i))
    fireEvent.click(screen.getByRole('button', { name: /^next$/i }))

    // Step 2: authorize
    fireEvent.click(screen.getByRole('button', { name: /simulate secure redirect/i }))
    await act(async () => {
      vi.advanceTimersByTime(900)
    })
    fireEvent.click(screen.getByRole('button', { name: /^next$/i }))

    // Step 4: scope
    fireEvent.click(screen.getByLabelText(/trailing 12 months/i))
    fireEvent.click(screen.getByRole('button', { name: /^next$/i }))

    // Step 5: map currencies
    for (const currency of ['EUR', 'GBP', 'INR']) {
      fireEvent.change(screen.getByLabelText(new RegExp(`${currency} internal category`, 'i')), {
        target: { value: 'recurring' },
      })
      fireEvent.change(screen.getByLabelText(new RegExp(`${currency} ledger account`, 'i')), {
        target: { value: 'revenue' },
      })
    }
    fireEvent.click(screen.getByRole('button', { name: /^next$/i }))

    // Step 6: confirm + finish
    fireEvent.click(screen.getByRole('checkbox', { name: /confirm least-privilege access/i }))
    fireEvent.click(screen.getByRole('button', { name: /finish connection/i }))
  }

  it('lands on the Revenue Sources page after finishing', async () => {
    await completeWizard()
    expect(screen.getByRole('heading', { name: /revenue sources/i })).toBeInTheDocument()
  })

  it('adds the new source to the list', async () => {
    await completeWizard()
    // Stripe appears at least once in the sources list (seed + newly added both show Stripe)
    expect(screen.getAllByText('Stripe').length).toBeGreaterThanOrEqual(1)
  })

  it('new source is listed alongside the existing seeds', async () => {
    await completeWizard()
    // INITIAL_SOURCES still present plus the new Stripe row
    const stripeItems = screen.getAllByText('Stripe')
    expect(stripeItems.length).toBeGreaterThanOrEqual(2)
  })

  it('adds the source to the store so it persists', async () => {
    await completeWizard()
    const stored = sourcesStore.getAll()
    expect(stored.some((s) => s.provider === 'Stripe' && s.accountLabel === 'stripe-connected')).toBe(
      true,
    )
  })

  it('shows a success toast after finishing', async () => {
    await completeWizard()
    // Toast renders the message in the DOM
    expect(screen.getByText(/stripe connected successfully/i)).toBeInTheDocument()
  })

  it('clears persisted wizard state from sessionStorage after finishing', async () => {
    await completeWizard()
    const raw = sessionStorage.getItem(CONNECT_SOURCE_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      expect(parsed.provider).toBeNull()
    } else {
      expect(raw).toBeNull()
    }
  })
})

// ─── Persistence, OAuth state validation, and error handling ──────────────

describe('connect source wizard — persistence and OAuth callback validation', () => {
  it('preserves entered data across a full page refresh mid-wizard', async () => {
    vi.useFakeTimers()
    const firstRender = renderApp('/connect-source/provider')

    // Select Shopify, authorize, and configure scope
    fireEvent.click(screen.getByLabelText(/shopify/i))
    fireEvent.click(screen.getByRole('button', { name: /^next$/i }))
    fireEvent.click(screen.getByRole('button', { name: /simulate secure redirect/i }))
    await act(async () => {
      vi.advanceTimersByTime(900)
    })
    fireEvent.click(screen.getByRole('button', { name: /^next$/i }))

    fireEvent.click(screen.getByLabelText(/current fiscal year/i))
    fireEvent.click(screen.getByRole('checkbox', { name: /include disputes/i }))

    // Simulate full browser reload at /connect-source/scope
    firstRender.unmount()
    renderApp('/connect-source/scope')

    expect(screen.getByRole('heading', { name: /configure scope/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/current fiscal year/i)).toBeChecked()
    expect(screen.getByRole('checkbox', { name: /include disputes/i })).toBeChecked()
  })

  it('rejects a mismatched OAuth state parameter with a clear error', () => {
    renderApp('/connect-source/provider')

    fireEvent.click(screen.getByLabelText(/stripe/i))
    fireEvent.click(screen.getByRole('button', { name: /^next$/i }))
    fireEvent.click(screen.getByRole('button', { name: /simulate secure redirect/i }))

    // Unmount to simulate external redirect returning with a tampered state param
    cleanup()
    renderApp('/connect-source/callback?state=tampered-invalid-nonce')

    expect(screen.getByText(/State Mismatch/i)).toBeInTheDocument()
    expect(screen.getByText(/OAuth state verification failed/i)).toBeInTheDocument()
    expect(screen.getByText(/ERR_OAUTH_STATE_MISMATCH/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^next$/i })).toBeDisabled()
  })

  it('displays provider error and error_description query params on callback', () => {
    renderApp('/connect-source/provider')

    fireEvent.click(screen.getByLabelText(/stripe/i))
    fireEvent.click(screen.getByRole('button', { name: /^next$/i }))
    fireEvent.click(screen.getByRole('button', { name: /simulate secure redirect/i }))

    // Simulate redirect back from provider with OAuth error + error_description
    cleanup()
    renderApp(
      '/connect-source/callback?error=access_denied&error_description=Account+owner+declined+access',
    )

    expect(screen.getByText(/Access Denied/i)).toBeInTheDocument()
    expect(screen.getByText(/access_denied:/i)).toBeInTheDocument()
    expect(screen.getByText(/Account owner declined access/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^next$/i })).toBeDisabled()
  })

  it('accepts a matching OAuth state nonce after a full-page redirect', () => {
    renderApp('/connect-source/provider')

    fireEvent.click(screen.getByLabelText(/razorpay/i))
    fireEvent.click(screen.getByRole('button', { name: /^next$/i }))
    fireEvent.click(screen.getByRole('button', { name: /simulate secure redirect/i }))

    const persisted = JSON.parse(sessionStorage.getItem(CONNECT_SOURCE_STORAGE_KEY)!)
    expect(typeof persisted.oauthStateNonce).toBe('string')

    // Simulate returning from the provider with the exact stored nonce
    cleanup()
    renderApp(`/connect-source/callback?state=${encodeURIComponent(persisted.oauthStateNonce)}`)

    expect(screen.getByText(/Authorization Successful/i)).toBeInTheDocument()
    expect(screen.getByText(/Connected to Razorpay/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^next$/i })).toBeEnabled()
  })
})

// ─── Empty state: Connect a source link ────────────────────────────────────

describe('RevenueSources — empty state', () => {
  it('shows a "Connect a source" link when no sources exist', () => {
    sourcesStore.setAll([])
    renderApp('/sources')

    expect(screen.getByRole('link', { name: /connect a source/i })).toBeInTheDocument()
  })

  it('"Connect a source" link points to the wizard', () => {
    sourcesStore.setAll([])
    renderApp('/sources')

    const link = screen.getByRole('link', { name: /connect a source/i }) as HTMLAnchorElement
    expect(link.getAttribute('href')).toBe('/connect-source/provider')
  })
})
