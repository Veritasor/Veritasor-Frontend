import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'

type AuthShellProps = {
  eyebrow: string
  title: string
  description: string
  footerPrompt: string
  footerLinkLabel: string
  footerLinkHref: string
  sideTitle: string
  sideDescription: string
  sideHighlights: string[]
  children: ReactNode
}

export default function AuthShell({
  eyebrow,
  title,
  description,
  footerPrompt,
  footerLinkLabel,
  footerLinkHref,
  sideTitle,
  sideDescription,
  sideHighlights,
  children,
}: AuthShellProps) {
  return (
    <main className="auth-page">
      <section className="auth-shell">
        <aside className="auth-hero" aria-label="Authentication overview">
          <Link to="/" className="auth-brand">
            Veritasor
          </Link>
          <p className="auth-eyebrow">{eyebrow}</p>
          <h1 className="auth-hero-title">{sideTitle}</h1>
          <p className="auth-hero-description">{sideDescription}</p>
          <ul className="auth-highlight-list">
            {sideHighlights.map((highlight) => (
              <li key={highlight} className="auth-highlight-item">
                <span className="auth-highlight-dot" aria-hidden="true" />
                <span>{highlight}</span>
              </li>
            ))}
          </ul>
        </aside>

        <section className="auth-panel" aria-labelledby="auth-screen-title">
          <div className="auth-panel-header">
            <p className="auth-eyebrow">{eyebrow}</p>
            <h2 id="auth-screen-title" className="auth-panel-title">
              {title}
            </h2>
            <p className="auth-panel-description">{description}</p>
          </div>

          {children}

          <p className="auth-footer">
            {footerPrompt} <Link to={footerLinkHref}>{footerLinkLabel}</Link>
          </p>
        </section>
      </section>
    </main>
  )
}
