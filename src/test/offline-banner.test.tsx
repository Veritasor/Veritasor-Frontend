import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import OfflineBanner from '../components/OfflineBanner'
import StaleDataChip from '../components/StaleDataChip'

describe('OfflineBanner', () => {
  beforeEach(() => {
    // Default to online
    Object.defineProperty(navigator, 'onLine', { writable: true, value: true })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders nothing when online', () => {
    const { container } = render(<OfflineBanner />)
    expect(container.firstChild).toBeNull()
  })

  it('renders banner when offline', () => {
    Object.defineProperty(navigator, 'onLine', { writable: true, value: false })
    render(<OfflineBanner />)

    const banner = screen.getByRole('alert')
    expect(banner).toBeInTheDocument()
    expect(banner).toHaveClass('offline-banner')
    expect(banner).toHaveAccessibleName(/offline/i)
  })

  it('displays offline label and message', () => {
    Object.defineProperty(navigator, 'onLine', { writable: true, value: false })
    render(<OfflineBanner />)

    expect(screen.getByText('Offline')).toBeInTheDocument()
    expect(screen.getByText(/You're offline/)).toBeInTheDocument()
    expect(screen.getByText(/Stale data is displayed/)).toBeInTheDocument()
  })

  it('renders retry button with accessible label', () => {
    Object.defineProperty(navigator, 'onLine', { writable: true, value: false })
    render(<OfflineBanner />)

    const retryBtn = screen.getByRole('button', { name: /retry connection/i })
    expect(retryBtn).toBeInTheDocument()
    expect(retryBtn).toHaveClass('offline-banner-retry')
  })

  it('calls onRetry when retry button is clicked', () => {
    Object.defineProperty(navigator, 'onLine', { writable: true, value: false })
    const onRetry = vi.fn()
    render(<OfflineBanner onRetry={onRetry} />)

    fireEvent.click(screen.getByRole('button', { name: /retry connection/i }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('performs default fetch retry when no onRetry provided', async () => {
    Object.defineProperty(navigator, 'onLine', { writable: true, value: false })
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(new Response('', { status: 200 }))

    render(<OfflineBanner />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /retry connection/i }))
    })

    expect(fetchSpy).toHaveBeenCalledWith(window.location.origin, {
      method: 'HEAD',
      cache: 'no-store',
    })
  })

  it('dismisses when dismiss button is clicked', () => {
    Object.defineProperty(navigator, 'onLine', { writable: true, value: false })
    render(<OfflineBanner />)

    expect(screen.getByRole('alert')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /dismiss offline banner/i }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows banner again when going offline after being online', () => {
    Object.defineProperty(navigator, 'onLine', { writable: true, value: true })
    const { rerender } = render(<OfflineBanner />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    // Simulate going offline
    act(() => {
      Object.defineProperty(navigator, 'onLine', { writable: true, value: false })
      window.dispatchEvent(new Event('offline'))
    })

    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('hides banner when coming back online', () => {
    Object.defineProperty(navigator, 'onLine', { writable: true, value: false })
    render(<OfflineBanner />)

    expect(screen.getByRole('alert')).toBeInTheDocument()

    act(() => {
      Object.defineProperty(navigator, 'onLine', { writable: true, value: true })
      window.dispatchEvent(new Event('online'))
    })

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('dismiss button has accessible label', () => {
    Object.defineProperty(navigator, 'onLine', { writable: true, value: false })
    render(<OfflineBanner />)

    expect(screen.getByRole('button', { name: /dismiss offline banner/i })).toBeInTheDocument()
  })

  it('renders the wifi-off icon with aria-hidden', () => {
    Object.defineProperty(navigator, 'onLine', { writable: true, value: false })
    render(<OfflineBanner />)

    const icon = document.querySelector('.offline-banner-icon')
    expect(icon).toHaveAttribute('aria-hidden', 'true')
  })

  it('retry button is keyboard focusable', () => {
    Object.defineProperty(navigator, 'onLine', { writable: true, value: false })
    render(<OfflineBanner />)

    const retryBtn = screen.getByRole('button', { name: /retry connection/i })
    retryBtn.focus()
    expect(retryBtn).toHaveFocus()
  })
})

describe('StaleDataChip', () => {
  it('renders nothing when isStale is false', () => {
    const { container } = render(<StaleDataChip isStale={false} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when isStale is not provided', () => {
    const { container } = render(<StaleDataChip />)
    expect(container.firstChild).toBeNull()
  })

  it('renders stale chip when isStale is true', () => {
    render(<StaleDataChip isStale={true} />)
    const chip = screen.getByRole('status')
    expect(chip).toBeInTheDocument()
    expect(chip).toHaveClass('stale-data-chip')
    expect(chip).toHaveAccessibleName(/data may be outdated/i)
  })

  it('displays "Stale" text', () => {
    render(<StaleDataChip isStale={true} />)
    expect(screen.getByText('Stale')).toBeInTheDocument()
  })

  it('displays relative time when lastUpdated is provided', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    render(<StaleDataChip isStale={true} lastUpdated={fiveMinAgo} />)
    expect(screen.getByText(/5m ago/)).toBeInTheDocument()
  })

  it('displays "just now" for very recent timestamps', () => {
    const justNow = new Date().toISOString()
    render(<StaleDataChip isStale={true} lastUpdated={justNow} />)
    expect(screen.getByText(/just now/)).toBeInTheDocument()
  })

  it('displays hours for older timestamps', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    render(<StaleDataChip isStale={true} lastUpdated={twoHoursAgo} />)
    expect(screen.getByText(/2h ago/)).toBeInTheDocument()
  })

  it('displays days for very old timestamps', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    render(<StaleDataChip isStale={true} lastUpdated={threeDaysAgo} />)
    expect(screen.getByText(/3d ago/)).toBeInTheDocument()
  })

  it('hides time text when lastUpdated is not provided', () => {
    render(<StaleDataChip isStale={true} />)
    expect(screen.queryByText(/Updated/)).not.toBeInTheDocument()
  })

  it('renders pulse dot with aria-hidden', () => {
    render(<StaleDataChip isStale={true} />)
    const dot = document.querySelector('.stale-data-chip-dot')
    expect(dot).toHaveAttribute('aria-hidden', 'true')
  })
})
