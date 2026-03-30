import { Link } from 'react-router-dom'
import AuthShell from '../components/AuthShell'

const highlights = [
  'Enterprise-grade verification for revenue attestations',
  'Keyboard-first forms with visible focus and inline guidance',
  'Reusable error, loading, and disabled states across every auth entry point',
]

export default function Login() {
  return (
    <AuthShell
      eyebrow="Authentication"
      title="Welcome back"
      description="Sign in to monitor attestation runs, review evidence, and continue onboarding securely."
      footerPrompt="Need an account?"
      footerLinkLabel="Create one"
      footerLinkHref="/signup"
      sideTitle="Trusted access for finance teams"
      sideDescription="The authentication system now uses a shared visual language that stays readable on phones, tablets, and large desktop workspaces."
      sideHighlights={highlights}
    >
      <form className="auth-form">
        <div className="auth-input-group">
          <label className="auth-label" htmlFor="login-email">
            Work email
          </label>
          <input
            id="login-email"
            className="auth-input"
            type="email"
            placeholder="team@veritasor.com"
            autoComplete="email"
            defaultValue="ops@veritasor.com"
          />
        </div>

        <div className="auth-input-group">
          <div className="auth-label-row">
            <label className="auth-label" htmlFor="login-password">
              Password
            </label>
            <Link to="/forgot-password" className="auth-inline-link">
              Forgot password?
            </Link>
          </div>
          <input
            id="login-password"
            className="auth-input auth-input-error"
            type="password"
            placeholder="Enter your password"
            autoComplete="current-password"
            aria-describedby="login-password-error"
            defaultValue="badpass"
          />
          <p id="login-password-error" className="auth-message auth-message-error" role="alert">
            Your password must include at least 12 characters and one symbol.
          </p>
        </div>

        <label className="auth-checkbox">
          <input type="checkbox" defaultChecked />
          <span>Keep this device trusted for 30 days</span>
        </label>

        <div className="auth-actions">
          <button type="submit" className="auth-button auth-button-primary">
            Sign in
          </button>
          <button type="button" className="auth-button auth-button-secondary">
            Continue with Google
          </button>
          <button type="button" className="auth-button auth-button-ghost" disabled>
            SSO loading...
          </button>
        </div>
      </form>
    </AuthShell>
  )
}
