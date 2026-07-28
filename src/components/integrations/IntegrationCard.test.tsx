import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import IntegrationCard from './IntegrationCard'
import type { Integration } from './IntegrationCard'

function makeIntegration(overrides: Partial<Integration> = {}): Integration {
  return {
    id: 'test-integration',
    name: 'Test Integration',
    description: 'A test integration description',
    icon: '🔬',
    status: 'available',
    statusText: 'Available',
    ...overrides,
  }
}

function renderCard(integration: Integration, actions?: {
  onConfigure?: (id: string) => void
  onConnect?: (id: string) => void
  onDisconnect?: (id: string) => void
}) {
  return render(
    <IntegrationCard
      integration={integration}
      onConfigure={actions?.onConfigure}
      onConnect={actions?.onConnect}
      onDisconnect={actions?.onDisconnect}
    />,
  )
}

describe('IntegrationCard', () => {
  it('renders the integration name', () => {
    renderCard(makeIntegration())
    expect(screen.getByText('Test Integration')).toBeInTheDocument()
  })

  it('renders the integration description', () => {
    renderCard(makeIntegration())
    expect(screen.getByText('A test integration description')).toBeInTheDocument()
  })

  it('renders as an article with aria-label', () => {
    renderCard(makeIntegration())
    const article = screen.getByRole('article')
    expect(article).toHaveAttribute('aria-label', 'Test Integration integration')
  })

  it('shows Connect button when status is available', () => {
    renderCard(makeIntegration({ status: 'available', statusText: 'Available' }))
    expect(screen.getByRole('button', { name: /connect test integration/i })).toBeInTheDocument()
  })

  it('shows Configure and Disconnect buttons when status is connected', () => {
    renderCard(makeIntegration({ status: 'connected', statusText: 'Connected' }))
    expect(screen.getByRole('button', { name: /configure test integration/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /disconnect test integration/i })).toBeInTheDocument()
  })

  it('shows status chip with correct text', () => {
    renderCard(makeIntegration({ status: 'connected', statusText: 'Connected' }))
    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('Connected')
  })

  it('calls onConnect when Connect button is clicked', () => {
    const onConnect = vi.fn()
    renderCard(makeIntegration({ status: 'available' }), { onConnect })
    fireEvent.click(screen.getByRole('button', { name: /connect/i }))
    expect(onConnect).toHaveBeenCalledWith('test-integration')
  })

  it('calls onConfigure when Configure button is clicked', () => {
    const onConfigure = vi.fn()
    renderCard(makeIntegration({ status: 'connected' }), { onConfigure })
    fireEvent.click(screen.getByRole('button', { name: /configure/i }))
    expect(onConfigure).toHaveBeenCalledWith('test-integration')
  })

  it('calls onDisconnect when Disconnect button is clicked', () => {
    const onDisconnect = vi.fn()
    renderCard(makeIntegration({ status: 'connected' }), { onDisconnect })
    fireEvent.click(screen.getByRole('button', { name: /disconnect/i }))
    expect(onDisconnect).toHaveBeenCalledWith('test-integration')
  })

  it('shows error status chip', () => {
    renderCard(makeIntegration({ status: 'error', statusText: 'Reconnect needed' }))
    expect(screen.getByRole('status')).toHaveTextContent('Reconnect needed')
  })

  it('shows Connect button for error status (not connected)', () => {
    renderCard(makeIntegration({ status: 'error', statusText: 'Reconnect needed' }))
    expect(screen.getByRole('button', { name: /connect/i })).toBeInTheDocument()
  })
})
