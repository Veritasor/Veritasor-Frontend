import { createContext, useContext, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { useBlocker, useLocation, useNavigate } from 'react-router-dom'
import { useIntl } from 'react-intl'
import LocalePickerField from '../components/LocalePicker/LocalePickerField'
import AuditLogTimeline, { type AuditLogEntry } from '../components/audit-log/AuditLogTimeline'
import { auditLogApi } from '../services/auditLogApi'
import TokensExport from '../components/tokens/TokensExport'
import TokensDiffViewer from '../components/tokens/TokensDiffViewer'
import A11yAuditPanel from '../components/a11y/A11yAuditPanel'
import A11yCoverageMatrix from '../components/a11y/A11yCoverageMatrix'
import SettingsIntegrationsPanel from './SettingsIntegrationsPanel'
import MfaManagementPanel from '../components/MfaManagementPanel'
import WebhookRetryPanel from '../components/WebhookRetryPanel'
import WebhookCreateForm from '../components/webhooks/WebhookCreateForm'
import WebhookSecretRotationDialog, { type RotatingSecret } from '../components/WebhookSecretRotationDialog'
import { webhooksStore, useWebhooks } from '../store/webhooksStore'
import DensityToggle from '../components/DensityToggle'
import DirtyStateBanner from '../components/DirtyStateBanner'
import { useDirtyForm, type SaveStatus } from '../hooks/useDirtyForm'
import { validatePassword } from '../utils/passwordPolicy'
import {
  NOTIFICATION_CATEGORIES,
  CHANNEL_META,
  useNotifications,
  type NotificationChannel,
} from '../store/notificationsStore'
import { useOptionalWorkspace } from '../state/workspace'
import { TeamPanel as ExtractedTeamPanel } from '../components/team/TeamPanel'

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
] as const;

type TabId = (typeof TABS)[number]['id']

function getTabFromHash(hash: string): TabId {
  const id = hash.replace("#", "") as TabId;
  return TABS.some((t) => t.id === id) ? id : TABS[0].id;
}

// ─── Dirty-state registry (page-level) ────────────────────────────────────────

type DirtyTabEntry = {
  isDirty: boolean;
  saveStatus: SaveStatus;
  lastSavedAt: Date | null;
  save: () => Promise<void>;
  reset: () => void;
};

interface DirtyRegistryCtx {
  entries: Map<TabId, DirtyTabEntry>;
  register: (tab: TabId, entry: DirtyTabEntry) => void;
  unregister: (tab: TabId) => void;
}

const DirtyRegistryContext = createContext<DirtyRegistryCtx | null>(null);

function useDirtyRegistry() {
  const ctx = useContext(DirtyRegistryContext);
  if (!ctx) throw new Error("useDirtyRegistry must be used within Settings");
  return ctx;
}

function usePageDirtyState(registry: DirtyRegistryCtx): {
  anyDirty: boolean;
  dirtyTabs: TabId[];
  aggregateStatus: SaveStatus;
  lastSavedAt: Date | null;
  saveAll: () => Promise<void>;
  discardAll: () => void;
} {
  const { entries } = registry;
  return useMemo(() => {
    let anyDirty = false;
    const dirtyTabs: TabId[] = [];
    let aggregateStatus: SaveStatus = "idle";
    let lastSavedAt: Date | null = null;

    for (const [tab, e] of entries) {
      if (e.isDirty) {
        anyDirty = true;
        dirtyTabs.push(tab);
      }
      if (
        e.saveStatus === "saving" ||
        (e.saveStatus === "dirty" && aggregateStatus !== "saving") ||
        (e.saveStatus === "saved" && aggregateStatus === "idle")
      ) {
        aggregateStatus = e.saveStatus;
      }
      if (e.lastSavedAt && (!lastSavedAt || e.lastSavedAt > lastSavedAt)) {
        lastSavedAt = e.lastSavedAt;
      }
    }

    return {
      anyDirty,
      dirtyTabs,
      aggregateStatus: anyDirty
        ? aggregateStatus === "saving"
          ? "saving"
          : "dirty"
        : aggregateStatus,
      lastSavedAt,
      saveAll: async () => {
        const results = Array.from(entries.values())
          .filter((e) => e.isDirty)
          .map((e) => e.save());
        await Promise.all(results);
      },
      discardAll: () => {
        for (const e of entries.values()) e.reset();
      },
    };
  }, [entries]);
}

// ─── MFA section stubs (completeness) ────────────────────────────────────────

type MfaState = "setup" | "enabled" | "recovery" | "disabled";
const mfaState: MfaState = "disabled";
const mfaSection: Record<MfaState, () => JSX.Element> = {
  setup: () => <div />,
  enabled: () => <div />,
  recovery: () => <div />,
  disabled: () => <div />,
};

// ─── Tab Panels ───────────────────────────────────────────────────────────────

function BusinessProfilePanel() {
  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <div>
        <h2>Business Profile</h2>
        <p style={{ color: "var(--muted)" }}>
          Manage your business details, legal entity information, and compliance settings.
        </p>
      </div>
    </div>
  );
}

