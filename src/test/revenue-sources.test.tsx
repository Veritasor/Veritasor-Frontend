import { MemoryRouter } from 'react-router-dom'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { describe, expect, it, afterEach } from 'vitest'
import RevenueSources from '../pages/RevenueSources'

afterEach(() => cleanup())

function renderPage() {
  return render(
    <MemoryRouter>
      <RevenueSources />
    </MemoryRouter>,
  )
}

// ---------------------------------------------------------------------------
// Page structure
// ---------------------------------------------------------------------------

describe('RevenueSources — page structure', () => {
  it('renders the heading and description', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: /revenue sources/i })).toBeInTheDocument()
    expect(screen.getByText(/connected integrations/i)).toBeInTheDocument()
  })

  it('renders the sources list', () => {
    renderPage()
    expect(screen.getByRole('list', { name: /connected revenue sources/i })).toBeInTheDocument()
  })

  it('renders all three mock sources', () => {
    renderPage()
    expect(screen.getByText('Stripe')).toBeInTheDocument()
    expect(screen.getByText('Shopify')).toBeInTheDocument()
    expect(screen.getByText('QuickBooks')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Status badges
// ---------------------------------------------------------------------------

describe('RevenueSources — status badges', () => {
  it('shows Healthy badge for Stripe', () => {
    renderPage()
    expect(screen.getByLabelText('Health status: Healthy')).toBeInTheDocument()
  })

  it('shows Warning badge for Shopify', () => {
    renderPage()
    expect(screen.getByLabelText('Health status: Warning')).toBeInTheDocument()
  })

  it('shows Error badge for QuickBooks', () => {
    renderPage()
    expect(screen.getByLabelText('Health status: Error')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

describe('RevenueSources — actions', () => {
  it('renders Disconnect buttons for all sources', () => {
    renderPage()
    expect(screen.getAllByRole('button', { name: /disconnect/i }).length).toBe(3)
  })

  it('renders Reconnect buttons only for non-healthy sources', () => {
    renderPage()
    // Shopify (warning) and QuickBooks (error) get Reconnect; Stripe (healthy) does not
    expect(screen.getAllByRole('button', { name: /reconnect/i }).length).toBe(2)
  })

  it('reconnect updates status to Healthy', () => {
    renderPage()
    const reconnectShopify = screen.getByRole('button', { name: /reconnect shopify/i })
    fireEvent.click(reconnectShopify)
    // After reconnect, Shopify should no longer have a Reconnect button
    expect(screen.queryByRole('button', { name: /reconnect shopify/i })).toBeNull()
    // Only QuickBooks reconnect remains
    expect(screen.getAllByRole('button', { name: /reconnect/i }).length).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// Disconnect confirmation dialog
// ---------------------------------------------------------------------------

describe('RevenueSources — disconnect confirmation', () => {
  it('opens confirmation dialog when Disconnect is clicked', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /disconnect stripe/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/disconnect stripe\?/i)).toBeInTheDocument()
  })

  it('dialog describes the consequence', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /disconnect stripe/i }))
    expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument()
  })

  it('Cancel closes the dialog without removing the source', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /disconnect stripe/i }))
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByText('Stripe')).toBeInTheDocument()
  })

  it('Disconnect confirm removes the source from the list', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /disconnect stripe/i }))
    // Click the Disconnect button inside the dialog
    const dialogDisconnect = screen.getAllByRole('button', { name: /disconnect/i }).find(
      (btn) => btn.closest('[role="dialog"]'),
    )!
    fireEvent.click(dialogDisconnect)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.queryByText('Stripe')).toBeNull()
    // Other sources remain
    expect(screen.getByText('Shopify')).toBeInTheDocument()
  })

  it('shows empty state when all sources are disconnected', () => {
    renderPage()
    // Disconnect all three
    for (const provider of ['Stripe', 'Shopify', 'QuickBooks']) {
      fireEvent.click(screen.getByRole('button', { name: new RegExp(`disconnect ${provider}`, 'i') }))
      const dialogDisconnect = screen.getAllByRole('button', { name: /disconnect/i }).find(
        (btn) => btn.closest('[role="dialog"]'),
      )!
      fireEvent.click(dialogDisconnect)
    }
    expect(screen.getByRole('region', { name: /no sources connected/i })).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Accessibility
// ---------------------------------------------------------------------------

describe('RevenueSources — accessibility', () => {
  it('dialog has aria-modal and aria-labelledby', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /disconnect stripe/i }))
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-labelledby', 'confirm-title')
    expect(dialog).toHaveAttribute('aria-describedby', 'confirm-desc')
  })

  it('last sync uses a <time> element', () => {
    renderPage()
    const times = document.querySelectorAll('time')
    expect(times.length).toBeGreaterThanOrEqual(1)
  })
})
