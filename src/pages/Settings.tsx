import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import LocalePickerField from '../components/LocalePicker/LocalePickerField'
import AuditLogTimeline, { type AuditLogEntry } from '../components/audit-log/AuditLogTimeline'
import TokensExport from '../components/tokens/TokensExport'
import SettingsIntegrationsPanel from './SettingsIntegrationsPanel'
import MfaMethodChooser from '../components/MfaMethodChooser'
import WebhookRetryPanel from '../components/WebhookRetryPanel'

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

interface ActiveSession {
  id: string
  device: string
  browser: string
  ip: string
  location: string
  lastActive: string
  isCurrent: boolean
}

const MOCK_SESSIONS: ActiveSession[] = [
  { id: 's1', device: 'MacBook Pro 14"', browser: 'Chrome 125', ip: '203.0.113.42', location: 'Lagos, NG', lastActive: 'Now', isCurrent: true },
  { id: 's2', device: 'iPhone 15 Pro', browser: 'Safari 18', ip: '203.0.113.42', location: 'Lagos, NG', lastActive: '2 hours ago', isCurrent: false },
  { id: 's3', device: 'Windows PC', browser: 'Firefox 128', ip: '198.51.100.77', location: 'Accra, GH', lastActive: '3 days ago', isCurrent: false },
  { id: 's4', device: 'Android Tablet', browser: 'Chrome 124', ip: '192.0.2.150', location: 'Nairobi, KE', lastActive: '2 weeks ago', isCurrent: false },
]

function SessionRow({ session, onRevoke }: { session: ActiveSession; onRevoke: (id: string) => void }) {
  const [revoking, setRevoking] = useState(false)

  const handleRevoke = () => {
    setRevoking(true)
    setTimeout(() => {
      onRevoke(session.id)
      setRevoking(false)
    }, 400)
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.75rem',
        padding: '0.75rem 1rem',
        borderRadius: 10,
        border: `1px solid ${session.isCurrent ? 'var(--border-strong)' : 'var(--border)'}`,
        background: session.isCurrent ? 'rgba(94, 234, 212, 0.06)' : 'transparent',
      }}
    >
      <div style={{ display: 'grid', gap: '0.2rem', minWidth: 0 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, fontSize: '0.9rem' }}>
          {session.device}
          {session.isCurrent ? (
            <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent)', border: '1px solid var(--border-strong)', borderRadius: 4, padding: '0.1rem 0.4rem' }}>
              Current
            </span>
          ) : null}
        </span>
        <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>
          {session.browser} · {session.ip} · {session.location}
        </span>
        <span style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>
          Active {session.lastActive}
        </span>
      </div>
      {!session.isCurrent ? (
        <button
          type="button"
          onClick={handleRevoke}
          disabled={revoking}
          style={{
            padding: '0.35rem 0.75rem',
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: revoking ? 'var(--danger)' : 'transparent',
            color: revoking ? '#fff' : 'var(--danger)',
            fontWeight: 600,
            fontSize: '0.8rem',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'background 0.15s, color 0.15s',
          }}
        >
          {revoking ? 'Revoking…' : 'Revoke'}
        </button>
      ) : (
        <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
          This device
        </span>
      )}
    </div>
  )
}

function SignOutAllButton() {
  const [confirming, setConfirming] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  if (confirming) {
    return (
      <div
        style={{
          padding: '1rem',
          borderRadius: 12,
          border: '1px solid rgba(248, 113, 113, 0.3)',
          background: 'rgba(248, 113, 113, 0.06)',
          display: 'grid',
          gap: '0.75rem',
        }}
      >
        <p style={{ margin: 0, fontWeight: 700, color: 'var(--danger)' }}>
          Sign out of all other sessions?
        </p>
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.5 }}>
          This will revoke all active sessions except your current device. You will need to
          sign back in on those devices.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={() => { setSigningOut(true); setTimeout(() => setConfirming(false), 800) }}
            disabled={signingOut}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: 8,
              border: 'none',
              background: signingOut ? 'var(--muted)' : 'var(--danger)',
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            {signingOut ? 'Signing out…' : 'Yes, sign out'}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={signingOut}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--text)',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      style={{
        padding: '0.5rem 1rem',
        borderRadius: 8,
        border: '1px solid var(--border)',
        background: 'transparent',
        color: 'var(--danger)',
        fontWeight: 700,
        fontSize: '0.85rem',
        cursor: 'pointer',
      }}
    >
      Sign out of all other sessions
    </button>
  )
}

function SecurityPanel() {
  const [mfaMethod, setMfaMethod] = useState<MfaMethod | null>(null)
  const [sessions, setSessions] = useState(MOCK_SESSIONS)

  const handleRevoke = useCallback((id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id))
  }, [])

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

      {/* Active sessions */}
      <hr style={{ margin: '2rem 0', borderColor: 'var(--border)', opacity: 0.5 }} />
      <section aria-labelledby="active-sessions-title">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h3 id="active-sessions-title" style={{ margin: 0, fontSize: '1.05rem' }}>Active sessions</h3>
            <p style={{ margin: '0.15rem 0 0', color: 'var(--muted)', fontSize: '0.85rem' }}>
              {sessions.length} active session{sessions.length !== 1 ? 's' : ''}
            </p>
          </div>
          {sessions.filter((s) => !s.isCurrent).length > 0 ? <SignOutAllButton /> : null}
        </div>
        <div style={{ display: 'grid', gap: '0.5rem', maxWidth: 600 }}>
          {sessions.map((session) => (
            <SessionRow key={session.id} session={session} onRevoke={handleRevoke} />
          ))}
        </div>
        {sessions.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>No active sessions found.</p>
        ) : null}
      </section>
    </div>
  )
}

function WebhooksPanel() {
  const [retryingId, setRetryingId] = useState<string | null>(null)

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
      // Real app: trigger retry via API
    }, 2000)
  }

  return (
    <div>
      <h2>Webhooks</h2>
      <p style={{ color: 'var(--muted)' }}>
        View webhook delivery history and retry failed attempts. Each delivery shows its backoff
        intervals and final status.
      </p>
      <div style={{ marginTop: '1.5rem', maxWidth: 900, display: 'grid', gap: '1rem' }}>
        {mockDeliveries.map((delivery) => (
          <WebhookRetryPanel
            key={delivery.id}
            delivery={delivery}
            onRetry={handleRetry}
            isRetrying={retryingId === delivery.id}
          />
        ))}
      </div>
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
