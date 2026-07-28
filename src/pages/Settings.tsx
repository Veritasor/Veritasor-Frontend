import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import LocalePickerField from '../components/LocalePicker/LocalePickerField'
import AuditLogTimeline, { type AuditLogEntry } from '../components/audit-log/AuditLogTimeline'
import TokensExport from '../components/tokens/TokensExport'
import MfaMethodChooser, { type MfaMethod } from '../components/MfaMethodChooser'
import WebhookRetryPanel from '../components/WebhookRetryPanel'
import WebhookCreateForm from '../components/webhooks/WebhookCreateForm'
import type { WebhookDelivery } from '../components/api-keys/apiKeyTypes'
import SettingsIntegrationsPanel from './SettingsIntegrationsPanel'
import { useToast } from '../components/ToastContext'

// Tab definitions ordered by frequency of use
const TABS = [
  { id: 'profile', label: 'Profile' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'integrations', label: 'Integrations' },
  { id: 'api-keys', label: 'API Keys' },
  { id: 'webhooks', label: 'Webhooks' },
  { id: 'tokens', label: 'Tokens' },
  { id: 'billing', label: 'Billing' },
  { id: 'security', label: 'Security' },
  { id: 'audit-log', label: 'Audit Log' },
  { id: 'webhooks', label: 'Webhooks' },
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

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function generateRecoveryCodes(): string[] {
  return Array.from({ length: 10 }, () => {
    const seg = () =>
      Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('')
    return `${seg()}-${seg()}-${seg()}`
  })
}

function SecurityPanel() {
  const [mfaState, setMfaState] = useState<'off' | 'setup' | 'codes' | 'active'>('off')
  const [codes, setCodes] = useState<string[]>([])
  const [codesConfirmed, setCodesConfirmed] = useState(false)

  const inputStyle = {
    padding: '0.6rem 0.8rem',
    borderRadius: 8,
    border: '1px solid var(--border)',
    background: 'var(--surface-strong)',
    color: 'var(--text)',
    fontSize: '0.95rem',
  }

  const btnStyle = {
    alignSelf: 'start' as const,
    padding: '0.6rem 1.25rem',
    borderRadius: 8,
    border: 'none',
    background: 'var(--accent)',
    color: '#04111f',
    fontWeight: 700,
    cursor: 'pointer' as const,
    fontSize: '0.95rem',
  }

  const handleStartSetup = () => {
    setCodes(generateRecoveryCodes())
    setMfaState('codes')
  }

  const handleCopyAll = useCallback(async () => {
    const text = codes.join('\n')
    await navigator.clipboard.writeText(text)
  }, [codes])

  const handleDownloadTxt = useCallback(() => {
    const text = `Veritasor Recovery Codes\n${'='.repeat(22)}\n\n${codes.join('\n')}\n\nKeep these codes safe. Each code can only be used once.`
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'veritasor-recovery-codes.txt'
    a.click()
    URL.revokeObjectURL(url)
  }, [codes])

  const handlePrint = useCallback(() => {
    const pw = window.open('', '_blank')
    if (!pw) return
    pw.document.write(`<!DOCTYPE html><html><head><title>Recovery Codes — Veritasor</title><style>body{font-family:system-ui,sans-serif;padding:2rem;max-width:600px;margin:0 auto}h1{font-size:1.4rem}code{font-family:"Courier New",monospace;font-size:1.15rem;display:block;padding:0.35rem 0}@media print{button{display:none}}</style></head><body><h1>Veritasor Recovery Codes</h1><p style="color:#555">Save these codes in a secure place. Each code can only be used once.</p><hr>${codes.map((c) => `<code>${c}</code>`).join('')}<hr><p style="font-size:0.85rem;color:#999">Generated ${new Date().toLocaleDateString()}</p><button onclick="window.print()">Print</button></body></html>`)
    pw.document.close()
  }, [codes])

  const mfaSection: Record<string, () => JSX.Element> = useMemo(
    () => ({
      off: () => (
        <div>
          <h3>Two-Factor Authentication</h3>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', maxWidth: 480 }}>
            Add an extra layer of security. Once enabled, you will be asked for a one-time code from your authenticator app when signing in.
          </p>
          <button type="button" onClick={handleStartSetup} style={btnStyle}>
            Set up two-factor authentication
          </button>
        </div>
      ),
      codes: () => (
        <div>
          <h3>Recovery Codes</h3>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', maxWidth: 480 }}>
            Save these recovery codes in a secure place. Each code can only be used once. If you lose access to your authenticator app, you can use one of these codes to sign in.
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.4rem',
              maxWidth: 480,
              fontFamily: '"Courier New", monospace',
              fontSize: '1rem',
              background: 'var(--surface-strong)',
              padding: '1rem',
              borderRadius: 8,
              border: '1px solid var(--border)',
              marginBottom: '1rem',
            }}
            role="list"
            aria-label="Recovery codes"
          >
            {codes.map((code, i) => (
              <div key={code} role="listitem" style={{ padding: '0.25rem 0' }}>
                <code style={{ fontSize: '1rem', userSelect: 'all' }}>{code}</code>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
            <button type="button" onClick={handleCopyAll} style={btnStyle}>Copy all</button>
            <button type="button" onClick={handleDownloadTxt} style={{ ...btnStyle, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)' }}>
              Download .txt
            </button>
            <button type="button" onClick={handlePrint} style={{ ...btnStyle, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)' }}>
              Print
            </button>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={codesConfirmed}
              onChange={(e) => setCodesConfirmed(e.target.checked)}
              style={{ width: 16, height: 16 }}
            />
            I've saved these recovery codes
          </label>
          <button type="button" disabled={!codesConfirmed} onClick={() => { setMfaState('active'); setCodesConfirmed(false) }} style={{ ...btnStyle, marginTop: '1rem', opacity: codesConfirmed ? 1 : 0.5 }}>
            Continue
          </button>
        </div>
      ),
      active: () => (
        <div>
          <h3>Two-Factor Authentication</h3>
          <p style={{ color: 'var(--accent)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span aria-label="Enabled">✓</span> Two-factor authentication is enabled
          </p>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', maxWidth: 480 }}>
            Your account is protected with two-factor authentication. You can disable it at any time.
          </p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" onClick={() => { setMfaState('codes'); setCodes(generateRecoveryCodes()); setCodesConfirmed(false) }} style={{ ...btnStyle, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)' }}>
              View recovery codes
            </button>
            <button type="button" onClick={() => setMfaState('off')} style={{ ...btnStyle, background: 'transparent', border: '1px solid var(--danger, #dc3545)', color: 'var(--danger, #dc3545)' }}>
              Disable
            </button>
          </div>
        </div>
      ),
    }),
    [codes, codesConfirmed, handleCopyAll, handleDownloadTxt, handlePrint, handleStartSetup],
  )
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
            style={inputStyle}
          />
        </div>
        <div style={{ display: 'grid', gap: '0.4rem' }}>
          <label htmlFor="settings-new-password" style={{ fontSize: '0.9rem', fontWeight: 600 }}>
            New password
          </label>
          <input
            id="settings-new-password"
            type="password"
            style={inputStyle}
          />
        </div>
        <button
          type="submit"
          style={btnStyle}
        >
          Update password
        </button>
      </form>
      <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '1.5rem 0' }} />
      {mfaSection[mfaState]()}

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
  const [showCreateForm, setShowCreateForm] = useState(false)
  const { addToast } = useToast()

  function handleCreate(data: { url: string; description: string; events: string[] }) {
    // In a real app, this would call the API to create the webhook endpoint
    addToast(
      `Webhook endpoint created with ${data.events.length} event${data.events.length === 1 ? '' : 's'}.`,
      'success',
      5000,
    )
    setShowCreateForm(false)
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
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap',
          marginBottom: '1rem',
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>Webhooks</h2>
          <p style={{ color: 'var(--muted)', margin: '0.35rem 0 0' }}>
            Create and manage webhook endpoints. View delivery history and retry failed attempts.
          </p>
        </div>
        {!showCreateForm && (
          <button
            type="button"
            className="app-button app-button-primary"
            style={{ width: 'auto' }}
            onClick={() => setShowCreateForm(true)}
          >
            Create endpoint
          </button>
        )}
      </div>

      {showCreateForm && (
        <section
          aria-label="Create webhook endpoint"
          style={{
            padding: '1.25rem',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--surface)',
            marginBottom: '2rem',
          }}
        >
          <WebhookCreateForm
            onSubmit={handleCreate}
            onCancel={() => setShowCreateForm(false)}
          />
        </section>
      )}

      <h3
        style={{
          margin: '0 0 0.75rem',
          fontSize: 'var(--text-sm)',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: 'var(--muted)',
        }}
      >
        Recent deliveries
      </h3>
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

const PANELS: Record<TabId, () => JSX.Element> = {
  profile: ProfilePanel,
  notifications: NotificationsPanel,
  integrations: SettingsIntegrationsPanel,
  'api-keys': ApiKeysPanel,
  webhooks: WebhooksPanel,
  tokens: TokensPanel,
  billing: BillingPanel,
  security: SecurityPanel,
  'audit-log': AuditLogPanel,
  webhooks: WebhooksPanel,
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
