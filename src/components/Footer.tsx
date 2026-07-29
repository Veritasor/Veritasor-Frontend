import { useCookieConsent } from './CookieConsentContext'

export default function Footer() {
  const { openSettings } = useCookieConsent()

  return (
    <footer
      className="site-footer"
      style={{
        padding: '1.25rem 1.5rem',
        borderTop: '1px solid var(--border)',
        marginTop: 'auto',
        fontSize: '0.9rem',
        color: 'var(--muted)',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1rem',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <span>© {new Date().getFullYear()} Veritasor</span>

      <nav aria-label="Footer">
        <button
          type="button"
          onClick={openSettings}
          className="cookie-preferences-link"
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            color: 'var(--accent)',
            cursor: 'pointer',
            fontSize: '0.9rem',
            textDecoration: 'underline',
          }}
        >
          Cookie preferences
        </button>
      </nav>
    </footer>
  )
}
