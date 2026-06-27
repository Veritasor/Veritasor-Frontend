import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import IncidentBanner, { type Incident } from '../components/IncidentBanner'

const critical: Incident = { id: '1', severity: 'critical', message: 'API is down' }
const warning: Incident = { id: '2', severity: 'warning', message: 'Elevated latency', statusUrl: 'https://status.example.com' }
const maintenance: Incident = { id: '3', severity: 'maintenance', message: 'Scheduled downtime at 02:00 UTC' }

describe('IncidentBanner', () => {
  it('renders nothing when incidents is empty', () => {
    const { container } = render(<IncidentBanner incidents={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders a critical banner with role=alert and correct CSS class', () => {
    render(<IncidentBanner incidents={[critical]} />)
    const banner = screen.getByRole('alert')
    expect(banner).toBeInTheDocument()
    expect(banner).toHaveClass('incident-banner-critical')
    expect(banner).toHaveAccessibleName(/critical incident.*API is down/i)
  })

  it('renders a warning banner with role=alert and correct CSS class', () => {
    render(<IncidentBanner incidents={[warning]} />)
    const banner = screen.getByRole('alert')
    expect(banner).toHaveClass('incident-banner-warning')
    expect(banner).toHaveAccessibleName(/service degraded.*elevated latency/i)
  })

  it('renders a maintenance banner with role=status and correct CSS class', () => {
    render(<IncidentBanner incidents={[maintenance]} />)
    const banner = screen.getByRole('status')
    expect(banner).toBeInTheDocument()
    expect(banner).toHaveClass('incident-banner-maintenance')
    expect(banner).toHaveAccessibleName(/scheduled maintenance.*scheduled downtime/i)
  })

  it('renders severity icon and label for dual coding', () => {
    render(<IncidentBanner incidents={[critical]} />)
    const icon = document.querySelector('.incident-banner-icon')
    expect(icon).toHaveAttribute('aria-hidden', 'true')
    expect(icon?.textContent).toBe('🔴')
    const label = document.querySelector('.incident-banner-label')
    expect(label).toHaveAttribute('aria-hidden', 'true')
    expect(label?.textContent).toBe('Critical incident')
  })

  it('renders a status page link when statusUrl is provided', () => {
    render(<IncidentBanner incidents={[warning]} />)
    const link = screen.getByRole('link', { name: /view status page details/i })
    expect(link).toHaveAttribute('href', 'https://status.example.com')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('does not render a details link when statusUrl is absent', () => {
    render(<IncidentBanner incidents={[critical]} />)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('renders multiple concurrent incidents', () => {
    render(<IncidentBanner incidents={[critical, warning, maintenance]} />)
    const alerts = screen.getAllByRole('alert')
    const statuses = screen.getAllByRole('status')
    expect(alerts).toHaveLength(2)
    expect(statuses).toHaveLength(1)
    expect(screen.getByText('API is down')).toBeInTheDocument()
    expect(screen.getByText('Elevated latency')).toBeInTheDocument()
    expect(screen.getByText('Scheduled downtime at 02:00 UTC')).toBeInTheDocument()
  })

  it('dismiss button has accessible label', () => {
    render(<IncidentBanner incidents={[critical]} />)
    const btn = screen.getByRole('button', { name: /dismiss.*API is down/i })
    expect(btn).toBeInTheDocument()
  })

  it('dismisses a banner when dismiss button is clicked', () => {
    render(<IncidentBanner incidents={[critical]} />)
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('dismisses only the clicked banner when multiple are present', () => {
    render(<IncidentBanner incidents={[critical, warning]} />)
    const dismissBtns = screen.getAllByRole('button', { name: /dismiss/i })
    fireEvent.click(dismissBtns[0])
    expect(screen.queryByText('API is down')).not.toBeInTheDocument()
    expect(screen.getByText('Elevated latency')).toBeInTheDocument()
  })

  it('renders nothing after all banners are dismissed', () => {
    const { container } = render(<IncidentBanner incidents={[critical]} />)
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }))
    expect(container.firstChild).toBeNull()
  })

  it('wraps all banners in a labelled container', () => {
    render(<IncidentBanner incidents={[critical]} />)
    expect(screen.getByRole('region', { name: /system status/i })).toBeInTheDocument()
  })
})
