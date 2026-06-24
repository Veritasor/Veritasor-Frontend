import { useState } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import TopAppBar from './TopAppBar'
import { ToastProvider } from './ToastContext'
import IncidentBanner, { type Incident } from './IncidentBanner'

// Incidents are typically injected from an API or feature flag.
// Pass an empty array (or omit the prop) when there are no active incidents.
const ACTIVE_INCIDENTS: Incident[] = []

interface LayoutProps {
  incidents?: Incident[]
}

export default function Layout({ incidents = ACTIVE_INCIDENTS }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  function toggleSidebar() {
    setSidebarOpen((o) => !o)
  }

  function closeSidebar() {
    setSidebarOpen(false)
  }

  return (
    <ToastProvider>
      <div className="app-shell">
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>

        <IncidentBanner incidents={incidents} />

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
    </ToastProvider>
  )
}
