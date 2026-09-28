import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AnnouncementBanner, { type Announcement } from './AnnouncementBanner'

const announcement: Announcement = {
  id: 'release-notes',
  title: 'A new dashboard is here',
  message: 'Explore the updated dashboard experience.',
  learnMoreUrl: 'https://example.com/releases',
}

describe('AnnouncementBanner', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('renders announcement content and its optional learn-more link', () => {
    render(<AnnouncementBanner announcements={[announcement]} />)

    expect(screen.getByRole('region', { name: 'Product announcements' })).toBeInTheDocument()
    expect(screen.getByRole('status', {
      name: 'Announcement: A new dashboard is here. Explore the updated dashboard experience.',
    })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Learn more about: A new dashboard is here' }))
      .toHaveAttribute('href', announcement.learnMoreUrl)
    expect(screen.getByRole('link', { name: /learn more/i }))
      .toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('omits the learn-more link when no URL is provided', () => {
    const { learnMoreUrl: _learnMoreUrl, ...announcementWithoutLink } = announcement
    render(<AnnouncementBanner announcements={[announcementWithoutLink]} />)

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Dismiss announcement: A new dashboard is here' }))
      .toBeInTheDocument()
  })

  it('dismisses an announcement, persists it per user, and keeps it dismissed after remount', () => {
    const props = { announcements: [announcement], userId: 'user-42' }
    const { unmount } = render(<AnnouncementBanner {...props} />)

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss announcement: A new dashboard is here' }))

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(window.localStorage.getItem('veritasor:dismissed-announcements:user-42'))
      .toBe(JSON.stringify(['release-notes']))

    unmount()
    render(<AnnouncementBanner {...props} />)

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('does not apply one user’s dismissal to another user', () => {
    window.localStorage.setItem(
      'veritasor:dismissed-announcements:user-42',
      JSON.stringify(['release-notes']),
    )
    render(<AnnouncementBanner announcements={[announcement]} userId="user-84" />)

    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('renders nothing when the announcements list is empty', () => {
    const { container } = render(<AnnouncementBanner announcements={[]} />)

    expect(container).toBeEmptyDOMElement()
  })

  it('recovers from malformed persisted JSON and saves a valid dismissal', () => {
    window.localStorage.setItem('veritasor:dismissed-announcements:anonymous', '{invalid json')
    render(<AnnouncementBanner announcements={[announcement]} />)

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss announcement: A new dashboard is here' }))

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(window.localStorage.getItem('veritasor:dismissed-announcements:anonymous'))
      .toBe(JSON.stringify(['release-notes']))
  })

  it('continues to render and dismiss when localStorage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Storage is unavailable')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage is unavailable')
    })

    render(<AnnouncementBanner announcements={[announcement]} />)

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(() => fireEvent.click(
      screen.getByRole('button', { name: 'Dismiss announcement: A new dashboard is here' }),
    )).not.toThrow()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})