function ProfilePanel() {
  const registry = useDirtyRegistry();

  const form = useDirtyForm({
    storageKey: "veritasor_settings_profile_draft",
    initialValues: {
      displayName: "Joel Agboola",
      email: "joel@example.com",
    },
    autoSave: true,
    autoSaveIntervalMs: 3000,
  });

  useEffect(() => {
    registry.register("profile", {
      isDirty: form.isDirty,
      saveStatus: form.saveStatus,
      lastSavedAt: form.lastSavedAt,
      save: form.save,
      reset: form.reset,
    });
    return () => registry.unregister("profile");
  }, [
    registry.register,
    registry.unregister,
    form.isDirty,
    form.saveStatus,
    form.lastSavedAt,
    form.save,
    form.reset,
  ]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await form.save();
  }

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <DirtyStateBanner
        isDirty={form.isDirty}
        saveStatus={form.saveStatus}
        lastSavedAt={form.lastSavedAt}
        onSave={form.save}
        onDiscard={form.reset}
        formLabel="Profile"
      />
      <div>
        <h2>Profile</h2>
        <p style={{ color: "var(--muted)" }}>
          Manage your personal information and display name.
        </p>
        <form
          style={{ display: "grid", gap: "1rem", maxWidth: 480 }}
          onSubmit={handleSubmit}
          aria-describedby="profile-sr-status"
        >
          <span id="profile-sr-status" className="sr-only" aria-live="polite" />
          <LocalePickerField />
          <div style={{ display: "grid", gap: "0.4rem" }}>
            <label
              htmlFor="settings-display-name"
              style={{ fontSize: "0.9rem", fontWeight: 600 }}
            >
              Display name
            </label>
            <input
              id="settings-display-name"
              type="text"
              value={form.values.displayName}
              onChange={(e) => form.setField("displayName", e.target.value)}
              aria-invalid={false}
              style={{
                padding: "0.6rem 0.8rem",
                borderRadius: 8,
                border: `1px solid ${form.isDirty ? "var(--border-strong)" : "var(--border)"}`,
                background: "var(--surface-strong)",
                color: "var(--text)",
                fontSize: "0.95rem",
              }}
            />
          </div>
          <div style={{ display: "grid", gap: "0.4rem" }}>
            <label
              htmlFor="settings-email"
              style={{ fontSize: "0.9rem", fontWeight: 600 }}
            >
              Email
            </label>
            <input
              id="settings-email"
              type="email"
              value={form.values.email}
              onChange={(e) => form.setField("email", e.target.value)}
              style={{
                padding: "0.6rem 0.8rem",
                borderRadius: 8,
                border: `1px solid ${form.isDirty ? "var(--border-strong)" : "var(--border)"}`,
                background: "var(--surface-strong)",
                color: "var(--text)",
                fontSize: "0.95rem",
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              type="submit"
              disabled={!form.isDirty || form.saveStatus === "saving"}
              aria-busy={form.saveStatus === "saving"}
              style={{
                alignSelf: "start",
                padding: "0.6rem 1.25rem",
                borderRadius: 8,
                border: "none",
                background: "var(--accent)",
                color: "#04111f",
                fontWeight: 700,
                cursor:
                  !form.isDirty || form.saveStatus === "saving"
                    ? "default"
                    : "pointer",
                fontSize: "0.95rem",
                opacity:
                  !form.isDirty || form.saveStatus === "saving" ? 0.6 : 1,
                minHeight: "2.75rem",
              }}
            >
              {form.saveStatus === "saving" ? "Saving…" : "Save changes"}
            </button>
            {form.isDirty && (
              <button
                type="button"
                onClick={form.reset}
                style={{
                  padding: "0.6rem 1rem",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "transparent",
                  color: "var(--text)",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: "0.9rem",
                  minHeight: "2.75rem",
                }}
              >
                Reset
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

const NOTIFICATION_CHANNELS: NotificationChannel[] = ["email", "inapp", "webhook"];

function NotificationsPanel() {
  const registry = useDirtyRegistry();
  const { preferences, setPreference, setPreferences, resetPreferences } =
    useNotifications();
  const initialSnapshotRef = useRef(preferences);
  const [isDirty, setIsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const save = useCallback(async () => {
    setSaveStatus("saving");
    initialSnapshotRef.current = preferences;
    setIsDirty(false);
    setSaveStatus("saved");
    setLastSavedAt(new Date());
  }, [preferences]);

  const reset = useCallback(() => {
    setPreferences(initialSnapshotRef.current);
    setIsDirty(false);
    setSaveStatus("idle");
  }, [setPreferences]);

  useEffect(() => {
    registry.register("notifications", {
      isDirty,
      saveStatus,
      lastSavedAt,
      save,
      reset,
    });
    return () => registry.unregister("notifications");
  }, [
    registry.register,
    registry.unregister,
    isDirty,
    saveStatus,
    lastSavedAt,
    save,
    reset,
  ]);

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <DirtyStateBanner
        isDirty={isDirty}
        saveStatus={saveStatus}
        lastSavedAt={lastSavedAt}
        onSave={save}
        onDiscard={reset}
        formLabel="Notifications"
      />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <h2>Notifications</h2>
          <p style={{ color: "var(--muted)" }}>
            Choose which events trigger email, in-app bell, and webhook notifications.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            resetPreferences();
            setIsDirty(true);
            setSaveStatus("dirty");
          }}
          style={{
            padding: "0.45rem 0.85rem",
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "transparent",
            color: "var(--text)",
            cursor: "pointer",
            fontSize: "0.85rem",
            fontWeight: 600,
          }}
        >
          Reset to defaults
        </button>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            minWidth: 480,
          }}
        >
          <thead>
            <tr>
              <th
                scope="col"
                style={{
                  textAlign: "left",
                  padding: "0.65rem 0.75rem",
                  borderBottom: "1px solid var(--border)",
                  fontSize: "0.78rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "var(--muted)",
                }}
              >
                Event
              </th>
              {NOTIFICATION_CHANNELS.map((ch) => (
                <th
                  key={ch}
                  scope="col"
                  title={CHANNEL_META[ch].help}
                  style={{
                    textAlign: "center",
                    padding: "0.65rem 0.75rem",
                    borderBottom: "1px solid var(--border)",
                    fontSize: "0.78rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: "var(--muted)",
                    whiteSpace: "nowrap",
                  }}
                >
                  <span aria-hidden="true" style={{ marginRight: "0.3rem" }}>
                    {CHANNEL_META[ch].icon}
                  </span>
                  {CHANNEL_META[ch].label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {NOTIFICATION_CATEGORIES.map((cat) => (
              <tr
                key={cat.id}
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <td style={{ padding: "0.75rem" }}>
                  <div style={{ fontWeight: 600, fontSize: "0.92rem" }}>
                    {cat.title}
                  </div>
                  <div
                    style={{
                      fontSize: "0.82rem",
                      color: "var(--muted)",
                      marginTop: "0.15rem",
                    }}
                  >
                    {cat.description}
                  </div>
                </td>
                {NOTIFICATION_CHANNELS.map((ch) => {
                  const checked = preferences[cat.id]?.[ch] ?? cat.defaults[ch];
                  return (
                    <td
                      key={ch}
                      style={{
                        textAlign: "center",
                        padding: "0.75rem",
                        verticalAlign: "middle",
                      }}
                    >
                      <input
                        id={`notif-${cat.id}-${ch}`}
                        type="checkbox"
                        checked={checked}
                        aria-label={`${cat.title} — ${CHANNEL_META[ch].label}`}
                        onChange={(e) => {
                          setPreference(cat.id, ch, e.target.checked);
                          setIsDirty(true);
                          setSaveStatus("dirty");
                        }}
                        style={{ width: 16, height: 16, cursor: "pointer" }}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ApiKeysPanel() {
  return (
    <div>
      <h2>API Keys</h2>
      <p style={{ color: "var(--muted)" }}>
        Create and manage API keys for programmatic access.
      </p>
      <div
        style={{
          padding: "0.9rem 1rem",
          borderRadius: 8,
          border: "1px solid var(--border)",
          background: "var(--surface-strong)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          maxWidth: 600,
        }}
      >
        <div>
          <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>
            Production key
          </div>
          <code style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
            vrt_live_••••••••••••3f9a
          </code>
        </div>
        <button
          type="button"
          style={{
            padding: "0.4rem 0.9rem",
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "transparent",
            color: "var(--text)",
            cursor: "pointer",
            fontSize: "0.85rem",
          }}
        >
          Revoke
        </button>
      </div>
    </div>
  );
}

const INVOICE_STATUS_META: Record<
  InvoiceStatus,
  { label: string; bg: string; border: string; color: string; dot: string }
> = {
  paid: {
    label: "Paid",
    bg: "var(--success-soft)",
    border: "rgba(52, 211, 153, 0.35)",
    color: "var(--success)",
    dot: "var(--success)",
  },
  open: {
    label: "Open",
    bg: "rgba(96, 165, 250, 0.12)",
    border: "rgba(96, 165, 250, 0.35)",
    color: "#60a5fa",
    dot: "#60a5fa",
  },
  overdue: {
    label: "Overdue",
    bg: "var(--danger-soft)",
    border: "rgba(251, 113, 133, 0.35)",
    color: "var(--danger)",
    dot: "var(--danger)",
  },
  void: {
    label: "Void",
    bg: "var(--surface-soft)",
    border: "rgba(148, 163, 184, 0.35)",
    color: "var(--muted)",
    dot: "var(--muted)",
  },
};

const INVOICES_PER_PAGE = 5;

function InvoiceStatusChip({ status }: { status: InvoiceStatus }) {
  const meta = INVOICE_STATUS_META[status];
  return (
    <span
      role="status"
      aria-label={`Invoice status: ${meta.label}`}
      className="status-chip"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.4rem",
        padding: "var(--density-badge-padding)",
        borderRadius: 999,
        fontWeight: 700,
        fontSize: "var(--density-badge-font)",
        border: `1px solid ${meta.border}`,
        background: meta.bg,
        color: meta.color,
        whiteSpace: "nowrap",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: "0.5rem",
          height: "0.5rem",
          borderRadius: "50%",
          background: meta.dot,
          flexShrink: 0,
        }}
      />
      {meta.label}
    </span>
  );
}

const thStyle: React.CSSProperties = {
  padding: "0.75rem 1rem",
  textAlign: "left",
  fontSize: "0.78rem",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "var(--muted)",
  borderBottom: "1px solid var(--border)",
};

const tdStyle: React.CSSProperties = {
  padding: "0.9rem 1rem",
  fontSize: "0.92rem",
  color: "var(--text)",
  verticalAlign: "middle",
};

const iconBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "0.35rem",
  padding: "0.5rem 0.75rem",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--surface-strong)",
  color: "var(--text)",
  cursor: "pointer",
  fontSize: "0.85rem",
  fontWeight: 600,
  minHeight: "2.5rem",
  textDecoration: "none",
  transition: "border-color 120ms ease, background-color 120ms ease",
};

const pagerBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: "2.5rem",
  minHeight: "2.5rem",
  padding: "0.45rem 0.85rem",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--surface)",
  color: "var(--text)",
  cursor: "pointer",
  fontSize: "0.88rem",
  fontWeight: 500,
  transition: "all 120ms ease",
};

const inputStyle: React.CSSProperties = {
  padding: "0.6rem 0.8rem",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--surface-strong)",
  color: "var(--text)",
  fontSize: "0.95rem",
  minHeight: "2.75rem",
};

function InvoiceList() {
  const { invoices } = useBilling();
  const { locale } = useLocale();
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(invoices.length / INVOICES_PER_PAGE);
  const startIdx = (page - 1) * INVOICES_PER_PAGE;
  const pageInvoices = invoices.slice(
    startIdx,
    startIdx + INVOICES_PER_PAGE,
  );

  return (
    <section
      aria-labelledby="invoice-list-heading"
      style={{ display: "grid", gap: "1rem" }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h3
            id="invoice-list-heading"
            style={{ margin: 0, fontSize: "1.05rem" }}
          >
            Invoice history
          </h3>
          <p
            style={{
              margin: "0.25rem 0 0",
              color: "var(--muted)",
              fontSize: "0.9rem",
            }}
          >
            Download PDF receipts and track payment status.
          </p>
        </div>
        <div style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
          Showing {startIdx + 1}–
          {Math.min(startIdx + INVOICES_PER_PAGE, invoices.length)} of{" "}
          {invoices.length}
        </div>
      </div>

      <div
        role="region"
        aria-label="Invoice list table"
        style={{ overflowX: "auto" }}
      >
        <table
          className="invoice-table"
          style={{
            width: "100%",
            minWidth: 560,
            borderCollapse: "separate",
            borderSpacing: 0,
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            overflow: "hidden",
            background: "var(--surface)",
          }}
        >
          <thead>
            <tr style={{ background: "var(--surface-strong)" }}>
              <th scope="col" style={thStyle}>
                Period
              </th>
              <th scope="col" style={thStyle}>
                Due date
              </th>
              <th scope="col" style={thStyle}>
                Amount
              </th>
              <th scope="col" style={thStyle}>
                Status
              </th>
              <th scope="col" style={{ ...thStyle, textAlign: "right" }}>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {pageInvoices.map((inv) => {
              const due = new Date(inv.dueDate);
              return (
                <tr
                  key={inv.id}
                  className="invoice-row"
                  style={{ borderTop: "1px solid var(--border)" }}
                >
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 600 }}>{inv.period}</div>
                    <div
                      style={{
                        color: "var(--muted)",
                        fontSize: "0.82rem",
                        fontFamily:
                          "ui-monospace, SFMono-Regular, Menlo, monospace",
                      }}
                    >
                      {inv.id}
                    </div>
                  </td>
                  <td style={tdStyle}>
                    {formatDate(due, locale, "medium")}
                  </td>
                  <td
                    style={{
                      ...tdStyle,
                      fontWeight: 700,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {formatCurrency(inv.amount, locale)}
                  </td>
                  <td style={tdStyle}>
                    <InvoiceStatusChip status={inv.status} />
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>
                    <a
                      href={inv.pdfUrl}
                      className="icon-button"
                      aria-label={`Download PDF invoice for ${inv.period}`}
                      style={iconBtnStyle}
                    >
                      <svg
                        aria-hidden="true"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ flexShrink: 0 }}
                      >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      <span style={{ whiteSpace: "nowrap" }}>PDF</span>
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <nav
          aria-label="Invoice list pagination"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          <div style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
            Page{" "}
            <span style={{ fontWeight: 600, color: "var(--text)" }}>
              {page}
            </span>{" "}
            of {totalPages}
          </div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              aria-label="Previous page"
              style={pagerBtnStyle}
            >
              ← Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPage(p)}
                aria-current={p === page ? "page" : undefined}
                aria-label={`Go to page ${p}`}
                style={{
                  ...pagerBtnStyle,
                  background: p === page ? "var(--accent)" : "transparent",
                  color: p === page ? "#04111f" : "var(--text)",
                  borderColor: p === page ? "transparent" : "var(--border)",
                  fontWeight: p === page ? 700 : 500,
                }}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              aria-label="Next page"
              style={pagerBtnStyle}
            >
              Next →
            </button>
          </div>
        </nav>
      )}
    </section>
  );
}

const CARD_BRAND_META: Record<
  CardBrand,
  { label: string; gradient: string; pattern: string }
> = {
  visa: {
    label: "Visa",
    gradient: "linear-gradient(135deg, #1a1f71 0%, #2d4ecf 100%)",
    pattern: "•",
  },
  mastercard: {
    label: "Mastercard",
    gradient: "linear-gradient(135deg, #1e3a8a 0%, #dc2626 100%)",
    pattern: "◆",
  },
  amex: {
    label: "Amex",
    gradient: "linear-gradient(135deg, #006fcf 0%, #0077c5 100%)",
    pattern: "▲",
  },
  discover: {
    label: "Discover",
    gradient: "linear-gradient(135deg, #ff6600 0%, #e63946 100%)",
    pattern: "■",
  },
};

function getPaymentStatusMeta(status: PaymentMethodStatus) {
  if (status === "expired")
    return {
      label: "Expired",
      icon: "⚠",
      bg: "var(--danger-soft)",
      border: "rgba(251, 113, 133, 0.35)",
      color: "var(--danger)",
    };
  if (status === "expiring")
    return {
      label: "Expiring soon",
      icon: "⏰",
      bg: "var(--warning-soft)",
      border: "rgba(251, 191, 36, 0.35)",
      color: "var(--warning)",
    };
  return {
    label: "Active",
    icon: "✓",
    bg: "var(--success-soft)",
    border: "rgba(52, 211, 153, 0.35)",
    color: "var(--success)",
  };
}

function CardArt({ method }: { method: PaymentMethod }) {
  const meta = CARD_BRAND_META[method.brand];
  return (
    <div
      aria-hidden="true"
      style={{
        width: 64,
        height: 40,
        borderRadius: 8,
        background: meta.gradient,
        flexShrink: 0,
        position: "relative",
        overflow: "hidden",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "flex-end",
        padding: "0.35rem 0.5rem",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25)",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.08,
          fontSize: 14,
          lineHeight: "10px",
          letterSpacing: "2px",
          color: "#fff",
          padding: "6px 8px",
          fontFamily: "ui-monospace, monospace",
          wordBreak: "break-all",
        }}
      >
        {meta.pattern.repeat(40)}
      </div>
      <span
        style={{
          position: "relative",
          color: "#fff",
          fontSize: "0.68rem",
          fontWeight: 800,
          letterSpacing: "0.04em",
          textShadow: "0 1px 2px rgba(0,0,0,0.35)",
        }}
      >
        {meta.label}
      </span>
    </div>
  );
}

function PaymentMethodsPanel() {
  const { paymentMethods: methods, setDefaultMethod, removeMethod } = useBilling();
  const [showAdd, setShowAdd] = useState(false);

  function setDefault(id: string) {
    setDefaultMethod(id);
  }

  return (
    <section
      aria-labelledby="payment-methods-heading"
      style={{ display: "grid", gap: "1rem" }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h3
            id="payment-methods-heading"
            style={{ margin: 0, fontSize: "1.05rem" }}
          >
            Payment methods
          </h3>
          <p
            style={{
              margin: "0.25rem 0 0",
              color: "var(--muted)",
              fontSize: "0.9rem",
            }}
          >
            Add, remove, or update the cards charged for your subscription.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="app-button app-button-primary"
          style={{
            width: "auto",
            minHeight: "2.75rem",
            padding: "0.55rem 1rem",
            fontSize: "0.9rem",
          }}
        >
          + Add payment method
        </button>
      </div>

      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          display: "grid",
          gap: "0.75rem",
        }}
      >
        {methods.map((method) => {
          const statusMeta = getPaymentStatusMeta(method.status);
          const expSoon =
            method.status === "expiring" || method.status === "expired";
          return (
            <li
              key={method.id}
              className={`payment-method-card${expSoon ? ` pm-${method.status}` : ""}`}
              style={{
                padding: "1rem 1.1rem",
                border: `1px solid ${expSoon ? statusMeta.border : "var(--border)"}`,
                borderRadius: "var(--radius-sm)",
                background: expSoon ? statusMeta.bg : "var(--surface)",
                display: "grid",
                gridTemplateColumns: "auto 1fr auto",
                gap: "1rem",
                alignItems: "center",
              }}
            >
              <CardArt method={method} />
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    flexWrap: "wrap",
                  }}
                >
                  <span style={{ fontWeight: 700 }}>
                    {CARD_BRAND_META[method.brand].label}
                  </span>
                  <span
                    style={{
                      fontFamily: "ui-monospace, monospace",
                      fontWeight: 600,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    •••• {method.last4}
                  </span>
                  {method.isDefault && (
                    <span
                      aria-label="Default payment method"
                      style={{
                        fontSize: "0.72rem",
                        fontWeight: 800,
                        padding: "0.15rem 0.5rem",
                        borderRadius: 999,
                        background: "rgba(94, 234, 212, 0.14)",
                        border: "1px solid rgba(94, 234, 212, 0.35)",
                        color: "var(--accent)",
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                      }}
                    >
                      Default
                    </span>
                  )}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.65rem",
                    flexWrap: "wrap",
                    marginTop: "0.35rem",
                  }}
                >
                  <span style={{ color: "var(--muted)", fontSize: "0.88rem" }}>
                    Expires {String(method.expMonth).padStart(2, "0")}/
                    {method.expYear}
                  </span>
                  {expSoon && (
                    <span
                      role={method.status === "expired" ? "alert" : "status"}
                      aria-label={statusMeta.label}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.35rem",
                        fontSize: "0.82rem",
                        fontWeight: 700,
                        color: statusMeta.color,
                      }}
                    >
                      <span aria-hidden="true">{statusMeta.icon}</span>
                      {statusMeta.label}
                      {method.status === "expiring" && (
                        <span style={{ fontWeight: 500 }}>
                          — update to avoid service interruption
                        </span>
                      )}
                    </span>
                  )}
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  flexWrap: "wrap",
                  justifyContent: "flex-end",
                }}
              >
                {!method.isDefault && (
                  <button
                    type="button"
                    onClick={() => setDefault(method.id)}
                    aria-label={`Set ${CARD_BRAND_META[method.brand].label} ending ${method.last4} as default`}
                    style={{
                      ...pagerBtnStyle,
                      minHeight: "2.5rem",
                      padding: "0.45rem 0.9rem",
                    }}
                  >
                    Set default
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removeMethod(method.id)}
                  aria-label={`Remove ${CARD_BRAND_META[method.brand].label} ending ${method.last4}`}
                  disabled={method.isDefault}
                  style={{
                    ...pagerBtnStyle,
                    minHeight: "2.5rem",
                    padding: "0.45rem 0.9rem",
                    color: method.isDefault ? "var(--muted)" : "var(--danger)",
                    borderColor: method.isDefault
                      ? "var(--border)"
                      : "rgba(251, 113, 133, 0.35)",
                  }}
                >
                  Remove
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {showAdd && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-pm-title"
          style={{
            padding: "1rem 1.1rem",
            border: "1px dashed var(--border-strong)",
            borderRadius: "var(--radius-sm)",
            background: "var(--surface-soft)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "1rem",
              marginBottom: "0.75rem",
            }}
          >
            <h4 id="add-pm-title" style={{ margin: 0, fontSize: "0.98rem" }}>
              Add a new payment method
            </h4>
            <button
              type="button"
              aria-label="Cancel adding payment method"
              onClick={() => setShowAdd(false)}
              style={iconBtnStyle}
            >
              ✕
            </button>
          </div>
          <form
            style={{
              display: "grid",
              gap: "0.75rem",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            }}
            onSubmit={(e) => {
              e.preventDefault();
              setShowAdd(false);
            }}
          >
            <div
              style={{ gridColumn: "1 / -1", display: "grid", gap: "0.35rem" }}
            >
              <label
                htmlFor="pm-number"
                style={{ fontSize: "0.88rem", fontWeight: 600 }}
              >
                Card number
              </label>
              <input
                id="pm-number"
                type="text"
                inputMode="numeric"
                placeholder="1234 5678 9012 3456"
                style={inputStyle}
              />
            </div>
            <div style={{ display: "grid", gap: "0.35rem" }}>
              <label
                htmlFor="pm-exp"
                style={{ fontSize: "0.88rem", fontWeight: 600 }}
              >
                Expiration
              </label>
              <input
                id="pm-exp"
                type="text"
                inputMode="numeric"
                placeholder="MM / YY"
                style={inputStyle}
              />
            </div>
            <div style={{ display: "grid", gap: "0.35rem" }}>
              <label
                htmlFor="pm-cvc"
                style={{ fontSize: "0.88rem", fontWeight: 600 }}
              >
                CVC
              </label>
              <input
                id="pm-cvc"
                type="text"
                inputMode="numeric"
                placeholder="123"
                style={inputStyle}
              />
            </div>
            <div
              style={{
                gridColumn: "1 / -1",
                display: "flex",
                justifyContent: "flex-end",
                gap: "0.5rem",
                marginTop: "0.25rem",
              }}
            >
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                style={pagerBtnStyle}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="app-button app-button-primary"
                style={{
                  width: "auto",
                  minHeight: "2.5rem",
                  padding: "0.5rem 1.1rem",
                }}
              >
                Save card
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

// ─── Plan Comparison ─────────────────────────────────────────────────────────

function PlanCard({
  plan,
  isCurrent,
  onSelect,
  selected,
}: {
  plan: PlanMeta;
  isCurrent: boolean;
  onSelect: (id: PlanId) => void;
  selected: PlanId | null;
}) {
  const { currentPlan, billingCycle } = useBilling();
  const price = getPrice(plan, billingCycle);
  const isSelected = selected === plan.id;
  const isDowngrade = !isCurrent && plan.monthlyPrice < currentPlan.monthlyPrice;
  const isUpgrade = !isCurrent && plan.monthlyPrice > currentPlan.monthlyPrice;

  return (
    <div
      role="region"
      aria-label={`${plan.name} plan${plan.recommended ? " (recommended)" : ""}`}
      className={`plan-card${plan.recommended ? " plan-card-recommended" : ""}${isSelected ? " plan-card-selected" : ""}`}
      style={{
        display: "grid",
        gap: "1rem",
        padding: "1.25rem",
        borderRadius: "var(--radius-sm)",
        border: `2px solid ${
          plan.recommended
            ? "var(--accent)"
            : isCurrent
              ? "var(--border-strong)"
              : "var(--border)"
        }`,
        background:
          plan.recommended
            ? "rgba(94, 234, 212, 0.06)"
            : isCurrent
              ? "rgba(96, 165, 250, 0.06)"
              : "var(--surface)",
        position: "relative",
        transition: "border-color 150ms ease, box-shadow 150ms ease",
      }}
    >
      {/* Badges */}
      {isCurrent && (
        <span
          aria-label={`Current plan: ${plan.name}`}
          style={{
            position: "absolute",
            top: "-0.6rem",
            left: "1rem",
            padding: "0.2rem 0.7rem",
            borderRadius: 999,
            background: "var(--surface-strong)",
            border: "1px solid var(--border-strong)",
            color: "var(--accent)",
            fontWeight: 700,
            fontSize: "0.72rem",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          Current plan
        </span>
      )}
      {plan.recommended && !isCurrent && (
        <span
          aria-label="Recommended plan"
          style={{
            position: "absolute",
            top: "-0.6rem",
            right: "1rem",
            padding: "0.2rem 0.7rem",
            borderRadius: 999,
            background: "var(--accent)",
            color: "#04111f",
            fontWeight: 800,
            fontSize: "0.72rem",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          Recommended
        </span>
      )}

      <div>
        <h3 style={{ margin: 0, fontSize: "1.1rem" }}>{plan.name}</h3>
        <p
          style={{
            margin: "0.25rem 0 0",
            color: "var(--muted)",
            fontSize: "0.88rem",
            lineHeight: 1.4,
          }}
        >
          {plan.description}
        </p>
      </div>

      <div>
        <span
          style={{
            fontSize: "1.75rem",
            fontWeight: 800,
            fontVariantNumeric: "tabular-nums",
            color: plan.recommended ? "var(--accent)" : "var(--text)",
          }}
        >
          ${price}
        </span>
        <span style={{ color: "var(--muted)", fontSize: "0.88rem" }}>
          /month
        </span>
      </div>

      {/* Prorated impact when selected and different from current */}
      {isSelected && !isCurrent && (
        <div
          role="status"
          aria-live="polite"
          style={{
            padding: "0.6rem 0.8rem",
            borderRadius: 8,
            background: isUpgrade
              ? "rgba(251, 191, 36, 0.1)"
              : "rgba(52, 211, 153, 0.1)",
            border: `1px solid ${
              isUpgrade
                ? "rgba(251, 191, 36, 0.3)"
                : "rgba(52, 211, 153, 0.3)"
            }`,
            fontSize: "0.85rem",
            display: "grid",
            gap: "0.3rem",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <span style={{ color: "var(--muted)", fontSize: "0.82rem" }}>
              {(() => {
                const impact = formatProratedImpact(currentPlan, plan, billingCycle);
                return impact.label;
              })()}
            </span>
            <span
              style={{
                fontWeight: 700,
                color: isUpgrade ? "var(--warning)" : "var(--success)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {(() => {
                const impact = formatProratedImpact(currentPlan, plan, billingCycle);
                return `${impact.isCredit ? "−" : "+"}${impact.amount}`;
              })()}
            </span>
          </div>
          <div
            style={{
              fontSize: "0.75rem",
              color: "var(--muted)",
            }}
          >
            {isUpgrade
              ? `Upgrade charge prorated for remaining 15 days`
              : `Credit prorated for remaining 15 days`}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => onSelect(plan.id)}
        disabled={isCurrent}
        aria-label={
          isCurrent
            ? `${plan.name} is your current plan`
            : isUpgrade
              ? `Upgrade to ${plan.name} plan`
              : isDowngrade
                ? `Downgrade to ${plan.name} plan`
                : `Switch to ${plan.name} plan`
        }
        style={{
          padding: "0.65rem 1rem",
          borderRadius: 8,
          background: isSelected
            ? "var(--accent)"
            : isCurrent
              ? "var(--surface-strong)"
              : "transparent",
          color:
            isSelected
              ? "#04111f"
              : isCurrent
                ? "var(--muted)"
                : "var(--text)",
          fontWeight: 700,
          fontSize: "0.9rem",
          cursor: isCurrent ? "default" : "pointer",
          border: isCurrent
            ? "1px solid var(--border)"
            : isSelected
              ? "none"
              : "1px solid var(--border)",
          transition: "all 150ms ease",
        }}
      >
        {isCurrent
          ? "Current plan"
          : isSelected
            ? "Selected"
            : isUpgrade
              ? "Upgrade"
              : isDowngrade
                ? "Downgrade"
                : "Switch"}
      </button>
    </div>
  );
}

function PlanComparisonTable({
  selectedPlan,
}: {
  selectedPlan: PlanId | null;
}) {
  const { plan: currentPlanId, billingCycle } = useBilling();
  const isComparing = selectedPlan != null && selectedPlan !== currentPlanId;
  void isComparing;

  return (
    <section aria-labelledby="plan-comparison-heading">
      <h3
        id="plan-comparison-heading"
        style={{ margin: 0, fontSize: "1.05rem" }}
      >
        Plan comparison
      </h3>

      {/* Desktop table */}
      <div
        role="region"
        aria-label="Plan features comparison table"
        style={{ overflowX: "auto", marginTop: "1rem" }}
        className="plan-comparison-table-wrapper"
      >
        <table
          aria-label="Compare plan features across Starter, Growth, and Enterprise tiers"
          style={{
            width: "100%",
            minWidth: 640,
            borderCollapse: "separate",
            borderSpacing: 0,
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            overflow: "hidden",
            background: "var(--surface)",
          }}
        >
          <thead>
            <tr style={{ background: "var(--surface-strong)" }}>
              <th scope="col" style={{ ...thStyle, width: "30%" }}>
                Feature
              </th>
              {PLANS.map((plan) => (
                <th
                  key={plan.id}
                  scope="col"
                  style={{
                    ...thStyle,
                    width: "23.33%",
                    color:
                      plan.id === currentPlanId
                        ? "var(--accent)"
                        : plan.recommended
                          ? "var(--accent)"
                          : "var(--muted)",
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: "0.85rem" }}>
                    {plan.name}
                  </div>
                  <div
                    style={{
                      fontWeight: 400,
                      fontSize: "0.75rem",
                      color: "var(--muted)",
                      marginTop: "0.15rem",
                    }}
                  >
                    ${getPrice(plan, billingCycle)}/{billingCycle === "annual" ? "yr" : "mo"}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PLAN_FEATURES.map((feature, idx) => (
              <tr
                key={feature.label}
                style={{
                  borderTop: "1px solid var(--border)",
                  background:
                    idx % 2 === 0 ? "transparent" : "var(--surface-soft)",
                }}
              >
                <th
                  scope="row"
                  style={{
                    ...tdStyle,
                    fontWeight: 600,
                    fontSize: "0.88rem",
                    textAlign: "left",
                  }}
                >
                  {feature.label}
                </th>
                {PLANS.map((plan) => (
                  <td
                    key={plan.id}
                    style={{
                      ...tdStyle,
                      color:
                        plan.id === currentPlanId
                          ? "var(--accent)"
                          : "var(--text)",
                      fontWeight:
                        plan.id === currentPlanId ? 600 : 400,
                    }}
                  >
                    {typeof feature.values[plan.id] === "boolean" ? (
                      feature.values[plan.id] === true ? (
                        <span
                          aria-label={`${feature.label}: included in ${plan.name}`}
                          style={{ color: "var(--success)" }}
                        >
                          <svg
                            aria-hidden="true"
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </span>
                      ) : (
                        <span
                          aria-label={`${feature.label}: not included in ${plan.name}`}
                          style={{ color: "var(--muted)" }}
                        >
                          —
                        </span>
                      )
                    ) : (
                      <span style={{ fontSize: "0.92rem" }}>
                        {String(feature.values[plan.id])}
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Responsive card layout (visible on narrow viewports via CSS) */}
      <div
        className="plan-comparison-cards"
        style={{
          display: "none",
          marginTop: "1rem",
          gap: "1rem",
        }}
      >
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            style={{
              padding: "1rem",
              borderRadius: "var(--radius-sm)",
              border: `1px solid ${
                plan.id === currentPlanId
                  ? "var(--border-strong)"
                  : "var(--border)"
              }`,
              background: "var(--surface)",
            }}
          >
            <h4
              style={{
                margin: 0,
                fontSize: "1rem",
                color:
                  plan.id === currentPlanId
                    ? "var(--accent)"
                    : "var(--text)",
              }}
            >
              {plan.name}
              {plan.id === currentPlanId && (
                <span
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    color: "var(--accent)",
                    marginLeft: "0.5rem",
                    textTransform: "uppercase",
                  }}
                >
                  (Current)
                </span>
              )}
            </h4>
            <div
              style={{
                fontSize: "1.25rem",
                fontWeight: 800,
                marginTop: "0.5rem",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              ${getPrice(plan, billingCycle)}
              <span style={{ fontSize: "0.85rem", fontWeight: 400, color: "var(--muted)" }}>
                /{billingCycle === "annual" ? "yr" : "mo"}
              </span>
            </div>
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: "0.75rem 0 0",
                display: "grid",
                gap: "0.5rem",
              }}
            >
              {PLAN_FEATURES.map((feature) => (
                <li
                  key={feature.label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "0.5rem",
                    fontSize: "0.85rem",
                    padding: "0.3rem 0",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <span style={{ color: "var(--muted)" }}>
                    {feature.label}
                  </span>
                  <span style={{ fontWeight: 600 }}>
                    {typeof feature.values[plan.id] === "boolean" ? (
                      feature.values[plan.id] === true ? (
                        <span style={{ color: "var(--success)" }}>✓</span>
                      ) : (
                        <span style={{ color: "var(--muted)" }}>—</span>
                      )
                    ) : (
                      String(feature.values[plan.id])
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function PlanComparison() {
  const { plan: currentPlanId, currentPlan, billingCycle, changePlan } = useBilling();
  const [selectedPlan, setSelectedPlan] = useState<PlanId | null>(null);

  return (
    <section
      aria-labelledby="plan-comparison-section-heading"
      style={{ display: "grid", gap: "1.5rem" }}
    >
      <div>
        <h3
          id="plan-comparison-section-heading"
          style={{ margin: 0, fontSize: "1.05rem" }}
        >
          Compare plans
        </h3>
        <p
          style={{
            margin: "0.25rem 0 0",
            color: "var(--muted)",
            fontSize: "0.9rem",
          }}
        >
          See what each plan offers and find the right fit for your team.
          Prorated charges or credits apply when switching mid-cycle.
        </p>
      </div>

      {/* Plan cards */}
      <div
        className="plan-cards-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "1rem",
        }}
      >
        {PLANS.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            isCurrent={plan.id === currentPlanId}
            onSelect={setSelectedPlan}
            selected={selectedPlan}
          />
        ))}
      </div>

      {/* Feature comparison table */}
      <PlanComparisonTable selectedPlan={selectedPlan} />

      {/* Action footer when a plan is selected */}
      {selectedPlan && selectedPlan !== currentPlanId && (
        <div
          role="status"
          aria-live="polite"
          style={{
            padding: "1rem 1.25rem",
            borderRadius: "var(--radius-sm)",
            border: "1px solid rgba(94, 234, 212, 0.3)",
            background: "rgba(94, 234, 212, 0.06)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                fontWeight: 700,
                fontSize: "0.95rem",
                color: "var(--accent)",
              }}
            >
              {(() => {
                const plan = PLANS.find((p) => p.id === selectedPlan)!;
                const isUpgrade = plan.monthlyPrice > currentPlan.monthlyPrice;
                return isUpgrade
                  ? `Ready to upgrade to ${plan.name}?`
                  : `Ready to downgrade to ${plan.name}?`;
              })()}
            </div>
            <div style={{ fontSize: "0.85rem", color: "var(--muted)", marginTop: "0.2rem" }}>
              Changes will apply to your next billing cycle.{" "}
              {(() => {
                const plan = PLANS.find((p) => p.id === selectedPlan)!;
                const impact = formatProratedImpact(currentPlan, plan, billingCycle);
                return `${impact.label}: ${impact.isCredit ? "−" : "+"}${impact.amount}`;
              })()}
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => setSelectedPlan(null)}
              style={{
                padding: "0.55rem 1rem",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "transparent",
                color: "var(--text)",
                fontWeight: 600,
                fontSize: "0.88rem",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                changePlan(selectedPlan);
                setSelectedPlan(null);
              }}
              className="app-button app-button-primary"
              style={{
                width: "auto",
                minHeight: "2.75rem",
                padding: "0.55rem 1.25rem",
                fontSize: "0.9rem",
              }}
            >
              {(() => {
                const plan = PLANS.find((p) => p.id === selectedPlan)!;
                const isUpgrade = plan.monthlyPrice > currentPlan.monthlyPrice;
                return `Confirm ${isUpgrade ? "upgrade" : "downgrade"}`;
              })()}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function BillingPanel() {
  const { currentPlan, billingCycle } = useBilling();
  const price = getPrice(currentPlan, billingCycle);
  const periodUnit = billingCycle === "annual" ? "year" : "month";

  return (
    <div style={{ display: "grid", gap: "2rem" }}>
      <div>
        <h2>Billing</h2>
        <p style={{ color: "var(--muted)" }}>
          Manage your subscription plan, payment methods, and invoices.
        </p>
        <dl
          style={{
            display: "grid",
            gridTemplateColumns: "max-content 1fr",
            gap: "0.5rem 1.5rem",
            maxWidth: 480,
            marginTop: "1.25rem",
          }}
        >
          <dt style={{ color: "var(--muted)", fontSize: "0.9rem" }}>Plan</dt>
          <dd style={{ margin: 0, fontWeight: 600 }}>{currentPlan.name}</dd>
          <dt style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
            Next billing date
          </dt>
          <dd style={{ margin: 0 }}>July 15, 2026</dd>
          <dt style={{ color: "var(--muted)", fontSize: "0.9rem" }}>Amount</dt>
          <dd
            style={{
              margin: 0,
              fontWeight: 700,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {formatCurrency(price)} / {periodUnit}
          </dd>
        </dl>
      </div>

      <PlanComparison />

      <hr
        style={{
          border: "none",
          borderTop: "1px solid var(--border)",
          margin: 0,
          opacity: 0.5,
        }}
      />

      <PaymentMethodsPanel />

      <hr
        style={{
          border: "none",
          borderTop: "1px solid var(--border)",
          margin: 0,
          opacity: 0.5,
        }}
      />

      <InvoiceList />
    </div>
  );
}

interface ActiveSession {
  id: string;
  device: string;
  browser: string;
  ip: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
}

const MOCK_SESSIONS: ActiveSession[] = [
  {
    id: "s1",
    device: 'MacBook Pro 14"',
    browser: "Chrome 125",
    ip: "203.0.113.42",
    location: "Lagos, NG",
    lastActive: "Now",
    isCurrent: true,
  },
  {
    id: "s2",
    device: "iPhone 15 Pro",
    browser: "Safari 18",
    ip: "203.0.113.42",
    location: "Lagos, NG",
    lastActive: "2 hours ago",
    isCurrent: false,
  },
  {
    id: "s3",
    device: "Windows PC",
    browser: "Firefox 128",
    ip: "198.51.100.77",
    location: "Accra, GH",
    lastActive: "3 days ago",
    isCurrent: false,
  },
  {
    id: "s4",
    device: "Android Tablet",
    browser: "Chrome 124",
    ip: "192.0.2.150",
    location: "Nairobi, KE",
    lastActive: "2 weeks ago",
    isCurrent: false,
  },
];

function SessionRow({
  session,
  onRevoke,
}: {
  session: ActiveSession;
  onRevoke: (id: string) => void;
}) {
  const [revoking, setRevoking] = useState(false);

  const handleRevoke = () => {
    setRevoking(true);
    setTimeout(() => {
      onRevoke(session.id);
      setRevoking(false);
    }, 400);
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "0.75rem",
        padding: "0.75rem 1rem",
        borderRadius: 10,
        border: `1px solid ${session.isCurrent ? "var(--border-strong)" : "var(--border)"}`,
        background: session.isCurrent
          ? "rgba(94, 234, 212, 0.06)"
          : "transparent",
      }}
    >
      <div style={{ display: "grid", gap: "0.2rem", minWidth: 0 }}>
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            fontWeight: 600,
            fontSize: "0.9rem",
          }}
        >
          {session.device}
          {session.isCurrent ? (
            <span
              style={{
                fontSize: "0.7rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "var(--accent)",
                border: "1px solid var(--border-strong)",
                borderRadius: 4,
                padding: "0.1rem 0.4rem",
              }}
            >
              Current
            </span>
          ) : null}
        </span>
        <span style={{ color: "var(--muted)", fontSize: "0.8rem" }}>
          {session.browser} · {session.ip} · {session.location}
        </span>
        <span style={{ color: "var(--muted)", fontSize: "0.75rem" }}>
          Active {session.lastActive}
        </span>
      </div>
      {!session.isCurrent ? (
        <button
          type="button"
          onClick={handleRevoke}
          disabled={revoking}
          style={{
            padding: "0.35rem 0.75rem",
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: revoking ? "var(--danger)" : "transparent",
            color: revoking ? "#fff" : "var(--danger)",
            fontWeight: 600,
            fontSize: "0.8rem",
            cursor: "pointer",
            whiteSpace: "nowrap",
            transition: "background 0.15s, color 0.15s",
          }}
        >
          {revoking ? "Revoking…" : "Revoke"}
        </button>
      ) : (
        <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
          This device
        </span>
      )}
    </div>
  );
}

function SignOutAllButton() {
  const [confirming, setConfirming] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  if (confirming) {
    return (
      <div
        style={{
          padding: "1rem",
          borderRadius: 12,
          border: "1px solid rgba(248, 113, 113, 0.3)",
          background: "rgba(248, 113, 113, 0.06)",
          display: "grid",
          gap: "0.75rem",
        }}
      >
        <p style={{ margin: 0, fontWeight: 700, color: "var(--danger)" }}>
          Sign out of all other sessions?
        </p>
        <p
          style={{
            margin: 0,
            fontSize: "0.85rem",
            color: "var(--muted)",
            lineHeight: 1.5,
          }}
        >
          This will revoke all active sessions except your current device. You
          will need to sign back in on those devices.
        </p>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            type="button"
            onClick={() => {
              setSigningOut(true);
              setTimeout(() => setConfirming(false), 800);
            }}
            disabled={signingOut}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: 8,
              border: "none",
              background: signingOut ? "var(--muted)" : "var(--danger)",
              color: "#fff",
              fontWeight: 700,
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            {signingOut ? "Signing out…" : "Yes, sign out"}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={signingOut}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text)",
              fontWeight: 600,
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      style={{
        padding: "0.5rem 1rem",
        borderRadius: 8,
        border: "1px solid var(--border)",
        background: "transparent",
        color: "var(--danger)",
        fontWeight: 700,
        fontSize: "0.85rem",
        cursor: "pointer",
      }}
    >
      Sign out of all other sessions
    </button>
  );
}

function SecurityPanel() {
  const registry = useDirtyRegistry();
  const [sessions, setSessions] = useState(MOCK_SESSIONS);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmTouched, setConfirmTouched] = useState(false);
  const passwordPolicyId = useId();
  const confirmPasswordId = useId();

  const pwForm = useDirtyForm({
    storageKey: "veritasor_settings_security_draft",
    initialValues: {
      currentPassword: "",
      newPassword: "",
    },
    autoSave: false,
    onSave: async (v) => {
      await new Promise((r) => setTimeout(r, 500));
      void v;
    },
  });
  const passwordPolicy = validatePassword(pwForm.values.newPassword);
  const passwordsMatch = pwForm.values.newPassword === confirmPassword;
  const showConfirmError = confirmTouched && !passwordsMatch;
  const canSubmitPassword =
    pwForm.isDirty &&
    passwordPolicy.valid &&
    passwordsMatch &&
    pwForm.saveStatus !== "saving";

  useEffect(() => {
    registry.register("security", {
      isDirty: pwForm.isDirty,
      saveStatus: pwForm.saveStatus,
      lastSavedAt: pwForm.lastSavedAt,
      save: pwForm.save,
      reset: pwForm.reset,
    });
    return () => registry.unregister("security");
  }, [
    registry.register,
    registry.unregister,
    pwForm.isDirty,
    pwForm.saveStatus,
    pwForm.lastSavedAt,
    pwForm.save,
    pwForm.reset,
  ]);

  const handleRevoke = useCallback((id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  async function handlePwSubmit(e: React.FormEvent) {
    e.preventDefault();
    setConfirmTouched(true);
    if (!passwordPolicy.valid || !passwordsMatch) return;
    await pwForm.save();
  }

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <DirtyStateBanner
        isDirty={pwForm.isDirty}
        saveStatus={pwForm.saveStatus}
        lastSavedAt={pwForm.lastSavedAt}
        onSave={pwForm.save}
        onDiscard={pwForm.reset}
        formLabel="Security"
      />
      <div>
        <h2>Security</h2>
        <p style={{ color: "var(--muted)" }}>
          Update your password and manage two-factor authentication.
        </p>
        <form
          style={{ display: "grid", gap: "1rem", maxWidth: 480 }}
          onSubmit={handlePwSubmit}
        >
          <div style={{ display: "grid", gap: "0.4rem" }}>
            <label htmlFor="current-password" style={{ fontSize: "0.9rem", fontWeight: 600 }}>
              Current password
            </label>
            <input
              id="current-password"
              type="password"
              value={pwForm.values.currentPassword}
              onChange={(e) => pwForm.setField("currentPassword", e.target.value)}
              style={{
                padding: "0.6rem 0.8rem",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--surface-strong)",
                color: "var(--text)",
                fontSize: "0.95rem",
              }}
            />
          </div>
          <div style={{ display: "grid", gap: "0.4rem" }}>
            <label htmlFor="new-password" style={{ fontSize: "0.9rem", fontWeight: 600 }}>
              New password
            </label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={pwForm.values.newPassword}
              onChange={(e) => pwForm.setField("newPassword", e.target.value)}
              aria-describedby={passwordPolicyId}
              style={{
                padding: "0.6rem 0.8rem",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--surface-strong)",
                color: "var(--text)",
                fontSize: "0.95rem",
              }}
            />
          </div>
          <ul
            id={passwordPolicyId}
            style={{ margin: 0, paddingLeft: "1.25rem", color: "var(--muted)", fontSize: "0.85rem" }}
            aria-label="Password requirements"
          >
            {passwordPolicy.failures.length > 0 ? (
              passwordPolicy.failures.map((failure) => (
                <li key={failure}>{failure}</li>
              ))
            ) : (
              <li>Password meets all requirements.</li>
            )}
          </ul>
          <div style={{ display: "grid", gap: "0.4rem" }}>
            <label htmlFor="confirm-new-password" style={{ fontSize: "0.9rem", fontWeight: 600 }}>
              Confirm new password
            </label>
            <input
              id="confirm-new-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setConfirmTouched(true);
              }}
              aria-describedby={confirmPasswordId}
              aria-invalid={showConfirmError ? "true" : undefined}
              style={{
                padding: "0.6rem 0.8rem",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--surface-strong)",
                color: "var(--text)",
                fontSize: "0.95rem",
              }}
            />
            {showConfirmError ? (
              <span id={confirmPasswordId} role="alert" style={{ color: "var(--danger)", fontSize: "0.85rem" }}>
                Passwords do not match.
              </span>
            ) : (
              <span id={confirmPasswordId} style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
                Confirm your new password.
              </span>
            )}
          </div>
          <button
            type="submit"
            disabled={!canSubmitPassword}
            aria-busy={pwForm.saveStatus === "saving"}
            style={{
              alignSelf: "start",
              padding: "0.6rem 1.25rem",
              borderRadius: 8,
              border: "none",
              background: "var(--accent)",
              color: "#04111f",
              fontWeight: 700,
              cursor: canSubmitPassword ? "pointer" : "default",
              fontSize: "0.95rem",
              opacity: canSubmitPassword ? 1 : 0.6,
              minHeight: "2.75rem",
            }}
          >
            {pwForm.saveStatus === "saving" ? "Saving…" : "Update password"}
          </button>
        </form>

      <hr style={{ margin: 0, borderColor: "var(--border)", opacity: 0.5 }} />

      <MfaManagementPanel />

      {/* Active sessions */}
      <hr style={{ margin: 0, borderColor: "var(--border)", opacity: 0.5 }} />
      <section aria-labelledby="active-sessions-title">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
            marginBottom: "1rem",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h3
              id="active-sessions-title"
              style={{ margin: 0, fontSize: "1.05rem" }}
            >
              Active sessions
            </h3>
            <p
              style={{
                margin: "0.15rem 0 0",
                color: "var(--muted)",
                fontSize: "0.85rem",
              }}
            >
              {sessions.length} active session{sessions.length !== 1 ? "s" : ""}
            </p>
          </div>
          {sessions.filter((s) => !s.isCurrent).length > 0 ? (
            <SignOutAllButton />
          ) : null}
        </div>
        <div style={{ display: "grid", gap: "0.5rem", maxWidth: 600 }}>
          {sessions.map((session) => (
            <SessionRow
              key={session.id}
              session={session}
              onRevoke={handleRevoke}
            />
          ))}
        </div>
        {sessions.length === 0 ? (
          <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
            No active sessions found.
          </p>
        ) : null}
      </section>
    </div>
    </div>
  );
}

function WebhooksPanel() {
  const { endpoints, deliveries } = useWebhooks();
  const [statusFilter, setStatusFilter] = useState<"all" | "delivered" | "failed" | "retrying">("all");
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [rotation, setRotation] = useState<{
    endpointId: string;
    oldSecret: RotatingSecret;
    newSecret: RotatingSecret;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleCreate(data: { url: string; description: string; events: string[] }) {
    try {
      const created = webhooksStore.createEndpoint(data);
      setCreatedSecret(created.signingSecret);
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to create webhook endpoint.');
    }
  }

  function handleRetry(id: string) {
    if (!webhooksStore.retryDelivery(id)) return;
    window.setTimeout(() => {
      webhooksStore.completeRetry(id, {
        statusCode: null,
        error: 'Retry transport is not configured in this frontend.',
      });
    }, 1000);
  }

  return (
    <div>
      <h2>Webhooks</h2>
      <p style={{ color: "var(--muted)" }}>
        Manage secure endpoints and review persistent delivery history.
      </p>
      {error && <p role="alert" style={{ color: "var(--danger)" }}>{error}</p>}
      {createdSecret && (
        <div role="status" style={{ marginTop: "1rem", padding: "1rem", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)" }}>
          <strong>Save this signing secret now; it will not be shown again.</strong>
          <p><code>{createdSecret}</code></p>
          <button type="button" className="app-button app-button-secondary" onClick={() => setCreatedSecret(null)}>Dismiss</button>
        </div>
      )}
      <section aria-labelledby="webhook-endpoints-heading" style={{ marginTop: "1.5rem" }}>
        <h3 id="webhook-endpoints-heading">Endpoints</h3>
        <WebhookCreateForm
          existingUrls={endpoints.map((endpoint) => endpoint.url)}
          onSubmit={handleCreate}
        />
        <div style={{ display: "grid", gap: "0.75rem", maxWidth: 900, marginTop: "1.25rem" }}>
          {endpoints.map((endpoint) => (
            <article key={endpoint.id} style={{ padding: "1rem", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)" }}>
              <strong>{endpoint.description || endpoint.url}</strong>
              {endpoint.description && <p style={{ margin: "0.25rem 0", color: "var(--muted)" }}>{endpoint.url}</p>}
              <p style={{ margin: "0.5rem 0", color: "var(--muted)", fontSize: "var(--text-sm)" }}>
                {endpoint.enabled ? "Enabled" : "Disabled"} · {endpoint.events.join(", ")} · Signing secret {endpoint.signingSecretMasked}
              </p>
              {endpoint.previousSecretExpiresAt && (
                <p style={{ color: "var(--muted)", fontSize: "var(--text-sm)" }}>
                  Previous secret valid until <time dateTime={endpoint.previousSecretExpiresAt}>{new Date(endpoint.previousSecretExpiresAt).toLocaleString()}</time>
                </p>
              )}
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="app-button app-button-secondary"
                  disabled={!endpoint.enabled}
                  onClick={() => webhooksStore.disableEndpoint(endpoint.id)}
                >
                  Disable endpoint
                </button>
                <button
                  type="button"
                  className="app-button app-button-secondary"
                  disabled={!endpoint.enabled}
                  onClick={() => {
                    try {
                      setRotation({ endpointId: endpoint.id, ...webhooksStore.rotateSecret(endpoint.id) });
                      setError(null);
                    } catch (reason) {
                      setError(reason instanceof Error ? reason.message : 'Unable to rotate signing secret.');
                    }
                  }}
                >
                  Rotate secret
                </button>
              </div>
            </article>
          ))}
          {endpoints.length === 0 && <p style={{ color: "var(--muted)" }}>No webhook endpoints configured.</p>}
        </div>
      </section>
      <section aria-labelledby="webhook-deliveries-heading" style={{ marginTop: "2rem" }}>
        <h3 id="webhook-deliveries-heading">Delivery history</h3>
        <label htmlFor="webhook-delivery-status">Filter by status</label>{" "}
        <select
          id="webhook-delivery-status"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
        >
          <option value="all">All statuses</option>
          <option value="delivered">Delivered</option>
          <option value="failed">Failed</option>
          <option value="retrying">Retrying</option>
        </select>
      <div
        style={{
          marginTop: "1.5rem",
          maxWidth: 900,
          display: "grid",
          gap: "1rem",
        }}
      >
        {deliveries.filter((delivery) => statusFilter === "all" || delivery.status === statusFilter).map((delivery) => (
          <WebhookRetryPanel
            key={delivery.id}
            delivery={delivery}
            onRetry={handleRetry}
            isRetrying={delivery.status === "retrying"}
          />
        ))}
      </div>
      {deliveries.filter((delivery) => statusFilter === "all" || delivery.status === statusFilter).length === 0 && (
        <p style={{ color: "var(--muted)" }}>No deliveries match this status.</p>
      )}
      </section>
      {rotation && (
        <WebhookSecretRotationDialog
          open
          endpointLabel={endpoints.find((endpoint) => endpoint.id === rotation.endpointId)?.url ?? "Webhook endpoint"}
          oldSecret={rotation.oldSecret}
          newSecret={rotation.newSecret}
          onConfirm={() => setRotation(null)}
          onCancelRotation={() => {
            webhooksStore.cancelRotation(rotation.endpointId);
            setRotation(null);
          }}
          onClose={() => setRotation(null)}
        />
      )}
    </div>
  );
}

function TokensPanel() {
  return (
    <div>
      <h2>Design tokens</h2>
      <p style={{ color: "var(--muted)" }}>
        Review theme changes, then export a snapshot of Veritasor design tokens as CSS custom properties.
      </p>
      <div style={{ marginTop: "1.5rem", maxWidth: 1100, display: "grid", gap: "1.5rem" }}>
        <TokensDiffViewer />
        <TokensExport />
      </div>
    </div>
  );
}

const MOCK_AUDIT_ENTRIES: AuditLogEntry[] = [
  {
    id: "1",
    timestamp: "2026-07-28T08:12:00Z",
    event: "Attestation completed",
    details: "Merkle root: 0x7f...3a",
  },
  {
    id: "2",
    timestamp: "2026-07-28T08:14:00Z",
    event: "Attestation completed",
    details: "Merkle root: 0x7f...3a",
  },
  {
    id: "3",
    timestamp: "2026-07-28T08:15:00Z",
    event: "Attestation completed",
    details: "Merkle root: 0x7f...3a",
  },
  {
    id: "4",
    timestamp: "2026-07-28T09:00:00Z",
    event: "Revenue source connected",
    details: "Provider: Stripe",
  },
  {
    id: "5",
    timestamp: "2026-07-27T14:30:00Z",
    event: "Attestation failed",
    details: "Timeout after 30s",
  },
  {
    id: "6",
    timestamp: "2026-07-27T14:31:00Z",
    event: "Attestation failed",
    details: "Timeout after 30s",
  },
  {
    id: "7",
    timestamp: "2026-07-27T14:32:00Z",
    event: "Attestation failed",
    details: "Timeout after 30s",
  },
  {
    id: "8",
    timestamp: "2026-07-27T14:33:00Z",
    event: "Attestation failed",
    details: "Timeout after 30s",
  },
  {
    id: "9",
    timestamp: "2026-07-26T10:00:00Z",
    event: "API key rotated",
  },
];

function AuditLogPanel() {
  const intl = useIntl();
  const handleFetchDetail = useCallback(async (id: string) => {
    return auditLogApi.getAuditEventDetail(id);
  }, []);
  return (
    <div>
      <h2>{intl.formatMessage({ id: 'auditLog.filters.title', defaultMessage: 'Audit Log' })}</h2>
      <p style={{ color: "var(--muted)" }}>
        Recent activity for this workspace. Click any event to view full
        request/response detail. In compact density mode, identical consecutive
        events are grouped by day and collapsed into summary badges.
      </p>
      <div style={{ marginTop: "1.5rem", maxWidth: 800 }}>
        <AuditLogTimeline
          entries={MOCK_AUDIT_ENTRIES}
          onFetchDetail={handleFetchDetail}
        />
      </div>
    </div>
  );
}

// Team management is implemented in src/components/team/.

function AppearancePanel() {
  const workspaceCtx = useOptionalWorkspace()
  const workspace = workspaceCtx?.activeWorkspaceId ?? 'default-workspace'

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <div>
        <h2>Appearance</h2>
        <p style={{ color: "var(--muted)" }}>
          Customise the look and feel of your dashboard.
        </p>
      </div>

      {/* ── Density ───────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gap: "1rem",
          padding: "1.25rem",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-sm)",
          background: "var(--surface)",
          maxWidth: 600,
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: "1rem" }}>Display density</h3>
          <p
            style={{
              margin: "0.25rem 0 0",
              color: "var(--muted)",
              fontSize: "0.88rem",
            }}
          >
            Control the spacing and information density of data-heavy views.
          </p>
        </div>
        <DensityToggle workspace={workspace} />
        <p
          style={{
            margin: 0,
            color: "var(--muted)",
            fontSize: "0.82rem",
            lineHeight: 1.5,
          }}
        >
          Your preference is saved locally and synced to the cloud when you are
          signed in. Changes take effect immediately.
        </p>
      </div>
    </div>
  )
}

const PANELS: Record<TabId, () => JSX.Element> = {
  profile: ProfilePanel,
  business: BusinessProfilePanel,
  notifications: NotificationsPanel,
  appearance: AppearancePanel,
  team: ExtractedTeamPanel,
  integrations: SettingsIntegrationsPanel,
  webhooks: WebhooksPanel,
  "api-keys": ApiKeysPanel,
  tokens: TokensPanel,
  billing: BillingPanel,
  security: SecurityPanel,
  "audit-log": AuditLogPanel,
  "a11y-audit": () => <A11yAuditPanel />,
};

// ─── Unsaved Changes Navigation Guard ─────────────────────────────────────────

type LeaveAction = { kind: "external" } | { kind: "tab"; target: TabId };

function leaveActionToText(action: LeaveAction): string {
  if (action.kind === "external") return "this page";
  const label = TABS.find((t) => t.id === action.target)?.label;
  return `the ${label ?? action.target} section`;
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export default function Settings() {
  const location = useLocation();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<Map<TabId, DirtyTabEntry>>(() => new Map());
  const register = useCallback((tab: TabId, entry: DirtyTabEntry) => {
    setEntries((current) => new Map(current).set(tab, entry));
  }, []);
  const unregister = useCallback((tab: TabId) => {
    setEntries((current) => {
      if (!current.has(tab)) return current;
      const next = new Map(current);
      next.delete(tab);
      return next;
    });
  }, []);
  const registry = useMemo<DirtyRegistryCtx>(
    () => ({ entries, register, unregister }),
    [entries, register, unregister],
  );
  const pageState = usePageDirtyState(registry);
  const blocker = useBlocker(pageState.anyDirty);
  const [activeTab, setActiveTab] = useState<TabId>(() =>
    getTabFromHash(location.hash),
  );
  const [pendingLeave, setPendingLeave] = useState<LeaveAction | null>(null);
  const [leaveSaveError, setLeaveSaveError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const sheetRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const srAnnounceRef = useRef<HTMLDivElement>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);
  const cancelLeave = useCallback(() => {
    setPendingLeave(null);
    if (blocker.state === "blocked") blocker.reset();
    setLeaveSaveError(null);
  }, [blocker]);

  useEffect(() => {
    if (blocker.state === "blocked") {
      const nextLocation = blocker.location;
      const target = nextLocation.pathname === location.pathname
        ? getTabFromHash(nextLocation.hash)
        : null;
      setPendingLeave(
        target && target !== activeTab
          ? { kind: "tab", target }
          : { kind: "external" },
      );
      if (srAnnounceRef.current) {
        srAnnounceRef.current.textContent =
          "Warning: you have unsaved changes. A dialog is open to confirm leaving the page.";
      }
    }
  }, [blocker, location.pathname, activeTab]);

  useEffect(() => {
    if (pendingLeave !== null) {
      prevFocusRef.current = document.activeElement as HTMLElement | null;
      queueMicrotask(() => dialogRef.current?.focus());
    } else if (prevFocusRef.current) {
      const el = prevFocusRef.current;
      queueMicrotask(() => el.focus());
      prevFocusRef.current = null;
    }
  }, [pendingLeave]);

  useEffect(() => {
    if (pendingLeave === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        cancelLeave();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [pendingLeave, cancelLeave]);

  async function saveAllAndLeave(action: LeaveAction) {
    setLeaveSaveError(null);
    try {
      await pageState.saveAll();
    } catch (error) {
      setLeaveSaveError(
        error instanceof Error ? error.message : "Unable to save your changes.",
      );
      return;
    }
    setPendingLeave(null);
    if (blocker.state === "blocked") {
      blocker.proceed();
    } else if (action.kind === "tab") {
      setActiveTab(action.target);
      navigate(`/settings#${action.target}`, { replace: true });
    }
    setLeaveSaveError(null);
  }

  function discardAndLeave(action: LeaveAction) {
    pageState.discardAll();
    setPendingLeave(null);
    setLeaveSaveError(null);
    if (blocker.state === "blocked") {
      blocker.proceed();
    } else if (action.kind === "tab") {
      setActiveTab(action.target);
      navigate(`/settings#${action.target}`, { replace: true });
    }
  }

  // ── Sync tab with hash ────────────────────────────────────────────────

  useEffect(() => {
    const next = getTabFromHash(location.hash);
    if (next !== activeTab && pageState.anyDirty) {
      const was = history.state;
      history.replaceState(was, "", `#${activeTab}`);
      setPendingLeave({ kind: "tab", target: next });
      if (srAnnounceRef.current) {
        srAnnounceRef.current.textContent = `Warning: you have unsaved changes. Confirm switching to ${leaveActionToText(
          { kind: "tab", target: next },
        )}.`;
      }
    } else if (next !== activeTab) {
      setActiveTab(next);
    }
  }, [location.hash, activeTab, pageState.anyDirty]);

  useEffect(() => {
    if (!sheetOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSheetOpen(false)
        document.getElementById('settings-sheet-trigger')?.focus()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [sheetOpen])

  const selectTab = useCallback(
    (id: TabId) => {
      if (id === activeTab) return;
      if (pageState.anyDirty) {
        setPendingLeave({ kind: "tab", target: id });
        if (srAnnounceRef.current) {
          const label = TABS.find((t) => t.id === id)?.label;
          srAnnounceRef.current.textContent = `Warning: you have unsaved changes. Confirm switching to the ${label} section.`;
        }
      } else {
        setActiveTab(id);
        navigate(`/settings#${id}`, { replace: true });
      }
    },
    [activeTab, navigate, pageState.anyDirty],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, currentIndex: number) => {
      let next = currentIndex;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        next = (currentIndex + 1) % TABS.length;
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        next = (currentIndex - 1 + TABS.length) % TABS.length;
      } else if (e.key === "Home") {
        e.preventDefault();
        next = 0;
      } else if (e.key === "End") {
        e.preventDefault();
        next = TABS.length - 1;
      } else {
        return;
      }
      tabRefs.current[next]?.focus();
      selectTab(TABS[next].id);
    },
    [selectTab],
  );

  const activeLabel = TABS.find((t) => t.id === activeTab)?.label ?? 'Settings'
  const dirtyTabLabels: string[] = [];
  const Panel = PANELS[activeTab]

  return (
    <DirtyRegistryContext.Provider value={registry}>
      <div>
        <div
          ref={srAnnounceRef}
          role="status"
          aria-live="assertive"
          aria-atomic="true"
          tabIndex={-1}
          className="sr-only"
        />
        <h1 style={{ marginTop: 0 }}>Settings</h1>

      {/* Mobile: bottom-sheet trigger */}
      <button
        id="settings-sheet-trigger"
        type="button"
        className="settings-tab-select"
        aria-haspopup="listbox"
        aria-expanded={sheetOpen}
        onClick={() => setSheetOpen(true)}
        style={{
          width: "100%",
          padding: "0.6rem 0.8rem",
          borderRadius: 8,
          border: '1px solid var(--border)',
          background: 'var(--surface-strong)',
          color: 'var(--text)',
          fontSize: '0.95rem',
          marginBottom: '1.5rem',
          textAlign: 'left',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span>{activeLabel}</span>
        <span aria-hidden="true" style={{ fontSize: '0.8rem' }}>▼</span>
      </button>

      {/* Bottom sheet */}
      {sheetOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Settings sections"
          ref={sheetRef}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
          }}
        >
          <div
            aria-hidden="true"
            onClick={() => setSheetOpen(false)}
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }}
          />
          <div
            style={{
              position: 'relative',
              background: 'var(--surface)',
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              padding: '1rem 0 2rem',
              maxHeight: '70vh',
              overflowY: 'auto',
              animation: 'slideUp 0.2s ease-out',
            }}
          >
            <div
              style={{
                width: 40,
                height: 4,
                background: 'var(--border)',
                borderRadius: 2,
                margin: '0 auto 1rem',
              }}
            />
            <ul role="listbox" aria-label="Settings sections" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {TABS.map((tab) => (
                <li key={tab.id} role="option" aria-selected={tab.id === activeTab}>
                  <button
                    type="button"
                    onClick={() => { selectTab(tab.id); setSheetOpen(false) }}
                    style={{
                      width: '100%',
                      padding: '0.8rem 1.2rem',
                      border: 'none',
                      background: tab.id === activeTab ? 'var(--surface-strong)' : 'transparent',
                      color: tab.id === activeTab ? 'var(--accent)' : 'var(--text)',
                      fontSize: '1rem',
                      fontWeight: tab.id === activeTab ? 600 : 400,
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    {tab.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Desktop: tablist */}
        <div
          role="tablist"
          aria-label="Settings tabs"
          className="settings-tablist"
          style={{
            display: "flex",
            gap: "0",
            borderBottom: "2px solid var(--border)",
            marginBottom: "1.5rem",
            overflowX: "auto",
          }}
        >
          {TABS.map((tab, index) => {
            const isActive = tab.id === activeTab;
            const dirty = registry.entries.get(tab.id)?.isDirty ?? false;
            return (
              <button
                key={tab.id}
                ref={(el) => {
                  tabRefs.current[index] = el;
                }}
                role="tab"
                id={`tab-${tab.id}`}
                aria-controls={`panel-${tab.id}`}
                aria-selected={isActive}
                tabIndex={isActive ? 0 : -1}
                type="button"
                onClick={() => selectTab(tab.id)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                style={{
                  padding: "0.6rem 1.1rem",
                  background: "transparent",
                  border: "none",
                  borderBottom: isActive
                    ? "2px solid var(--accent)"
                    : "2px solid transparent",
                  marginBottom: -2,
                  color: isActive ? "var(--accent)" : "var(--muted)",
                  fontWeight: isActive ? 700 : 400,
                  fontSize: "0.95rem",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "color 0.15s, border-color 0.15s",
                  position: "relative",
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.35rem",
                  }}
                >
                  {tab.label}
                  {dirty && (
                    <span
                      aria-hidden="true"
                      title="Unsaved changes"
                      style={{
                        width: "0.45rem",
                        height: "0.45rem",
                        borderRadius: "50%",
                        background: "var(--warning)",
                        flexShrink: 0,
                      }}
                    />
                  )}
                  {dirty && <span className="sr-only">unsaved changes</span>}
                </span>
              </button>
            );
          })}
        </div>

        {TABS.map((tab) => {
          const isActive = tab.id === activeTab;
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
          );
        })}
      </div>

      {pendingLeave !== null && (
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- backdrop click cancels leave; Escape key is handled via keydown listener
        <div
          className="modal-backdrop"
          onClick={cancelLeave}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(2, 6, 23, 0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "1rem",
          }}
        >
          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- stops click propagation from dialog to backdrop */}
          <div
            ref={dialogRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="leave-warning-title"
            aria-describedby="leave-warning-desc leave-warning-tabs"
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 440,
              background: "var(--surface)",
              border: "1px solid var(--border-strong)",
              borderRadius: "var(--radius-sm)",
              boxShadow: "0 24px 48px rgba(2, 6, 23, 0.5)",
              padding: "1.25rem 1.25rem 1rem",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: "0.75rem",
                marginBottom: "0.75rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: "2.25rem",
                    height: "2.25rem",
                    borderRadius: "50%",
                    background: "var(--warning-soft)",
                    border: "1px solid rgba(251, 191, 36, 0.4)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--warning)",
                    fontWeight: 800,
                    fontSize: "1rem",
                  }}
                >
                  !
                </span>
                <h2
                  id="leave-warning-title"
                  style={{ margin: 0, fontSize: "1.05rem" }}
                >
                  Leave with unsaved changes?
                </h2>
              </div>
              <button
                type="button"
                onClick={cancelLeave}
                aria-label="Close dialog, stay on page"
                title="Press Escape to dismiss"
                style={{
                  minWidth: "2.25rem",
                  minHeight: "2.25rem",
                  padding: "0.3rem",
                  borderRadius: 8,
                  border: "none",
                  background: "transparent",
                  color: "var(--muted)",
                  fontSize: "1rem",
                  cursor: "pointer",
                }}
              >
                <span aria-hidden="true">✕</span>
              </button>
            </div>
            <p
              id="leave-warning-desc"
              style={{
                margin: "0 0 0.5rem",
                fontSize: "0.93rem",
                color: "var(--text)",
                lineHeight: 1.5,
              }}
            >
              You have unsaved changes. If you leave{" "}
              <strong>{leaveActionToText(pendingLeave)}</strong>, your edits{" "}
              {pendingLeave.kind === "external"
                ? "will be saved as a local draft and may be lost if you clear browser storage."
                : "will remain as a local draft."}
            </p>
            {leaveSaveError && (
              <p role="alert" style={{ color: "var(--danger)", margin: "0 0 1rem" }}>
                {leaveSaveError}
              </p>
            )}
            {dirtyTabLabels.length > 0 && (
              <ul
                id="leave-warning-tabs"
                style={{
                  margin: "0 0 1rem",
                  paddingLeft: "1.2rem",
                  fontSize: "0.88rem",
                  color: "var(--muted)",
                }}
              >
                {dirtyTabLabels.map((label) => (
                  <li key={label}>{label}</li>
                ))}
              </ul>
            )}
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                justifyContent: "flex-end",
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                onClick={cancelLeave}
                style={{
                  minHeight: "2.5rem",
                  padding: "0.5rem 1rem",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "transparent",
                  color: "var(--text)",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Stay
              </button>
              <button
                type="button"
                onClick={() => discardAndLeave(pendingLeave)}
                style={{
                  minHeight: "2.5rem",
                  padding: "0.5rem 1rem",
                  borderRadius: 8,
                  border: "1px solid rgba(251, 113, 133, 0.4)",
                  background: "rgba(251, 113, 133, 0.08)",
                  color: "var(--danger)",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Discard & leave
              </button>
              <button
                type="button"
                onClick={() => saveAllAndLeave(pendingLeave)}
                style={{
                  minHeight: "2.5rem",
                  padding: "0.5rem 1.1rem",
                  borderRadius: 8,
                  border: "none",
                  background: "var(--accent)",
                  color: "#04111f",
                  fontSize: "0.9rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Save & leave
              </button>
            </div>
          </div>
        </div>
      )}
    </DirtyRegistryContext.Provider>
  )
}
