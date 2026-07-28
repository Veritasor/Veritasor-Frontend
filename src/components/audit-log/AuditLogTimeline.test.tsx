import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import AuditLogTimeline from './AuditLogTimeline'
import { useDensityMode } from '../../hooks/useDensityMode'

vi.mock('../../hooks/useDensityMode')

const mockUseDensityMode = vi.mocked(useDensityMode)

const baseEntries = [
  { id: '1', timestamp: '2026-07-28T08:12:00Z', event: 'Attestation completed', details: 'Merkle root: 0x7f...3a' },
  { id: '2', timestamp: '2026-07-28T08:14:00Z', event: 'Attestation completed', details: 'Merkle root: 0x7f...3a' },
  { id: '3', timestamp: '2026-07-28T08:15:00Z', event: 'Attestation completed', details: 'Merkle root: 0x7f...3a' },
  { id: '4', timestamp: '2026-07-28T09:00:00Z', event: 'Revenue source connected', details: 'Provider: Stripe' },
  { id: '5', timestamp: '2026-07-27T14:30:00Z', event: 'Attestation failed', details: 'Timeout after 30s' },
  { id: '6', timestamp: '2026-07-27T14:31:00Z', event: 'Attestation failed', details: 'Timeout after 30s' },
  { id: '7', timestamp: '2026-07-27T14:32:00Z', event: 'Attestation failed', details: 'Timeout after 30s' },
  { id: '8', timestamp: '2026-07-27T14:33:00Z', event: 'Attestation failed', details: 'Timeout after 30s' },
  { id: '9', timestamp: '2026-07-26T10:00:00Z', event: 'API key rotated' },
]

function setup(density: 'comfortable' | 'compact' = 'comfortable') {
  mockUseDensityMode.mockReturnValue({ density, setDensity: vi.fn() })
}

