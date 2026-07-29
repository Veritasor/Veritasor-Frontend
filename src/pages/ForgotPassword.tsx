import React, { useState, useId } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import AuthShell from '../components/AuthShell'
import { useToast } from '../components/ToastContext'

// ---------------------------------------------------------------------------
// Password strength helpers (shared with NewPasswordState)
// ---------------------------------------------------------------------------

function computeStrength(password: string): number {
  if (!password) return 0
  if (password.length < 8) return 1
  const hasUpper = /[A-Z]/.test(password)
  const hasLower = /[a-z]/.test(password)
  const hasDigit = /[0-9]/.test(password)
  const hasSym = /[^A-Za-z0-9]/.test(password)
  const mixed = hasUpper && hasLower && hasDigit
  if (password.length >= 12 && mixed && hasSym) return 4
  if (password.length >= 12 && mixed) return 3
  if (password.length >= 8 && (hasUpper || hasLower) && hasDigit) return 2
  return 1
}

const STRENGTH_COPY: Record<number, string> = {
  0: 'Enter a password to see its strength',
  1: 'Too short — use at least 8 characters',
  2: 'Fair — try adding uppercase and numbers',
  3: 'Good — add a symbol for maximum strength',
  4: 'Strong enough for a production workspace',
}

// ---------------------------------------------------------------------------
// Expired-link state — #258
// ---------------------------------------------------------------------------

function ExpiredLinkState() {
  const navigate = useNavigate()
  const { addToast } = useToast()

  const handleSendNew = () => {
    navigate('/forgot-password')
    addToast('Enter your email below to receive a fresh reset link.', 'info')
  }

  const handleContactSupport = () => {
    addToast('Opening support contact channels in a new window.', 'info')
  }

  const highlights = [
    'Expired-link states guide users back to the request flow with a single tap',
    'The hero icon uses accessible colours so the warning reads in high-contrast mode',
    'Support contact is always one click away to prevent dead ends',
  ]

  return (
    <AuthShell
      eyebrow="Recovery"
      title="Link expired"
      description="Password reset links are valid for 15 minutes. This one has expired — request a fresh link below."
      footerPrompt="Remembered your credentials?"
      footerLinkLabel="Return to sign in"
      footerLinkHref="/login"
      sideTitle="Quick recovery, no dead ends"
      sideDescription="Expired-link states reuse the same accessible card, message, and button tokens so the UI stays familiar even when the journey changes."
      sideHighlights={highlights}
    >
      {/* Error hero */}
      <div className="auth-expired-hero" aria-hidden="true">
        <svg
          className="auth-expired-icon"
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          focusable="false"
        >
          <circle cx="32" cy="32" r="28" stroke="var(--warning)" strokeWidth="2.5" strokeDasharray="6 4" />
          <circle cx="32" cy="32" r="20" stroke="var(--warning)" strokeWidth="1.5" opacity="0.4" />
          {/* Clock face */}
          <circle cx="32" cy="32" r="13" fill="var(--warning-soft)" stroke="var(--warning)" strokeWidth="1.5" />
          {/* Hour hand */}
          <line x1="32" y1="32" x2="32" y2="22" stroke="var(--warning)" strokeWidth="2.5" strokeLinecap="round" />
          {/* Minute hand — past 12, angled */}
          <line x1="32" y1="32" x2="39" y2="37" stroke="var(--warning)" strokeWidth="2" strokeLinecap="round" />
          {/* Centre dot */}
          <circle cx="32" cy="32" r="2" fill="var(--warning)" />
          {/* X mark overlay */}
          <line x1="44" y1="44" x2="52" y2="52" stroke="var(--danger)" strokeWidth="3" strokeLinecap="round" />
          <line x1="52" y1="44" x2="44" y2="52" stroke="var(--danger)" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </div>

      {/* Alert message */}
      <div
        className="auth-message auth-message-warning"
        role="alert"
        aria-live="assertive"
      >
        <span aria-hidden="true" className="auth-message-icon">⚠</span>
        This reset link has expired. Reset links are single-use and valid for
        15 minutes. Request a new one using the button below.
      </div>

      <div className="auth-actions">
        <button
          type="button"
          className="auth-button auth-button-primary"
          onClick={handleSendNew}
        >
          Send a new link
        </button>
        <button
          type="button"
          className="auth-button auth-button-ghost"
          onClick={handleContactSupport}
        >
          Contact support
        </button>
      </div>
    </AuthShell>
  )
}

