import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

// Tab definitions ordered by frequency of use
const TABS = [
  { id: 'profile', label: 'Profile' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'api-keys', label: 'API Keys' },
  { id: 'billing', label: 'Billing' },
  { id: 'security', label: 'Security' },
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
    </div>
  )
}

const PANELS: Record<TabId, () => JSX.Element> = {
  profile: ProfilePanel,
  notifications: NotificationsPanel,
  'api-keys': ApiKeysPanel,
  billing: BillingPanel,
  security: SecurityPanel,
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
