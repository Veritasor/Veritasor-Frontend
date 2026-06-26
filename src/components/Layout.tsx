import { useState } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import TopAppBar from './TopAppBar'
import { ToastProvider, useToast } from './ToastContext'

function ToastContainer() {
  const { toasts, removeToast } = useToast()
  if (toasts.length === 0) return null
  return (
    <div aria-live="polite" aria-atomic="false" className="toast-container">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role={toast.type === 'error' || toast.type === 'warning' ? 'alert' : 'status'}
          className={`toast toast-${toast.type}`}
        >
          <span>{toast.message}</span>
          <button
            type="button"
            aria-label="Close notification"
            onClick={() => removeToast(toast.id)}
            className="toast-close"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}

function LayoutInner() {
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
      <ToastContainer />
    </div>
  )
}

export default function Layout() {
  return (
    <ToastProvider>
      <LayoutInner />
    </ToastProvider>
  )
}


