import { useEffect, useState } from 'react'
import {
  Link,
  Outlet,
  useLocation,
  useNavigate,
  useOutletContext,
} from 'react-router-dom'
import WizardProgress from '../../components/WizardProgress'

type ProviderId = 'stripe' | 'shopify' | 'razorpay'
type AuthorizationStatus = 'idle' | 'pending' | 'authorized' | 'denied'
type SyncWindowId = 'trailing-12-months' | 'current-fiscal-year' | 'all-history'

type ProviderDefinition = {
  id: ProviderId
  name: string
  badge: string
  description: string
  note: string
}

type SyncWindowDefinition = {
  id: SyncWindowId
  label: string
  description: string
}

type WizardStep = {
  id: string
  path: string
  label: string
  detail: string
}

type WizardData = {
  provider: ProviderId | null
  authorizationStatus: AuthorizationStatus
  syncWindow: SyncWindowId | null
  optionalScopes: string[]
  confirmLeastPrivilege: boolean
  scopeValidationAttempted: boolean
  testConnectionStatus: 'idle' | 'running' | 'success' | 'failure'
}

type WizardContext = {
  data: WizardData
  currentStepIndex: number
  providerName: string
  setProvider: (provider: ProviderId) => void
  startAuthorization: () => void
  setAuthorizationDenied: () => void
  setSyncWindow: (windowId: SyncWindowId) => void
  toggleOptionalScope: (scopeId: string) => void
  setConfirmLeastPrivilege: (checked: boolean) => void
  runTestConnection: () => void
  resetTestConnection: () => void
}

const providerOptions: ProviderDefinition[] = [
  {
    id: 'stripe',
    name: 'Stripe',
    badge: 'Most requested',
    description: 'Sync payouts, charges, and balance movements used in attestation runs.',
    note: 'Read-only OAuth permissions with fast reconnect support.',
  },
  {
    id: 'shopify',
    name: 'Shopify',
    badge: 'Commerce',
    description: 'Bring order and payout summaries into one source of truth for revenue checks.',
    note: 'Best for marketplace or storefront-led reporting workflows.',
  },
  {
    id: 'razorpay',
    name: 'Razorpay',
    badge: 'Emerging markets',
    description: 'Verify settlements and fee data without exposing payout controls.',
    note: 'Useful for teams reconciling multi-region payment activity.',
  },
]

const requiredScopes = [
  'Read payout and settlement totals required to compute attestation evidence.',
  'Read charge and refund metadata needed for reconciliation checks.',
  'Read account configuration relevant to revenue-source ownership.',
]

const optionalScopes = [
  {
    id: 'disputes',
    label: 'Include disputes and adjustments',
    description: 'Adds supporting context for revenue exceptions and negative adjustments.',
  },
  {
    id: 'subscriptions',
    label: 'Include subscription summaries',
    description: 'Useful when attestations should separate recurring revenue from one-off sales.',
  },
]

const syncWindows: SyncWindowDefinition[] = [
  {
    id: 'trailing-12-months',
    label: 'Trailing 12 months',
    description: 'Recommended for first-time connections and lighter initial syncs.',
  },
  {
    id: 'current-fiscal-year',
    label: 'Current fiscal year',
    description: 'Pulls only the active reporting year for a faster initial review.',
  },
  {
    id: 'all-history',
    label: 'All available history',
    description: 'Best when a backfill is needed before publishing the next attestation.',
  },
]

const wizardSteps: WizardStep[] = [
  {
    id: 'provider',
    path: '/connect-source/provider',
    label: 'Select provider',
    detail: 'Choose the revenue platform we should connect.',
  },
  {
    id: 'authorize',
    path: '/connect-source/authorize',
    label: 'Authorize',
    detail: 'Complete the secure provider handoff.',
  },
  {
    id: 'scope',
    path: '/connect-source/scope',
    label: 'Configure scope',
    detail: 'Decide how much history and supporting context to sync.',
  },
  {
    id: 'test-connection',
    path: '/connect-source/test-connection',
    label: 'Test connection',
    detail: 'Verify live read access before completing the setup.',
  },
  {
    id: 'confirm',
    path: '/connect-source/confirm',
    label: 'Confirm',
    detail: 'Review the connection before finishing.',
  },
]

