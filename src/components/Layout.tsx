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
  const { openSettings: openCookieSettings } = useCookieConsent()

  function toggleSidebar() {
    setSidebarOpen((o) => !o);
  }

  function closeSidebar() {
    setSidebarOpen(false);
  }

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans">
      {/* Sidebar Layout shell */}
      <aside className="w-64 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-6">
        <div className="flex items-center space-x-2 px-2">
          <span className="text-lg font-bold tracking-wider uppercase text-zinc-900 dark:text-white">Veritasor</span>
        </div>
        
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`block rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 shadow-xs'
                    : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
                }`}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>
      </aside>

      <TopAppBar onSidebarToggle={toggleSidebar} sidebarOpen={sidebarOpen} />

      <div className="app-body">
        <aside
          id="app-sidebar"
          className={`app-sidebar${sidebarOpen ? " app-sidebar-open" : ""}`}
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
            <NavLink to="/sources" className={({ isActive }) => `sidebar-link${isActive ? ' sidebar-link-active' : ''}`}>
              Revenue Sources
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
      <LayoutInner />
    </ToastProvider>
  )
}


