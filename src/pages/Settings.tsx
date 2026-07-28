import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import LocalePickerField from '../components/LocalePicker/LocalePickerField'
import AuditLogTimeline, { type AuditLogEntry } from '../components/audit-log/AuditLogTimeline'
import TokensExport from '../components/tokens/TokensExport'
import WebhookSecretRotationDialog, { type RotatingSecret } from '../components/WebhookSecretRotationDialog'

// Tab definitions ordered by frequency of use
const TABS = [
  { id: 'profile', label: 'Profile' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'integrations', label: 'Integrations' },
  { id: 'api-keys', label: 'API Keys' },
  { id: 'tokens', label: 'Tokens' },
  { id: 'billing', label: 'Billing' },
  { id: 'security', label: 'Security' },
  { id: 'audit-log', label: 'Audit Log' },
] as const

type TabId = (typeof TABS)[number]['id']

function getTabFromHash(hash: string): TabId {
  const id = hash.replace('#', '') as TabId
  return TABS.some((t) => t.id === id) ? id : TABS[0].id
}

// ─── Tab Panels ───────────────────────────────────────────────────────────────

function ProfilePanel() {
  return (
    <div>
      <h2>Profile</h2>
      <p style={{ color: 'var(--muted)' }}>Manage your personal information and display name.</p>
      <form style={{ display: 'grid', gap: '1rem', maxWidth: 480 }}>
        <LocalePickerField />
        <div style={{ display: 'grid', gap: '0.4rem' }}>
          <label htmlFor="settings-display-name" style={{ fontSize: '0.9rem', fontWeight: 600 }}>
            Display name
          </label>
          <input
            id="settings-display-name"
            type="text"
            defaultValue="Joel Agboola"
            style={{
              padding: '0.6rem 0.8rem',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--surface-strong)',
              color: 'var(--text)',
              fontSize: '0.95rem',
            }}
          />
        </div>
        <div style={{ display: 'grid', gap: '0.4rem' }}>
          <label htmlFor="settings-email" style={{ fontSize: '0.9rem', fontWeight: 600 }}>
            Email
          </label>
          <input
            id="settings-email"
            type="email"
            defaultValue="joel@example.com"
            style={{
              padding: '0.6rem 0.8rem',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--surface-strong)',
              color: 'var(--text)',
              fontSize: '0.95rem',
            }}
          />
        </div>
        <button
          type="submit"
          style={{
            alignSelf: 'start',
            padding: '0.6rem 1.25rem',
            borderRadius: 8,
            border: 'none',
            background: 'var(--accent)',
            color: '#04111f',
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: '0.95rem',
          }}
        >
          Save changes
        </button>
      </form>
    </div>
  )
}

