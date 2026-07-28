import { useCallback, useId, useRef, useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

export type MfaMethod = 'totp' | 'sms' | 'security-key'

interface MethodDefinition {
  id: MfaMethod
  title: string
  icon: string
  description: string
  pros: string[]
  cons: string[]
  recommended: boolean
  learnMore: string
}

// ─── Data ──────────────────────────────────────────────────────────────────────

const METHODS: MethodDefinition[] = [
  {
    id: 'totp',
    title: 'Authenticator app (TOTP)',
    icon: '📱',
    description: 'Generate time-based one-time codes with an app like Google Authenticator, 1Password, or Authy.',
    pros: [
      'Works offline — no cellular signal required',
      'Free and widely supported across platforms',
      'Codes refresh every 30 seconds',
    ],
    cons: [
      'Requires a separate app installed',
      'Must transfer seeds when switching devices',
      'Can be phished if the user is tricked into entering a code on a fake site',
    ],
    recommended: false,
    learnMore:
      'TOTP (Time-based One-Time Password) is an open standard defined in RFC 6238. It uses a shared secret and the current time to generate codes that change every 30 seconds. Because codes are time-based, your device clock must be reasonably accurate.',
  },
  {
    id: 'sms',
    title: 'SMS text message',
    icon: '💬',
    description: 'Receive a one-time code via text message to your registered phone number.',
    pros: [
      'No additional app needed — works on any mobile phone',
      'Familiar and quick to set up',
      'Useful as a fallback when other methods are unavailable',
    ],
    cons: [
      'Vulnerable to SIM-swap attacks',
      'Requires cellular connectivity',
      'Slower delivery than app-based codes',
      'Carrier-dependent and may incur SMS fees',
    ],
    recommended: false,
    learnMore:
      'SMS-based two-factor authentication sends a numeric code to your phone. While better than no 2FA, SMS is considered the weakest second factor because attackers can exploit carrier porting or SS7 vulnerabilities to intercept messages.',
  },
  {
    id: 'security-key',
    title: 'Security key (FIDO2/WebAuthn)',
    icon: '🔐',
    description: 'Use a physical hardware key (like YubiKey) or a platform authenticator (Touch ID, Windows Hello, Face ID) for phishing-resistant authentication.',
    pros: [
      'Phishing-resistant — the browser verifies the origin',
      'Fastest authentication flow (tap or biometric)',
      'Hardware keys work across devices via USB-C, Lightning, or NFC',
      'Platform authenticators are built into modern devices',
    ],
    cons: [
      'Requires a compatible device or hardware key',
      'Hardware keys can be lost or damaged (register a backup)',
      'Not all services support FIDO2 yet',
    ],
    recommended: true,
    learnMore:
      'FIDO2 (Fast IDentity Online) is the gold standard for authentication. It uses public-key cryptography: your private key never leaves the device, and the service only stores a public key. WebAuthn, the browser API, ensures the request comes from the real site, making it immune to phishing.',
  },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function LearnMorePopover({
  id,
  methodTitle,
  content,
  isOpen,
  onToggle,
}: {
  id: string
  methodTitle: string
  content: string
  isOpen: boolean
  onToggle: () => void
}) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelId = `${id}-learn-more`

  const close = useCallback(() => {
    // Close is handled by parent via onToggle
    onToggle()
    // Focus back to trigger on close
    setTimeout(() => triggerRef.current?.focus(), 0)
  }, [onToggle])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        close()
      }
    },
    [close],
  )

  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      <button
        ref={triggerRef}
        type="button"
        id={`${id}-learn-trigger`}
        className="mfa-learn-trigger"
        aria-expanded={isOpen}
        aria-controls={panelId}
        aria-label={`Learn more about ${methodTitle}`}
        onClick={onToggle}
      >
        Learn more
      </button>
      {isOpen ? (
        <div
          id={panelId}
          className="mfa-learn-popover"
          role="region"
          aria-label={`More about ${methodTitle}`}
          onKeyDown={handleKeyDown}
        >
          <p className="mfa-learn-popover-text">{content}</p>
          <button
            type="button"
            className="mfa-learn-close"
            onClick={close}
            aria-label="Close learn more"
          >
            ✕
          </button>
        </div>
      ) : null}
      {/* Backdrop to trap clicks outside */}
      {isOpen ? (
        <div
          className="mfa-learn-backdrop"
          onClick={close}
          aria-hidden="true"
        />
      ) : null}
    </span>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

