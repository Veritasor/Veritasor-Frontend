import { useEffect } from 'react'
import { Link } from 'react-router-dom'

export default function ServerError() {
  useEffect(() => {
    document.title = 'Something went wrong - Veritasor'
  }, [])

  function handleRetry() {
    window.location.reload()
  }

  return (
    <section className="not-found-page" aria-labelledby="server-error-title">
      <div className="not-found-card">
        {/* Illustration */}
        <div aria-hidden="true" style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
          <svg
            width="160"
            height="120"
            viewBox="0 0 160 120"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect x="30" y="20" width="100" height="70" rx="8" stroke="currentColor" strokeWidth="2" opacity="0.3" />
            <path d="M55 45h50M55 58h35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
            <circle cx="80" cy="90" r="18" fill="var(--surface-strong)" stroke="currentColor" strokeWidth="2" />
            <path d="M80 82v10M80 96v2" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </div>

        <p className="not-found-eyebrow">500 error</p>
        <div className="not-found-header">
          <h1 id="server-error-title">Something went wrong on our side</h1>
          <p>
            We hit an unexpected problem while processing your request. Your data is safe.
            Please try again in a moment.
          </p>
        </div>

        <div className="not-found-actions" aria-label="Recovery actions">
          <button
            type="button"
            className="not-found-button not-found-button-primary"
            onClick={handleRetry}
          >
            Try again
          </button>
          <a
            className="not-found-button not-found-button-secondary"
            href="https://status.veritasor.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            View status page
          </a>
        </div>

        <div className="not-found-support" aria-label="Additional support links">
          <Link className="not-found-support-link" to="/">
            <span>Back to dashboard</span>
            <small>Return to a known working page.</small>
          </Link>
          <Link className="not-found-support-link" to="/help">
            <span>Contact support</span>
            <small>Let us know if the problem continues.</small>
          </Link>
        </div>
      </div>
    </section>
  )
}
