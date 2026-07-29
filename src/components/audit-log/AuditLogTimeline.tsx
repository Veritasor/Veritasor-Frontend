import { useRef, useState } from 'react'
import { useDensityMode } from '../../hooks/useDensityMode'
import type { CSSProperties } from 'react'
import AuditLogDetailDrawer from './AuditLogDetailDrawer'
import type { AuditLogEntryDetail } from './AuditLogDetailDrawer'

export interface AuditLogEntry {
  id: string
  timestamp: string
  event: string
  details?: string
}

interface GroupedDay {
  date: string
  entries: AuditLogEntry[]
}

interface BurstGroup {
  event: string
  count: number
  firstTimestamp: string
  lastTimestamp: string
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function groupByDay(entries: AuditLogEntry[]): GroupedDay[] {
  const map = new Map<string, AuditLogEntry[]>()
  for (const entry of entries) {
    const day = formatDate(entry.timestamp)
    const existing = map.get(day)
    if (existing) {
      existing.push(entry)
    } else {
      map.set(day, [entry])
    }
  }
  return Array.from(map.entries()).map(([date, entries]) => ({ date, entries }))
}

function collapseBursts(entries: AuditLogEntry[], threshold: number): (AuditLogEntry | BurstGroup)[] {
  const result: (AuditLogEntry | BurstGroup)[] = []
  let i = 0
  while (i < entries.length) {
    const current = entries[i]
    let burstCount = 1
    let j = i + 1
    while (j < entries.length && entries[j].event === current.event) {
      burstCount++
      j++
    }
    if (burstCount >= threshold) {
      result.push({
        event: current.event,
        count: burstCount,
        firstTimestamp: current.timestamp,
        lastTimestamp: entries[j - 1].timestamp,
      })
    } else {
      for (let k = i; k < j; k++) {
        result.push(entries[k])
      }
    }
    i = j
  }
  return result
}

interface AuditLogTimelineProps {
  entries: AuditLogEntry[]
  burstThreshold?: number
  /** Provide enriched entry detail on demand; falls back to base entry if omitted */
  onFetchDetail?: (id: string) => AuditLogEntryDetail | Promise<AuditLogEntryDetail>
}

const burstThresholdDefault = 3

const groupStyle: CSSProperties = {
  padding: 'var(--density-padding)',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border)',
  background: 'var(--surface-strong)',
  marginBottom: 'var(--density-gap)',
}

const dayHeaderStyle: CSSProperties = {
  fontSize: 'var(--density-text-sm)',
  fontWeight: 700,
  color: 'var(--accent)',
  marginBottom: 'var(--density-row-gap)',
  paddingBottom: 'var(--space-1)',
  borderBottom: '1px solid var(--border)',
}

const entryStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 'var(--space-2)',
  padding: 'var(--space-1) 0',
  borderBottom: '1px solid var(--border)',
}

const burstStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-2)',
  padding: 'var(--space-1) 0',
  borderBottom: '1px solid var(--border)',
  background: 'var(--surface-soft)',
  borderRadius: 'var(--radius-sm)',
  paddingLeft: 'var(--space-2)',
  paddingRight: 'var(--space-2)',
  marginBottom: 'var(--space-1)',
}

const timeStyle: CSSProperties = {
  fontSize: 'var(--density-text-sm)',
  color: 'var(--muted)',
  whiteSpace: 'nowrap',
  minWidth: '4.5rem',
}

const eventStyle: CSSProperties = {
  fontSize: 'var(--density-text-sm)',
  fontWeight: 600,
}

const detailStyle: CSSProperties = {
  fontSize: 'var(--density-text-muted)',
  color: 'var(--muted)',
}

const badgeStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: '1.5rem',
  height: '1.5rem',
  padding: '0 0.35rem',
  borderRadius: '999px',
  background: 'var(--accent)',
  color: '#04111f',
  fontWeight: 700,
  fontSize: 'var(--density-badge-font)',
  lineHeight: 1,
}

