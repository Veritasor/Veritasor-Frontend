/**
 * Layout accessibility and navigation tests
 *
 * Covers issue #XXX:
 * - Skip link rendered and functional
 * - Sidebar closes on route change (simulated via navigation)
 * - Escape key closes sidebar and returns focus to hamburger
 * - document.title updates per route
 * - Focus moves to #main-content after navigation
 * - Only one <main> landmark rendered at a time
 */

import { MemoryRouter, Route, Routes, Link } from 'react-router-dom'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { IntlProvider } from 'react-intl'
import Layout from './Layout'
import { CookieConsentProvider } from './CookieConsentContext'
import enMessages from '../i18n/messages/en.json'

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <IntlProvider locale="en" messages={enMessages}>
      <CookieConsentProvider>{children}</CookieConsentProvider>
    </IntlProvider>
  )
}

// A minimal page component that links away so we can test route-change behaviour
function PageA() {
  return (
    <div>
      <h1>Page A</h1>
      <Link to="/page-b">Go to Page B</Link>
    </div>
  )
}

function PageB() {
  return <h1>Page B</h1>
}

function renderLayout(initialPath = '/page-a') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Providers>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route path="page-a" element={<PageA />} />
            <Route path="page-b" element={<PageB />} />
            <Route path="dashboard" element={<div><h1>Dashboard</h1></div>} />
            <Route path="attestations" element={<div><h1>Attestations</h1></div>} />
          </Route>
        </Routes>
      </Providers>
    </MemoryRouter>,
  )
}

afterEach(() => {
  document.title = 'Veritasor — Revenue Attestations'
})

// ─── Skip link ────────────────────────────────────────────────────────────────

describe('Layout — skip link', () => {
  it('renders a skip link as the first focusable element', () => {
    renderLayout()
    const skipLink = screen.getByRole('link', { name: /skip to main content/i })
    expect(skipLink).toBeInTheDocument()
  })

  it('skip link href points to #main-content', () => {
    renderLayout()
    const skipLink = screen.getByRole('link', { name: /skip to main content/i }) as HTMLAnchorElement
    expect(skipLink.getAttribute('href')).toBe('#main-content')
  })

  it('skip link has the skip-link class', () => {
    renderLayout()
    expect(screen.getByRole('link', { name: /skip to main content/i })).toHaveClass('skip-link')
  })

  it('skip link is the first anchor/button in the document', () => {
    const { container } = renderLayout()
    const focusables = container.querySelectorAll('a[href], button')
    expect(focusables[0]).toHaveClass('skip-link')
  })
})

// ─── Main landmark ────────────────────────────────────────────────────────────

describe('Layout — main landmark', () => {
  it('renders exactly one main element', () => {
    renderLayout()
    expect(screen.getAllByRole('main')).toHaveLength(1)
  })

  it('main has id="main-content"', () => {
    renderLayout()
    expect(document.getElementById('main-content')).toBeInTheDocument()
  })

  it('main has tabIndex="-1" so it can receive programmatic focus', () => {
    renderLayout()
    expect(document.getElementById('main-content')).toHaveAttribute('tabindex', '-1')
  })
})

// ─── Sidebar — Escape key ─────────────────────────────────────────────────────

describe('Layout — Escape closes sidebar', () => {
  it('pressing Escape while sidebar is open closes it', () => {
    renderLayout()
    fireEvent.click(screen.getByRole('button', { name: /open navigation/i }))
    expect(document.getElementById('app-sidebar')).toHaveClass('app-sidebar-open')

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(document.getElementById('app-sidebar')).not.toHaveClass('app-sidebar-open')
  })

  it('pressing Escape while sidebar is closed does nothing', () => {
    renderLayout()
    expect(document.getElementById('app-sidebar')).not.toHaveClass('app-sidebar-open')
    // Should not throw
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(document.getElementById('app-sidebar')).not.toHaveClass('app-sidebar-open')
  })

  it('after Escape, focus returns to the hamburger button', () => {
    renderLayout()
    fireEvent.click(screen.getByRole('button', { name: /open navigation/i }))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: /open navigation/i }),
    )
  })
})

// ─── Sidebar — route change ───────────────────────────────────────────────────

describe('Layout — sidebar closes on navigation', () => {
  it('navigating from an open sidebar closes it', async () => {
    renderLayout('/page-a')
    // open the sidebar
    fireEvent.click(screen.getByRole('button', { name: /open navigation/i }))
    expect(document.getElementById('app-sidebar')).toHaveClass('app-sidebar-open')

    // click a nav link inside the page content to trigger route change
    await act(async () => {
      fireEvent.click(screen.getByRole('link', { name: /go to page b/i }))
    })

    expect(document.getElementById('app-sidebar')).not.toHaveClass('app-sidebar-open')
  })

  it('overlay is gone after navigation', async () => {
    renderLayout('/page-a')
    fireEvent.click(screen.getByRole('button', { name: /open navigation/i }))
    expect(document.querySelector('.app-sidebar-overlay')).toBeInTheDocument()

    await act(async () => {
      fireEvent.click(screen.getByRole('link', { name: /go to page b/i }))
    })

    expect(document.querySelector('.app-sidebar-overlay')).not.toBeInTheDocument()
  })
})

// ─── document.title ───────────────────────────────────────────────────────────

describe('Layout — document.title updates on navigation', () => {
  it('sets a route-specific title after navigating to /dashboard', async () => {
    render(
      <MemoryRouter initialEntries={['/other']}>
        <Providers>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route
                path="other"
                element={
                  <div>
                    <Link to="/dashboard">Go dashboard</Link>
                  </div>
                }
              />
              <Route path="dashboard" element={<div>Dashboard</div>} />
            </Route>
          </Routes>
        </Providers>
      </MemoryRouter>,
    )

    await act(async () => {
      fireEvent.click(screen.getByRole('link', { name: /go dashboard/i }))
    })

    expect(document.title).toBe('Dashboard — Veritasor')
  })

  it('sets Attestations title after navigating to /attestations', async () => {
    render(
      <MemoryRouter initialEntries={['/other']}>
        <Providers>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route
                path="other"
                element={
                  <div>
                    <Link to="/attestations">Go attestations</Link>
                  </div>
                }
              />
              <Route path="attestations" element={<div>Attestations</div>} />
            </Route>
          </Routes>
        </Providers>
      </MemoryRouter>,
    )

    await act(async () => {
      fireEvent.click(screen.getByRole('link', { name: /go attestations/i }))
    })

    expect(document.title).toBe('Attestations — Veritasor')
  })
})

// ─── Focus management ─────────────────────────────────────────────────────────

describe('Layout — focus moves to main after navigation', () => {
  it('main content receives focus after route change', async () => {
    vi.useFakeTimers()

    renderLayout('/page-a')

    await act(async () => {
      fireEvent.click(screen.getByRole('link', { name: /go to page b/i }))
    })

    // flush the requestAnimationFrame callback
    await act(async () => {
      vi.runAllTimers()
    })

    vi.useRealTimers()

    expect(document.activeElement).toBe(document.getElementById('main-content'))
  })
})

// ─── Regression: no duplicate main ───────────────────────────────────────────

describe('Layout — single main landmark', () => {
  it('renders only one main landmark even on /help route', () => {
    render(
      <MemoryRouter initialEntries={['/help']}>
        <Providers>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route
                path="help"
                element={
                  // Simulate a page that previously had a nested <main>
                  <div>
                    <article>Help content</article>
                  </div>
                }
              />
            </Route>
          </Routes>
        </Providers>
      </MemoryRouter>,
    )
    expect(screen.getAllByRole('main')).toHaveLength(1)
  })
})
