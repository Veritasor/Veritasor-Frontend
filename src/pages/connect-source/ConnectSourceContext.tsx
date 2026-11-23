import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type ProviderId = 'stripe' | 'shopify' | 'razorpay'
export type OAuthCallbackState = 'success' | 'denied' | 'expired' | 'unknown' | 'mismatch'
export type AuthorizationStatus =
  | 'idle'
  | 'pending'
  | 'authorized'
  | 'denied'
  | 'expired'
  | 'unknown'
  | 'mismatch'
export type SyncWindowId = 'trailing-12-months' | 'current-fiscal-year' | 'all-history'

export type InternalCategory = 'recurring' | 'one-time' | 'refund' | 'fee' | 'other'
export type LedgerAccount = 'revenue' | 'deferred' | 'contra' | 'expense' | 'unassigned'

export interface CurrencyRow {
  /** ISO 4217 code as reported by the source */
  currency: string
  /** User-assigned internal category */
  category: InternalCategory | null
  /** User-assigned ledger account */
  ledgerAccount: LedgerAccount | null
}

export type WizardData = {
  provider: ProviderId | null
  authorizationStatus: AuthorizationStatus
  oauthCallbackState: OAuthCallbackState
  /** Anti-CSRF OAuth state nonce generated before redirect and verified on callback */
  oauthStateNonce: string | null
  /** Optional provider error code returned on the OAuth callback query string */
  oauthError: string | null
  /** Optional human-readable error_description returned on the OAuth callback query string */
  oauthErrorDescription: string | null
  syncWindow: SyncWindowId | null
  optionalScopes: string[]
  /** Currency/ledger mapping rows (#223) */
  currencyMappings: CurrencyRow[]
  confirmLeastPrivilege: boolean
  scopeValidationAttempted: boolean
  mappingValidationAttempted: boolean
}

export const CONNECT_SOURCE_STORAGE_KEY = 'veritasor-connect-source-wizard-v1'

// Default currency rows — in production these would come from the provider's account info
export const DEFAULT_CURRENCY_ROWS: CurrencyRow[] = [
  { currency: 'USD', category: 'recurring', ledgerAccount: 'revenue' },
  { currency: 'EUR', category: null, ledgerAccount: null },
  { currency: 'GBP', category: null, ledgerAccount: null },
  { currency: 'INR', category: null, ledgerAccount: null },
]

export const initialWizardData: WizardData = {
  provider: null,
  authorizationStatus: 'idle',
  oauthCallbackState: 'success',
  oauthStateNonce: null,
  oauthError: null,
  oauthErrorDescription: null,
  syncWindow: null,
  optionalScopes: [],
  currencyMappings: DEFAULT_CURRENCY_ROWS,
  confirmLeastPrivilege: false,
  scopeValidationAttempted: false,
  mappingValidationAttempted: false,
}

const VALID_PROVIDERS = new Set<string>(['stripe', 'shopify', 'razorpay'])
const VALID_AUTH_STATUSES = new Set<string>([
  'idle',
  'pending',
  'authorized',
  'denied',
  'expired',
  'unknown',
  'mismatch',
])
const VALID_CALLBACK_STATES = new Set<string>([
  'success',
  'denied',
  'expired',
  'unknown',
  'mismatch',
])
const VALID_SYNC_WINDOWS = new Set<string>([
  'trailing-12-months',
  'current-fiscal-year',
  'all-history',
])
const VALID_CATEGORIES = new Set<string>(['recurring', 'one-time', 'refund', 'fee', 'other'])
const VALID_LEDGERS = new Set<string>(['revenue', 'deferred', 'contra', 'expense', 'unassigned'])

function isValidCurrencyRow(value: unknown): value is CurrencyRow {
  if (!value || typeof value !== 'object') return false
  const row = value as Record<string, unknown>
  return (
    typeof row.currency === 'string' &&
    (row.category === null || (typeof row.category === 'string' && VALID_CATEGORIES.has(row.category))) &&
    (row.ledgerAccount === null ||
      (typeof row.ledgerAccount === 'string' && VALID_LEDGERS.has(row.ledgerAccount)))
  )
}

function isValidWizardData(value: unknown): value is WizardData {
  if (!value || typeof value !== 'object') return false
  const d = value as Record<string, unknown>
  return (
    (d.provider === null || (typeof d.provider === 'string' && VALID_PROVIDERS.has(d.provider))) &&
    typeof d.authorizationStatus === 'string' &&
    VALID_AUTH_STATUSES.has(d.authorizationStatus) &&
    typeof d.oauthCallbackState === 'string' &&
    VALID_CALLBACK_STATES.has(d.oauthCallbackState) &&
    (d.oauthStateNonce === null || typeof d.oauthStateNonce === 'string') &&
    (d.oauthError === null || typeof d.oauthError === 'string') &&
    (d.oauthErrorDescription === null || typeof d.oauthErrorDescription === 'string') &&
    (d.syncWindow === null ||
      (typeof d.syncWindow === 'string' && VALID_SYNC_WINDOWS.has(d.syncWindow))) &&
    Array.isArray(d.optionalScopes) &&
    d.optionalScopes.every((s) => typeof s === 'string') &&
    Array.isArray(d.currencyMappings) &&
    d.currencyMappings.every(isValidCurrencyRow) &&
    typeof d.confirmLeastPrivilege === 'boolean' &&
    typeof d.scopeValidationAttempted === 'boolean' &&
    typeof d.mappingValidationAttempted === 'boolean'
  )
}

