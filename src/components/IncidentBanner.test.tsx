import { render, screen, act, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { vi } from 'vitest'
import IncidentBanner, { Incident } from './IncidentBanner'

describe('IncidentBanner', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders critical incident', () => {
    const incidents: Incident[] = [{ id: '1', severity: 'critical', message: 'Test issue' }]
    render(<IncidentBanner incidents={incidents} />)
    expect(screen.getByText('Critical incident')).toBeInTheDocument()
    expect(screen.getByText('Test issue')).toBeInTheDocument()
  })

  it('renders upcoming scheduled maintenance with countdown', () => {
    const futureDate = new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour from now
    const incidents: Incident[] = [
      { id: '2', severity: 'maintenance', message: 'DB Upgrade', scheduledStart: futureDate }
    ]
    render(<IncidentBanner incidents={incidents} />)
    expect(screen.getByText('Scheduled maintenance')).toBeInTheDocument()
    expect(screen.getByText('Starts in 1 hour')).toBeInTheDocument()
    expect(screen.getByText('DB Upgrade')).toBeInTheDocument()
  })

  it('switches to in-progress when countdown reaches zero', () => {
    const futureDate = new Date(Date.now() + 10 * 1000).toISOString() // 10 seconds from now
    const incidents: Incident[] = [
      { id: '3', severity: 'maintenance', message: 'DB Upgrade', scheduledStart: futureDate }
    ]
    render(<IncidentBanner incidents={incidents} />)
    
    // Initially scheduled
    expect(screen.getByText('Scheduled maintenance')).toBeInTheDocument()
    
    act(() => {
      vi.advanceTimersByTime(30000) // Advance 30s
    })
    
    // Now in progress
    expect(screen.getByText('Maintenance in progress')).toBeInTheDocument()
    expect(screen.queryByText(/Starts in/)).not.toBeInTheDocument()
  })

  it('dismisses an incident', () => {
    const incidents: Incident[] = [{ id: '4', severity: 'warning', message: 'Test warn' }]
    render(<IncidentBanner incidents={incidents} />)
    expect(screen.getByText('Test warn')).toBeInTheDocument()
    
    const dismissBtn = screen.getByRole('button', { name: /Dismiss: Test warn/i })
    fireEvent.click(dismissBtn)
    
    expect(screen.queryByText('Test warn')).not.toBeInTheDocument()
  })

  it('renders link if statusUrl is provided', () => {
    const incidents: Incident[] = [
      { id: '5', severity: 'critical', message: 'Oh no', statusUrl: 'https://status.page' }
    ]
    render(<IncidentBanner incidents={incidents} />)
    const link = screen.getByRole('link', { name: /View status page details/i })
    expect(link).toHaveAttribute('href', 'https://status.page')
  })

  it('does not render if all dismissed', () => {
    const incidents: Incident[] = [{ id: '6', severity: 'warning', message: 'Test warn' }]
    const { container } = render(<IncidentBanner incidents={incidents} />)
    
    const dismissBtn = screen.getByRole('button')
    fireEvent.click(dismissBtn)
    
    expect(container).toBeEmptyDOMElement()
  })
})
