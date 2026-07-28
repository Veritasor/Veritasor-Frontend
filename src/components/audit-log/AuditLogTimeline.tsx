import { useDensityMode } from '../../hooks/useDensityMode'
import type { CSSProperties } from 'react'

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
}: AuditLogTimelineProps) {
  const { density } = useDensityMode('default')
  const isCompact = density === 'compact'

  if (entries.length === 0) {
    return (
      <div role="status" aria-live="polite" style={{ padding: 'var(--density-padding)', color: 'var(--muted)' }}>
        No audit log entries.
      </div>
    )
  }

  if (isCompact) {
    const days = groupByDay(entries)
    return (
      <div role="log" aria-label="Audit log timeline" aria-live="polite">
        {days.map((day) => {
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
                    <li key={entry.id} style={entryStyle} role="listitem">
                      <span style={timeStyle}>{formatTime(entry.timestamp)}</span>
                      <div>
                        <span style={eventStyle}>{entry.event}</span>
                        {entry.details && (
                          <p style={{ ...detailStyle, margin: '0.15rem 0 0' }}>{entry.details}</p>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
      </div>
    )
  }

  return (
    <div role="log" aria-label="Audit log timeline" aria-live="polite">
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {entries.map((entry) => (
          <li key={entry.id} style={entryStyle} role="listitem">
            <span style={timeStyle}>{formatTime(entry.timestamp)}</span>
            <div>
              <span style={eventStyle}>{entry.event}</span>
              {entry.details && (
                <p style={{ ...detailStyle, margin: '0.15rem 0 0' }}>{entry.details}</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}