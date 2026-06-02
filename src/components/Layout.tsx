import { useState } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import TopAppBar from './TopAppBar'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  function toggleSidebar() {
    setSidebarOpen((o) => !o)
  }

  function closeSidebar() {
    setSidebarOpen(false)
  }

  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <TopAppBar
        onSidebarToggle={toggleSidebar}
        sidebarOpen={sidebarOpen}
      />

      <div className="app-body">
        <aside
          id="app-sidebar"
          className={`app-sidebar${sidebarOpen ? ' app-sidebar-open' : ''}`}
          aria-label="Site navigation"
        >
          <nav aria-label="Main navigation">
            <NavLink to="/" end className={({ isActive }) => `sidebar-link${isActive ? ' sidebar-link-active' : ''}`}>
              Dashboard
            </NavLink>
            <NavLink to="/attestations" className={({ isActive }) => `sidebar-link${isActive ? ' sidebar-link-active' : ''}`}>
              Attestations
            </NavLink>
          </nav>
        </aside>

        {sidebarOpen && (
          <div
            className="app-sidebar-overlay"
            aria-hidden="true"
            onClick={closeSidebar}
          />
        )}

        <main id="main-content" tabIndex={-1} className="app-main">
          <Outlet />
        </main>
      </div>
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
