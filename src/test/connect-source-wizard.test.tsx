import { act } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Navigate, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Dashboard from '../pages/Dashboard'
import {
  AuthorizeSourceStep,
  ConfigureSourceScopeStep,
  ConfirmSourceStep,
  ConnectSourceWizard,
  MapCurrenciesStep,
  OAuthCallbackLandingStep,
  SelectSourceProviderStep,
  WIZARD_STORAGE_KEY,
} from '../pages/connect-source/ConnectSourceWizard'

function renderApp(initialEntry = '/') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/connect-source" element={<ConnectSourceWizard />}>
          <Route index element={<Navigate to="provider" replace />} />
          <Route path="provider" element={<SelectSourceProviderStep />} />
          <Route path="authorize" element={<AuthorizeSourceStep />} />
          <Route path="callback" element={<OAuthCallbackLandingStep />} />
          <Route path="scope" element={<ConfigureSourceScopeStep />} />
          <Route path="mapping" element={<MapCurrenciesStep />} />
          <Route path="confirm" element={<ConfirmSourceStep />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

function mapAllCurrencies() {
  fireEvent.change(screen.getByLabelText(/EUR internal category/i), {
    target: { value: 'recurring' },
  })
  fireEvent.change(screen.getByLabelText(/EUR ledger account/i), {
    target: { value: 'revenue' },
  })
  fireEvent.change(screen.getByLabelText(/GBP internal category/i), {
    target: { value: 'one-time' },
  })
  fireEvent.change(screen.getByLabelText(/GBP ledger account/i), {
    target: { value: 'deferred' },
  })
  fireEvent.change(screen.getByLabelText(/INR internal category/i), {
    target: { value: 'fee' },
  })
  fireEvent.change(screen.getByLabelText(/INR ledger account/i), {
    target: { value: 'expense' },
  })
}

beforeEach(() => {
  window.sessionStorage.clear()
})

afterEach(() => {
  cleanup()
  window.sessionStorage.clear()
  vi.useRealTimers()
})

describe('connect source wizard', () => {
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

    mapAllCurrencies()
    fireEvent.click(nextButton)

    const finishButton = screen.getByRole('button', { name: /finish connection/i })
    expect(finishButton).toBeDisabled()

    fireEvent.click(screen.getByRole('checkbox', { name: /confirm least-privilege access/i }))
    expect(finishButton).toBeEnabled()
  })

  it('hydrates from sessionStorage on refresh and keeps the user on any step with prior selections', async () => {
    vi.useFakeTimers()
    let view = renderApp('/connect-source/provider')

    // Step 1: Select provider & refresh on step 1 and step 2
    fireEvent.click(screen.getByLabelText(/stripe/i))
    view.unmount()
    view = renderApp('/connect-source/provider')
    expect(screen.getByRole('heading', { name: /select provider/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/stripe/i)).toBeChecked()

    fireEvent.click(screen.getByRole('button', { name: /^next$/i }))
    expect(screen.getByRole('heading', { name: /authorize/i })).toBeInTheDocument()

    // Refresh on step 2 (authorize)
    view.unmount()
    view = renderApp('/connect-source/authorize')
    expect(screen.getByRole('heading', { name: /authorize/i })).toBeInTheDocument()
    expect(screen.getByText(/Step 2 of 6: Authorize/i)).toBeInTheDocument()
    expect(screen.getByText(/Before redirecting to Stripe/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /simulate secure redirect/i }))

    await act(async () => {
      vi.advanceTimersByTime(900)
    })

    // Step 3: Callback & refresh on step 3
    expect(screen.getByText(/Authorization Successful/i)).toBeInTheDocument()
    view.unmount()
    view = renderApp('/connect-source/callback')
    expect(screen.getByRole('heading', { name: /oauth callback/i })).toBeInTheDocument()
    expect(screen.getByText(/Step 3 of 6: OAuth callback/i)).toBeInTheDocument()
    expect(screen.getByText(/Connected to Stripe/i)).toBeInTheDocument()

    // Advance from callback -> scope (Step 4)
    fireEvent.click(screen.getByRole('button', { name: /^next$/i }))
    expect(screen.getByRole('heading', { name: /configure scope/i })).toBeInTheDocument()

    // Choose sync window and an optional scope, then refresh on step 4
    fireEvent.click(screen.getByLabelText(/current fiscal year/i))
    fireEvent.click(screen.getByRole('checkbox', { name: /include disputes and adjustments/i }))
    view.unmount()
    view = renderApp('/connect-source/scope')
    expect(screen.getByRole('heading', { name: /configure scope/i })).toBeInTheDocument()
    expect(screen.getByText(/Step 4 of 6: Configure scope/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/current fiscal year/i)).toBeChecked()
    expect(screen.getByRole('checkbox', { name: /include disputes and adjustments/i })).toBeChecked()

    // Advance to mapping step (Step 5), map currencies, and refresh on step 5
    fireEvent.click(screen.getByRole('button', { name: /^next$/i }))
    expect(screen.getByRole('heading', { name: /map currencies/i })).toBeInTheDocument()
    mapAllCurrencies()

    view.unmount()
    view = renderApp('/connect-source/mapping')
    expect(screen.getByRole('heading', { name: /map currencies/i })).toBeInTheDocument()
    expect(screen.getByText(/Step 5 of 6: Map currencies/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/EUR internal category/i)).toHaveValue('recurring')
    expect(screen.getByLabelText(/GBP ledger account/i)).toHaveValue('deferred')

    // Advance to confirm step (Step 6), check least-privilege, and refresh on step 6
    fireEvent.click(screen.getByRole('button', { name: /^next$/i }))
    expect(screen.getByRole('heading', { name: /^confirm$/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox', { name: /confirm least-privilege access/i }))

    view.unmount()
    renderApp('/connect-source/confirm')
    expect(screen.getByRole('heading', { name: /^confirm$/i })).toBeInTheDocument()
    expect(screen.getByText(/Step 6 of 6: Confirm/i)).toBeInTheDocument()
    expect(screen.getByText(/Current fiscal year/i)).toBeInTheDocument()
    expect(screen.getByText(/4 currencies mapped/i)).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /confirm least-privilege access/i })).toBeChecked()
  })

  it('falls back to step 1 without crashing when sessionStorage contains corrupt or invalid data', () => {
    // Malformed JSON
    window.sessionStorage.setItem(WIZARD_STORAGE_KEY, '{not-valid-json')
    const { unmount } = renderApp('/connect-source/scope')

    expect(screen.getByRole('heading', { name: /select provider/i })).toBeInTheDocument()
    expect(screen.getByText(/Step 1 of 6: Select provider/i)).toBeInTheDocument()
    unmount()

    // Unknown provider / bad shape
    window.sessionStorage.setItem(
      WIZARD_STORAGE_KEY,
      JSON.stringify({
        provider: 'unknown-provider',
        authorizationStatus: 'authorized',
        oauthCallbackState: 'success',
        syncWindow: 'trailing-12-months',
        optionalScopes: [],
        currencyMappings: [],
        confirmLeastPrivilege: false,
        scopeValidationAttempted: false,
        mappingValidationAttempted: false,
      }),
    )
    renderApp('/connect-source/confirm')

    expect(screen.getByRole('heading', { name: /select provider/i })).toBeInTheDocument()
    expect(screen.getByText(/Step 1 of 6: Select provider/i)).toBeInTheDocument()
  })

  it('clears persisted sessionStorage state on finish and on cancel', async () => {
    vi.useFakeTimers()
    renderApp('/connect-source/provider')

    fireEvent.click(screen.getByLabelText(/shopify/i))
    expect(window.sessionStorage.getItem(WIZARD_STORAGE_KEY)).not.toBeNull()

    // Cancel clears storage and navigates to /
    fireEvent.click(screen.getByRole('link', { name: /^cancel$/i }))
    expect(window.sessionStorage.getItem(WIZARD_STORAGE_KEY)).toBeNull()
    expect(screen.getByRole('heading', { name: /^dashboard$/i })).toBeInTheDocument()

    // Re-enter wizard and complete through Finish connection
    cleanup()
    renderApp('/connect-source/provider')

    fireEvent.click(screen.getByLabelText(/stripe/i))
    fireEvent.click(screen.getByRole('button', { name: /^next$/i }))
    fireEvent.click(screen.getByRole('button', { name: /simulate secure redirect/i }))

    await act(async () => {
      vi.advanceTimersByTime(900)
    })

    fireEvent.click(screen.getByRole('button', { name: /^next$/i }))
    fireEvent.click(screen.getByLabelText(/trailing 12 months/i))
    fireEvent.click(screen.getByRole('button', { name: /^next$/i }))
    mapAllCurrencies()
    fireEvent.click(screen.getByRole('button', { name: /^next$/i }))

    fireEvent.click(screen.getByRole('checkbox', { name: /confirm least-privilege access/i }))
    expect(window.sessionStorage.getItem(WIZARD_STORAGE_KEY)).not.toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /finish connection/i }))
    expect(window.sessionStorage.getItem(WIZARD_STORAGE_KEY)).toBeNull()
    expect(screen.getByRole('heading', { name: /^dashboard$/i })).toBeInTheDocument()
  })
})