function NotificationsPanel() {
  return (
    <div>
      <h2>Notifications</h2>
      <p style={{ color: 'var(--muted)' }}>Choose which events trigger email notifications.</p>
      <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: '0.75rem', maxWidth: 480 }}>
        {[
          'Attestation completed',
          'Attestation failed',
          'New revenue source connected',
          'Billing invoice generated',
        ].map((item) => (
          <li key={item} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <input
              id={`notif-${item}`}
              type="checkbox"
              defaultChecked
              style={{ width: 16, height: 16 }}
            />
            <label htmlFor={`notif-${item}`} style={{ fontSize: '0.95rem' }}>
              {item}
            </label>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ApiKeysPanel() {
  return (
    <div>
      <h2>API Keys</h2>
      <p style={{ color: 'var(--muted)' }}>Create and manage API keys for programmatic access.</p>
      <div
        style={{
          padding: '0.9rem 1rem',
          borderRadius: 8,
          border: '1px solid var(--border)',
          background: 'var(--surface-strong)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          maxWidth: 600,
        }}
      >
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Production key</div>
          <code style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>vrt_live_••••••••••••3f9a</code>
        </div>
        <button
          type="button"
          style={{
            padding: '0.4rem 0.9rem',
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'transparent',
            color: 'var(--text)',
            cursor: 'pointer',
            fontSize: '0.85rem',
          }}
        >
          Revoke
        </button>
      </div>
    </div>
  )
}

function BillingPanel() {
  return (
    <div>
      <h2>Billing</h2>
      <p style={{ color: 'var(--muted)' }}>Manage your subscription plan and payment method.</p>
      <dl style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '0.5rem 1.5rem', maxWidth: 480 }}>
        <dt style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Plan</dt>
        <dd style={{ margin: 0, fontWeight: 600 }}>Growth</dd>
        <dt style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Next billing date</dt>
        <dd style={{ margin: 0 }}>July 1, 2026</dd>
        <dt style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Amount</dt>
        <dd style={{ margin: 0 }}>$49 / month</dd>
      </dl>
    </div>
  )
}

function SecurityPanel() {
  const [mfaMethod, setMfaMethod] = useState<MfaMethod | null>(null)

  return (
    <div>
      <h2>Security</h2>
      <p style={{ color: 'var(--muted)' }}>Update your password and manage two-factor authentication.</p>
      <form style={{ display: 'grid', gap: '1rem', maxWidth: 480 }}>
        <div style={{ display: 'grid', gap: '0.4rem' }}>
          <label htmlFor="settings-current-password" style={{ fontSize: '0.9rem', fontWeight: 600 }}>
            Current password
          </label>
          <input
            id="settings-current-password"
            type="password"
            style={{
              padding: '0.6rem 0.8rem',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--surface-strong)',
              color: 'var(--text)',
              fontSize: '0.95rem',
            }}
          />
        </div>
        <div style={{ display: 'grid', gap: '0.4rem' }}>
          <label htmlFor="settings-new-password" style={{ fontSize: '0.9rem', fontWeight: 600 }}>
            New password
          </label>
          <input
            id="settings-new-password"
            type="password"
            style={{
              padding: '0.6rem 0.8rem',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--surface-strong)',
              color: 'var(--text)',
              fontSize: '0.95rem',
            }}
          />
        </div>
        <button
          type="submit"
          style={{
            alignSelf: 'start',
            padding: '0.6rem 1.25rem',
            borderRadius: 8,
            border: 'none',
            background: 'var(--accent)',
            color: '#04111f',
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: '0.95rem',
          }}
        >
          Update password
        </button>
      </form>

      <hr style={{ margin: '2rem 0', borderColor: 'var(--border)', opacity: 0.5 }} />

      <MfaMethodChooser value={mfaMethod} onChange={setMfaMethod} />
    </div>
  )
}

function TokensPanel() {
  return (
    <div>
      <h2>Design tokens</h2>
      <p style={{ color: 'var(--muted)' }}>
        Export a snapshot of Veritasor design tokens as CSS custom properties. Choose a scope,
        then copy or download the file.
      </p>
      <div style={{ marginTop: '1.5rem', maxWidth: 720 }}>
        <TokensExport />
      </div>
    </div>
  )
}

