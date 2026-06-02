import { useEffect } from 'react'
import { Link } from 'react-router-dom'

const supportLinks = [
  {
    label: 'Review attestations',
    href: '/attestations',
    description: 'Check recent revenue evidence and attestation history.',
  },
  {
    label: 'Sign in again',
    href: '/login',
    description: 'Return through the secure access flow if your session changed.',
  },
]

export default function NotFound() {
  useEffect(() => {
    document.title = 'Page not found - Veritasor'
  }, [])

  return (
    <section className="not-found-page" aria-labelledby="not-found-title">
      <div className="not-found-card">
        <p className="not-found-eyebrow">404 error</p>
        <div className="not-found-header">
          <h1 id="not-found-title">We could not find that page</h1>
          <p>
            The address may be outdated, mistyped, or no longer available. Your workspace is still
            safe, and you can return to a verified destination below.
          </p>
        </div>

        <div className="not-found-actions" aria-label="Safe destinations">
          <Link className="not-found-button not-found-button-primary" to="/">
            Back to dashboard
          </Link>
          <Link className="not-found-button not-found-button-secondary" to="/login">
            Go to login
          </Link>
        </div>

        <div className="not-found-support" aria-label="Additional support links">
          {supportLinks.map((link) => (
            <Link className="not-found-support-link" key={link.href} to={link.href}>
              <span>{link.label}</span>
              <small>{link.description}</small>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
