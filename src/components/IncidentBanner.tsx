import { useState } from 'react'

export type BannerSeverity = 'critical' | 'warning' | 'maintenance'

export interface Incident {
  id: string
  severity: BannerSeverity
  message: string
  statusUrl?: string
}

const SEVERITY_META: Record<BannerSeverity, { icon: string; label: string; role: 'alert' | 'status' }> = {
  critical:    { icon: '🔴', label: 'Critical incident',  role: 'alert'  },
  warning:     { icon: '🟡', label: 'Service degraded',   role: 'alert'  },
  maintenance: { icon: '🔧', label: 'Scheduled maintenance', role: 'status' },
}

interface Props {
  incidents: Incident[]
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
      {visible.map((incident) => {
        const meta = SEVERITY_META[incident.severity]
        return (
          <div
            key={incident.id}
            className={`incident-banner incident-banner-${incident.severity}`}
            role={meta.role}
            aria-label={`${meta.label}: ${incident.message}`}
          >
            <span className="incident-banner-icon" aria-hidden="true">{meta.icon}</span>
            <span className="incident-banner-label" aria-hidden="true">{meta.label}</span>
            <span className="incident-banner-message">{incident.message}</span>
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
              onClick={() => dismiss(incident.id)}
              aria-label={`Dismiss: ${incident.message}`}
            >
              ✕
            </button>
          </div>
        )
      })}
    </section>
  )
}
