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

  return 3
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