function AuditLogPanel() {
  const mockEntries: AuditLogEntry[] = [
    {
      id: '1',
      timestamp: '2026-07-28T08:12:00Z',
      event: 'Attestation completed',
      details: 'Merkle root: 0x7f...3a',
    },
    {
      id: '2',
      timestamp: '2026-07-28T08:14:00Z',
      event: 'Attestation completed',
      details: 'Merkle root: 0x7f...3a',
    },
    {
      id: '3',
      timestamp: '2026-07-28T08:15:00Z',
      event: 'Attestation completed',
      details: 'Merkle root: 0x7f...3a',
    },
    {
      id: '4',
      timestamp: '2026-07-28T09:00:00Z',
      event: 'Revenue source connected',
      details: 'Provider: Stripe',
    },
    {
      id: '5',
      timestamp: '2026-07-27T14:30:00Z',
      event: 'Attestation failed',
      details: 'Timeout after 30s',
    },
    {
      id: '6',
      timestamp: '2026-07-27T14:31:00Z',
      event: 'Attestation failed',
      details: 'Timeout after 30s',
    },
    {
      id: '7',
      timestamp: '2026-07-27T14:32:00Z',
      event: 'Attestation failed',
      details: 'Timeout after 30s',
    },
    {
      id: '8',
      timestamp: '2026-07-27T14:33:00Z',
      event: 'Attestation failed',
      details: 'Timeout after 30s',
    },
    {
      id: '9',
      timestamp: '2026-07-26T10:00:00Z',
      event: 'API key rotated',
    },
  ]

  return (
    <div>
      <h2>Audit Log</h2>
      <p style={{ color: 'var(--muted)' }}>
        Recent activity for this workspace. In compact density mode, identical consecutive events are
        grouped by day and collapsed into summary badges.
      </p>
      <div style={{ marginTop: '1.5rem', maxWidth: 800 }}>
        <AuditLogTimeline entries={mockEntries} />
      </div>
    </div>
  )
}

