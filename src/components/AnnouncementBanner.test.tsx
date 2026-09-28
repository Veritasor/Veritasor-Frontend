import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import AnnouncementBanner, { type Announcement } from './AnnouncementBanner'

/**
 * Regression suite for the dismissal-storage branches in AnnouncementBanner.
 *
 * Named evidence from the issue:
 *   - `src/components/AnnouncementBanner.tsx:25` → `if (!raw) return new Set()`
 *
 * The component persists dismissals in `localStorage` and seeds its React state
 * from that read. The empty/absent entry branch is the one that decides whether
 * a first-time visitor sees every announcement, so it is asserted directly and
 * alongside the adjacent "stored dismissals are honoured" behaviour.
 */

const ANNOUNCEMENTS: Announcement[] = [
  { id: 'ann-1', title: 'Planned maintenance', message: 'The indexer pauses at 02:00 UTC.' },
  {
    id: 'ann-2',
    title: 'New webhook retries',
    message: 'Failed deliveries are retried with backoff.',
    learnMoreUrl: 'https://docs.example.test/webhooks',
  },
]

/** The component writes its dismissed ids to a single well-known storage key. */
let STORAGE_KEY: string

beforeAll(() => {
  render(<AnnouncementBanner announcements={[{ id: 'probe', title: 'Probe', message: 'Probe' }]} />)
  const key = window.localStorage.key(0)
  cleanup()
  window.localStorage.clear()
  if (!key) throw new Error('AnnouncementBanner did not persist a dismissal key')
  STORAGE_KEY = key
})

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  window.localStorage.clear()
})

describe('AnnouncementBanner - empty dismissal storage (line 25 branch)', () => {
  it('shows every announcement when no dismissal entry exists', () => {
    render(<AnnouncementBanner announcements={ANNOUNCEMENTS} />)

    expect(screen.getByRole('region', { name: 'Product announcements' })).toBeInTheDocument()
    expect(screen.getByText('Planned maintenance')).toBeInTheDocument()
    expect(screen.getByText('New webhook retries')).toBeInTheDocument()
    expect(screen.getAllByRole('status')).toHaveLength(2)
  })

  it('treats an empty stored array as nothing dismissed', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([]))

    render(<AnnouncementBanner announcements={ANNOUNCEMENTS} />)

    expect(screen.getAllByRole('status')).toHaveLength(2)
  })

  it('renders nothing when the announcement list is empty', () => {
    const { container } = render(<AnnouncementBanner announcements={[]} />)

    expect(container).toBeEmptyDOMElement()
    expect(screen.queryByRole('region', { name: 'Product announcements' })).not.toBeInTheDocument()
  })
})

describe('AnnouncementBanner - stored dismissals (adjacent success path)', () => {
  it('hides announcements whose ids are stored as dismissed', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(['ann-1']))

    render(<AnnouncementBanner announcements={ANNOUNCEMENTS} />)

    expect(screen.queryByText('Planned maintenance')).not.toBeInTheDocument()
    expect(screen.getByText('New webhook retries')).toBeInTheDocument()
    expect(screen.getAllByRole('status')).toHaveLength(1)
  })

  it('renders nothing when every announcement is already dismissed', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(['ann-1', 'ann-2']))

    const { container } = render(<AnnouncementBanner announcements={ANNOUNCEMENTS} />)

    expect(container).toBeEmptyDOMElement()
  })

  it('ignores stored ids that do not match any announcement', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(['stale-id']))

    render(<AnnouncementBanner announcements={ANNOUNCEMENTS} />)

    expect(screen.getAllByRole('status')).toHaveLength(2)
  })

  it('falls back to an empty set when the stored value is corrupt JSON', () => {
    window.localStorage.setItem(STORAGE_KEY, '{not-json')

    render(<AnnouncementBanner announcements={ANNOUNCEMENTS} />)

    expect(screen.getAllByRole('status')).toHaveLength(2)
  })

  it('falls back to an empty set when localStorage.getItem throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError: storage disabled')
    })

    render(<AnnouncementBanner announcements={ANNOUNCEMENTS} />)

    expect(screen.getAllByRole('status')).toHaveLength(2)
  })
})

describe('AnnouncementBanner - dismissal interaction', () => {
  it('hides a dismissed announcement and persists the id', () => {
    render(<AnnouncementBanner announcements={ANNOUNCEMENTS} />)

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss announcement: Planned maintenance' }))

    expect(screen.queryByText('Planned maintenance')).not.toBeInTheDocument()
    expect(screen.getByText('New webhook retries')).toBeInTheDocument()
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]')).toEqual(['ann-1'])
  })

  it('keeps sibling announcements visible when one is dismissed', () => {
    render(<AnnouncementBanner announcements={ANNOUNCEMENTS} />)

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss announcement: New webhook retries' }))

    expect(screen.getByText('Planned maintenance')).toBeInTheDocument()
    expect(screen.queryByText('New webhook retries')).not.toBeInTheDocument()
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]')).toEqual(['ann-2'])
  })

  it('restores persisted dismissals after a remount', () => {
    const { unmount } = render(<AnnouncementBanner announcements={ANNOUNCEMENTS} />)
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss announcement: Planned maintenance' }))
    unmount()

    render(<AnnouncementBanner announcements={ANNOUNCEMENTS} />)

    expect(screen.queryByText('Planned maintenance')).not.toBeInTheDocument()
    expect(screen.getByText('New webhook retries')).toBeInTheDocument()
  })

  it('still dismisses in memory when localStorage.setItem throws', () => {
    render(<AnnouncementBanner announcements={ANNOUNCEMENTS} />)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss announcement: Planned maintenance' }))

    expect(screen.queryByText('Planned maintenance')).not.toBeInTheDocument()
  })
})

describe('AnnouncementBanner - rendering contract', () => {
  it('renders a learn-more link only for announcements that declare one', () => {
    render(<AnnouncementBanner announcements={ANNOUNCEMENTS} />)

    const link = screen.getByRole('link', { name: 'Learn more about: New webhook retries' })
    expect(link).toHaveAttribute('href', 'https://docs.example.test/webhooks')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')

    expect(screen.getAllByRole('link')).toHaveLength(1)
  })

  it('exposes an accessible label combining title and message per banner', () => {
    render(<AnnouncementBanner announcements={ANNOUNCEMENTS} />)

    expect(
      screen.getByRole('status', {
        name: 'Announcement: Planned maintenance. The indexer pauses at 02:00 UTC.',
      }),
    ).toBeInTheDocument()
  })
})