export function generateOAuthStateNonce(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `nonce-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function readPersistedWizardData(): WizardData {
  try {
    const raw = sessionStorage.getItem(CONNECT_SOURCE_STORAGE_KEY)
    if (!raw) return initialWizardData
    const parsed: unknown = JSON.parse(raw)
    return isValidWizardData(parsed) ? parsed : initialWizardData
  } catch {
    return initialWizardData
  }
}

export function writePersistedWizardData(data: WizardData): void {
  try {
    sessionStorage.setItem(CONNECT_SOURCE_STORAGE_KEY, JSON.stringify(data))
  } catch {
    // Ignore storage quota or private-mode errors
  }
}

export function clearPersistedWizardData(): void {
  try {
    sessionStorage.removeItem(CONNECT_SOURCE_STORAGE_KEY)
  } catch {
    // Ignore storage errors
  }
}

export type ConnectSourceContextValue = {
  data: WizardData
  setData: React.Dispatch<React.SetStateAction<WizardData>>
  setProvider: (provider: ProviderId) => void
  startAuthorization: () => string
  setOAuthCallbackState: (
    state: OAuthCallbackState,
    errorDetails?: { error?: string | null; errorDescription?: string | null },
  ) => void
  setSyncWindow: (windowId: SyncWindowId) => void
  toggleOptionalScope: (scopeId: string) => void
  setCurrencyMapping: (currency: string, field: 'category' | 'ledgerAccount', value: string) => void
  setConfirmLeastPrivilege: (checked: boolean) => void
  resetWizard: () => void
}

export const ConnectSourceContext = createContext<ConnectSourceContextValue | null>(null)

export function ConnectSourceProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<WizardData>(() => readPersistedWizardData())

  useEffect(() => {
    writePersistedWizardData(data)
  }, [data])

  const setProvider = useCallback((provider: ProviderId) => {
    setData({
      ...initialWizardData,
      provider,
      currencyMappings: DEFAULT_CURRENCY_ROWS.map((row) => ({ ...row })),
    })
  }, [])

  const startAuthorization = useCallback(() => {
    const nonce = generateOAuthStateNonce()
    setData((currentData) => ({
      ...currentData,
      authorizationStatus: 'pending',
      oauthStateNonce: nonce,
      oauthError: null,
      oauthErrorDescription: null,
    }))
    return nonce
  }, [])

  const setOAuthCallbackState = useCallback(
    (
      state: OAuthCallbackState,
      errorDetails?: { error?: string | null; errorDescription?: string | null },
    ) => {
      const authorizationStatus: AuthorizationStatus =
        state === 'success'
          ? 'authorized'
          : state === 'denied'
            ? 'denied'
            : state === 'expired'
              ? 'expired'
              : state === 'mismatch'
                ? 'mismatch'
                : 'unknown'

      const nextError = errorDetails?.error ?? null
      const nextErrorDescription = errorDetails?.errorDescription ?? null

      setData((currentData) => {
        if (
          currentData.oauthCallbackState === state &&
          currentData.authorizationStatus === authorizationStatus &&
          currentData.oauthError === nextError &&
          currentData.oauthErrorDescription === nextErrorDescription
        ) {
          return currentData
        }

        return {
          ...currentData,
          oauthCallbackState: state,
          authorizationStatus,
          oauthError: nextError,
          oauthErrorDescription: nextErrorDescription,
        }
      })
    },
    [],
  )

  const setSyncWindow = useCallback((windowId: SyncWindowId) => {
    setData((currentData) => ({
      ...currentData,
      syncWindow: windowId,
      scopeValidationAttempted: false,
      confirmLeastPrivilege: false,
    }))
  }, [])

  const toggleOptionalScope = useCallback((scopeId: string) => {
    setData((currentData) => ({
      ...currentData,
      optionalScopes: currentData.optionalScopes.includes(scopeId)
        ? currentData.optionalScopes.filter((currentScope) => currentScope !== scopeId)
        : [...currentData.optionalScopes, scopeId],
      confirmLeastPrivilege: false,
    }))
  }, [])

  const setCurrencyMapping = useCallback(
    (currency: string, field: 'category' | 'ledgerAccount', value: string) => {
      setData((currentData) => ({
        ...currentData,
        mappingValidationAttempted: false,
        currencyMappings: currentData.currencyMappings.map((row) =>
          row.currency === currency ? { ...row, [field]: value === '' ? null : value } : row,
        ),
      }))
    },
    [],
  )

  const setConfirmLeastPrivilege = useCallback((checked: boolean) => {
    setData((currentData) => ({
      ...currentData,
      confirmLeastPrivilege: checked,
    }))
  }, [])

  const resetWizard = useCallback(() => {
    clearPersistedWizardData()
    setData({
      ...initialWizardData,
      currencyMappings: DEFAULT_CURRENCY_ROWS.map((row) => ({ ...row })),
    })
  }, [])

  const value = useMemo<ConnectSourceContextValue>(
    () => ({
      data,
      setData,
      setProvider,
      startAuthorization,
      setOAuthCallbackState,
      setSyncWindow,
      toggleOptionalScope,
      setCurrencyMapping,
      setConfirmLeastPrivilege,
      resetWizard,
    }),
    [
      data,
      setProvider,
      startAuthorization,
      setOAuthCallbackState,
      setSyncWindow,
      toggleOptionalScope,
      setCurrencyMapping,
      setConfirmLeastPrivilege,
      resetWizard,
    ],
  )

  return <ConnectSourceContext.Provider value={value}>{children}</ConnectSourceContext.Provider>
}

export function useConnectSource(): ConnectSourceContextValue {
  const ctx = useContext(ConnectSourceContext)
  if (!ctx) {
    throw new Error('useConnectSource must be used within a ConnectSourceProvider')
  }
  return ctx
}