function WebhooksPanel() {
  const [retryingId, setRetryingId] = useState<string | null>(null)
  const [rotationOpen, setRotationOpen] = useState(false)

  // Demo rotation state — real app gets this from the API
  const graceEndsAt = new Date(Date.now() + 1000 * 60 * 60 * 23.5).toISOString()
  const mockOldSecret: RotatingSecret = {
    masked: 'whsec_••••••••••••3f9a',
    full: 'whsec_oldSecretValueForDemo3f9a',
    lastUsedAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
    expiresAt: graceEndsAt,
  }
  const mockNewSecret: RotatingSecret = {
    masked: 'whsec_••••••••••••b2c7',
    full: 'whsec_newSecretValueForDemob2c7',
    lastUsedAt: null,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90).toISOString(),
  }

  const mockDeliveries: WebhookDelivery[] = [
    {
      id: 'wh_001',
      event: 'attestation.completed',
      triggeredAt: '2026-07-28T09:30:00Z',
      status: 'failed',
      attempts: [
        {
          attempt: 1,
          at: '2026-07-28T09:30:00Z',
          statusCode: null,
          error: 'Connection refused',
          backoffSeconds: 60,
        },
        {
          attempt: 2,
          at: '2026-07-28T09:31:00Z',
          statusCode: 503,
          error: 'Service Unavailable',
          backoffSeconds: 120,
        },
        {
          attempt: 3,
          at: '2026-07-28T09:33:00Z',
          statusCode: 500,
          error: 'Internal Server Error',
        },
      ],
    },
    {
      id: 'wh_002',
      event: 'source.connected',
      triggeredAt: '2026-07-28T08:00:00Z',
      status: 'retrying',
      attempts: [
        {
          attempt: 1,
          at: '2026-07-28T08:00:00Z',
          statusCode: 503,
          backoffSeconds: 60,
        },
        {
          attempt: 2,
          at: '2026-07-28T08:01:00Z',
          statusCode: 503,
          backoffSeconds: 180,
        },
      ],
    },
    {
      id: 'wh_003',
      event: 'attestation.failed',
      triggeredAt: '2026-07-27T18:45:00Z',
      status: 'delivered',
      attempts: [
        {
          attempt: 1,
          at: '2026-07-27T18:45:00Z',
          statusCode: 503,
          backoffSeconds: 60,
        },
        {
          attempt: 2,
          at: '2026-07-27T18:46:00Z',
          statusCode: 200,
        },
      ],
    },
  ]

  function handleRetry(id: string) {
    setRetryingId(id)
    setTimeout(() => {
      setRetryingId(null)
    }, 2000)
  }

  return (
    <div>
      <h2>Webhooks</h2>
      <p style={{ color: 'var(--muted)' }}>
        View webhook delivery history and retry failed attempts. Each delivery shows its backoff
        intervals and final status.
      </p>

      {/* Signing secret section */}
      <section aria-labelledby="webhook-secret-heading" style={{ marginTop: '1.5rem', maxWidth: 600 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
          <h3 id="webhook-secret-heading" style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
            Signing secret
          </h3>
          <button
            type="button"
            className="modal-btn modal-btn-cancel"
            style={{ fontSize: 'var(--text-sm)', minHeight: 36, padding: '0.4rem 0.9rem' }}
            onClick={() => setRotationOpen(true)}
          >
            Rotate secret
          </button>
        </div>
        <p style={{ margin: 0, color: 'var(--muted)', fontSize: 'var(--text-sm)' }}>
          Used to verify webhook payloads. Rotate it if you suspect it has been compromised.
        </p>
        <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <code style={{ fontFamily: '"SF Mono","Fira Code",monospace', fontSize: 'var(--text-sm)', color: 'var(--text)' }}>
            whsec_••••••••••••3f9a
          </code>
        </div>
      </section>

      <hr style={{ margin: '1.5rem 0', borderColor: 'var(--border)', opacity: 0.5 }} />

      {/* Delivery history */}
      <div style={{ maxWidth: 900, display: 'grid', gap: '1rem' }}>
        {mockDeliveries.map((delivery) => (
          <WebhookRetryPanel
            key={delivery.id}
            delivery={delivery}
            onRetry={handleRetry}
            isRetrying={retryingId === delivery.id}
          />
        ))}
      </div>

      <WebhookSecretRotationDialog
        open={rotationOpen}
        endpointLabel="https://example.com/webhooks"
        oldSecret={mockOldSecret}
        newSecret={mockNewSecret}
        onConfirm={() => setRotationOpen(false)}
        onCancelRotation={() => setRotationOpen(false)}
        onClose={() => setRotationOpen(false)}
      />
    </div>
  )
}

function TokensPanel() {
  return (
    <div>
      <h2>Design tokens</h2>
      <p style={{ color: 'var(--muted)' }}>
        Export a snapshot of Veritasor design tokens as CSS custom properties. Choose a scope,
        then copy or download the file.
      </p>
      <div style={{ marginTop: '1.5rem', maxWidth: 720 }}>
        <TokensExport />
      </div>
    </div>
  )
}

function AuditLogPanel() {
  const mockEntries: AuditLogEntry[] = [
    {
      id: '1',
      timestamp: '2026-07-28T08:12:00Z',
      event: 'Attestation completed',
      details: 'Merkle root: 0x7f...3a',
    },
    {
      id: '2',
      timestamp: '2026-07-28T08:14:00Z',
      event: 'Attestation completed',
      details: 'Merkle root: 0x7f...3a',
    },
    {
      id: '3',
      timestamp: '2026-07-28T08:15:00Z',
      event: 'Attestation completed',
      details: 'Merkle root: 0x7f...3a',
    },
    {
      id: '4',
      timestamp: '2026-07-28T09:00:00Z',
      event: 'Revenue source connected',
      details: 'Provider: Stripe',
    },
    {
      id: '5',
      timestamp: '2026-07-27T14:30:00Z',
      event: 'Attestation failed',
      details: 'Timeout after 30s',
    },
    {
      id: '6',
      timestamp: '2026-07-27T14:31:00Z',
      event: 'Attestation failed',
      details: 'Timeout after 30s',
    },
    {
      id: '7',
      timestamp: '2026-07-27T14:32:00Z',
      event: 'Attestation failed',
      details: 'Timeout after 30s',
    },
    {
      id: '8',
      timestamp: '2026-07-27T14:33:00Z',
      event: 'Attestation failed',
      details: 'Timeout after 30s',
    },
    {
      id: '9',
      timestamp: '2026-07-26T10:00:00Z',
      event: 'API key rotated',
    },
  ]

  return (
    <div>
      <h2>Audit Log</h2>
      <p style={{ color: 'var(--muted)' }}>
        Recent activity for this workspace. In compact density mode, identical consecutive events are
        grouped by day and collapsed into summary badges.
      </p>
      <div style={{ marginTop: '1.5rem', maxWidth: 800 }}>
        <AuditLogTimeline entries={mockEntries} />
      </div>
    </div>
  )
}

const PANELS: Record<TabId, () => JSX.Element> = {
  profile: ProfilePanel,
  notifications: NotificationsPanel,
  integrations: SettingsIntegrationsPanel,
  'api-keys': ApiKeysPanel,
  tokens: TokensPanel,
  billing: BillingPanel,
  security: SecurityPanel,
  'audit-log': AuditLogPanel,
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export default function Settings() {
  const location = useLocation()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabId>(() => getTabFromHash(location.hash))
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  // Sync active tab with URL hash changes (e.g. browser back/forward)
  useEffect(() => {
    setActiveTab(getTabFromHash(location.hash))
  }, [location.hash])

  const selectTab = useCallback(
    (id: TabId) => {
      setActiveTab(id)
      navigate(`/settings#${id}`, { replace: true })
    },
    [navigate],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, currentIndex: number) => {
      let next = currentIndex
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        next = (currentIndex + 1) % TABS.length
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        next = (currentIndex - 1 + TABS.length) % TABS.length
      } else if (e.key === 'Home') {
        e.preventDefault()
        next = 0
      } else if (e.key === 'End') {
        e.preventDefault()
        next = TABS.length - 1
      } else {
        return
      }
      tabRefs.current[next]?.focus()
      selectTab(TABS[next].id)
    },
    [selectTab],
  )

  const Panel = PANELS[activeTab]

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Settings</h1>

      {/* Mobile: select collapse */}
      <label htmlFor="settings-tab-select" className="sr-only">
        Settings section
      </label>
      <select
        id="settings-tab-select"
        aria-label="Settings section"
        value={activeTab}
        onChange={(e) => selectTab(e.target.value as TabId)}
        style={{
          width: '100%',
          padding: '0.6rem 0.8rem',
          borderRadius: 8,
          border: '1px solid var(--border)',
          background: 'var(--surface-strong)',
          color: 'var(--text)',
          fontSize: '0.95rem',
          marginBottom: '1.5rem',
        }}
        className="settings-tab-select"
      >
        {TABS.map((tab) => (
          <option key={tab.id} value={tab.id}>
            {tab.label}
          </option>
        ))}
      </select>

      {/* Desktop: tablist */}
      <div
        role="tablist"
        aria-label="Settings tabs"
        className="settings-tablist"
        style={{
          display: 'flex',
          gap: '0',
          borderBottom: '2px solid var(--border)',
          marginBottom: '1.5rem',
          overflowX: 'auto',
        }}
      >
        {TABS.map((tab, index) => {
          const isActive = tab.id === activeTab
          return (
            <button
              key={tab.id}
              ref={(el) => { tabRefs.current[index] = el }}
              role="tab"
              id={`tab-${tab.id}`}
              aria-controls={`panel-${tab.id}`}
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              type="button"
              onClick={() => selectTab(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              style={{
                padding: '0.6rem 1.1rem',
                background: 'transparent',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                marginBottom: -2,
                color: isActive ? 'var(--accent)' : 'var(--muted)',
                fontWeight: isActive ? 700 : 400,
                fontSize: '0.95rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'color 0.15s, border-color 0.15s',
              }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab panels */}
      {TABS.map((tab) => {
        const isActive = tab.id === activeTab
        return (
          <div
            key={tab.id}
            role="tabpanel"
            id={`panel-${tab.id}`}
            aria-labelledby={`tab-${tab.id}`}
            hidden={!isActive}
            tabIndex={0}
          >
            {isActive && <Panel />}
          </div>
        )
      })}
    </div>
  )
}