const initialWizardData: WizardData = {
  provider: null,
  authorizationStatus: 'idle',
  syncWindow: null,
  optionalScopes: [],
  confirmLeastPrivilege: false,
  scopeValidationAttempted: false,
  testConnectionStatus: 'idle',
}

function getProviderName(provider: ProviderId | null) {
  return providerOptions.find((option) => option.id === provider)?.name ?? 'your provider'
}

function getStepIndex(pathname: string) {
  return wizardSteps.findIndex((step) => pathname.endsWith(step.path))
}

function isProviderComplete(data: WizardData) {
  return data.provider !== null
}

function isAuthorizeComplete(data: WizardData) {
  return isProviderComplete(data) && data.authorizationStatus === 'authorized'
}

function isScopeComplete(data: WizardData) {
  return isAuthorizeComplete(data) && data.syncWindow !== null
}

function isTestConnectionComplete(data: WizardData) {
  return isScopeComplete(data) && data.testConnectionStatus === 'success'
}

function getFirstIncompleteStepIndex(data: WizardData) {
  if (!isProviderComplete(data)) {
    return 0
  }

  if (!isAuthorizeComplete(data)) {
    return 1
  }

  if (!isScopeComplete(data)) {
    return 2
  }

  if (!isTestConnectionComplete(data)) {
    return 3
  }

  return 4
}

function useWizardContext() {
  return useOutletContext<WizardContext>()
}

