import AuthShell from '../components/AuthShell'

const highlights = [
  'Recovery actions stay calm and minimal to keep attention on the primary next step',
  'Success and caution messages use shared semantics and consistent spacing',
  'Touch targets remain full-width on mobile for dependable tap behavior',
]

export default function ForgotPassword() {
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
      sideHighlights={highlights}
    >
      <form className="auth-form">
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
            aria-describedby="recovery-email-help"
          />
          <p id="recovery-email-help" className="auth-message">
            Recovery links expire after 15 minutes and invalidate any older reset requests.
          </p>
        </div>

        <div className="auth-message auth-message-success" role="status">
          Recent reset attempts are shown on the next screen so users can confirm whether support action is needed.
        </div>

        <div className="auth-message auth-message-warning">
          If your workspace uses SSO, direct password reset should remain a secondary option below SSO assistance.
        </div>

        <div className="auth-actions">
          <button type="submit" className="auth-button auth-button-primary">
            Send reset link
          </button>
          <button type="button" className="auth-button auth-button-secondary">
            Contact support
          </button>
        </div>
      </form>
    </AuthShell>
  )
}
