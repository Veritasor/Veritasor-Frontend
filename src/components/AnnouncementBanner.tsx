import { useEffect, useState } from 'react'

export interface Announcement {
  id: string
  title: string
  message: string
  learnMoreUrl?: string
}

interface Props {
  announcements: Announcement[]
  /** Optional user id so dismiss is stored per user */
  userId?: string
}

const STORAGE_KEY_PREFIX = 'veritasor:dismissed-announcements'

function getStorageKey(userId?: string) {
  return `\( {STORAGE_KEY_PREFIX}: \){userId ?? 'anonymous'}`
}

function loadDismissed(userId?: string): Set<string> {
  try {
    const raw = localStorage.getItem(getStorageKey(userId))
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as string[]
    return new Set(parsed)
  } catch {
    return new Set()
  }
}

function saveDismissed(ids: Set<string>, userId?: string) {
  try {
    localStorage.setItem(getStorageKey(userId), JSON.stringify(Array.from(ids)))
  } catch {
    // ignore storage errors
  }
}

export default function AnnouncementBanner({ announcements, userId }: Props) {
  const [dismissed, setDismissed] = useState<Set<string>>(() => loadDismissed(userId))

  // Keep storage in sync when dismissed changes
  useEffect(() => {
    saveDismissed(dismissed, userId)
  }, [dismissed, userId])

  const visible = announcements.filter((a) => !dismissed.has(a.id))
  if (visible.length === 0) return null

  function dismiss(id: string) {
    setDismissed((prev) => {
      const next = new Set(prev)
      next.add(id)
      return next
    })
  }

  return (
    <section className="announcement-banner-stack" aria-label="Product announcements">
      {visible.map((announcement) => (
        <div
          key={announcement.id}
          className="announcement-banner"
          role="status"
          aria-label={`Announcement: ${announcement.title}. ${announcement.message}`}
        >
          <div className="announcement-banner-content">
            <span className="announcement-banner-icon" aria-hidden="true">
              ✨
            </span>
            <div className="announcement-banner-text">
              <strong className="announcement-banner-title">{announcement.title}</strong>
              <span className="announcement-banner-message">{announcement.message}</span>
            </div>
          </div>

          <div className="announcement-banner-actions">
            {announcement.learnMoreUrl && (
              <a
                href={announcement.learnMoreUrl}
                className="announcement-banner-link"
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Learn more about: ${announcement.title}`}
              >
                Learn more
              </a>
            )}
            <button
              type="button"
              className="announcement-banner-dismiss"
              onClick={() => dismiss(announcement.id)}
              aria-label={`Dismiss announcement: ${announcement.title}`}
            >
              Dismiss
            </button>
          </div>
        </div>
      ))}
    </section>
  )
          }