describe('AuditLogTimeline', () => {
  describe('comfortable density', () => {
    beforeEach(() => {
      setup('comfortable')
    })

    it('renders with entries', () => {
      render(<AuditLogTimeline entries={baseEntries} />)
      expect(screen.getByRole('log', { name: /audit log timeline/i })).toBeInTheDocument()
    })

    it('renders all individual entries', () => {
      render(<AuditLogTimeline entries={baseEntries} />)
      expect(screen.getAllByRole('listitem')).toHaveLength(9)
    })

    it('does not collapse identical consecutive events', () => {
      render(<AuditLogTimeline entries={baseEntries} />)
      expect(screen.getAllByText('Attestation completed')).toHaveLength(3)
    })

    it('renders timestamps for each entry', () => {
      render(<AuditLogTimeline entries={baseEntries} />)
      expect(screen.getByText('08:12 AM')).toBeInTheDocument()
      expect(screen.getByText('09:00 AM')).toBeInTheDocument()
    })

    it('renders details when provided', () => {
      render(<AuditLogTimeline entries={baseEntries} />)
      expect(screen.getAllByText('Merkle root: 0x7f...3a')).toHaveLength(3)
    })

    it('renders entry without details when details are absent', () => {
      const noDetails = [{ id: '1', timestamp: '2026-07-28T10:00:00Z', event: 'API key rotated' }]
      render(<AuditLogTimeline entries={noDetails} />)
      expect(screen.getByText('API key rotated')).toBeInTheDocument()
    })

    it('shows empty state when no entries', () => {
      render(<AuditLogTimeline entries={[]} />)
      expect(screen.getByText('No audit log entries.')).toBeInTheDocument()
    })

    it('empty state has aria-live region', () => {
      render(<AuditLogTimeline entries={[]} />)
      expect(screen.getByRole('status')).toBeInTheDocument()
    })
  })

  describe('compact density', () => {
    beforeEach(() => {
      setup('compact')
    })

    it('groups entries by day', () => {
      render(<AuditLogTimeline entries={baseEntries} />)
      expect(screen.getByRole('heading', { name: /July 28, 2026/ })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: /July 27, 2026/ })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: /July 26, 2026/ })).toBeInTheDocument()
    })

    it('collapses identical consecutive events into a burst summary', () => {
      render(<AuditLogTimeline entries={baseEntries} />)
      expect(screen.getByText('Attestation completed')).toBeInTheDocument()
      const badges = screen.getAllByLabelText(/events/)
      expect(badges.length).toBeGreaterThanOrEqual(1)
    })

    it('shows burst badge with correct count', () => {
      render(<AuditLogTimeline entries={baseEntries} />)
      const badge = screen.getByLabelText('3 events')
      expect(badge).toBeInTheDocument()
    })

    it('does not collapse events below burst threshold', () => {
      const twoSame = [
        { id: '1', timestamp: '2026-07-28T08:12:00Z', event: 'Attestation completed' },
        { id: '2', timestamp: '2026-07-28T08:13:00Z', event: 'Attestation completed' },
      ]
      render(<AuditLogTimeline entries={twoSame} burstThreshold={3} />)
      expect(screen.getAllByRole('listitem')).toHaveLength(2)
    })

    it('collapses events at or above burst threshold', () => {
      const threeSame = [
        { id: '1', timestamp: '2026-07-28T08:12:00Z', event: 'Attestation completed' },
        { id: '2', timestamp: '2026-07-28T08:13:00Z', event: 'Attestation completed' },
        { id: '3', timestamp: '2026-07-28T08:14:00Z', event: 'Attestation completed' },
      ]
      render(<AuditLogTimeline entries={threeSame} burstThreshold={3} />)
      expect(screen.getAllByRole('listitem')).toHaveLength(1)
      expect(screen.getByLabelText('3 events')).toBeInTheDocument()
    })

    it('shows time range for burst groups', () => {
      render(<AuditLogTimeline entries={baseEntries} />)
      expect(screen.getByText('08:12 AM \u2013 08:15 AM')).toBeInTheDocument()
    })

    it('shows individual entries alongside burst groups', () => {
      render(<AuditLogTimeline entries={baseEntries} />)
      expect(screen.getByText('Revenue source connected')).toBeInTheDocument()
      expect(screen.getByText('API key rotated')).toBeInTheDocument()
    })

    it('renders day group sections with aria-labelledby', () => {
      render(<AuditLogTimeline entries={baseEntries} />)
      const dayHeadings = screen.getAllByRole('heading', { level: 3 })
      expect(dayHeadings.length).toBe(3)
      baseEntries
        .map((e) => new Date(e.timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }))
        .filter((v, i, a) => a.indexOf(v) === i)
        .forEach((date) => {
          expect(document.getElementById(`day-heading-${date}`)).toBeInTheDocument()
        })
    })

    it('day group has aria-label on the list', () => {
      render(<AuditLogTimeline entries={baseEntries} />)
      expect(screen.getByLabelText(/Events for July 28, 2026/)).toBeInTheDocument()
    })

    it('shows empty state when no entries', () => {
      render(<AuditLogTimeline entries={[]} />)
      expect(screen.getByText('No audit log entries.')).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    beforeEach(() => {
      setup('compact')
    })

    it('has role="log" on the timeline container', () => {
      render(<AuditLogTimeline entries={baseEntries} />)
      expect(screen.getByRole('log')).toBeInTheDocument()
    })

    it('has aria-label on the log container', () => {
      render(<AuditLogTimeline entries={baseEntries} />)
      expect(screen.getByRole('log', { name: /audit log timeline/i })).toBeInTheDocument()
    })

    it('has aria-live="polite" for dynamic updates', () => {
      render(<AuditLogTimeline entries={baseEntries} />)
      expect(screen.getByRole('log')).toHaveAttribute('aria-live', 'polite')
    })

    it('day headings use h3 for hierarchy', () => {
      render(<AuditLogTimeline entries={baseEntries} />)
      const h3s = screen.getAllByRole('heading', { level: 3 })
      expect(h3s.length).toBeGreaterThan(0)
    })

    it('list items have role="listitem"', () => {
      render(<AuditLogTimeline entries={baseEntries} />)
      const items = screen.getAllByRole('listitem')
      expect(items.length).toBeGreaterThan(0)
    })

    it('burst badge has descriptive aria-label', () => {
      render(<AuditLogTimeline entries={baseEntries} />)
      expect(screen.getByLabelText('3 events')).toBeInTheDocument()
    })

    it('day group heading is linked via aria-labelledby', () => {
      render(<AuditLogTimeline entries={baseEntries} />)
      const headingId = 'day-heading-July 28, 2026'
      expect(document.getElementById(headingId)).toBeInTheDocument()
    })
  })

  describe('burst threshold customization', () => {
    beforeEach(() => {
      setup('compact')
    })

    it('uses custom burst threshold', () => {
      const twoSame = [
        { id: '1', timestamp: '2026-07-28T08:12:00Z', event: 'Event A' },
        { id: '2', timestamp: '2026-07-28T08:13:00Z', event: 'Event A' },
      ]
      render(<AuditLogTimeline entries={twoSame} burstThreshold={2} />)
      expect(screen.getByLabelText('2 events')).toBeInTheDocument()
    })

    it('does not collapse when threshold is higher than burst size', () => {
      const twoSame = [
        { id: '1', timestamp: '2026-07-28T08:12:00Z', event: 'Event A' },
        { id: '2', timestamp: '2026-07-28T08:13:00Z', event: 'Event A' },
      ]
      render(<AuditLogTimeline entries={twoSame} burstThreshold={5} />)
      expect(screen.getAllByRole('listitem')).toHaveLength(2)
    })
  })
})