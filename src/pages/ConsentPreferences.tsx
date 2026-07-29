import { useEffect, useId, useState } from 'react'
import { useCookieConsent } from '../components/CookieConsentContext'
import type { ConsentState } from '../components/CookieConsentContext'

// ─── Category descriptions ────────────────────────────────────────────────────

const CONSENT_CATEGORIES = [
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
  {
    id: 'productCommunications' as const,
    label: 'Product Communications',
    description: 'Receive important updates about your account, security alerts, and feature announcements.',
    locked: false,
  },
]

// ─── Last updated date ─────────────────────────────────────────────────────────

const LAST_UPDATED = new Date('2024-01-15T00:00:00Z')

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
    <div className="cp-toggle-row" data-testid="toggle-row">
      <div className="cp-toggle-info">
        <label htmlFor={id} className="cp-toggle-name">
          {label}
          {disabled && <span className="cp-toggle-locked" aria-hidden="true"> (always active)</span>}
        </label>
        <p id={descId} className="cp-toggle-desc">
          {description}
        </p>
      </div>
      <div className="cp-toggle-control" aria-hidden={disabled ? 'true' : undefined}>
        <input
          type="checkbox"
          id={id}
          role="switch"
          checked={checked}
          disabled={disabled}
          aria-describedby={descId}
          aria-label={disabled ? `${label} (always active)` : label}
          className="cp-toggle-input"
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="cp-toggle-track" aria-hidden="true">
          <span className="cp-toggle-thumb" />
        </span>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ConsentPreferences() {
  const { consent, savePreferences } = useCookieConsent()
  const [localConsent, setLocalConsent] = useState<ConsentState>(consent)
  const [hasChanges, setHasChanges] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const titleId = useId()
  const prefix = useId()

  // Sync local state with current consent
  useEffect(() => {
    setLocalConsent(consent)
    setHasChanges(false)
  }, [consent])

  function toggleCategory(key: keyof ConsentState, value: boolean) {
    setLocalConsent((prev) => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  async function handleSave() {
    setSaveStatus('saving')
    try {
      savePreferences(localConsent)
      setSaveStatus('saved')
      setHasChanges(false)
      // Reset status after 3 seconds
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch {
      setSaveStatus('error')
      // Reset error status after 3 seconds
      setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }

  function handleReset() {
    setLocalConsent(consent)
    setHasChanges(false)
  }

  function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date)
  }

  return (
    <div className="cp-container">
      <div className="cp-content">
        <header className="cp-header">
          <h1 id={titleId} className="cp-title">
            Consent Preferences
          </h1>
          <p className="cp-subtitle">
            Manage your privacy preferences for cookies and data processing. You can change these settings at any time.
          </p>
        </header>

        <main className="cp-main" aria-labelledby={titleId}>
          <section className="cp-section" aria-label="Consent categories">
            <div className="cp-categories">
              {CONSENT_CATEGORIES.map((cat) => (
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
            </div>
          </section>

          <section className="cp-actions-section" aria-label="Actions">
            <div className="cp-actions">
              <button
                type="button"
                className="cp-btn cp-btn-primary"
                onClick={handleSave}
                disabled={!hasChanges || saveStatus === 'saving'}
                aria-busy={saveStatus === 'saving'}
              >
                {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved!' : 'Save preferences'}
              </button>
              {hasChanges && (
                <button
                  type="button"
                  className="cp-btn cp-btn-secondary"
                  onClick={handleReset}
                  disabled={saveStatus === 'saving'}
                >
                  Cancel
                </button>
              )}
            </div>
            {saveStatus === 'error' && (
              <p className="cp-error" role="alert">
                Failed to save preferences. Please try again.
              </p>
            )}
          </section>

          <footer className="cp-footer">
            <div className="cp-footer-info">
              <p className="cp-last-updated">
                Last updated: <time dateTime={LAST_UPDATED.toISOString()}>{formatDate(LAST_UPDATED)}</time>
              </p>
              <p className="cp-policy-link">
                For more details, read our{' '}
                <a href="/privacy-policy" className="cp-link">
                  privacy policy
                </a>
                .
              </p>
            </div>
          </footer>
        </main>
      </div>
    </div>
  )
}