// ---------------------------------------------------------------------------
// New-password entry state — #259
// ---------------------------------------------------------------------------

function NewPasswordState({ token }: { token: string | null }) {
  const navigate = useNavigate()
  const { addToast } = useToast()

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmTouched, setConfirmTouched] = useState(false)

  const newPasswordId = useId()
  const confirmPasswordId = useId()
  const strengthId = useId()
  const matchId = useId()

  const strength = computeStrength(newPassword)
  const passwordsMatch = newPassword === confirmPassword
  const showMatchError = confirmTouched && confirmPassword.length > 0 && !passwordsMatch
  const showMatchSuccess = confirmTouched && confirmPassword.length > 0 && passwordsMatch

  const highlights = [
    'The shared strength meter gives live feedback before submission',
    'Show/hide toggles reduce transcription errors without sacrificing security',
    'Match indicator confirms both fields agree before the form is submitted',
  ]

  // Missing or blank token — show incomplete-link error
  if (!token || !token.trim()) {
    const handleRequestNew = () => navigate('/forgot-password')
    return (
      <AuthShell
        eyebrow="Recovery"
        title="Incomplete link"
        description="The reset link is missing required information. Request a new one to continue."
        footerPrompt="Remembered your credentials?"
        footerLinkLabel="Return to sign in"
        footerLinkHref="/login"
        sideTitle="A safer recovery flow"
        sideDescription="All reset links are cryptographically signed and expire automatically for your account security."
        sideHighlights={highlights}
      >
        <div
          className="auth-message auth-message-warning"
          role="alert"
          aria-live="assertive"
        >
          <span aria-hidden="true" className="auth-message-icon">⚠</span>
          This reset link appears to be incomplete or corrupted. Please request
          a fresh link to set your new password.
        </div>
        <div className="auth-actions">
          <button
            type="button"
            className="auth-button auth-button-primary"
            onClick={handleRequestNew}
          >
            Request a new link
          </button>
        </div>
      </AuthShell>
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setConfirmTouched(true)

    if (strength < 2) {
      addToast('Your password is too weak. Use at least 8 characters with mixed case and digits.', 'error')
      return
    }
    if (!passwordsMatch) {
      addToast('Passwords do not match. Please check both fields.', 'error')
      return
    }

    addToast('Your password has been updated. You can now sign in.', 'success')
    navigate('/login')
  }

  return (
    <AuthShell
      eyebrow="Recovery"
      title="Set new password"
      description="Choose a strong password for your Veritasor workspace. It must be at least 8 characters."
      footerPrompt="Remembered your credentials?"
      footerLinkLabel="Return to sign in"
      footerLinkHref="/login"
      sideTitle="A safer recovery flow"
      sideDescription="The shared strength meter, match indicator, and show/hide toggles are reused from signup so the pattern stays consistent throughout the product."
      sideHighlights={highlights}
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {/* New password */}
        <div className="auth-input-group">
          <label className="auth-label" htmlFor={newPasswordId}>
            New password
          </label>
          <div className="auth-input-toggle-group">
            <input
              id={newPasswordId}
              className="auth-input"
              type={showNew ? 'text' : 'password'}
              placeholder="Create a strong password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              aria-describedby={`${strengthId}`}
            />
            <button
              type="button"
              className="auth-toggle-btn"
              aria-pressed={showNew}
              aria-label={showNew ? 'Hide new password' : 'Show new password'}
              onClick={() => setShowNew((v) => !v)}
            >
              {showNew ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        {/* Strength meter — shared with Signup */}
        <div
          className="auth-strength"
          id={strengthId}
          aria-label="Password strength"
          aria-live="polite"
          aria-atomic="true"
        >
          {[1, 2, 3, 4].map((bar) => (
            <span
              key={bar}
              className={
                'auth-strength-bar' +
                (strength >= bar ? ' auth-strength-bar-active' : '')
              }
            />
          ))}
          <p className="auth-strength-copy">{STRENGTH_COPY[strength]}</p>
        </div>

        {/* Confirm password */}
        <div className="auth-input-group">
          <label className="auth-label" htmlFor={confirmPasswordId}>
            Confirm password
          </label>
          <div className="auth-input-toggle-group">
            <input
              id={confirmPasswordId}
              className={
                'auth-input' + (showMatchError ? ' auth-input-error' : '')
              }
              type={showConfirm ? 'text' : 'password'}
              placeholder="Repeat your new password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value)
                setConfirmTouched(true)
              }}
              aria-describedby={matchId}
              aria-invalid={showMatchError ? 'true' : undefined}
            />
            <button
              type="button"
              className="auth-toggle-btn"
              aria-pressed={showConfirm}
              aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
              onClick={() => setShowConfirm((v) => !v)}
            >
              {showConfirm ? 'Hide' : 'Show'}
            </button>
          </div>

          {showMatchError && (
            <p
              id={matchId}
              className="auth-message auth-message-error"
              role="alert"
            >
              <span aria-hidden="true" className="auth-message-icon">!</span>
              Passwords do not match.
            </p>
          )}
          {showMatchSuccess && (
            <p
              id={matchId}
              className="auth-message auth-message-success"
              role="status"
            >
              <span aria-hidden="true" className="auth-message-icon">✓</span>
              Passwords match.
            </p>
          )}
          {!showMatchError && !showMatchSuccess && (
            <span id={matchId} className="sr-only">
              Confirm your new password to continue.
            </span>
          )}
        </div>

        <div className="auth-actions">
          <button type="submit" className="auth-button auth-button-primary">
            Set new password
          </button>
        </div>
      </form>
    </AuthShell>
  )
}

