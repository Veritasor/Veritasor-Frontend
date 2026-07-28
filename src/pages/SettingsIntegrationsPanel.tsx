import { useState, useCallback } from 'react'
import IntegrationCard from '../components/integrations/IntegrationCard'
import { AVAILABLE_INTEGRATIONS } from '../components/integrations/integrations-data'
import type { Integration } from '../components/integrations/IntegrationCard'

type FilterMode = 'all' | 'connected' | 'available'

const FILTER_TABS: { id: FilterMode; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'connected', label: 'Connected' },
  { id: 'available', label: 'Available' },
]

export default function SettingsIntegrationsPanel() {
  const [integrations, setIntegrations] = useState<Integration[]>(AVAILABLE_INTEGRATIONS)
  const [filter, setFilter] = useState<FilterMode>('all')

  const filtered =
    filter === 'all' ? integrations : integrations.filter((i) => i.status === filter || (filter === 'available' && i.status === 'error'))

  const handleConnect = useCallback(
    (id: string) => {
      setIntegrations((prev) =>
        prev.map((i) => (i.id === id ? { ...i, status: 'connected' as const, statusText: 'Connected' } : i)),
      )
    },
    [],
  )

  const handleDisconnect = useCallback(
    (id: string) => {
      setIntegrations((prev) =>
        prev.map((i) => (i.id === id ? { ...i, status: 'available' as const, statusText: 'Available' } : i)),
      )
    },
    [],
  )

  const connectedCount = integrations.filter((i) => i.status === 'connected').length
  const errorCount = integrations.filter((i) => i.status === 'error').length

  return (
    <div>
      <h2>Integrations</h2>
      <p style={{ color: 'var(--muted)', marginBottom: '1rem' }}>
        Connect third-party services to extend Veritasor's capabilities.
      </p>

      {/* Summary */}
      <div
        style={{
          display: 'flex',
          gap: '1.5rem',
          marginBottom: '1.25rem',
          fontSize: 'var(--text-sm)',
          color: 'var(--muted)',
        }}
      >
        <span>
          <strong style={{ color: 'var(--text)' }}>{connectedCount}</strong> connected
        </span>
        <span>
          <strong style={{ color: 'var(--text)' }}>{integrations.length - connectedCount}</strong> available
        </span>
        {errorCount > 0 && (
          <span>
            <strong style={{ color: 'var(--danger)' }}>{errorCount}</strong> need attention
          </span>
        )}
      </div>

      {/* Sub-filter tabs */}
      <div
        role="tablist"
        aria-label="Integration filter"
        style={{
          display: 'flex',
          gap: '0',
          borderBottom: '2px solid var(--border)',
          marginBottom: '1rem',
        }}
      >
        {FILTER_TABS.map((tab) => {
          const isActive = tab.id === filter
          return (
            <button
              key={tab.id}
              role="tab"
              id={`integrations-filter-${tab.id}`}
              aria-controls={`integrations-filter-panel-${tab.id}`}
              aria-selected={isActive}
              type="button"
              onClick={() => setFilter(tab.id)}
              style={{
                padding: '0.5rem 1rem',
                background: 'transparent',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                marginBottom: -2,
                color: isActive ? 'var(--accent)' : 'var(--muted)',
                fontWeight: isActive ? 600 : 400,
                fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'color 0.15s, border-color 0.15s',
              }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Card grid */}
      <div
        role="tabpanel"
        id={`integrations-filter-panel-${filter}`}
        aria-labelledby={`integrations-filter-${filter}`}
        style={{
          display: 'grid',
          gap: 'var(--density-gap)',
        }}
      >
        {filtered.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: 'var(--text-sm)', padding: '2rem 0', textAlign: 'center' }}>
            No {filter === 'connected' ? 'connected' : 'available'} integrations yet.
          </p>
        ) : (
          filtered.map((integration) => (
            <IntegrationCard
              key={integration.id}
              integration={integration}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
              onConfigure={() => {
                /* stub: navigate to config page */
              }}
            />
          ))
        )}
      </div>
    </div>
  )
}
