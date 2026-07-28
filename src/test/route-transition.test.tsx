import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import PageTransition from '../components/PageTransition'
import { isAuthRoute, isModalRoute } from '../utils/pageTransitionUtils'
import { ToastProvider } from '../components/ToastContext'

function renderWithRouter(initialEntries = ['/dashboard']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <ToastProvider>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <PageTransition>
                <div>Dashboard View</div>
              </PageTransition>
            }
          />
          <Route
            path="/attestations"
            element={
              <PageTransition>
                <div>Attestations View</div>
              </PageTransition>
            }
          />
          <Route
            path="/login"
            element={
              <PageTransition>
                <div>Login View</div>
              </PageTransition>
            }
          />
          <Route
            path="/signup"
            element={
              <PageTransition>
                <div>Signup View</div>
              </PageTransition>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <PageTransition>
                <div>Forgot Password View</div>
              </PageTransition>
            }
          />
          <Route
            path="/settings-modal"
            element={
              <PageTransition>
                <div>Settings Modal View</div>
              </PageTransition>
            }
          />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('PageTransition motion pattern', () => {
  const originalMatchMedia = window.matchMedia

  beforeEach(() => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  })

  afterEach(() => {
    window.matchMedia = originalMatchMedia
  })

  describe('isAuthRoute helper', () => {
    it('correctly identifies auth routes', () => {
      expect(isAuthRoute('/login')).toBe(true)
      expect(isAuthRoute('/signup')).toBe(true)
      expect(isAuthRoute('/forgot-password')).toBe(true)
      expect(isAuthRoute('/reset-password')).toBe(true)
      expect(isAuthRoute('/login/sso')).toBe(true)
    })

    it('returns false for non-auth routes', () => {
      expect(isAuthRoute('/dashboard')).toBe(false)
      expect(isAuthRoute('/attestations')).toBe(false)
      expect(isAuthRoute('/settings')).toBe(false)
    })
  })

  describe('isModalRoute helper', () => {
    it('identifies modal routes by path or location state', () => {
      expect(isModalRoute('/settings-modal')).toBe(true)
      expect(isModalRoute('/attestations/confirm-modal')).toBe(true)
      expect(isModalRoute('/dashboard', { backgroundLocation: '/dashboard' })).toBe(true)
    })

    it('returns false for normal route paths without modal state', () => {
      expect(isModalRoute('/dashboard')).toBe(false)
      expect(isModalRoute('/attestations')).toBe(false)
    })
  })

  describe('Standard route transitions', () => {
    it('applies 120ms crossfade class for standard dashboard routes', () => {
      renderWithRouter(['/dashboard'])
      const container = screen.getByTestId('page-transition-wrapper')

      expect(container).toHaveClass('page-transition-crossfade')
      expect(container).toHaveAttribute('data-transition-exempt', 'false')
      expect(container).toHaveAttribute('data-transition-type', 'crossfade')
      expect(screen.getByText('Dashboard View')).toBeInTheDocument()
    })
  })

  describe('Auth route exemptions', () => {
    it('exempts login route from crossfade transition (instant swap)', () => {
      renderWithRouter(['/login'])
      const container = screen.getByTestId('page-transition-wrapper')

      expect(container).toHaveClass('page-transition-instant')
      expect(container).toHaveAttribute('data-transition-exempt', 'true')
      expect(container).toHaveAttribute('data-transition-type', 'instant')
      expect(screen.getByText('Login View')).toBeInTheDocument()
    })

    it('exempts signup route from crossfade transition', () => {
      renderWithRouter(['/signup'])
      const container = screen.getByTestId('page-transition-wrapper')

      expect(container).toHaveClass('page-transition-instant')
      expect(container).toHaveAttribute('data-transition-exempt', 'true')
    })

    it('exempts forgot-password route from crossfade transition', () => {
      renderWithRouter(['/forgot-password'])
      const container = screen.getByTestId('page-transition-wrapper')

      expect(container).toHaveClass('page-transition-instant')
      expect(container).toHaveAttribute('data-transition-exempt', 'true')
    })
  })

  describe('Modal route exemptions', () => {
    it('exempts modal routes from crossfade transition', () => {
      renderWithRouter(['/settings-modal'])
      const container = screen.getByTestId('page-transition-wrapper')

      expect(container).toHaveClass('page-transition-instant')
      expect(container).toHaveAttribute('data-transition-exempt', 'true')
      expect(screen.getByText('Settings Modal View')).toBeInTheDocument()
    })
  })

  describe('Accessibility & prefers-reduced-motion fallback', () => {
    it('falls back to instant transition when prefers-reduced-motion is active', () => {
      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))

      renderWithRouter(['/dashboard'])
      const container = screen.getByTestId('page-transition-wrapper')

      expect(container).toHaveClass('page-transition-instant')
      expect(container).toHaveAttribute('data-transition-exempt', 'true')
      expect(container).toHaveAttribute('data-transition-type', 'instant')
    })
  })
})
