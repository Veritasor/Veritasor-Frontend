import { Link } from 'react-router-dom'
import LocaleAccountMenu from '../components/LocalePicker/LocaleAccountMenu'

const FEATURES = [
  {
    title: 'Connect revenue sources',
    body: 'Link payment processors, accounting tools and bank feeds. Veritasor normalises the records into a single revenue ledger for the period you choose.',
  },
  {
    title: 'Attest on-chain',
    body: 'Each period is condensed into a Merkle root and anchored on-chain, so the figure you share can be checked against an immutable commitment.',
  },
  {
    title: 'Share verifiable proof',
    body: 'Send lenders, investors or partners a proof link. They verify the attestation independently without seeing your underlying transactions.',
  },
  {
    title: 'Audit and control',
    body: 'API keys with scopes, webhooks, an audit log and data export keep every attestation traceable and every integration under your control.',
  },
]

const STEPS = [
  ['1', 'Create a business account', 'Sign up and complete the onboarding wizard.'],
  ['2', 'Connect a source', 'Authorise a provider and map currencies.'],
  ['3', 'Trigger an attestation', 'Review the period summary and confirm.'],
  ['4', 'Share the proof', 'Anyone can verify the Merkle root on-chain.'],
]

export default function Landing() {
  return (
    <div className="landing">
      <a href="#main-content" className="skip-link">Skip to main content</a>

      <header className="landing-nav">
        <Link to="/" className="landing-brand" aria-label="Veritasor home">Veritasor</Link>
        <nav aria-label="Primary">
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
          <a href="https://github.com/Veritasor/Veritasor-Frontend#readme" target="_blank" rel="noopener noreferrer">Docs</a>
          <a href="https://github.com/Veritasor/Veritasor-Frontend" target="_blank" rel="noopener noreferrer">GitHub</a>
          <LocaleAccountMenu />
          <Link to="/login">Log in</Link>
          <Link
            to="/signup"
            className="landing-btn landing-btn-primary"
            aria-label="Get started — create a Veritasor account"
          >
            Get started
          </Link>
        </nav>
      </header>

      <main id="main-content" tabIndex={-1} aria-label="Main content">
        <section className="landing-hero" aria-labelledby="landing-hero-heading">
          <p className="landing-eyebrow">On-chain revenue attestation</p>
          <h1 id="landing-hero-heading">Prove your revenue. <span>Without exposing your books.</span></h1>
          <p className="landing-lead">
            Veritasor lets businesses connect their revenue sources, anchor a cryptographic
            commitment on-chain, and share tamper-evident proof with anyone who needs to trust the numbers.
          </p>
          <div className="landing-cta">
            <Link
              to="/signup"
              className="landing-btn landing-btn-primary"
              aria-label="Create a Veritasor account"
            >
              Create account
            </Link>
            <Link
              to="/dashboard"
              className="landing-btn"
              aria-label="Explore the demo dashboard"
            >
              Explore the demo dashboard
            </Link>
          </div>
          <p className="landing-note">The dashboard runs on sample demo data; no real accounts or customers are shown.</p>
        </section>

        <section id="features" className="landing-section" aria-labelledby="landing-features-heading">
          <h2 id="landing-features-heading">What you get</h2>
          <div className="landing-grid">
            {FEATURES.map((f) => (
              <article key={f.title} className="landing-card">
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="how" className="landing-section" aria-labelledby="landing-how-heading">
          <h2 id="landing-how-heading">How it works</h2>
          <ol className="landing-steps">
            {STEPS.map(([n, t, d]) => (
              <li key={n}>
                <span className="landing-step-n" aria-hidden="true">{n}</span>
                <div><strong>{t}</strong><p>{d}</p></div>
              </li>
            ))}
          </ol>
        </section>

        <section className="landing-section landing-final" aria-labelledby="landing-final-heading">
          <h2 id="landing-final-heading">Ready to attest your first period?</h2>
          <Link
            to="/signup"
            className="landing-btn landing-btn-primary"
            aria-label="Get started — attest your first period"
          >
            Get started
          </Link>
        </section>
      </main>

      <footer className="landing-footer">
        <span>Veritasor. Open source frontend, demo build.</span>
        <nav aria-label="Footer">
          <Link to="/login">Log in</Link>
          <span aria-hidden="true"> · </span>
          <Link to="/consent-preferences">Cookie settings</Link>
          <span aria-hidden="true"> · </span>
          <a href="https://veritasor-frontend-opal.vercel.app" target="_blank" rel="noopener noreferrer">Live site</a>
          <span aria-hidden="true"> · </span>
          <a href="https://github.com/Veritasor/Veritasor-Frontend" target="_blank" rel="noopener noreferrer">GitHub</a>
        </nav>
      </footer>
    </div>
  )
}