export function ConnectSourceWizard() {
  const location = useLocation()
  const navigate = useNavigate()
  const [data, setData] = useState<WizardData>(initialWizardData)
  const currentStepIndex = getStepIndex(location.pathname)
  const providerName = getProviderName(data.provider)

  useEffect(() => {
    if (currentStepIndex === -1) {
      navigate(wizardSteps[0].path, { replace: true })
      return
    }

    const furthestAllowedStepIndex = getFirstIncompleteStepIndex(data)

    if (currentStepIndex > furthestAllowedStepIndex) {
      navigate(wizardSteps[furthestAllowedStepIndex].path, { replace: true })
    }
  }, [currentStepIndex, data, navigate])

  useEffect(() => {
    if (data.authorizationStatus !== 'pending') {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setData((currentData) => ({
        ...currentData,
        authorizationStatus: 'authorized',
      }))
    }, 900)

    return () => window.clearTimeout(timeoutId)
  }, [data.authorizationStatus])

  useEffect(() => {
    if (data.testConnectionStatus !== 'running') {
      return
    }

    // Simulate a test connection that takes ~1.6 s and can randomly fail
    const timeoutId = window.setTimeout(() => {
      // Use a deterministic heuristic for demo: Razorpay always fails first try
      const willFail = data.provider === 'razorpay'
      setData((currentData) => ({
        ...currentData,
        testConnectionStatus: willFail ? 'failure' : 'success',
      }))
    }, 1600)

    return () => window.clearTimeout(timeoutId)
  }, [data.testConnectionStatus, data.provider])

  useEffect(() => {
    const activeStep = wizardSteps[currentStepIndex]

    if (!activeStep) {
      return
    }

    document.title = `${activeStep.label} | Connect source | Veritasor`
  }, [currentStepIndex])

  if (currentStepIndex === -1) {
    return null
  }

  const activeStep = wizardSteps[currentStepIndex]
  const isFirstStep = currentStepIndex === 0
  const isLastStep = currentStepIndex === wizardSteps.length - 1

  const isPrimaryDisabled =
    activeStep.id === 'provider'
      ? !isProviderComplete(data)
      : activeStep.id === 'authorize'
        ? data.authorizationStatus !== 'authorized'
        : activeStep.id === 'confirm'
          ? !data.confirmLeastPrivilege
          : activeStep.id === 'test-connection'
            ? data.testConnectionStatus !== 'success'
            : false

  function goToStep(index: number) {
    navigate(wizardSteps[index].path)
  }

  function handleNext() {
    if (activeStep.id === 'scope' && data.syncWindow === null) {
      setData((currentData) => ({
        ...currentData,
        scopeValidationAttempted: true,
      }))
      return
    }

    if (isLastStep) {
      navigate('/')
      return
    }

    goToStep(currentStepIndex + 1)
  }

  const context: WizardContext = {
    data,
    currentStepIndex,
    providerName,
    setProvider: (provider) =>
      setData({
        provider,
        authorizationStatus: 'idle',
        syncWindow: null,
        optionalScopes: [],
        confirmLeastPrivilege: false,
        scopeValidationAttempted: false,
        testConnectionStatus: 'idle',
      }),
    startAuthorization: () =>
      setData((currentData) => ({
        ...currentData,
        authorizationStatus: 'pending',
      })),
    setAuthorizationDenied: () =>
      setData((currentData) => ({
        ...currentData,
        authorizationStatus: 'denied',
      })),
    setSyncWindow: (windowId) =>
      setData((currentData) => ({
        ...currentData,
        syncWindow: windowId,
        scopeValidationAttempted: false,
        confirmLeastPrivilege: false,
        testConnectionStatus: 'idle',
      })),
    toggleOptionalScope: (scopeId) =>
      setData((currentData) => ({
        ...currentData,
        optionalScopes: currentData.optionalScopes.includes(scopeId)
          ? currentData.optionalScopes.filter((currentScope) => currentScope !== scopeId)
          : [...currentData.optionalScopes, scopeId],
        confirmLeastPrivilege: false,
      })),
    setConfirmLeastPrivilege: (checked) =>
      setData((currentData) => ({
        ...currentData,
        confirmLeastPrivilege: checked,
      })),
    runTestConnection: () =>
      setData((currentData) => ({
        ...currentData,
        testConnectionStatus: 'running',
      })),
    resetTestConnection: () =>
      setData((currentData) => ({
        ...currentData,
        testConnectionStatus: 'idle',
      })),
  }

  return (
    <section className="app-page wizard-page">
      <header className="page-header page-header-tight">
        <p className="page-eyebrow">Connect revenue source</p>
        <div className="page-header-split">
          <div>
            <h1 className="page-title">Guide teams through a safer connection flow</h1>
            <p className="page-description">
              The wizard keeps sensitive setup linear: pick a provider, complete the secure
              handoff, set the sync scope, then confirm the read-only connection.
            </p>
          </div>
          <div className="page-chip-group" aria-label="Wizard characteristics">
            <span className="page-chip">WCAG 2.1 AA target</span>
            <span className="page-chip">4-step pattern</span>
            <span className="page-chip">Review-friendly states</span>
          </div>
        </div>
      </header>

      <div className="wizard-shell app-card">
        <WizardProgress currentStepIndex={currentStepIndex} steps={wizardSteps} />

        <div className="wizard-content">
          <header className="wizard-step-heading">
            <p className="wizard-step-eyebrow">{providerName}</p>
            <h2>{activeStep.label}</h2>
            <p>{activeStep.detail}</p>
          </header>

          <Outlet context={context} />
        </div>

        <footer className="wizard-footer">
          <Link to="/" className="app-button app-button-ghost wizard-cancel">
            Cancel
          </Link>

          <div className="wizard-footer-actions">
            {!isFirstStep ? (
              <button
                type="button"
                className="app-button app-button-secondary"
                onClick={() => goToStep(currentStepIndex - 1)}
              >
                Back
              </button>
            ) : null}
            <button
              type="button"
              className="app-button app-button-primary"
              onClick={handleNext}
              disabled={isPrimaryDisabled}
            >
              {isLastStep ? 'Finish connection' : 'Next'}
            </button>
          </div>
        </footer>
      </div>
    </section>
  )
}

