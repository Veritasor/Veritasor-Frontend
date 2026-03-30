import { Outlet, Link } from 'react-router-dom'

export default function Layout() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
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
        <nav style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <Link to="/">Dashboard</Link>
          <Link to="/attestations">Attestations</Link>
          <Link to="/login">Login</Link>
        </nav>
      </aside>
      <main style={{ flex: 1, padding: '2rem' }}>
        <Outlet />
      </main>
    </div>
  )
}
