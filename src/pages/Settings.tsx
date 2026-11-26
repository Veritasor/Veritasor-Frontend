import A11yAuditPanel from '../components/a11y/A11yAuditPanel'
import SettingsIntegrationsPanel from './SettingsIntegrationsPanel'
import ApiKeysPanel from './settings/ApiKeys'
import AppearancePanel from './settings/Appearance'
import AuditLogPanel from './settings/AuditLog'
import BillingPanel from './settings/Billing'
import NotificationsPanel from './settings/Notifications'
import ProfilePanel from './settings/Profile'
import SecurityPanel from './settings/Security'
import TeamPanel from './settings/Team'
import TokensPanel from './settings/Tokens'
import WebhooksPanel from './settings/Webhooks'
import SettingsShell from './settings/SettingsShell'
import type { TabId } from './settings/dirtyRegistry'

// Tab definitions ordered by frequency of use
const TABS = [
  { id: "profile", label: "Profile" },
  { id: "notifications", label: "Notifications" },
  { id: "appearance", label: "Appearance" },
  { id: "team", label: "Team" },
  { id: "integrations", label: "Integrations" },
  { id: "webhooks", label: "Webhooks" },
  { id: "api-keys", label: "API Keys" },
  { id: "tokens", label: "Tokens" },
  { id: "billing", label: "Billing" },
  { id: "security", label: "Security" },
  { id: "audit-log", label: "Audit Log" },
  { id: "a11y-audit", label: "Accessibility" },
] as const

function getTabFromHash(hash: string): TabId {
  const id = hash.replace("#", "") as TabId
  return TABS.some((tab) => tab.id === id) ? id : TABS[0].id
}

const PANELS: Record<TabId, () => JSX.Element> = {
  profile: ProfilePanel,
  notifications: NotificationsPanel,
  appearance: AppearancePanel,
  team: TeamPanel,
  integrations: SettingsIntegrationsPanel,
  webhooks: WebhooksPanel,
  "api-keys": ApiKeysPanel,
  tokens: TokensPanel,
  billing: BillingPanel,
  security: SecurityPanel,
  "audit-log": AuditLogPanel,
  "a11y-audit": () => <A11yAuditPanel />,
}

export default function Settings() {
  return (
    <SettingsShell
      tabs={TABS}
      panels={PANELS}
      getTabFromHash={getTabFromHash}
    />
  )
}
