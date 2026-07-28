import { useState } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import TopAppBar from './TopAppBar'
import { ToastProvider } from './ToastContext'
import ToastContainer from './ToastContainer'
import { useCookieConsent } from './CookieConsentContext'
import Footer from './Footer'

function LayoutInner() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { openSettings: openCookieSettings } = useCookieConsent()

  function toggleSidebar() {
    setSidebarOpen((o) => !o)
  }

  function closeSidebar() {
    setSidebarOpen(false)
  }

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans">
      <TopAppBar onSidebarToggle={toggleSidebar} sidebarOpen={sidebarOpen} />

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
            <NavLink
              to="/sources"
              className={({ isActive }) => `sidebar-link${isActive ? ' sidebar-link-active' : ''}`}
            >
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

        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <main id="main-content" tabIndex={-1} className="app-main">
            <Outlet />
          </main>

          {/* Persistent footer with Cookie preferences link */}
          <Footer />
        </div>
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