export function SelectSourceProviderStep() {
  const { data, setProvider } = useWizardContext()

  return (
    <div className="wizard-step-body">
      <div className="wizard-callout">
        <h3>Why this step comes first</h3>
        <p>
          Provider selection affects both the authorization language and the downstream scope
          copy, so the wizard keeps later steps locked until a source is chosen.
        </p>
      </div>

      <fieldset className="wizard-fieldset">
        <legend className="wizard-legend">Choose a revenue provider</legend>
        <p className="wizard-supporting-copy">
          Each option uses the same shell and action layout, but keeps the provider-specific
          trust note visible before the user is asked to authorize anything.
        </p>

        <div className="wizard-choice-grid">
          {providerOptions.map((provider) => {
            const isChecked = data.provider === provider.id

            return (
              <label key={provider.id} className="wizard-choice-card">
                <input
                  className="wizard-choice-input"
                  type="radio"
                  name="provider"
                  value={provider.id}
                  checked={isChecked}
                  onChange={() => setProvider(provider.id)}
                />
                <span className="wizard-choice-surface">
                  <span className="wizard-choice-headline">
                    <span className="wizard-choice-title">{provider.name}</span>
                    <span className="wizard-choice-badge">{provider.badge}</span>
                  </span>
                  <span className="wizard-choice-description">{provider.description}</span>
                  <span className="wizard-choice-note">{provider.note}</span>
                </span>
              </label>
            )
          })}
        </div>
      </fieldset>
    </div>
  )
}

export function AuthorizeSourceStep() {
  const { data, providerName, startAuthorization, setAuthorizationDenied } = useWizardContext()

  return (
    <div className="wizard-step-body">
      <div className="wizard-two-column">
        <section className="app-card wizard-inline-card">
          <h3>Before redirecting to {providerName}</h3>
          <p className="wizard-supporting-copy">
            The CTA below stands in for an OAuth handoff. The step keeps the main Next button
            disabled until the handoff resolves, so the user cannot skip over authorization.
          </p>
          <ul className="wizard-list">
            {requiredScopes.map((scope) => (
              <li key={scope}>{scope}</li>
            ))}
          </ul>
          <div className="wizard-inline-actions">
            <button
              type="button"
              className="app-button app-button-primary"
              onClick={startAuthorization}
              disabled={data.authorizationStatus === 'pending'}
            >
              {data.authorizationStatus === 'pending'
                ? `Connecting to ${providerName}...`
                : `Simulate secure redirect`}
            </button>
            <button
              type="button"
              className="app-button app-button-secondary"
              onClick={setAuthorizationDenied}
              disabled={data.authorizationStatus === 'pending'}
            >
              Simulate access denied
            </button>
          </div>
        </section>

        <aside className="app-card wizard-status-card">
          <h3>Connection status</h3>
          {data.authorizationStatus === 'idle' ? (
            <p className="wizard-status-message">
              Waiting for the provider handoff. Keep Next disabled until the secure redirect
              finishes successfully.
            </p>
          ) : null}
          {data.authorizationStatus === 'pending' ? (
            <p className="wizard-status-message wizard-status-message-info" role="status">
              Securely establishing the connection and checking the returned permissions.
            </p>
          ) : null}
          {data.authorizationStatus === 'authorized' ? (
            <p className="wizard-status-message wizard-status-message-success" role="status">
              Read-only access confirmed. The user can now continue to scope configuration.
            </p>
          ) : null}
          {data.authorizationStatus === 'denied' ? (
            <p className="wizard-status-message wizard-status-message-error" role="alert">
              Authorization was denied. Keep the user in this step, explain the impact, and
              provide a retry path instead of silently dropping them back to the dashboard.
            </p>
          ) : null}
        </aside>
      </div>
    </div>
  )
}

