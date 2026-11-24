import { createContext, useContext } from 'react'

export type ConsentState = {
  functional: boolean
  analytics: boolean
  marketing: boolean
  productCommunications: boolean
}

type CookieConsentContextValue = {
  hasDecided: boolean
  consent: ConsentState
  functionalGrant?: AbortSignal
  bannerVisible: boolean
  acceptAll: () => void
  rejectAll: () => void
  savePreferences: (next: ConsentState) => void
  openSettings: () => void
  closeBanner: () => void
}

export const STORAGE_KEY = 'veritasor_cookie_consent'

export const CookieConsentContext = createContext<CookieConsentContextValue | undefined>(
  undefined,
)

export function useCookieConsent(): CookieConsentContextValue {
  const ctx = useContext(CookieConsentContext)
  if (!ctx) throw new Error('useCookieConsent must be used within CookieConsentProvider')
  return ctx
}

export type ConsentCategory = 'essential' | keyof ConsentState

export function useConsent(category: ConsentCategory): boolean {
  const context = useContext(CookieConsentContext)
  return category === 'essential' || (
    category === 'functional'
      ? context?.functionalGrant?.aborted === false
      : context?.hasDecided === true && context.consent[category] === true
  )
}

export function useFunctionalConsentGrant(): AbortSignal | undefined {
  return useContext(CookieConsentContext)?.functionalGrant
}