interface MfaMethodChooserProps {
  /** The currently selected MFA method, or null if none selected. */
  value: MfaMethod | null
  /** Called when the user selects a method. */
  onChange: (method: MfaMethod) => void
  /** Optional accessible name override for the radio group. */
  'aria-label'?: string
}

/**
 * MFA Method Chooser
 *
 * A radio-group of 3 cards (TOTP, SMS, Security Key) with icons,
 * tradeoffs, a "Recommended" badge, and learn-more popovers.
 *
 * Follows the wizard-choice-card pattern and WCAG 2.1 AA guidelines.
 */
export default function MfaMethodChooser({
  value,
  onChange,
  'aria-label': ariaLabel,
}: MfaMethodChooserProps) {
  const groupId = useId()
  const fieldsetLabel = ariaLabel ?? 'Choose a two-factor authentication method'
  const descId = `${groupId}-description`

  // Only one learn-more popover open at a time
  const [openLearnMore, setOpenLearnMore] = useState<MfaMethod | null>(null)

  const toggleLearnMore = useCallback(
    (methodId: MfaMethod) => {
      setOpenLearnMore((prev) => (prev === methodId ? null : methodId))
    },
    [],
  )

  return (
    <fieldset className="mfa-fieldset" aria-describedby={descId}>
      <legend className="mfa-legend">{fieldsetLabel}</legend>

      <p id={descId} className="mfa-description">
        Each method provides a second factor during sign-in. We recommend
        security keys for the strongest protection.
      </p>

      <div className="mfa-choice-grid">
        {METHODS.map((method) => {
          const isChecked = value === method.id
          const inputId = `${groupId}-${method.id}`

          return (
            <label key={method.id} className="mfa-choice-card">
              <input
                id={inputId}
                className="mfa-choice-input"
                type="radio"
                name={groupId}
                value={method.id}
                checked={isChecked}
                onChange={() => onChange(method.id)}
              />

              <span className="mfa-choice-surface">
                {/* Headline row: icon + title + optional recommended badge */}
                <span className="mfa-choice-headline">
                  <span className="mfa-choice-icon" aria-hidden="true">
                    {method.icon}
                  </span>
                  <span className="mfa-choice-title">{method.title}</span>
                  {method.recommended ? (
                    <span className="mfa-recommended-badge">Recommended</span>
                  ) : null}
                </span>

                {/* Description */}
                <span className="mfa-choice-description">
                  {method.description}
                </span>

                {/* Tradeoffs: pros & cons */}
                <span className="mfa-tradeoffs">
                  <span className="mfa-tradeoff-section">
                    <span className="mfa-tradeoff-heading mfa-tradeoff-pros">
                      ✓ Pros
                    </span>
                    <ul className="mfa-tradeoff-list">
                      {method.pros.map((pro) => (
                        <li key={pro}>{pro}</li>
                      ))}
                    </ul>
                  </span>
                  <span className="mfa-tradeoff-section">
                    <span className="mfa-tradeoff-heading mfa-tradeoff-cons">
                      ✗ Considerations
                    </span>
                    <ul className="mfa-tradeoff-list">
                      {method.cons.map((con) => (
                        <li key={con}>{con}</li>
                      ))}
                    </ul>
                  </span>
                </span>

                {/* Learn more trigger */}
                <LearnMorePopover
                  id={inputId}
                  methodTitle={method.title}
                  content={method.learnMore}
                  isOpen={openLearnMore === method.id}
                  onToggle={() => toggleLearnMore(method.id)}
                />
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
