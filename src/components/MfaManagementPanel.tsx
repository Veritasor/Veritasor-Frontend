import { useCallback, useId, useState } from 'react'
import MfaMethodChooser, { type MfaMethod } from './MfaMethodChooser'
import { ReauthModal } from './ReauthModal'
import {
  buildOtpAuthUri,
  formatTotpSecret,
  generateTotpSecret,
  verifyTotp,
} from '../services/totp'
import {
  generateRecoveryCodes,
  replaceRecoveryCodes,
} from '../services/mockAuth'

export interface EnrolledMfaFactor {
  id: string
  method: MfaMethod
  label: string
  enrolledAt: string
  secret?: string
}

type WizardStep = 'idle' | 'choose' | 'enroll' | 'recovery'

const METHOD_LABELS: Record<MfaMethod, string> = {
  totp: 'Authenticator app (TOTP)',
  sms: 'SMS text message',
  'security-key': 'Security key (FIDO2/WebAuthn)',
}

const METHOD_ICONS: Record<MfaMethod, string> = {
  totp: '📱',
  sms: '💬',
  'security-key': '🔐',
}

function QrCodePlaceholder({ uri }: { uri: string }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '1rem',
        borderRadius: 10,
        border: '1px dashed var(--border)',
        background: 'var(--surface-strong)',
      }}
    >
      <svg
        role="img"
        aria-label="TOTP QR code placeholder"
        width="136"
        height="136"
        viewBox="0 0 136 136"
        style={{ background: '#ffffff', borderRadius: 6, padding: 8 }}
      >
        <rect x="8" y="8" width="32" height="32" fill="#0f172a" />
        <rect x="14" y="14" width="20" height="20" fill="#ffffff" />
        <rect x="18" y="18" width="12" height="12" fill="#0f172a" />
        <rect x="96" y="8" width="32" height="32" fill="#0f172a" />
        <rect x="102" y="14" width="20" height="20" fill="#ffffff" />
        <rect x="106" y="18" width="12" height="12" fill="#0f172a" />
        <rect x="8" y="96" width="32" height="32" fill="#0f172a" />
        <rect x="14" y="102" width="20" height="20" fill="#ffffff" />
        <rect x="18" y="106" width="12" height="12" fill="#0f172a" />
        <rect x="52" y="16" width="12" height="12" fill="#0f172a" />
        <rect x="72" y="16" width="12" height="12" fill="#0f172a" />
        <rect x="52" y="48" width="12" height="12" fill="#0f172a" />
        <rect x="72" y="48" width="12" height="12" fill="#0f172a" />
        <rect x="52" y="72" width="32" height="12" fill="#0f172a" />
        <rect x="96" y="56" width="12" height="28" fill="#0f172a" />
        <rect x="116" y="64" width="12" height="12" fill="#0f172a" />
        <rect x="56" y="96" width="12" height="12" fill="#0f172a" />
        <rect x="80" y="96" width="24" height="12" fill="#0f172a" />
        <rect x="64" y="116" width="28" height="12" fill="#0f172a" />
        <rect x="108" y="108" width="20" height="20" fill="#0f172a" />
      </svg>
      <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
        Scan with your authenticator app
      </span>
      <span className="sr-only">{uri}</span>
    </div>
  )
}

export interface MfaManagementPanelProps {
  /** Account email used in the otpauth:// provisioning URI. */
  accountEmail?: string
}

