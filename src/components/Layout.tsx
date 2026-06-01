import { NavLink, Outlet } from 'react-router-dom'

export default function Layout() {
  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <aside className="app-sidebar">
        <NavLink to="/" className="app-brand">
          Veritasor
        </NavLink>
        <nav className="app-nav" aria-label="Primary">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `app-nav-link ${isActive ? 'is-active' : ''}`}
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/attestations"
            className={({ isActive }) => `app-nav-link ${isActive ? 'is-active' : ''}`}
          >
            Attestations
          </NavLink>
          <NavLink
            to="/connect-source/provider"
            className={({ isActive }) => `app-nav-link ${isActive ? 'is-active' : ''}`}
          >
            Connect source
          </NavLink>
          <NavLink
            to="/login"
            className={({ isActive }) => `app-nav-link ${isActive ? 'is-active' : ''}`}
          >
            Login
          </NavLink>
        </nav>
      </aside>
      <main id="main-content" tabIndex={-1} className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