export function ConfigureSourceScopeStep() {
  const { data, setSyncWindow, toggleOptionalScope } = useWizardContext()
  const hasSyncWindowError = data.scopeValidationAttempted && data.syncWindow === null

  return (
    <div className="wizard-step-body">
      <section className="app-card wizard-inline-card">
        <h3>Define the sync window</h3>
        <p className="wizard-supporting-copy">
          This step demonstrates how validation errors surface inside the wizard body: the
          footer action stays available, but the missing field is called out inline with
          helper text and an alert summary.
        </p>

        {hasSyncWindowError ? (
          <div className="wizard-inline-alert" role="alert">
            Choose a sync window before continuing to the confirmation step.
          </div>
        ) : null}

        <fieldset className="wizard-fieldset">
          <legend className="wizard-legend">Initial sync window</legend>
          <div className="wizard-choice-grid wizard-choice-grid-compact">
            {syncWindows.map((windowOption) => {
              const isChecked = data.syncWindow === windowOption.id

              return (
                <label key={windowOption.id} className="wizard-choice-card">
                  <input
                    className="wizard-choice-input"
                    type="radio"
                    name="sync-window"
                    value={windowOption.id}
                    checked={isChecked}
                    aria-describedby={hasSyncWindowError ? 'sync-window-error' : undefined}
                    onChange={() => setSyncWindow(windowOption.id)}
                  />
                  <span className="wizard-choice-surface">
                    <span className="wizard-choice-title">{windowOption.label}</span>
                    <span className="wizard-choice-description">{windowOption.description}</span>
                  </span>
                </label>
              )
            })}
          </div>
          {hasSyncWindowError ? (
            <p id="sync-window-error" className="wizard-field-error">
              Error: a sync window is required so reviewers understand the default data
              boundary before approving the connection.
            </p>
          ) : null}
        </fieldset>
      </section>

      <section className="app-card wizard-inline-card">
        <h3>Optional supporting scopes</h3>
        <p className="wizard-supporting-copy">
          Required read-only scopes stay fixed. Optional scopes are additive and never
          replace the least-privilege baseline.
        </p>
        <ul className="wizard-list wizard-list-muted">
          {requiredScopes.map((scope) => (
            <li key={scope}>{scope}</li>
          ))}
        </ul>
        <div className="wizard-checkbox-list">
          {optionalScopes.map((scope) => (
            <label key={scope.id} className="wizard-checkbox">
              <input
                type="checkbox"
                checked={data.optionalScopes.includes(scope.id)}
                onChange={() => toggleOptionalScope(scope.id)}
              />
              <span>
                <strong>{scope.label}</strong>
                <span className="wizard-checkbox-description">{scope.description}</span>
              </span>
            </label>
          ))}
        </div>
      </section>
    </div>
  )
}

export function ConfirmSourceStep() {
  const { data, providerName, setConfirmLeastPrivilege } = useWizardContext()
  const syncWindowLabel =
    syncWindows.find((windowOption) => windowOption.id === data.syncWindow)?.label ?? 'Not set'

  return (
    <div className="wizard-step-body">
      <section className="app-card wizard-inline-card">
        <h3>Review the connection before finishing</h3>
        <dl className="wizard-summary-grid">
          <div>
            <dt>Provider</dt>
            <dd>{providerName}</dd>
          </div>
          <div>
            <dt>Authorization</dt>
            <dd>Read-only access approved</dd>
          </div>
          <div>
            <dt>Initial sync</dt>
            <dd>{syncWindowLabel}</dd>
          </div>
          <div>
            <dt>Optional scopes</dt>
            <dd>
              {data.optionalScopes.length > 0
                ? data.optionalScopes
                    .map(
                      (scopeId) =>
                        optionalScopes.find((scope) => scope.id === scopeId)?.label ?? scopeId,
                    )
                    .join(', ')
                : 'None added'}
            </dd>
          </div>
        </dl>
      </section>

      <label className="wizard-checkbox wizard-checkbox-confirm">
        <input
          type="checkbox"
          checked={data.confirmLeastPrivilege}
          onChange={(event) => setConfirmLeastPrivilege(event.target.checked)}
        />
        <span>
          <strong>Confirm least-privilege access</strong>
          <span className="wizard-checkbox-description">
            I understand this connection is limited to the selected read-only scopes and can be
            reviewed or revoked later.
          </span>
        </span>
      </label>
    </div>
  )
}