export default function MfaManagementPanel({
  accountEmail = 'joel@example.com',
}: MfaManagementPanelProps) {
  const headingId = useId()
  const lastFactorNoteId = useId()
  const totpInputId = useId()
  const smsInputId = useId()
  const keyLabelInputId = useId()
  const savedCheckboxId = useId()

  const [factors, setFactors] = useState<EnrolledMfaFactor[]>([])
  const [selectedMethod, setSelectedMethod] = useState<MfaMethod | null>('totp')
  const [wizardStep, setWizardStep] = useState<WizardStep>('idle')

  // TOTP enrollment state
  const [pendingSecret, setPendingSecret] = useState<string>('')
  const [totpCode, setTotpCode] = useState<string>('')
  const [verifyError, setVerifyError] = useState<string | null>(null)
  const [isVerifying, setIsVerifying] = useState<boolean>(false)
  const [copiedKey, setCopiedKey] = useState<boolean>(false)

  // SMS / Security Key enrollment state
  const [smsPhone, setSmsPhone] = useState<string>('')
  const [keyNickname, setKeyNickname] = useState<string>('Hardware Security Key')

  // Recovery codes lifecycle state
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])
  const [codesConfirmed, setCodesConfirmed] = useState<boolean>(false)
  const [showRecoveryCodes, setShowRecoveryCodes] = useState<boolean>(false)
  const [copiedCodes, setCopiedCodes] = useState<boolean>(false)
  const [reauthOpen, setReauthOpen] = useState<boolean>(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const beginEnrollment = useCallback((method: MfaMethod) => {
    setSelectedMethod(method)
    setVerifyError(null)
    setTotpCode('')
    setSmsPhone('')
    setKeyNickname('Hardware Security Key')
    setCopiedKey(false)
    setStatusMessage(null)
    if (method === 'totp') {
      setPendingSecret(generateTotpSecret())
    }
    setWizardStep('enroll')
  }, [])

  const completeFactorEnrollment = useCallback(
    (factor: EnrolledMfaFactor) => {
      const isFirstFactor = factors.length === 0
      setFactors((prev) => [...prev, factor])

      if (isFirstFactor || recoveryCodes.length === 0) {
        const freshCodes = generateRecoveryCodes()
        replaceRecoveryCodes(freshCodes)
        setRecoveryCodes(freshCodes)
        setCodesConfirmed(false)
        setWizardStep('recovery')
      } else {
        setWizardStep('idle')
        setStatusMessage(`${factor.label} added to your account.`)
      }
    },
    [factors.length, recoveryCodes.length],
  )

  const handleTotpVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setVerifyError(null)
    setIsVerifying(true)
    try {
      const valid = await verifyTotp(pendingSecret, totpCode)
      if (!valid) {
        setVerifyError(
          'Invalid verification code. Please check your authenticator app and try again.',
        )
        return
      }
      completeFactorEnrollment({
        id: `mfa_${Date.now()}`,
        method: 'totp',
        label: METHOD_LABELS.totp,
        enrolledAt: new Date().toISOString().slice(0, 10),
        secret: pendingSecret,
      })
    } finally {
      setIsVerifying(false)
    }
  }

  const handleSmsEnroll = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = smsPhone.trim()
    if (!trimmed) return
    completeFactorEnrollment({
      id: `mfa_${Date.now()}`,
      method: 'sms',
      label: `SMS (${trimmed})`,
      enrolledAt: new Date().toISOString().slice(0, 10),
    })
  }

  const handleSecurityKeyEnroll = (e: React.FormEvent) => {
    e.preventDefault()
    const label = keyNickname.trim() || METHOD_LABELS['security-key']
    completeFactorEnrollment({
      id: `mfa_${Date.now()}`,
      method: 'security-key',
      label,
      enrolledAt: new Date().toISOString().slice(0, 10),
    })
  }

  const handleRemoveFactor = (factorId: string) => {
    // Safeguard: never remove the last enrolled MFA method
    if (factors.length <= 1) return
    const target = factors.find((f) => f.id === factorId)
    setFactors((prev) => prev.filter((f) => f.id !== factorId))
    if (target) {
      setStatusMessage(`${target.label} has been removed.`)
    }
  }

  const handleCopyManualKey = async () => {
    try {
      await navigator.clipboard?.writeText(pendingSecret)
      setCopiedKey(true)
    } catch {
      setCopiedKey(true)
    }
  }

  const handleCopyAllCodes = async () => {
    try {
      await navigator.clipboard?.writeText(recoveryCodes.join('\n'))
      setCopiedCodes(true)
    } catch {
      setCopiedCodes(true)
    }
  }

  const handleDownloadCodes = () => {
    const content = `Veritasor Recovery Codes\n\n${recoveryCodes.join('\n')}\n`
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'veritasor-recovery-codes.txt'
    link.click()
    URL.revokeObjectURL(url)
  }

  const handlePrintCodes = () => {
    window.print?.()
  }

  const handleReauthSuccess = () => {
    setReauthOpen(false)
    const freshCodes = generateRecoveryCodes()
    replaceRecoveryCodes(freshCodes)
    setRecoveryCodes(freshCodes)
    setShowRecoveryCodes(true)
    setCopiedCodes(false)
    setStatusMessage(
      'Recovery codes regenerated. Your previous codes are no longer valid.',
    )
  }

  const otpAuthUri = pendingSecret
    ? buildOtpAuthUri({
        secret: pendingSecret,
        accountName: accountEmail,
        issuer: 'Veritasor',
      })
    : ''

  const isEnabled = factors.length > 0
  const isLastFactor = factors.length <= 1

  return (
    <section
      aria-labelledby={headingId}
      style={{ display: 'grid', gap: '1rem', maxWidth: 680 }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h3 id={headingId} style={{ margin: 0, fontSize: '1.05rem' }}>
            Two-factor authentication (MFA)
          </h3>
          <p
            style={{
              margin: '0.2rem 0 0',
              color: 'var(--muted)',
              fontSize: '0.88rem',
            }}
          >
            {isEnabled
              ? 'Two-factor authentication is enabled on your account.'
              : 'Add a second verification step to protect your account.'}
          </p>
        </div>
        <span
          role="status"
          style={{
            padding: '0.25rem 0.7rem',
            borderRadius: 999,
            fontSize: '0.8rem',
            fontWeight: 700,
            background: isEnabled
              ? 'var(--success-soft, rgba(52, 211, 153, 0.14))'
              : 'var(--surface-strong)',
            color: isEnabled ? 'var(--success, #34d399)' : 'var(--muted)',
            border: '1px solid var(--border)',
          }}
        >
          {isEnabled ? 'Enabled' : 'Not enabled'}
        </span>
      </div>

      {statusMessage && (
        <p
          role="status"
          aria-live="polite"
          style={{
            margin: 0,
            padding: '0.65rem 0.9rem',
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'var(--surface-strong)',
            fontSize: '0.88rem',
          }}
        >
          {statusMessage}
        </p>
      )}

      {/* Initial state: no factors enrolled */}
      {!isEnabled && wizardStep === 'idle' && (
        <div style={{ display: 'grid', gap: '1rem' }}>
          <MfaMethodChooser
            value={selectedMethod}
            onChange={setSelectedMethod}
          />
          <div>
            <button
              type="button"
              onClick={() => beginEnrollment(selectedMethod ?? 'totp')}
              style={{
                padding: '0.6rem 1.25rem',
                borderRadius: 8,
                border: 'none',
                background: 'var(--accent)',
                color: '#04111f',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '0.95rem',
                minHeight: '2.75rem',
              }}
            >
              Set up two-factor authentication
            </button>
          </div>
        </div>
      )}

      {/* Choose an additional method when already enabled */}
      {isEnabled && wizardStep === 'choose' && (
        <div
          style={{
            display: 'grid',
            gap: '1rem',
            padding: '1rem',
            borderRadius: 10,
            border: '1px solid var(--border)',
            background: 'var(--surface-strong)',
          }}
        >
          <MfaMethodChooser
            value={selectedMethod}
            onChange={setSelectedMethod}
            aria-label="Choose an additional two-factor authentication method"
          />
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => beginEnrollment(selectedMethod ?? 'totp')}
              style={{
                padding: '0.55rem 1.1rem',
                borderRadius: 8,
                border: 'none',
                background: 'var(--accent)',
                color: '#04111f',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '0.9rem',
              }}
            >
              Continue setup
            </button>
            <button
              type="button"
              onClick={() => setWizardStep('idle')}
              style={{
                padding: '0.55rem 1rem',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'transparent',
                color: 'var(--text)',
                cursor: 'pointer',
                fontSize: '0.9rem',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Enrollment wizard */}
      {wizardStep === 'enroll' && selectedMethod === 'totp' && (
        <div
          style={{
            display: 'grid',
            gap: '1rem',
            padding: '1.25rem',
            borderRadius: 10,
            border: '1px solid var(--border)',
            background: 'var(--surface-strong)',
          }}
        >
          <div>
            <h4 style={{ margin: 0, fontSize: '1rem' }}>
              Set up authenticator app (TOTP)
            </h4>
            <p
              style={{
                margin: '0.25rem 0 0',
                color: 'var(--muted)',
                fontSize: '0.88rem',
              }}
            >
              Scan the QR code below or enter the manual setup key into your
              authenticator app, then enter the 6-digit verification code.
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '1.25rem',
              alignItems: 'flex-start',
              flexWrap: 'wrap',
            }}
          >
            <QrCodePlaceholder uri={otpAuthUri} />

            <div style={{ display: 'grid', gap: '0.5rem', flex: '1 1 240px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                Manual setup key
              </span>
              <code
                data-testid="totp-manual-key"
                style={{
                  padding: '0.6rem 0.75rem',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  fontSize: '0.9rem',
                  letterSpacing: '0.06em',
                  wordBreak: 'break-all',
                }}
              >
                {formatTotpSecret(pendingSecret)}
              </code>
              <div>
                <button
                  type="button"
                  onClick={handleCopyManualKey}
                  style={{
                    padding: '0.4rem 0.85rem',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'transparent',
                    color: 'var(--text)',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                  }}
                >
                  {copiedKey ? 'Copied key' : 'Copy key'}
                </button>
              </div>
            </div>
          </div>

          <form
            onSubmit={handleTotpVerify}
            style={{ display: 'grid', gap: '0.75rem', maxWidth: 360 }}
          >
            <div style={{ display: 'grid', gap: '0.35rem' }}>
              <label
                htmlFor={totpInputId}
                style={{ fontSize: '0.88rem', fontWeight: 600 }}
              >
                6-digit verification code
              </label>
              <input
                id={totpInputId}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="000000"
                value={totpCode}
                onChange={(e) => {
                  setTotpCode(e.target.value)
                  if (verifyError) setVerifyError(null)
                }}
                aria-invalid={verifyError ? 'true' : undefined}
                style={{
                  padding: '0.6rem 0.8rem',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--text)',
                  fontSize: '1rem',
                  letterSpacing: '0.18em',
                }}
              />
            </div>

            {verifyError && (
              <p
                role="alert"
                style={{
                  margin: 0,
                  color: 'var(--danger, #fb7185)',
                  fontSize: '0.86rem',
                }}
              >
                {verifyError}
              </p>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="submit"
                disabled={isVerifying || totpCode.trim().length < 6}
                aria-busy={isVerifying}
                style={{
                  padding: '0.55rem 1.1rem',
                  borderRadius: 8,
                  border: 'none',
                  background: 'var(--accent)',
                  color: '#04111f',
                  fontWeight: 700,
                  cursor:
                    isVerifying || totpCode.trim().length < 6
                      ? 'default'
                      : 'pointer',
                  opacity: isVerifying || totpCode.trim().length < 6 ? 0.6 : 1,
                  fontSize: '0.9rem',
                }}
              >
                {isVerifying ? 'Verifying…' : 'Verify & enable'}
              </button>
              <button
                type="button"
                onClick={() => setWizardStep('idle')}
                style={{
                  padding: '0.55rem 1rem',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'transparent',
                  color: 'var(--text)',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {wizardStep === 'enroll' && selectedMethod === 'sms' && (
        <form
          onSubmit={handleSmsEnroll}
          style={{
            display: 'grid',
            gap: '0.85rem',
            padding: '1.25rem',
            borderRadius: 10,
            border: '1px solid var(--border)',
            background: 'var(--surface-strong)',
            maxWidth: 420,
          }}
        >
          <h4 style={{ margin: 0, fontSize: '1rem' }}>
            Set up SMS authentication
          </h4>
          <div style={{ display: 'grid', gap: '0.35rem' }}>
            <label
              htmlFor={smsInputId}
              style={{ fontSize: '0.88rem', fontWeight: 600 }}
            >
              Phone number
            </label>
            <input
              id={smsInputId}
              type="tel"
              placeholder="+1 555-0100"
              value={smsPhone}
              onChange={(e) => setSmsPhone(e.target.value)}
              required
              style={{
                padding: '0.6rem 0.8rem',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text)',
                fontSize: '0.95rem',
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="submit"
              disabled={!smsPhone.trim()}
              style={{
                padding: '0.55rem 1.1rem',
                borderRadius: 8,
                border: 'none',
                background: 'var(--accent)',
                color: '#04111f',
                fontWeight: 700,
                cursor: smsPhone.trim() ? 'pointer' : 'default',
                opacity: smsPhone.trim() ? 1 : 0.6,
                fontSize: '0.9rem',
              }}
            >
              Enable SMS
            </button>
            <button
              type="button"
              onClick={() => setWizardStep('idle')}
              style={{
                padding: '0.55rem 1rem',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'transparent',
                color: 'var(--text)',
                cursor: 'pointer',
                fontSize: '0.9rem',
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {wizardStep === 'enroll' && selectedMethod === 'security-key' && (
        <form
          onSubmit={handleSecurityKeyEnroll}
          style={{
            display: 'grid',
            gap: '0.85rem',
            padding: '1.25rem',
            borderRadius: 10,
            border: '1px solid var(--border)',
            background: 'var(--surface-strong)',
            maxWidth: 420,
          }}
        >
          <h4 style={{ margin: 0, fontSize: '1rem' }}>
            Register a security key (FIDO2/WebAuthn)
          </h4>
          <div style={{ display: 'grid', gap: '0.35rem' }}>
            <label
              htmlFor={keyLabelInputId}
              style={{ fontSize: '0.88rem', fontWeight: 600 }}
            >
              Key nickname
            </label>
            <input
              id={keyLabelInputId}
              type="text"
              value={keyNickname}
              onChange={(e) => setKeyNickname(e.target.value)}
              required
              style={{
                padding: '0.6rem 0.8rem',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text)',
                fontSize: '0.95rem',
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="submit"
              style={{
                padding: '0.55rem 1.1rem',
                borderRadius: 8,
                border: 'none',
                background: 'var(--accent)',
                color: '#04111f',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '0.9rem',
              }}
            >
              Register security key
            </button>
            <button
              type="button"
              onClick={() => setWizardStep('idle')}
              style={{
                padding: '0.55rem 1rem',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'transparent',
                color: 'var(--text)',
                cursor: 'pointer',
                fontSize: '0.9rem',
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Post-enrollment recovery codes step */}
      {wizardStep === 'recovery' && (
        <div
          style={{
            display: 'grid',
            gap: '1rem',
            padding: '1.25rem',
            borderRadius: 10,
            border: '1px solid var(--border)',
            background: 'var(--surface-strong)',
          }}
        >
          <div>
            <h4 style={{ margin: 0, fontSize: '1rem' }}>
              Save your recovery codes
            </h4>
            <p
              style={{
                margin: '0.25rem 0 0',
                color: 'var(--muted)',
                fontSize: '0.88rem',
              }}
            >
              Store these single-use recovery codes in a safe place. You can use
              them to sign in if you lose access to your MFA device.
            </p>
          </div>

          <ul
            aria-label="Recovery codes"
            style={{
              listStyle: 'none',
              margin: 0,
              padding: '0.85rem',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: '0.5rem',
              fontFamily: 'monospace',
              fontSize: '0.9rem',
            }}
          >
            {recoveryCodes.map((code) => (
              <li key={code}>{code}</li>
            ))}
          </ul>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleCopyAllCodes}
              style={{
                padding: '0.45rem 0.9rem',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'transparent',
                color: 'var(--text)',
                cursor: 'pointer',
                fontSize: '0.85rem',
              }}
            >
              {copiedCodes ? 'Copied!' : 'Copy all'}
            </button>
            <button
              type="button"
              onClick={handleDownloadCodes}
              style={{
                padding: '0.45rem 0.9rem',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'transparent',
                color: 'var(--text)',
                cursor: 'pointer',
                fontSize: '0.85rem',
              }}
            >
              Download .txt
            </button>
            <button
              type="button"
              onClick={handlePrintCodes}
              style={{
                padding: '0.45rem 0.9rem',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'transparent',
                color: 'var(--text)',
                cursor: 'pointer',
                fontSize: '0.85rem',
              }}
            >
              Print
            </button>
          </div>

          <label
            htmlFor={savedCheckboxId}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.9rem',
              cursor: 'pointer',
            }}
          >
            <input
              id={savedCheckboxId}
              type="checkbox"
              checked={codesConfirmed}
              onChange={(e) => setCodesConfirmed(e.target.checked)}
            />
            I&apos;ve saved these recovery codes in a safe place
          </label>

          <div>
            <button
              type="button"
              disabled={!codesConfirmed}
              onClick={() => {
                setWizardStep('idle')
                setStatusMessage('Two-factor authentication is now active.')
              }}
              style={{
                padding: '0.55rem 1.2rem',
                borderRadius: 8,
                border: 'none',
                background: 'var(--accent)',
                color: '#04111f',
                fontWeight: 700,
                cursor: codesConfirmed ? 'pointer' : 'default',
                opacity: codesConfirmed ? 1 : 0.6,
                fontSize: '0.9rem',
              }}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Enrolled factors & recovery code management */}
      {isEnabled && wizardStep === 'idle' && (
        <div style={{ display: 'grid', gap: '1rem' }}>
          <ul
            aria-label="Enrolled MFA methods"
            style={{
              listStyle: 'none',
              margin: 0,
              padding: 0,
              display: 'grid',
              gap: '0.5rem',
            }}
          >
            {factors.map((factor) => (
              <li
                key={factor.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  padding: '0.85rem 1rem',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--surface-strong)',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <span aria-hidden="true" style={{ fontSize: '1.15rem' }}>
                    {METHOD_ICONS[factor.method]}
                  </span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>
                      {factor.label}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                      Enrolled on {factor.enrolledAt}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isLastFactor}
                  aria-describedby={isLastFactor ? lastFactorNoteId : undefined}
                  aria-label={`Remove ${factor.label}`}
                  onClick={() => handleRemoveFactor(factor.id)}
                  style={{
                    padding: '0.4rem 0.85rem',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'transparent',
                    color: isLastFactor ? 'var(--muted)' : 'var(--danger, #fb7185)',
                    cursor: isLastFactor ? 'not-allowed' : 'pointer',
                    opacity: isLastFactor ? 0.55 : 1,
                    fontSize: '0.85rem',
                    fontWeight: 600,
                  }}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>

          {isLastFactor && (
            <p
              id={lastFactorNoteId}
              style={{
                margin: 0,
                fontSize: '0.84rem',
                color: 'var(--muted)',
              }}
            >
              At least one MFA method must remain active. Add another method
              before removing your last factor.
            </p>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setWizardStep('choose')}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--surface-strong)',
                color: 'var(--text)',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.88rem',
              }}
            >
              Add another method
            </button>
            <button
              type="button"
              onClick={() => setShowRecoveryCodes((prev) => !prev)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'transparent',
                color: 'var(--text)',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.88rem',
              }}
            >
              {showRecoveryCodes ? 'Hide recovery codes' : 'View recovery codes'}
            </button>
            <button
              type="button"
              onClick={() => setReauthOpen(true)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'transparent',
                color: 'var(--text)',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.88rem',
              }}
            >
              Regenerate recovery codes
            </button>
          </div>

          {showRecoveryCodes && recoveryCodes.length > 0 && (
            <div
              style={{
                display: 'grid',
                gap: '0.75rem',
                padding: '1rem',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--surface-strong)',
              }}
            >
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                Active recovery codes ({recoveryCodes.length})
              </div>
              <ul
                aria-label="Recovery codes"
                style={{
                  listStyle: 'none',
                  margin: 0,
                  padding: '0.75rem',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                  gap: '0.5rem',
                  fontFamily: 'monospace',
                  fontSize: '0.88rem',
                }}
              >
                {recoveryCodes.map((code) => (
                  <li key={code}>{code}</li>
                ))}
              </ul>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleCopyAllCodes}
                  style={{
                    padding: '0.4rem 0.85rem',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'transparent',
                    color: 'var(--text)',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                  }}
                >
                  {copiedCodes ? 'Copied!' : 'Copy all'}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadCodes}
                  style={{
                    padding: '0.4rem 0.85rem',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'transparent',
                    color: 'var(--text)',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                  }}
                >
                  Download .txt
                </button>
                <button
                  type="button"
                  onClick={handlePrintCodes}
                  style={{
                    padding: '0.4rem 0.85rem',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'transparent',
                    color: 'var(--text)',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                  }}
                >
                  Print
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <ReauthModal
        isOpen={reauthOpen}
        onSuccess={handleReauthSuccess}
        onClose={() => setReauthOpen(false)}
      />
    </section>
  )
}
