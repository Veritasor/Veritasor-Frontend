import { NavLink, Outlet } from 'react-router-dom'

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

function ToastContainer() {
  const { toasts, removeToast } = useToast()

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="toast-container"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  )
}

export default function Layout() {
  return (
    <ToastProvider>
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
        <main style={{ flex: 1, padding: '2rem', position: 'relative' }}>
          <Outlet />
        </main>
      </div>
      <ToastContainer />
    </ToastProvider>
  )
}
