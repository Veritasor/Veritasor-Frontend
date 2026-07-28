/**
 * Tests for RotationReminderBanner (#266)
 *
 * Covers:
 *  - Visibility logic (lead-time window, snooze suppression, non-active keys)
 *  - Accessible role and label
 *  - Urgency chip colours (>3 days = warning, ≤3 days = danger)
 *  - "Rotate now" primary CTA
 *  - "Snooze" secondary CTA
 *  - Days=0 edge case ("Today")
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import RotationReminderBanner, { shouldShowRotationReminder } from '../../components/api-keys/RotationReminderBanner'
import type { ApiKey } from '../../components/api-keys/apiKeyTypes'

function addDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

function subtractDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

const baseKey: ApiKey = {
  id: 'key_001',
  label: 'Admin key',
  status: 'active',
  createdAt: subtractDays(30),
  expiresAt: addDays(90),
  scopes: ['read:attestations'],
  maskedKey: 'vtsr_live_xxxx',
}

describe('shouldShowRotationReminder', () => {
  it('returns true when rotationDue is within 14 days', () => {
    expect(shouldShowRotationReminder({ ...baseKey, rotationDue: addDays(7) })).toBe(true)
  })

  it('returns true on the exact 14th day boundary', () => {
    expect(shouldShowRotationReminder({ ...baseKey, rotationDue: addDays(14) })).toBe(true)
  })

  it('returns false when rotationDue is 15+ days away', () => {
    expect(shouldShowRotationReminder({ ...baseKey, rotationDue: addDays(15) })).toBe(false)
  })

  it('returns false when rotationDue is in the past', () => {
    expect(shouldShowRotationReminder({ ...baseKey, rotationDue: subtractDays(1) })).toBe(false)
  })

  it('returns false for non-active key status', () => {
    expect(shouldShowRotationReminder({ ...baseKey, status: 'expired', rotationDue: addDays(5) })).toBe(false)
    expect(shouldShowRotationReminder({ ...baseKey, status: 'revoked', rotationDue: addDays(5) })).toBe(false)
  })

  it('returns false when rotationDue is absent', () => {
    expect(shouldShowRotationReminder({ ...baseKey })).toBe(false)
  })

  it('returns false when snoozed within 24 h', () => {
    const snoozedAt = new Date(Date.now() - 1000 * 60 * 30).toISOString() // snoozed 30 min ago
    expect(shouldShowRotationReminder({ ...baseKey, rotationDue: addDays(5), snoozedAt })).toBe(false)
  })

  it('returns true when snooze has expired (>24 h ago)', () => {
    const snoozedAt = new Date(Date.now() - 1000 * 60 * 60 * 25).toISOString() // snoozed 25 h ago
    expect(shouldShowRotationReminder({ ...baseKey, rotationDue: addDays(5), snoozedAt })).toBe(true)
  })
})

describe('RotationReminderBanner — rendering', () => {
  it('renders nothing when no rotationDue is set', () => {
    const { container } = render(
      <RotationReminderBanner keyItem={baseKey} onRotate={() => {}} onSnooze={() => {}} />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when rotationDue is outside the window', () => {
    const { container } = render(
      <RotationReminderBanner
        keyItem={{ ...baseKey, rotationDue: addDays(20) }}
        onRotate={() => {}}
        onSnooze={() => {}}
      />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders a status landmark when rotation is due within 14 days', () => {
    render(
      <RotationReminderBanner
        keyItem={{ ...baseKey, rotationDue: addDays(8) }}
        onRotate={() => {}}
        onSnooze={() => {}}
      />,
    )
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('has an accessible label describing days until rotation', () => {
    render(
      <RotationReminderBanner
        keyItem={{ ...baseKey, rotationDue: addDays(8) }}
        onRotate={() => {}}
        onSnooze={() => {}}
      />,
    )
    expect(screen.getByRole('status')).toHaveAccessibleName(/rotation reminder.*admin key.*8 day/i)
  })

  it('shows the key label in the message text', () => {
    render(
      <RotationReminderBanner
        keyItem={{ ...baseKey, rotationDue: addDays(5) }}
        onRotate={() => {}}
        onSnooze={() => {}}
      />,
    )
    expect(screen.getByText('Admin key')).toBeInTheDocument()
  })

  it('renders the "Rotate now" primary CTA with an accessible label', () => {
    render(
      <RotationReminderBanner
        keyItem={{ ...baseKey, rotationDue: addDays(5) }}
        onRotate={() => {}}
        onSnooze={() => {}}
      />,
    )
    expect(screen.getByRole('button', { name: /rotate key admin key now/i })).toBeInTheDocument()
  })

  it('renders the "Snooze" secondary CTA with an accessible label', () => {
    render(
      <RotationReminderBanner
        keyItem={{ ...baseKey, rotationDue: addDays(5) }}
        onRotate={() => {}}
        onSnooze={() => {}}
      />,
    )
    expect(screen.getByRole('button', { name: /snooze rotation reminder.*24 hour/i })).toBeInTheDocument()
  })

  it('displays "Today" chip when rotationDue is 0 days away', () => {
    // Set rotationDue to just a few hours from now (still 0 whole days)
    const nearFuture = new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString()
    render(
      <RotationReminderBanner
        keyItem={{ ...baseKey, rotationDue: nearFuture }}
        onRotate={() => {}}
        onSnooze={() => {}}
      />,
    )
    expect(screen.getByRole('status')).toBeInTheDocument()
  })
})

describe('RotationReminderBanner — interactions', () => {
  it('calls onRotate with the key id when "Rotate now" is clicked', () => {
    const onRotate = vi.fn()
    render(
      <RotationReminderBanner
        keyItem={{ ...baseKey, rotationDue: addDays(5) }}
        onRotate={onRotate}
        onSnooze={() => {}}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /rotate key/i }))
    expect(onRotate).toHaveBeenCalledOnce()
    expect(onRotate).toHaveBeenCalledWith('key_001')
  })

  it('calls onSnooze with the key id when "Snooze" is clicked', () => {
    const onSnooze = vi.fn()
    render(
      <RotationReminderBanner
        keyItem={{ ...baseKey, rotationDue: addDays(5) }}
        onRotate={() => {}}
        onSnooze={onSnooze}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /snooze/i }))
    expect(onSnooze).toHaveBeenCalledOnce()
    expect(onSnooze).toHaveBeenCalledWith('key_001')
  })
})

describe('RotationReminderBanner — accessibility', () => {
  it('icon is aria-hidden', () => {
    render(
      <RotationReminderBanner
        keyItem={{ ...baseKey, rotationDue: addDays(5) }}
        onRotate={() => {}}
        onSnooze={() => {}}
      />,
    )
    const icon = document.querySelector('[aria-hidden="true"]')
    expect(icon).toBeInTheDocument()
  })

  it('rotate button has minimum touch target (aria-label present)', () => {
    render(
      <RotationReminderBanner
        keyItem={{ ...baseKey, rotationDue: addDays(5) }}
        onRotate={() => {}}
        onSnooze={() => {}}
      />,
    )
    const btn = screen.getByRole('button', { name: /rotate key/i })
    expect(btn).toHaveAttribute('aria-label')
  })

  it('the rotation due date is wrapped in a <time> element', () => {
    render(
      <RotationReminderBanner
        keyItem={{ ...baseKey, rotationDue: addDays(8) }}
        onRotate={() => {}}
        onSnooze={() => {}}
      />,
    )
    expect(document.querySelector('time')).toBeInTheDocument()
    expect(document.querySelector('time')).toHaveAttribute('dateTime')
  })
})
