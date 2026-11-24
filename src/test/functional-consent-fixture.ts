import { CookieConsentProvider, STORAGE_KEY } from '../components/CookieConsentContext'

export { CookieConsentProvider as FunctionalConsentWrapper }

export function grantFunctionalConsent() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    functional: true,
    analytics: false,
    marketing: false,
    productCommunications: false,
  }))
}
