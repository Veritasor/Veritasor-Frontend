import { useState } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import TopAppBar from './TopAppBar'
import { ToastProvider, useToast } from './ToastContext'
import type { Toast } from './ToastContext'
import { useCookieConsent } from './CookieConsentContext'

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const isAlert = toast.type === 'error' || toast.type === 'warning'
  return (
    <div
      className={`toast toast-${toast.type}`}
      role={isAlert ? 'alert' : 'status'}
    >
      <span>{toast.message}</span>
      <button
        type="button"
        aria-label="Close notification"
        onClick={() => onRemove(toast.id)}
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

function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { openSettings: openCookieSettings } = useCookieConsent()

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
            <NavLink
              to="/"
              end
              className={({ isActive }) => `sidebar-link${isActive ? ' sidebar-link-active' : ''}`}
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/attestations"
              className={({ isActive }) => `sidebar-link${isActive ? ' sidebar-link-active' : ''}`}
            >
              Attestations
            </NavLink>
          </nav>
          <div className="sidebar-footer">
            <button
              type="button"
              className="sidebar-cookie-btn"
              onClick={openCookieSettings}
              aria-label="Open cookie settings"
            >
              Cookie settings
            </button>
          </div>
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
      <AppShell />
    </ToastProvider>
  )
}