// ---------------------------------------------------------------------------
// #224 — TestConnectionStep
// ---------------------------------------------------------------------------

function buildDiagnosticBundle(provider: string, syncWindow: string, optionalScopes: string[]): string {
  return JSON.stringify(
    {
      timestamp: new Date().toISOString(),
      provider,
      syncWindow,
      optionalScopes,
      userAgent: navigator.userAgent,
      error: {
        code: 'ERR_CONNECTION_TIMEOUT',
        message: 'The test connection did not receive a response within the allowed window.',
        hint: 'Check that the provider OAuth token has not been revoked and that the required scopes are still permitted.',
      },
    },
    null,
    2,
  )
}

export function TestConnectionStep() {
  const { data, providerName, runTestConnection, resetTestConnection, setData: _setData } =
    useWizardContext() as WizardContext & { setData?: never }

  const syncWindowLabel =
    syncWindows.find((w) => w.id === data.syncWindow)?.label ?? 'Not set'

  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle')

  const diagnosticBundle = buildDiagnosticBundle(
    providerName,
    syncWindowLabel,
    data.optionalScopes,
  )

  async function handleCopyDiagnostics() {
    try {
      await navigator.clipboard.writeText(diagnosticBundle)
      setCopyState('copied')
      setTimeout(() => setCopyState('idle'), 2500)
    } catch {
      setCopyState('error')
      setTimeout(() => setCopyState('idle'), 2500)
    }
  }

  const status = data.testConnectionStatus

  return (
    <div className="wizard-step-body">
      <div className="wizard-two-column">
        {/* Left panel — action */}
        <section className="app-card wizard-inline-card">
          <h3>Verify live read access to {providerName}</h3>
          <p className="wizard-supporting-copy">
            Before finishing setup, we make a lightweight read-only call to confirm the
            OAuth token works and the permitted scopes are correct. No data is stored
            during the test.
          </p>

          <dl className="wizard-summary-grid" style={{ marginBottom: '1rem' }}>
            <div><dt>Provider</dt><dd>{providerName}</dd></div>
            <div><dt>Sync window</dt><dd>{syncWindowLabel}</dd></div>
            <div>
              <dt>Scopes tested</dt>
              <dd>{data.optionalScopes.length > 0 ? `Required + ${data.optionalScopes.length} optional` : 'Required only'}</dd>
            </div>
          </dl>

          <div className="wizard-inline-actions">
            <button
              type="button"
              className="app-button app-button-primary"
              disabled={status === 'running'}
              onClick={runTestConnection}
              aria-describedby="test-conn-status-msg"
            >
              {status === 'running'
                ? 'Testing connection…'
                : status === 'failure'
                  ? 'Retry test'
                  : 'Run connection test'}
            </button>

            {(status === 'failure' || status === 'success') && (
              <button
                type="button"
                className="app-button app-button-secondary"
                onClick={resetTestConnection}
              >
                Reset
              </button>
            )}
          </div>
        </section>

        {/* Right panel — status */}
        <aside className="app-card wizard-status-card">
          <h3>Test status</h3>

          {status === 'idle' && (
            <p
              id="test-conn-status-msg"
              className="wizard-status-message"
              role="status"
            >
              Click "Run connection test" to verify the live read access before finishing
              setup.
            </p>
          )}

          {status === 'running' && (
            <div role="status" aria-live="polite" aria-atomic="true">
              <p className="wizard-status-message wizard-status-message-info" id="test-conn-status-msg">
                Contacting {providerName} and verifying read-only scopes…
              </p>
              {/* Animated loading bar */}
              <div
                aria-hidden="true"
                style={{
                  marginTop: '0.75rem',
                  height: 6,
                  borderRadius: 999,
                  background: 'rgba(148, 163, 184, 0.18)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: '40%',
                    height: '100%',
                    borderRadius: 999,
                    background: 'linear-gradient(90deg, var(--accent), #60a5fa)',
                    animation: 'test-conn-loading 1.4s ease-in-out infinite',
                  }}
                />
              </div>
              <style>{`
                @keyframes test-conn-loading {
                  0%   { transform: translateX(-100%); }
                  100% { transform: translateX(300%); }
                }
              `}</style>
            </div>
          )}

          {status === 'success' && (
            <div role="status" aria-live="polite" aria-atomic="true">
              <p
                className="wizard-status-message wizard-status-message-success"
                id="test-conn-status-msg"
              >
                ✓ Read-only access confirmed. All required scopes responded correctly.
                You can now proceed to the final confirmation step.
              </p>
              <ul
                style={{
                  marginTop: '0.75rem',
                  padding: '0 0 0 1.25rem',
                  color: 'var(--muted)',
                  fontSize: '0.88rem',
                  lineHeight: 1.6,
                }}
              >
                <li>Payout and settlement totals — readable</li>
                <li>Charge and refund metadata — readable</li>
                <li>Account configuration — readable</li>
              </ul>
            </div>
          )}

          {status === 'failure' && (
            <div role="alert" aria-live="assertive" aria-atomic="true">
              <p
                className="wizard-status-message wizard-status-message-error"
                id="test-conn-status-msg"
              >
                ✕ Connection failed. The test request did not succeed. Check the
                diagnostic details below and retry.
              </p>

              {/* Actionable hints */}
              <ul
                style={{
                  marginTop: '0.75rem',
                  padding: '0 0 0 1.25rem',
                  color: 'var(--muted)',
                  fontSize: '0.88rem',
                  lineHeight: 1.7,
                }}
              >
                <li>Confirm the OAuth token has not been revoked in your {providerName} dashboard.</li>
                <li>Ensure the required read-only scopes are still enabled.</li>
                <li>Check whether a firewall or IP allowlist is blocking outbound requests.</li>
                <li>Re-authorize the connection from the previous step if the token expired.</li>
              </ul>

              {/* Diagnostic bundle copy */}
              <div
                style={{
                  marginTop: '1rem',
                  padding: '0.75rem',
                  borderRadius: 10,
                  border: '1px solid rgba(251, 113, 133, 0.3)',
                  background: 'rgba(251, 113, 133, 0.06)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.5rem',
                    marginBottom: '0.5rem',
                  }}
                >
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--muted)' }}>
                    Diagnostic bundle
                  </span>
                  <button
                    type="button"
                    aria-label={
                      copyState === 'copied'
                        ? 'Diagnostic bundle copied'
                        : 'Copy diagnostic bundle to clipboard'
                    }
                    onClick={handleCopyDiagnostics}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.3rem 0.7rem',
                      borderRadius: 8,
                      border: '1px solid var(--border)',
                      background: 'transparent',
                      cursor: 'pointer',
                      color: copyState === 'copied' ? 'var(--success)' : 'var(--text)',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      transition: 'color 0.15s',
                    }}
                  >
                    {copyState === 'copied' ? (
                      <>
                        <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                        Copied
                      </>
                    ) : copyState === 'error' ? (
                      'Copy failed'
                    ) : (
                      <>
                        <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                        Copy
                      </>
                    )}
                  </button>
                </div>
                <pre
                  aria-label="Diagnostic bundle JSON"
                  tabIndex={0}
                  style={{
                    margin: 0,
                    fontSize: '0.76rem',
                    lineHeight: 1.55,
                    color: 'var(--muted)',
                    overflowX: 'auto',
                    maxHeight: 180,
                    overflowY: 'auto',
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    fontFamily: 'ui-monospace, "Cascadia Code", monospace',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                  }}
                >
                  {diagnosticBundle}
                </pre>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
