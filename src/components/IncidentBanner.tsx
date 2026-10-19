import { useState, useEffect } from 'react'

export type BannerSeverity = 'critical' | 'warning' | 'maintenance'

export interface Incident {
  id: string
  severity: BannerSeverity
  message: string
  statusUrl?: string
  scheduledStart?: string
  scheduledEnd?: string
}

const SEVERITY_META: Record<BannerSeverity, { icon: string; label: string; role: 'alert' | 'status' }> = {
  critical:    { icon: '🔴', label: 'Critical incident',  role: 'alert'  },
  warning:     { icon: '🟡', label: 'Service degraded',   role: 'alert'  },
  maintenance: { icon: '🔧', label: 'Scheduled maintenance', role: 'status' },
}

interface Props {
  incidents: Incident[]
}

function formatTimeRemaining(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days} day${days > 1 ? 's' : ''}`
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`
  if (minutes > 0) return `${minutes} min${minutes > 1 ? 's' : ''}`
  return `${seconds} sec${seconds > 1 ? 's' : ''}`
}

function IncidentItem({ incident, onDismiss }: { incident: Incident; onDismiss: (id: string) => void }) {
  const meta = SEVERITY_META[incident.severity]
  
  // Calculate if it's scheduled
  const isScheduledMaintenance = incident.severity === 'maintenance' && incident.scheduledStart
  
  const [timeRemaining, setTimeRemaining] = useState<number>(() => {
    if (!isScheduledMaintenance) return 0
    return Math.max(0, new Date(incident.scheduledStart!).getTime() - Date.now())
  })

  useEffect(() => {
    if (!isScheduledMaintenance) return
    
    // Initial check
    const checkTime = () => {
      const remaining = Math.max(0, new Date(incident.scheduledStart!).getTime() - Date.now())
      setTimeRemaining(remaining)
    }
    checkTime()

    // Update every 30s as requested by SR spam reduction rule
    const interval = setInterval(checkTime, 30000)
    return () => clearInterval(interval)
  }, [isScheduledMaintenance, incident.scheduledStart])

  const isInProgress = isScheduledMaintenance && timeRemaining === 0
  const isUpcoming = isScheduledMaintenance && timeRemaining > 0
  
  const label = isUpcoming ? 'Scheduled maintenance' : isInProgress ? 'Maintenance in progress' : meta.label

  return (
    <div
      className={`incident-banner incident-banner-${incident.severity} ${isUpcoming ? 'incident-banner-scheduled' : ''}`}
      role={meta.role}
      aria-label={`${label}: ${incident.message}`}
    >
      <span className="incident-banner-icon" aria-hidden="true">{meta.icon}</span>
      <span className="incident-banner-label" aria-hidden="true">{label}</span>
      <span className="incident-banner-message">{incident.message}</span>
      
      {isUpcoming && (
        <span className="incident-banner-countdown" aria-live="polite">
          Starts in {formatTimeRemaining(timeRemaining)}
        </span>
      )}
      
      {incident.statusUrl && (
        <a
          href={incident.statusUrl}
          className="incident-banner-link"
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`View status page details for: ${incident.message}`}
        >
          Details
        </a>
      )}
      <button
        className="incident-banner-dismiss"
        onClick={() => onDismiss(incident.id)}
        aria-label={`Dismiss: ${incident.message}`}
      >
        ✕
      </button>
    </div>
  )
}

export default function IncidentBanner({ incidents }: Props) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  const visible = incidents.filter((i) => !dismissed.has(i.id))
  if (visible.length === 0) return null

  function dismiss(id: string) {
    setDismissed((prev) => new Set(prev).add(id))
  }

  return (
    <section className="incident-banner-stack" aria-label="System status">
      {visible.map((incident) => (
        <IncidentItem key={incident.id} incident={incident} onDismiss={dismiss} />
      ))}
    </section>
  )
}
