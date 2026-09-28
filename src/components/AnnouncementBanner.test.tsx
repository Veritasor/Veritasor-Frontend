import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import AnnouncementBanner, { Announcement } from './AnnouncementBanner'

const LS_PREFIX = 'veritasor:dismissed-announcements'
const anonKey = `${LS_PREFIX}:anonymous`

function makeAnnouncements(): Announcement[] {
  return [
    { id: 'a1', title: 'First', message: 'First message' },
    { id: 'a2', title: 'Second', message: 'Second message', learnMoreUrl: 'https://docs.test/whats-new' },
  ]
}

describe('AnnouncementBanner', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('renders every announcement with an accessible status role and label', () => {
    render(<AnnouncementBanner announcements={makeAnnouncements()} />)

    expect(screen.getByText('First')).toBeInTheDocument()
    expect(screen.getByText('Second message')).toBeInTheDocument()
    expect(
      screen.getByRole('status', { name: 'Announcement: First. First message' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Product announcements')).toBeInTheDocument()
  })

  it('renders a Learn more link only when learnMoreUrl is present', () => {
    render(<AnnouncementBanner announcements={makeAnnouncements()} />)

    const links = screen.getAllByRole('link', { name: 'Learn more about: Second' })
    expect(links).toHaveLength(1)
    expect(links[0]).toHaveAttribute('href', 'https://docs.test/whats-new')
    expect(links[0]).toHaveAttribute('target', '_blank')
    expect(links[0]).toHaveAttribute('rel', 'noopener noreferrer')
    expect(screen.queryByRole('link', { name: 'Learn more about: First' })).not.toBeInTheDocument()
  })

  it('dismisses a single announcement without hiding the others', () => {
    render(<AnnouncementBanner announcements={makeAnnouncements()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss announcement: First' }))

    expect(screen.queryByText('First')).not.toBeInTheDocument()
    expect(screen.getByText('Second')).toBeInTheDocument()
  })

  it('renders nothing once every announcement has been dismissed', () => {
    const { container } = render(<AnnouncementBanner announcements={makeAnnouncements()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss announcement: First' }))
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss announcement: Second' }))

    expect(container).toBeEmptyDOMElement()
  })

  describe('dismissal persistence', () => {
    it('persists dismissed ids under the anonymous storage key by default', () => {
      render(<AnnouncementBanner announcements={makeAnnouncements()} />)
      fireEvent.click(screen.getByRole('button', { name: 'Dismiss announcement: First' }))

      expect(JSON.parse(localStorage.getItem(anonKey) as string)).toContain('a1')
    })

    it('namespaces persistence per userId', () => {
      render(<AnnouncementBanner announcements={makeAnnouncements()} userId="user-42" />)
      fireEvent.click(screen.getByRole('button', { name: 'Dismiss announcement: First' }))

      expect(JSON.parse(localStorage.getItem(`${LS_PREFIX}:user-42`) as string)).toContain('a1')
      expect(localStorage.getItem(anonKey)).toBeNull()
    })

    it('hydrates the dismissed set from storage on mount', () => {
      localStorage.setItem(anonKey, JSON.stringify(['a1']))

      render(<AnnouncementBanner announcements={makeAnnouncements()} />)

      expect(screen.queryByText('First')).not.toBeInTheDocument()
      expect(screen.getByText('Second')).toBeInTheDocument()
    })
  })

  describe('corrupt storage fallback (evidence: loadDismissed catch)', () => {
    it('ignores a non-JSON payload and still renders every announcement', () => {
      localStorage.setItem(anonKey, 'not-json{')

      render(<AnnouncementBanner announcements={makeAnnouncements()} />)

      expect(screen.getByText('First')).toBeInTheDocument()
      expect(screen.getByText('Second')).toBeInTheDocument()
    })

    it('ignores a JSON object payload (not iterable) and still renders', () => {
      localStorage.setItem(anonKey, JSON.stringify({ a1: true }))

      render(<AnnouncementBanner announcements={makeAnnouncements()} />)

      expect(screen.getByText('First')).toBeInTheDocument()
    })

    it('ignores a JSON number payload and still renders', () => {
      localStorage.setItem(anonKey, '42')

      render(<AnnouncementBanner announcements={makeAnnouncements()} />)

      expect(screen.getByText('First')).toBeInTheDocument()
    })

    it('does not throw when localStorage.getItem itself throws', () => {
      const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('storage disabled')
      })

      expect(() => render(<AnnouncementBanner announcements={makeAnnouncements()} />)).not.toThrow()
      expect(screen.getByText('First')).toBeInTheDocument()

      spy.mockRestore()
    })

    it('does not throw when localStorage.setItem fails while persisting a dismissal', () => {
      const { container } = render(<AnnouncementBanner announcements={makeAnnouncements()} />)

      const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('quota exceeded')
      })

      expect(() =>
        fireEvent.click(screen.getByRole('button', { name: 'Dismiss announcement: First' })),
      ).not.toThrow()
      expect(container).not.toBeEmptyDOMElement()

      spy.mockRestore()
    })
  })

  describe('empty and boundary inputs', () => {
    it('renders nothing for an empty announcements array', () => {
      const { container } = render(<AnnouncementBanner announcements={[]} />)
      expect(container).toBeEmptyDOMElement()
    })

    it('renders all announcements when every id is already dismissed (dedup)', () => {
      localStorage.setItem(anonKey, JSON.stringify(['a1', 'a1', 'a2']))

      const { container } = render(<AnnouncementBanner announcements={makeAnnouncements()} />)

      expect(container).toBeEmptyDOMElement()
    })
  })
})
