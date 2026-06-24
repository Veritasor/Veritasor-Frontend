import { useState } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import TopAppBar from './TopAppBar'
import { ToastProvider, useToast } from './ToastContext'

function ToastItem({ toast, onRemove }: { toast: { id: string; type: string; message: string; duration?: number }; onRemove: (id: string) => void }) {
  return (
    <div
      role={toast.type === 'error' || toast.type === 'warning' ? 'alert' : 'status'}
      className={`toast toast-${toast.type}`}
    >
      <span>{toast.message}</span>
      <button
        type="button"
        aria-label="Close notification"
        onClick={() => onRemove(toast.id)}
        style={{ marginLeft: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
      >
        ✕
      </button>
    </div>
  )
}

function ToastContainer() {
  const { toasts, removeToast } = useToast()
  return (
    <div aria-live="polite" aria-atomic="true" className="toast-container">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
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
            <NavLink to="/settings" className={({ isActive }) => `sidebar-link${isActive ? ' sidebar-link-active' : ''}`}>
              Settings
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
