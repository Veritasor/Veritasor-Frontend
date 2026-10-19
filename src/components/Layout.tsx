import { useEffect, useRef, useState } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import TopAppBar from './TopAppBar'
import { ToastProvider } from './ToastContext'
import ToastContainer from './ToastContainer'
import { useCookieConsent } from './CookieConsentContext'

const ROUTE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/attestations': 'Attestations',
  '/sources': 'Revenue Sources',
  '/api-keys': 'API Keys',
  '/help': 'Help',
  '/settings': 'Settings',
}

function getPageTitle(pathname: string): string {
  const label = ROUTE_TITLES[pathname] ?? 'Veritasor'
  return label === 'Veritasor' ? 'Veritasor — Revenue Attestations' : `${label} — Veritasor`
}

function focusHamburger() {
  const btn = document.querySelector<HTMLButtonElement>('[aria-controls="app-sidebar"]')
  btn?.focus()
}

function LayoutInner() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { openSettings: openCookieSettings } = useCookieConsent()
  const location = useLocation()
  const mainRef = useRef<HTMLElement | null>(null)
  const prevPathRef = useRef(location.pathname)

  // Close sidebar and manage focus on route change
  useEffect(() => {
    if (location.pathname === prevPathRef.current) return
    prevPathRef.current = location.pathname

    setSidebarOpen(false)

    document.title = getPageTitle(location.pathname)

    // Move focus to main content after navigation so screen readers announce the new page
    requestAnimationFrame(() => {
      mainRef.current?.focus()
    })
  }, [location.pathname])

  // Escape key closes the sidebar and returns focus to the toggle button
  useEffect(() => {
    if (!sidebarOpen) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setSidebarOpen(false)
        focusHamburger()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [sidebarOpen])

  function toggleSidebar() {
    setSidebarOpen((o) => !o)
  }

  function closeSidebar() {
    setSidebarOpen(false)
  }

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans">
      {/* Skip link — must be the first focusable element */}
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
              to="/dashboard"
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

        <main
          id="main-content"
          ref={mainRef}
          tabIndex={-1}
          className="app-main"
        >
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