export default function AuditLogTimeline({
  entries,
  burstThreshold = burstThresholdDefault,
  onFetchDetail,
}: AuditLogTimelineProps) {
  const { density } = useDensityMode('default')
  const isCompact = density === 'compact'

  const [activeDetail, setActiveDetail] = useState<AuditLogEntryDetail | null>(null)
  const triggerRef = useRef<HTMLElement | null>(null)

  async function openDrawer(entry: AuditLogEntry, triggerEl: HTMLElement) {
    triggerRef.current = triggerEl
    if (onFetchDetail) {
      const detail = await Promise.resolve(onFetchDetail(entry.id))
      setActiveDetail(detail)
    } else {
      setActiveDetail(entry)
    }
  }

  function closeDrawer() {
    setActiveDetail(null)
  }

  // Shared style for entry row button wrapper
  const rowButtonStyle: CSSProperties = {
    all: 'unset',
    display: 'flex',
    alignItems: 'flex-start',
    gap: 'var(--space-2)',
    padding: 'var(--space-1) 0',
    borderBottom: '1px solid var(--border)',
    width: '100%',
    cursor: 'pointer',
    borderRadius: 4,
    transition: 'background 100ms ease',
  }

  if (entries.length === 0) {
    return (
      <div role="status" aria-live="polite" style={{ padding: 'var(--density-padding)', color: 'var(--muted)' }}>
        No audit log entries.
      </div>
    )
  }

  const timeline = isCompact ? (
    <div role="log" aria-label="Audit log timeline" aria-live="polite">
      {groupByDay(entries).map((day) => {
        const bursts = collapseBursts(day.entries, burstThreshold)
        return (
          <section key={day.date} style={groupStyle} aria-labelledby={`day-heading-${day.date}`}>
            <h3 id={`day-heading-${day.date}`} style={dayHeaderStyle}>
              {day.date}
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }} aria-label={`Events for ${day.date}`}>
              {bursts.map((item, index) => {
                if ('count' in item) {
                  const burst = item as BurstGroup
                  return (
                    <li key={`burst-${index}`} style={burstStyle} role="listitem">
                      <span style={badgeStyle} aria-label={`${burst.count} events`}>{burst.count}</span>
                      <span style={eventStyle}>{burst.event}</span>
                      <span style={{ ...detailStyle, marginLeft: 'auto' }}>
                        {formatTime(burst.firstTimestamp)} – {formatTime(burst.lastTimestamp)}
                      </span>
                    </li>
                  )
                }
                const entry = item as AuditLogEntry
                return (
                  <li key={entry.id} role="listitem" style={{ listStyle: 'none' }}>
                    <button
                      type="button"
                      aria-label={`View details for ${entry.event} at ${formatTime(entry.timestamp)}`}
                      onClick={(e) => openDrawer(entry, e.currentTarget)}
                      style={rowButtonStyle}
                    >
                      <span style={timeStyle}>{formatTime(entry.timestamp)}</span>
                      <div>
                        <span style={eventStyle}>{entry.event}</span>
                        {entry.details && (
                          <p style={{ ...detailStyle, margin: '0.15rem 0 0' }}>{entry.details}</p>
                        )}
                      </div>
                      <span aria-hidden="true" style={{ marginLeft: 'auto', color: 'var(--muted)', fontSize: '0.75rem', paddingTop: '0.05rem', flexShrink: 0 }}>›</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </div>
  ) : (
    <div role="log" aria-label="Audit log timeline" aria-live="polite">
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {entries.map((entry) => (
          <li key={entry.id} role="listitem">
            <button
              type="button"
              aria-label={`View details for ${entry.event} at ${formatTime(entry.timestamp)}`}
              onClick={(e) => openDrawer(entry, e.currentTarget)}
              style={rowButtonStyle}
            >
              <span style={timeStyle}>{formatTime(entry.timestamp)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={eventStyle}>{entry.event}</span>
                {entry.details && (
                  <p style={{ ...detailStyle, margin: '0.15rem 0 0' }}>{entry.details}</p>
                )}
              </div>
              <span aria-hidden="true" style={{ color: 'var(--muted)', fontSize: '0.75rem', paddingTop: '0.05rem', flexShrink: 0 }}>›</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )

  return (
    <>
      {timeline}
      <AuditLogDetailDrawer
        entry={activeDetail}
        onClose={closeDrawer}
        triggerRef={triggerRef}
      />
    </>
  )
}