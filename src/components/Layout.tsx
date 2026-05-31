import { Outlet, Link } from 'react-router-dom'

export default function Layout() {
  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <Link to="/" className="app-brand">
          Veritasor
        </Link>
        <nav className="app-nav" aria-label="Main navigation">
          <Link to="/">Dashboard</Link>
          <Link to="/attestations">Attestations</Link>
          <Link to="/login">Login</Link>
        </nav>
      </aside>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
