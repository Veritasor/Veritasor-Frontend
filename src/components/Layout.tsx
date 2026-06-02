import { useEffect } from 'react'
import { Outlet, Link } from 'react-router-dom'
import { ToastProvider, useToast, Toast } from './ToastContext'

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onRemove(toast.id)
      }
    }
    // Only listen for Escape key if the document has focus in the toast stack or active elements
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toast.id, onRemove])

  const renderIcon = () => {
    switch (toast.type) {
      case 'success':
        return (
          <svg className="toast-icon toast-icon-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true" width="20" height="20">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'info':
        return (
          <svg className="toast-icon toast-icon-info" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true" width="20" height="20">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'warning':
        return (
          <svg className="toast-icon toast-icon-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true" width="20" height="20">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        )
      case 'error':
        return (
          <svg className="toast-icon toast-icon-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true" width="20" height="20">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      default:
        return null
    }
  }

  // Errors use assertive 'alert' role, other statuses use 'status' (polite live region)
  const role = toast.type === 'error' ? 'alert' : 'status'

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* WCAG 2.4.1 Bypass Blocks: must be the first focusable element in the DOM. */}
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
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
        {/* Primary navigation landmark; aria-label names it for assistive tech. */}
        <nav
          aria-label="Primary"
          style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
        >
          <Link to="/">Dashboard</Link>
          <Link to="/attestations">Attestations</Link>
          <Link to="/login">Login</Link>
        </nav>
      </aside>
      {/*
        Main landmark and skip-link target. tabIndex={-1} makes it a programmatic
        focus target so activating the skip link moves focus here, not just scroll.
      */}
      <main
        id="main-content"
        className="app-main"
        tabIndex={-1}
        aria-label="Main content"
        style={{ flex: 1, padding: '2rem' }}
      >
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
