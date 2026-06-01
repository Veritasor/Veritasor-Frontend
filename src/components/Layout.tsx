import { Outlet, Link } from 'react-router-dom'

export default function Layout() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* WCAG 2.4.1 Bypass Blocks: must be the first focusable element in the DOM. */}
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <aside
        style={{
          width: 220,
          padding: '1.5rem 1rem',
          borderRight: '1px solid var(--border)',
          background: 'var(--surface)',
        }}
      >
        <Link to="/" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)' }}>
          Veritasor
        </Link>
        {/* Primary navigation landmark; aria-label names it for assistive tech. */}
        <nav
          aria-label="Primary"
          style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
        >
          <Link to="/">Dashboard</Link>
          <Link to="/attestations">Attestations</Link>
          <Link to="/login">Login</Link>
        </nav>
      </aside>
      {/*
        Main landmark and skip-link target. tabIndex={-1} makes it a programmatic
        focus target so activating the skip link moves focus here, not just scroll.
      */}
      <main
        id="main-content"
        className="app-main"
        tabIndex={-1}
        aria-label="Main content"
        style={{ flex: 1, padding: '2rem' }}
      >
        <Outlet />
      </main>
    </div>
  )
}