// ---------------------------------------------------------------------------
// Request-email state (original form)
// ---------------------------------------------------------------------------

const requestHighlights = [
  'Recovery actions stay calm and minimal to keep attention on the primary next step',
  'Success and caution messages use shared semantics and consistent spacing',
  'Touch targets remain full-width on mobile for dependable tap behavior',
]

function RequestLinkState() {
  const { addToast } = useToast()
  const [email, setEmail] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !email.includes('@')) {
      addToast('Please enter a valid verified email address.', 'error')
      return
    }
    addToast(`A secure recovery link has been sent to ${email}.`, 'success')
    setEmail('')
  }

  const handleContactSupport = () => {
    addToast('Opening support contact channels in a new window.', 'info')
  }

  return (
    <AuthShell
      eyebrow="Recovery"
      title="Reset your password"
      description="We will email a secure recovery link to your verified workspace address."
      footerPrompt="Remembered your credentials?"
      footerLinkLabel="Return to sign in"
      footerLinkHref="/login"
      sideTitle="A safer recovery flow"
      sideDescription="Recovery states reuse the same accessible card, message, and button tokens so the UI feels familiar even when the journey changes."
      sideHighlights={requestHighlights}
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="auth-input-group">
          <label className="auth-label" htmlFor="recovery-email">
            Verified email
          </label>
          <input
            id="recovery-email"
            className="auth-input"
            type="email"
            placeholder="security@veritasor.com"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-describedby="recovery-email-help"
          />
          <p
            id="recovery-email-help"
            className="auth-message auth-message-help"
          >
            Recovery links expire after 15 minutes and invalidate any older
            reset requests.
          </p>
        </div>

        <div className="auth-message auth-message-success" role="status">
          <span aria-hidden="true" className="auth-message-icon">
            ✓
          </span>
          Recent reset attempts are shown on the next screen so users can
          confirm whether support action is needed.
        </div>

        <div className="auth-message auth-message-warning">
          <span aria-hidden="true" className="auth-message-icon">
            ⚠
          </span>
          If your workspace uses SSO, direct password reset should remain a
          secondary option below SSO assistance.
        </div>

        <div className="auth-actions">
          <button type="submit" className="auth-button auth-button-primary">
            Send reset link
          </button>
          <button
            type="button"
            className="auth-button auth-button-secondary"
            onClick={handleContactSupport}
          >
            Contact support
          </button>
        </div>
      </form>
    </AuthShell>
  )
}

// ---------------------------------------------------------------------------
// ForgotPassword — state router
// ---------------------------------------------------------------------------

export default function ForgotPassword() {
  const [searchParams] = useSearchParams()
  const state = searchParams.get('state')
  const token = searchParams.get('token')

  if (state === 'expired') {
    return <ExpiredLinkState />
  }

  if (state === 'reset') {
    return <NewPasswordState token={token} />
  }

  return <RequestLinkState />
}
