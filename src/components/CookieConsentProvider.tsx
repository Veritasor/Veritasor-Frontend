import { useCallback, useEffect, useRef, useState } from 'react'
import { CookieConsentContext, STORAGE_KEY, type ConsentState } from '../state/cookieConsent'
import { clearFunctionalStorage, readConsentStorage, writeConsentStorage } from '../utils/consentStorage'

const DEFAULT_CONSENT: ConsentState = { functional: false, analytics: false, marketing: false, productCommunications: false }

function readStorage(): { hasDecided: boolean; consent: ConsentState } {
  try {
    const raw = readConsentStorage(STORAGE_KEY, true)
    const parsed: unknown = raw === null ? null : JSON.parse(raw)
    if (
      parsed && typeof parsed === 'object' &&
      'analytics' in parsed && typeof parsed.analytics === 'boolean' &&
      'marketing' in parsed && typeof parsed.marketing === 'boolean' &&
      (!('productCommunications' in parsed) || typeof parsed.productCommunications === 'boolean') &&
      (!('functional' in parsed) || typeof parsed.functional === 'boolean')
    ) {
      return {
        hasDecided: true,
        consent: {
          analytics: parsed.analytics,
          marketing: parsed.marketing,
          productCommunications: 'productCommunications' in parsed && parsed.productCommunications === true,
          functional: 'functional' in parsed && parsed.functional === true,
        },
      }
    }
  } catch {
    // Invalid consent is treated as undecided.
  }
  return { hasDecided: false, consent: DEFAULT_CONSENT }
}

export function CookieConsentProvider({ children }: { children: React.ReactNode }) {
  const [initial] = useState(() => {
    const stored = readStorage()
    return { ...stored, grant: stored.consent.functional ? new AbortController() : undefined }
  })
  const grant = useRef(initial.grant)
  const [hasDecided, setHasDecided] = useState(initial.hasDecided)
  const [consent, setConsent] = useState(initial.consent)
  const [bannerVisible, setBannerVisible] = useState(!initial.hasDecided)

  const applyConsent = useCallback((next: ConsentState, decided: boolean) => {
    if (!next.functional) {
      const wasGranted = grant.current?.signal.aborted === false
      grant.current?.abort()
      if (decided || wasGranted) clearFunctionalStorage()
    } else if (!grant.current || grant.current.signal.aborted) {
      grant.current = new AbortController()
    }
    setConsent(next)
    setHasDecided(decided)
    setBannerVisible(!decided)
  }, [])

  const decide = useCallback((next: ConsentState) => {
    applyConsent(next, true)
    writeConsentStorage(STORAGE_KEY, JSON.stringify(next), true)
  }, [applyConsent])

  useEffect(() => {
    function syncConsent(event: StorageEvent) {
      if (event.key !== STORAGE_KEY && event.key !== null) return
      const stored = readStorage()
      applyConsent(stored.consent, stored.hasDecided)
    }
    window.addEventListener('storage', syncConsent)
    return () => window.removeEventListener('storage', syncConsent)
  }, [applyConsent])

  const acceptAll = useCallback(() => decide({ functional: true, analytics: true, marketing: true, productCommunications: true }), [decide])
  const rejectAll = useCallback(() => decide(DEFAULT_CONSENT), [decide])
  const savePreferences = useCallback((next: ConsentState) => decide(next), [decide])
  const openSettings = useCallback(() => setBannerVisible(true), [])
  const closeBanner = useCallback(() => {
    if (hasDecided) setBannerVisible(false)
  }, [hasDecided])

  return (
    <CookieConsentContext.Provider
      value={{
        hasDecided,
        consent,
        functionalGrant: consent.functional ? grant.current?.signal : undefined,
        bannerVisible,
        acceptAll,
        rejectAll,
        savePreferences,
        openSettings,
        closeBanner,
      }}
    >
      {children}
    </CookieConsentContext.Provider>
  )
}
