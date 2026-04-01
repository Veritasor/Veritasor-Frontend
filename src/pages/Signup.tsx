import AuthShell from '../components/AuthShell'

const highlights = [
  'Clear field grouping keeps legal, team, and security details easy to scan',
  'Password requirements are visible before submission to reduce recovery loops',
  'Responsive spacing keeps the full flow usable without horizontal scrolling',
]

export default function Signup() {
  return (
    <AuthShell
      eyebrow="Create account"
      title="Set up your workspace"
      description="Create a secure Veritasor account for your finance or compliance team in just a few guided steps."
      footerPrompt="Already have access?"
      footerLinkLabel="Sign in"
      footerLinkHref="/login"
      sideTitle="Fast onboarding without visual guesswork"
      sideDescription="Typography, spacing, and button hierarchy are shared across all authentication screens so engineers can extend the flow without inventing new patterns."
      sideHighlights={highlights}
    >
      <form className="auth-form">
        <div className="auth-grid">
          <div className="auth-input-group">
            <label className="auth-label" htmlFor="signup-name">
              Full name
            </label>
            <input
              id="signup-name"
              className="auth-input"
              type="text"
              placeholder="Amina Adeyemi"
              autoComplete="name"
            />
          </div>

          <div className="auth-input-group">
            <label className="auth-label" htmlFor="signup-company">
              Company
            </label>
            <input
              id="signup-company"
              className="auth-input"
              type="text"
              placeholder="Veritasor Labs"
              autoComplete="organization"
            />
          </div>
        </div>

        <div className="auth-input-group">
          <label className="auth-label" htmlFor="signup-email">
            Work email
          </label>
          <input
            id="signup-email"
            className="auth-input"
            type="email"
            placeholder="founder@veritasor.com"
            autoComplete="email"
          />
        </div>

        <div className="auth-input-group">
          <label className="auth-label" htmlFor="signup-password">
            Password
          </label>
          <input
            id="signup-password"
            className="auth-input"
            type="password"
            placeholder="Create a strong password"
            autoComplete="new-password"
            aria-describedby="signup-password-help"
          />
          <p id="signup-password-help" className="auth-message">
            Use 12+ characters with uppercase, lowercase, number, and symbol.
          </p>
        </div>

        <div className="auth-strength" aria-label="Password strength preview">
          <span className="auth-strength-bar auth-strength-bar-active" />
          <span className="auth-strength-bar auth-strength-bar-active" />
          <span className="auth-strength-bar auth-strength-bar-active" />
          <span className="auth-strength-bar" />
          <p className="auth-strength-copy">Strong enough for a production workspace</p>
        </div>

        <label className="auth-checkbox">
          <input type="checkbox" />
          <span>I agree to the terms, privacy policy, and audit logging requirements.</span>
        </label>

        <div className="auth-actions">
          <button type="submit" className="auth-button auth-button-primary">
            Create account
          </button>
          <button type="button" className="auth-button auth-button-secondary">
            Book onboarding call
          </button>
        </div>
      </form>
    </AuthShell>
  )
}
