import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import OfflineBanner from '../components/OfflineBanner'

vi.mock('../hooks/useOnlineStatus', () => ({
  useOnlineStatus: vi.fn(),
}))

async function getHookMock() {
  const mod = await import('../hooks/useOnlineStatus')
  return mod as unknown as { useOnlineStatus: ReturnType<typeof vi.fn> }
}

describe('OfflineBanner', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders nothing when online', async () => {
    const hookMock = await getHookMock()
    hookMock.useOnlineStatus.mockReturnValue({ isOnline: true, retry: vi.fn() })

    const { container } = render(<OfflineBanner />)
    expect(container.firstChild).toBeNull()
  })

  it('renders the banner when offline', async () => {
    const hookMock = await getHookMock()
    hookMock.useOnlineStatus.mockReturnValue({ isOnline: false, retry: vi.fn() })

    render(<OfflineBanner />)
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByText(/you are offline/i)).toBeInTheDocument()
  })

  it('has accessible label describing offline state', async () => {
    const hookMock = await getHookMock()
    hookMock.useOnlineStatus.mockReturnValue({ isOnline: false, retry: vi.fn() })

    render(<OfflineBanner />)
    expect(screen.getByRole('status')).toHaveAccessibleName(/you are offline/i)
  })

  it('shows stale chip when hasStaleData is true', async () => {
    const hookMock = await getHookMock()
    hookMock.useOnlineStatus.mockReturnValue({ isOnline: false, retry: vi.fn() })

    render(<OfflineBanner hasStaleData />)
    expect(screen.getByText('Stale')).toBeInTheDocument()
    expect(screen.getByText('Stale')).toHaveAccessibleName(/may be outdated/i)
  })

  it('hides stale chip when hasStaleData is false', async () => {
    const hookMock = await getHookMock()
    hookMock.useOnlineStatus.mockReturnValue({ isOnline: false, retry: vi.fn() })

    render(<OfflineBanner hasStaleData={false} />)
    expect(screen.queryByText('Stale')).not.toBeInTheDocument()
  })

  it('calls retry when retry button is clicked', async () => {
    const retryFn = vi.fn()
    const hookMock = await getHookMock()
    hookMock.useOnlineStatus.mockReturnValue({ isOnline: false, retry: retryFn })

    render(<OfflineBanner />)
    fireEvent.click(screen.getByRole('button', { name: /retry/i }))
    expect(retryFn).toHaveBeenCalledTimes(1)
  })

  it('retry button has accessible label', async () => {
    const hookMock = await getHookMock()
    hookMock.useOnlineStatus.mockReturnValue({ isOnline: false, retry: vi.fn() })

    render(<OfflineBanner />)
    const btn = screen.getByRole('button', { name: /retry connecting/i })
    expect(btn).toBeInTheDocument()
  })

  it('passes apiBaseUrl to useOnlineStatus', async () => {
    const hookMock = await getHookMock()
    hookMock.useOnlineStatus.mockReturnValue({ isOnline: false, retry: vi.fn() })

    render(<OfflineBanner apiBaseUrl="https://api.example.com" />)
    expect(hookMock.useOnlineStatus).toHaveBeenCalledWith('https://api.example.com')
  })

  it('renders icon with aria-hidden', async () => {
    const hookMock = await getHookMock()
    hookMock.useOnlineStatus.mockReturnValue({ isOnline: false, retry: vi.fn() })

    render(<OfflineBanner />)
    const icon = document.querySelector('.offline-banner-icon')
    expect(icon).toHaveAttribute('aria-hidden', 'true')
  })
})
