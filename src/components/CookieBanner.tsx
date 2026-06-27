import { useEffect, useId, useRef, useState } from 'react'
import { useCookieConsent } from './CookieConsentContext'
import type { ConsentState } from './CookieConsentContext'

// ─── Category descriptions ────────────────────────────────────────────────────

const CATEGORIES = [
  {
    id: 'essential' as const,
    label: 'Essential',
    description: 'Required for core features such as authentication and security. Cannot be disabled.',
    locked: true,
  },
  {
    id: 'analytics' as const,
    label: 'Analytics',
    description: 'Help us understand how you use the product so we can measure and improve it.',
    locked: false,
  },
  {
    id: 'marketing' as const,
    label: 'Marketing',
    description: 'Allow personalised content and relevant product updates based on your activity.',
    locked: false,
  },
]

// ─── Toggle switch sub-component ─────────────────────────────────────────────

interface ToggleRowProps {
  id: string
  label: string
  description: string
  checked: boolean
  disabled?: boolean
  onChange: (checked: boolean) => void
}

function ToggleRow({ id, label, description, checked, disabled = false, onChange }: ToggleRowProps) {
  const descId = `${id}-desc`
  return (
    <div className="cc-toggle-row">
      <div className="cc-toggle-info">
        <label htmlFor={id} className="cc-toggle-name">
          {label}
          {disabled && <span className="cc-toggle-locked" aria-hidden="true"> (always active)</span>}
        </label>
        <p id={descId} className="cc-toggle-desc">
          {description}
        </p>
      </div>
      <div className="cc-toggle-control" aria-hidden={disabled ? 'true' : undefined}>
        <input
          type="checkbox"
          id={id}
          role="switch"
          checked={checked}
          disabled={disabled}
          aria-describedby={descId}
          aria-label={disabled ? `${label} (always active)` : label}
          className="cc-toggle-input"
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="cc-toggle-track" aria-hidden="true">
          <span className="cc-toggle-thumb" />
        </span>
      </div>
    </div>
  )
}

// ─── Banner ───────────────────────────────────────────────────────────────────

export default function CookieBanner() {
  const { bannerVisible, hasDecided, consent, acceptAll, rejectAll, savePreferences, closeBanner } =
    useCookieConsent()

  const [detailsOpen, setDetailsOpen] = useState(false)
  const [localConsent, setLocalConsent] = useState<ConsentState>(consent)

  const acceptBtnRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  const detailsPanelId = useId()
  const prefix = useId()

  // Sync local state with current consent whenever banner becomes visible
  useEffect(() => {
    if (bannerVisible) {
      setLocalConsent(consent)
      setDetailsOpen(false)
    }
  }, [bannerVisible, consent])

  // Move focus to the first action button when the banner opens
  useEffect(() => {
    if (bannerVisible && acceptBtnRef.current) {
      acceptBtnRef.current.focus()
    }
  }, [bannerVisible])

  // ESC: close without change (if decided), else treat as Reject all
  useEffect(() => {
    if (!bannerVisible) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      if (hasDecided) {
        closeBanner()
      } else {
        rejectAll()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [bannerVisible, hasDecided, closeBanner, rejectAll])

  if (!bannerVisible) return null

  function handleSavePreferences() {
    savePreferences(localConsent)
  }

  function toggleCategory(key: keyof ConsentState, value: boolean) {
    setLocalConsent((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      className="cc-banner"
      data-testid="cookie-banner"
    >
      <div className="cc-banner-inner">
        {/* ── Main row ────────────────────────────────────────────── */}
        <div className="cc-content">
          <h2 id={titleId} className="cc-title">
            Your privacy choices
          </h2>
          <p className="cc-desc">
            We use cookies to keep the service running and to understand how it's used.
            You can accept all, reject optional cookies, or customise your preferences.
            Read our{' '}
            <a href="/privacy-policy" className="cc-policy-link">
              privacy policy
            </a>{' '}
            for details.
          </p>
        </div>

        <div className="cc-actions">
          <button
            ref={acceptBtnRef}
            type="button"
            className="cc-btn cc-btn-primary"
            onClick={acceptAll}
            aria-label="Accept all cookies"
          >
            Accept all
          </button>
          <button
            type="button"
            className="cc-btn cc-btn-secondary"
            onClick={rejectAll}
            aria-label="Reject optional cookies"
          >
            Reject all
          </button>
          <button
            type="button"
            className="cc-btn cc-btn-manage"
            aria-expanded={detailsOpen}
            aria-controls={detailsPanelId}
            onClick={() => setDetailsOpen((o) => !o)}
          >
            {detailsOpen ? 'Hide preferences' : 'Manage preferences'}
            <span className="cc-chevron" aria-hidden="true">
              {detailsOpen ? ' ▲' : ' ▼'}
            </span>
          </button>
        </div>
      </div>

      {/* ── Expandable preferences panel ─────────────────────────── */}
      {detailsOpen && (
        <div id={detailsPanelId} className="cc-details" role="group" aria-label="Cookie preferences">
          <div className="cc-details-inner">
            {CATEGORIES.map((cat) => (
              <ToggleRow
                key={cat.id}
                id={`${prefix}-${cat.id}`}
                label={cat.label}
                description={cat.description}
                disabled={cat.locked}
                checked={cat.locked ? true : localConsent[cat.id as keyof ConsentState]}
                onChange={(val) => {
                  if (!cat.locked) toggleCategory(cat.id as keyof ConsentState, val)
                }}
              />
            ))}

            <div className="cc-details-footer">
              <button
                type="button"
                className="cc-btn cc-btn-save"
                onClick={handleSavePreferences}
              >
                Save preferences
              </button>
              {hasDecided && (
                <button
                  type="button"
                  className="cc-btn cc-btn-manage"
                  onClick={closeBanner}
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
