import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useIntl } from 'react-intl'
import LocalePickerField from '../components/LocalePicker/LocalePickerField'
import AuditLogTimeline, { type AuditLogEntry } from '../components/audit-log/AuditLogTimeline'
import TokensExport from '../components/tokens/TokensExport'
import SettingsIntegrationsPanel from './SettingsIntegrationsPanel'
import MfaMethodChooser from '../components/MfaMethodChooser'
import WebhookRetryPanel from '../components/WebhookRetryPanel'
import SaveFilterModal from '../components/audit-log/SaveFilterModal'
import SavedFiltersDropdown from '../components/audit-log/SavedFiltersDropdown'
import { useSavedFilters } from '../hooks/useSavedFilters'
import {
  isFilterEmpty,
  parseFilterUrl,
  serializeFilterState,
  type FilterState,
} from '../utils/auditLogFilters'

// Tab definitions ordered by frequency of use
const TABS = [
  { id: "profile", label: "Profile" },
  { id: "notifications", label: "Notifications" },
  { id: "team", label: "Team" },
  { id: "integrations", label: "Integrations" },
  { id: "api-keys", label: "API Keys" },
  { id: "tokens", label: "Tokens" },
  { id: "billing", label: "Billing" },
  { id: "security", label: "Security" },
  { id: "audit-log", label: "Audit Log" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function getTabFromHash(hash: string): TabId {
  const id = hash.replace("#", "") as TabId;
  return TABS.some((t) => t.id === id) ? id : TABS[0].id;
}

// ─── Tab Panels ───────────────────────────────────────────────────────────────

function ProfilePanel() {
  return (
    <div>
      <h2>Profile</h2>
      <p style={{ color: "var(--muted)" }}>
        Manage your personal information and display name.
      </p>
      <form style={{ display: "grid", gap: "1rem", maxWidth: 480 }}>
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
            defaultValue="Joel Agboola"
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
          <label
            htmlFor="settings-email"
            style={{ fontSize: "0.9rem", fontWeight: 600 }}
          >
            Email
          </label>
          <input
            id="settings-email"
            type="email"
            defaultValue="joel@example.com"
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
        <button
          type="submit"
          style={{
            alignSelf: "start",
            padding: "0.6rem 1.25rem",
            borderRadius: 8,
            border: "none",
            background: "var(--accent)",
            color: "#04111f",
            fontWeight: 700,
            cursor: "pointer",
            fontSize: "0.95rem",
          }}
        >
          Save changes
        </button>
      </form>
    </div>
  );
}

function NotificationsPanel() {
  return (
    <div>
      <h2>Notifications</h2>
      <p style={{ color: "var(--muted)" }}>
        Choose which events trigger email notifications.
      </p>
      <ul
        style={{
          listStyle: "none",
          padding: 0,
          display: "grid",
          gap: "0.75rem",
          maxWidth: 480,
        }}
      >
        {[
          "Attestation completed",
          "Attestation failed",
          "New revenue source connected",
          "Billing invoice generated",
        ].map((item) => (
          <li
            key={item}
            style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
          >
            <input
              id={`notif-${item}`}
              type="checkbox"
              defaultChecked
              style={{ width: 16, height: 16 }}
            />
            <label htmlFor={`notif-${item}`} style={{ fontSize: "0.95rem" }}>
              {item}
            </label>
          </li>
        ))}
      </ul>
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

type InvoiceStatus = "paid" | "open" | "overdue" | "void";

interface Invoice {
  id: string;
  period: string;
  amount: number;
  status: InvoiceStatus;
  dueDate: string;
  pdfUrl: string;
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

const MOCK_INVOICES: Invoice[] = [
  {
    id: "inv_001",
    period: "June 2026",
    amount: 49.0,
    status: "paid",
    dueDate: "2026-06-01",
    pdfUrl: "#invoice-001",
  },
  {
    id: "inv_002",
    period: "May 2026",
    amount: 49.0,
    status: "paid",
    dueDate: "2026-05-01",
    pdfUrl: "#invoice-002",
  },
  {
    id: "inv_003",
    period: "April 2026",
    amount: 49.0,
    status: "paid",
    dueDate: "2026-04-01",
    pdfUrl: "#invoice-003",
  },
  {
    id: "inv_004",
    period: "July 2026",
    amount: 49.0,
    status: "open",
    dueDate: "2026-07-15",
    pdfUrl: "#invoice-004",
  },
  {
    id: "inv_005",
    period: "March 2026",
    amount: 29.0,
    status: "overdue",
    dueDate: "2026-03-15",
    pdfUrl: "#invoice-005",
  },
  {
    id: "inv_006",
    period: "February 2026",
    amount: 29.0,
    status: "void",
    dueDate: "2026-02-15",
    pdfUrl: "#invoice-006",
  },
  {
    id: "inv_007",
    period: "January 2026",
    amount: 29.0,
    status: "paid",
    dueDate: "2026-01-15",
    pdfUrl: "#invoice-007",
  },
  {
    id: "inv_008",
    period: "December 2025",
    amount: 29.0,
    status: "paid",
    dueDate: "2025-12-15",
    pdfUrl: "#invoice-008",
  },
  {
    id: "inv_009",
    period: "November 2025",
    amount: 29.0,
    status: "paid",
    dueDate: "2025-11-15",
    pdfUrl: "#invoice-009",
  },
  {
    id: "inv_010",
    period: "October 2025",
    amount: 29.0,
    status: "paid",
    dueDate: "2025-10-15",
    pdfUrl: "#invoice-010",
  },
  {
    id: "inv_011",
    period: "September 2025",
    amount: 29.0,
    status: "paid",
    dueDate: "2025-09-15",
    pdfUrl: "#invoice-011",
  },
  {
    id: "inv_012",
    period: "August 2025",
    amount: 29.0,
    status: "paid",
    dueDate: "2025-08-15",
    pdfUrl: "#invoice-012",
  },
];

const INVOICES_PER_PAGE = 5;

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

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
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(MOCK_INVOICES.length / INVOICES_PER_PAGE);
  const startIdx = (page - 1) * INVOICES_PER_PAGE;
  const pageInvoices = MOCK_INVOICES.slice(
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
          {Math.min(startIdx + INVOICES_PER_PAGE, MOCK_INVOICES.length)} of{" "}
          {MOCK_INVOICES.length}
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
                    {due.toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "2-digit",
                    })}
                  </td>
                  <td
                    style={{
                      ...tdStyle,
                      fontWeight: 700,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {formatCurrency(inv.amount)}
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

type CardBrand = "visa" | "mastercard" | "amex" | "discover";
type PaymentMethodStatus = "ok" | "expiring" | "expired";

interface PaymentMethod {
  id: string;
  brand: CardBrand;
  last4: string;
  expMonth: number;
  expYear: number;
  status: PaymentMethodStatus;
  isDefault: boolean;
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

const MOCK_PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: "pm_001",
    brand: "visa",
    last4: "4242",
    expMonth: 12,
    expYear: 2028,
    status: "ok",
    isDefault: true,
  },
  {
    id: "pm_002",
    brand: "mastercard",
    last4: "5678",
    expMonth: 8,
    expYear: 2026,
    status: "expiring",
    isDefault: false,
  },
  {
    id: "pm_003",
    brand: "amex",
    last4: "0005",
    expMonth: 3,
    expYear: 2025,
    status: "expired",
    isDefault: false,
  },
];

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
  const [methods, setMethods] = useState<PaymentMethod[]>(MOCK_PAYMENT_METHODS);
  const [showAdd, setShowAdd] = useState(false);

  function setDefault(id: string) {
    setMethods((prev) => prev.map((m) => ({ ...m, isDefault: m.id === id })));
  }

  function removeMethod(id: string) {
    setMethods((prev) => prev.filter((m) => m.id !== id));
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
        role="list"
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

function BillingPanel() {
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
          <dd style={{ margin: 0, fontWeight: 600 }}>Growth</dd>
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
            $49.00 / month
          </dd>
        </dl>
      </div>

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

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function generateRecoveryCodes(): string[] {
  return Array.from({ length: 10 }, () => {
    const seg = () =>
      Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('')
    return `${seg()}-${seg()}-${seg()}`
  })
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
      <p style={{ color: "var(--muted)" }}>
        Update your password and manage two-factor authentication.
      </p>
      <form style={{ display: "grid", gap: "1rem", maxWidth: 480 }}>
        <div style={{ display: "grid", gap: "0.4rem" }}>
          <label
            htmlFor="settings-current-password"
            style={{ fontSize: "0.9rem", fontWeight: 600 }}
          >
            Current password
          </label>
          <input
            id="settings-current-password"
            type="password"
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
          <label
            htmlFor="settings-new-password"
            style={{ fontSize: "0.9rem", fontWeight: 600 }}
          >
            New password
          </label>
          <input
            id="settings-new-password"
            type="password"
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
        <button
          type="submit"
          style={{
            alignSelf: "start",
            padding: "0.6rem 1.25rem",
            borderRadius: 8,
            border: "none",
            background: "var(--accent)",
            color: "#04111f",
            fontWeight: 700,
            cursor: "pointer",
            fontSize: "0.95rem",
          }}
        >
          Update password
        </button>
      </form>
      <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '1.5rem 0' }} />
      {mfaSection[mfaState]()}

      <hr
        style={{ margin: "2rem 0", borderColor: "var(--border)", opacity: 0.5 }}
      />

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
  );
}

function WebhooksPanel() {
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const mockDeliveries: WebhookDelivery[] = [
    {
      id: "wh_001",
      event: "attestation.completed",
      triggeredAt: "2026-07-28T09:30:00Z",
      status: "failed",
      attempts: [
        {
          attempt: 1,
          at: "2026-07-28T09:30:00Z",
          statusCode: null,
          error: "Connection refused",
          backoffSeconds: 60,
        },
        {
          attempt: 2,
          at: "2026-07-28T09:31:00Z",
          statusCode: 503,
          error: "Service Unavailable",
          backoffSeconds: 120,
        },
        {
          attempt: 3,
          at: "2026-07-28T09:33:00Z",
          statusCode: 500,
          error: "Internal Server Error",
        },
      ],
    },
    {
      id: "wh_002",
      event: "source.connected",
      triggeredAt: "2026-07-28T08:00:00Z",
      status: "retrying",
      attempts: [
        {
          attempt: 1,
          at: "2026-07-28T08:00:00Z",
          statusCode: 503,
          backoffSeconds: 60,
        },
        {
          attempt: 2,
          at: "2026-07-28T08:01:00Z",
          statusCode: 503,
          backoffSeconds: 180,
        },
      ],
    },
    {
      id: "wh_003",
      event: "attestation.failed",
      triggeredAt: "2026-07-27T18:45:00Z",
      status: "delivered",
      attempts: [
        {
          attempt: 1,
          at: "2026-07-27T18:45:00Z",
          statusCode: 503,
          backoffSeconds: 60,
        },
        {
          attempt: 2,
          at: "2026-07-27T18:46:00Z",
          statusCode: 200,
        },
      ],
    },
  ];

  function handleRetry(id: string) {
    setRetryingId(id);
    setTimeout(() => {
      setRetryingId(null);
      // Real app: trigger retry via API
    }, 2000);
  }

  return (
    <div>
      <h2>Webhooks</h2>
      <p style={{ color: "var(--muted)" }}>
        View webhook delivery history and retry failed attempts. Each delivery
        shows its backoff intervals and final status.
      </p>
      <div
        style={{
          marginTop: "1.5rem",
          maxWidth: 900,
          display: "grid",
          gap: "1rem",
        }}
      >
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
  );
}

function TokensPanel() {
  return (
    <div>
      <h2>Design tokens</h2>
      <p style={{ color: "var(--muted)" }}>
        Export a snapshot of Veritasor design tokens as CSS custom properties.
        Choose a scope, then copy or download the file.
      </p>
      <div style={{ marginTop: "1.5rem", maxWidth: 720 }}>
        <TokensExport />
      </div>
    </div>
  );
}

const AUDIT_LOG_WORKSPACE_ID = 'default';

const AUDIT_LOG_MOCK_ENTRIES: AuditLogEntry[] = [
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

const AUDIT_LOG_CHIPS: { id: AuditLogChipId; label: string }[] = [
  { id: "completed", label: "Completed" },
  { id: "failed", label: "Failed" },
  { id: "connection", label: "Connections" },
  { id: "security", label: "Security" },
];

type AuditLogChipId = "completed" | "failed" | "connection" | "security";

const KNOWN_CHIPS: ReadonlySet<AuditLogChipId> = new Set([
  "completed",
  "failed",
  "connection",
  "security",
]);

function normalizeChip(raw: string): AuditLogChipId | null {
  return KNOWN_CHIPS.has(raw as AuditLogChipId) ? (raw as AuditLogChipId) : null;
}

function matchesChip(event: string, chip: AuditLogChipId): boolean {
  const ev = event.toLowerCase();
  if (chip === "completed") return ev.includes("completed");
  if (chip === "failed") return ev.includes("failed");
  if (chip === "connection") return ev.includes("connected") || ev.includes("connect");
  return ev.includes("rotated") || ev.includes("security");
}

function filterAuditEntries(
  entries: readonly AuditLogEntry[],
  filters: FilterState,
): AuditLogEntry[] {
  const query = filters.query.trim().toLowerCase();
  const fromTs = filters.dateFrom
    ? Date.parse(`${filters.dateFrom}T00:00:00Z`)
    : null;
  const toTs = filters.dateTo
    ? Date.parse(`${filters.dateTo}T23:59:59Z`)
    : null;
  return entries.filter((entry) => {
    if (query) {
      const haystack = `${entry.event} ${entry.details ?? ""}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    if (filters.activeChips.length > 0) {
      const ids = filters.activeChips
        .map(normalizeChip)
        .filter((id): id is AuditLogChipId => id !== null);
      if (ids.length === 0) return true;
      if (!ids.some((chip) => matchesChip(entry.event, chip))) return false;
    }
    if (fromTs !== null || toTs !== null) {
      const entryTs = Date.parse(entry.timestamp);
      if (Number.isNaN(entryTs)) return false;
      if (fromTs !== null && entryTs < fromTs) return false;
      if (toTs !== null && entryTs > toTs) return false;
    }
    return true;
  });
}

function AuditLogPanel() {
  const intl = useIntl();
  const [searchParams, setSearchParams] = useSearchParams();
  // The URL is the single source of truth — parse directly. The audit
  // view does not share URL state with other tabs (which use the hash),
  // so bare `q`/`status`/`from`/`to` keys are unambiguous here.
  const filters = useMemo(
    () => parseFilterUrl(searchParams),
    [searchParams],
  );

  const [saveOpen, setSaveOpen] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const saved = useSavedFilters(AUDIT_LOG_WORKSPACE_ID);

  const entries = useMemo(
    () => filterAuditEntries(AUDIT_LOG_MOCK_ENTRIES, filters),
    [filters],
  );

  function updateParam(key: string, value: string) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );
  }

  function clearAll() {
    setSearchParams(new URLSearchParams(), { replace: true });
  }

  function applySavedFilter(searchParamsString: string, filterName: string) {
    // The stored searchParams string is canonical; treat it as the new
    // source of truth and rewrite the URL.
    const incoming = new URLSearchParams(searchParamsString.replace(/^\?/, ""));
    setSearchParams(incoming, { replace: true });
    // The second arg (filterName) is currently consumed only by the
    // aria-live announcement inside the dropdown; the URL is the
    // single source of truth for the active filter state.
    void filterName;
  }

  function handleSave(name: string) {
    const canonicalParams = serializeFilterState(filters);
    if (!canonicalParams) {
      // Should be guarded by the modal — but defensively bail.
      setSaveOpen(false);
      return;
    }
    const result = saved.save(name, canonicalParams);
    if (result.ok) {
      setSaveOpen(false);
    }
  }

  async function handleCopyUrl() {
    if (typeof window === "undefined") return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1800);
    } catch {
      setCopyState("idle");
    }
  }

  const isEmpty = isFilterEmpty(filters);
  // `saved.rename` already returns the `ValidationResult` shape expected
  // by the dropdown — no wrapper needed.
  const renameResult = saved.rename;

  return (
    <div>
      <h2>{intl.formatMessage({ id: 'auditLog.filters.title', defaultMessage: 'Audit Log' })}</h2>
      <p style={{ color: "var(--muted)" }}>
        Recent activity for this workspace. In compact density mode, identical
        consecutive events are grouped by day and collapsed into summary badges.
      </p>

      <div
        style={{
          marginTop: "1.5rem",
          display: "flex",
          flexWrap: "wrap",
          gap: "0.75rem",
          alignItems: "center",
        }}
        role="toolbar"
        aria-label={intl.formatMessage({
          id: 'auditLog.filters.toolbarLabel',
          defaultMessage: 'Filter and manage saved views',
        })}
      >
        <SavedFiltersDropdown
          filters={saved.filters}
          isHydrated={saved.isHydrated}
          maxFilters={saved.maxFilters}
          isFull={saved.isFull}
          maxNameLength={saved.maxNameLength}
          onApply={(sp, name) => applySavedFilter(sp, name)}
          onRename={renameResult}
          onDelete={(id) => saved.remove(id)}
        />

        <button
          type="button"
          onClick={() => setSaveOpen(true)}
          disabled={isEmpty || saved.isFull}
          aria-disabled={isEmpty || saved.isFull}
          title={
            isEmpty
              ? 'Apply filters before saving'
              : saved.isFull
                ? intl.formatMessage(
                    { id: 'auditLog.filters.capReached', defaultMessage: 'This workspace is at its limit of {max} saved filters. Delete one to make room.' },
                    { max: saved.maxFilters },
                  )
                : undefined
          }
          data-testid="open-save-filter-modal"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            minHeight: '2.75rem',
            padding: '0.45rem 0.85rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-strong)',
            background: isEmpty || saved.isFull ? 'var(--surface-soft)' : 'var(--surface)',
            color: isEmpty || saved.isFull ? 'var(--muted)' : 'var(--text)',
            font: 'inherit',
            fontSize: '0.9rem',
            fontWeight: 600,
            cursor: isEmpty || saved.isFull ? 'not-allowed' : 'pointer',
          }}
        >
          <span aria-hidden="true">＋</span>
          {intl.formatMessage({
            id: 'auditLog.filters.saveMenu',
            defaultMessage: 'Save current filter…',
          })}
        </button>

        <button
          type="button"
          onClick={handleCopyUrl}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            minHeight: '2.75rem',
            padding: '0.45rem 0.85rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            color: 'var(--text)',
            font: 'inherit',
            fontSize: '0.9rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
          aria-label={intl.formatMessage({
            id: 'auditLog.filters.copyUrl',
            defaultMessage: 'Copy shareable URL',
          })}
          data-testid="copy-share-url"
        >
          <span aria-hidden="true">{copyState === 'copied' ? '✓' : '⧉'}</span>
          {copyState === 'copied'
            ? intl.formatMessage({ id: 'auditLog.filters.copied', defaultMessage: 'Copied to clipboard' })
            : intl.formatMessage({ id: 'auditLog.filters.copyUrl', defaultMessage: 'Copy shareable URL' })}
        </button>

        {!isEmpty && (
          <button
            type="button"
            onClick={clearAll}
            data-testid="clear-audit-filters"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              minHeight: '2.75rem',
              padding: '0.45rem 0.85rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid transparent',
              background: 'transparent',
              color: 'var(--muted)',
              font: 'inherit',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {intl.formatMessage({ id: 'common.cancel', defaultMessage: 'Cancel' })} filters
          </button>
        )}
      </div>

      {/* Filter chips + date range — pure UI that writes to the URL */}
      <div style={{ marginTop: '1rem', display: 'grid', gap: '0.65rem' }}>
        <div role="group" aria-label="Filter by status" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          <button
            type="button"
            aria-pressed={filters.activeChips.length === 0}
            onClick={() => updateParam('status', '')}
            style={chipStyle(filters.activeChips.length === 0)}
          >
            All
          </button>
          {AUDIT_LOG_CHIPS.map((chip) => {
            const active = (filters.activeChips as string[]).includes(chip.id);
            return (
              <button
                key={chip.id}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  const next = active
                    ? (filters.activeChips as string[]).filter((c) => c !== chip.id)
                    : [...(filters.activeChips as string[]), chip.id];
                  updateParam('status', next.join(','));
                }}
                style={chipStyle(active)}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
          <label style={{ fontSize: '0.85rem', color: 'var(--muted)', display: 'flex', gap: 6, alignItems: 'center' }}>
            From
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => updateParam('from', e.target.value)}
              style={{
                padding: '0.35rem 0.5rem',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--surface-strong)',
                color: 'var(--text)',
                font: 'inherit',
              }}
            />
          </label>
          <label style={{ fontSize: '0.85rem', color: 'var(--muted)', display: 'flex', gap: 6, alignItems: 'center' }}>
            To
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => updateParam('to', e.target.value)}
              style={{
                padding: '0.35rem 0.5rem',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--surface-strong)',
                color: 'var(--text)',
                font: 'inherit',
              }}
            />
          </label>
          <input
            type="search"
            placeholder="Search audit log…"
            value={filters.query}
            onChange={(e) => updateParam('q', e.target.value)}
            aria-label="Search audit log"
            style={{
              flex: '1 1 240px',
              padding: '0.45rem 0.7rem',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--surface-strong)',
              color: 'var(--text)',
              font: 'inherit',
              minHeight: '2.5rem',
            }}
          />
        </div>
      </div>

      <p
        role="status"
        aria-live="polite"
        style={{ margin: '1rem 0 0', color: 'var(--muted)', fontSize: '0.9rem' }}
        data-testid="audit-filter-summary"
      >
        {intl.formatMessage(
          { id: 'auditLog.filters.results.singular', defaultMessage: 'Showing {count} of {total} entries' },
          { count: entries.length, total: AUDIT_LOG_MOCK_ENTRIES.length },
        )}
      </p>

      <div style={{ marginTop: "1rem", maxWidth: 800 }} data-testid="audit-log-timeline">
        {entries.length === 0 ? (
          <div
            role="status"
            aria-live="polite"
            style={{
              padding: '1rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px dashed var(--border)',
              background: 'var(--surface-soft)',
              color: 'var(--muted)',
            }}
          >
            No entries match the current filters.
          </div>
        ) : (
          <AuditLogTimeline entries={entries} />
        )}
      </div>

      <SaveFilterModal
        isOpen={saveOpen}
        existingNames={saved.filters.map((f) => f.name)}
        onSave={handleSave}
        onClose={() => setSaveOpen(false)}
      />
    </div>
  );
}

function chipStyle(active: boolean): React.CSSProperties {
  return {
    minHeight: '2.5rem',
    padding: '0.35rem 0.85rem',
    borderRadius: 999,
    border: `1px solid ${active ? 'rgba(94, 234, 212, 0.55)' : 'var(--border)'}`,
    background: active ? 'rgba(94, 234, 212, 0.18)' : 'var(--surface)',
    color: active ? '#d8fffa' : 'var(--text)',
    font: 'inherit',
    fontSize: '0.85rem',
    fontWeight: 600,
    cursor: 'pointer',
  };
}

type TeamRole = "owner" | "admin" | "billing" | "member";
type MemberStatus = "active" | "pending" | "disabled";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: TeamRole;
  status: MemberStatus;
  joinedAt: string;
  avatarInitials: string;
}

const TEAM_ROLE_LABELS: Record<TeamRole, string> = {
  owner: "Owner",
  admin: "Admin",
  billing: "Billing",
  member: "Member",
};

const TEAM_ROLE_META: Record<
  TeamRole,
  { bg: string; border: string; color: string }
> = {
  owner: {
    bg: "rgba(139, 92, 246, 0.14)",
    border: "rgba(139, 92, 246, 0.35)",
    color: "#a78bfa",
  },
  admin: {
    bg: "rgba(96, 165, 250, 0.14)",
    border: "rgba(96, 165, 250, 0.35)",
    color: "#60a5fa",
  },
  billing: {
    bg: "rgba(251, 191, 36, 0.14)",
    border: "rgba(251, 191, 36, 0.35)",
    color: "var(--warning)",
  },
  member: {
    bg: "var(--surface-soft)",
    border: "var(--border)",
    color: "var(--muted)",
  },
};

const MEMBER_STATUS_META: Record<MemberStatus, { label: string; dot: string }> =
  {
    active: { label: "Active", dot: "var(--success)" },
    pending: { label: "Pending", dot: "var(--warning)" },
    disabled: { label: "Disabled", dot: "var(--muted)" },
  };

const MOCK_TEAM: TeamMember[] = [
  {
    id: "u_001",
    name: "Joel Agboola",
    email: "joel@example.com",
    role: "owner",
    status: "active",
    joinedAt: "2025-09-12",
    avatarInitials: "JA",
  },
  {
    id: "u_002",
    name: "Sarah Chen",
    email: "sarah@example.com",
    role: "admin",
    status: "active",
    joinedAt: "2025-10-01",
    avatarInitials: "SC",
  },
  {
    id: "u_003",
    name: "Marcus Johnson",
    email: "marcus@example.com",
    role: "billing",
    status: "active",
    joinedAt: "2025-11-20",
    avatarInitials: "MJ",
  },
  {
    id: "u_004",
    name: "Priya Patel",
    email: "priya@example.com",
    role: "member",
    status: "pending",
    joinedAt: "2026-07-25",
    avatarInitials: "PP",
  },
  {
    id: "u_005",
    name: "Tomás Rivera",
    email: "tomas@example.com",
    role: "member",
    status: "active",
    joinedAt: "2026-01-08",
    avatarInitials: "TR",
  },
  {
    id: "u_006",
    name: "Hannah Schmidt",
    email: "hannah@example.com",
    role: "member",
    status: "disabled",
    joinedAt: "2025-12-03",
    avatarInitials: "HS",
  },
  {
    id: "u_007",
    name: "David Okonkwo",
    email: "david@example.com",
    role: "member",
    status: "active",
    joinedAt: "2026-03-14",
    avatarInitials: "DO",
  },
];

interface PendingBulkAction {
  type: "role" | "resend" | "remove";
  count: number;
  targetRole?: TeamRole;
  snapshot: TeamMember[];
  message: string;
}

function RoleChip({ role }: { role: TeamRole }) {
  const meta = TEAM_ROLE_META[role];
  return (
    <span
      aria-label={`Role: ${TEAM_ROLE_LABELS[role]}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "0.22rem 0.6rem",
        borderRadius: 999,
        fontWeight: 700,
        fontSize: "0.78rem",
        letterSpacing: "0.02em",
        border: `1px solid ${meta.border}`,
        background: meta.bg,
        color: meta.color,
        whiteSpace: "nowrap",
      }}
    >
      {TEAM_ROLE_LABELS[role]}
    </span>
  );
}

function MemberAvatar({ initials }: { initials: string }) {
  return (
    <div
      aria-hidden="true"
      style={{
        width: 36,
        height: 36,
        borderRadius: "50%",
        background: "linear-gradient(135deg, var(--accent), #60a5fa)",
        color: "#04111f",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 800,
        fontSize: "0.82rem",
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

function BulkActionToolbar({
  selectedCount,
  onClear,
  onChangeRole,
  onResendInvites,
  onRemove,
}: {
  selectedCount: number;
  onClear: () => void;
  onChangeRole: (role: TeamRole) => void;
  onResendInvites: () => void;
  onRemove: () => void;
}) {
  return (
    <div
      role="region"
      aria-label={`Bulk actions for ${selectedCount} selected member${selectedCount === 1 ? "" : "s"}`}
      aria-live="polite"
      className="bulk-action-toolbar"
      style={{
        position: "sticky",
        top: "3.5rem",
        zIndex: 50,
        display: "grid",
        gridTemplateColumns: "1fr auto",
        alignItems: "center",
        gap: "1rem",
        padding: "0.85rem 1.1rem",
        marginBottom: "1rem",
        borderRadius: "var(--radius-sm)",
        background:
          "linear-gradient(135deg, rgba(94, 234, 212, 0.12), rgba(96, 165, 250, 0.12))",
        border: "1px solid rgba(94, 234, 212, 0.3)",
        boxShadow: "0 8px 24px rgba(2, 6, 23, 0.35)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          flexWrap: "wrap",
          minWidth: 0,
        }}
      >
        <span
          aria-hidden="true"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: "2rem",
            height: "2rem",
            padding: "0 0.6rem",
            borderRadius: 999,
            background: "var(--accent)",
            color: "#04111f",
            fontWeight: 800,
            fontSize: "0.85rem",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {selectedCount}
        </span>
        <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>
          {selectedCount} {selectedCount === 1 ? "member" : "members"} selected
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          flexWrap: "wrap",
          justifyContent: "flex-end",
        }}
      >
        <label htmlFor="bulk-role" className="sr-only">
          Change role
        </label>
        <select
          id="bulk-role"
          aria-label="Change role for selected members"
          onChange={(e) => onChangeRole(e.target.value as TeamRole)}
          defaultValue=""
          style={{
            ...pagerBtnStyle,
            minHeight: "2.75rem",
            paddingRight: "2rem",
            appearance: "auto",
          }}
        >
          <option value="" disabled>
            Change role…
          </option>
          <option value="admin">Admin</option>
          <option value="billing">Billing</option>
          <option value="member">Member</option>
        </select>
        <button
          type="button"
          onClick={onResendInvites}
          aria-label={`Resend invitations to ${selectedCount} selected ${selectedCount === 1 ? "member" : "members"}`}
          style={{
            ...pagerBtnStyle,
            minHeight: "2.75rem",
            padding: "0.5rem 0.95rem",
          }}
        >
          Resend invite{selectedCount > 1 ? "s" : ""}
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${selectedCount} selected ${selectedCount === 1 ? "member" : "members"}`}
          style={{
            ...pagerBtnStyle,
            minHeight: "2.75rem",
            padding: "0.5rem 0.95rem",
            color: "var(--danger)",
            borderColor: "rgba(251, 113, 133, 0.35)",
          }}
        >
          Remove
        </button>
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear selection"
          style={iconBtnStyle}
        >
          ✕
        </button>
      </div>
    </div>
  );
}

function TeamPanel() {
  const [members, setMembers] = useState<TeamMember[]>(MOCK_TEAM);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<PendingBulkAction | null>(null);

  const allSelected = members.length > 0 && selected.size === members.length;
  const someSelected = selected.size > 0 && !allSelected;
  const selectedCount = selected.size;

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(members.map((m) => m.id)));
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function applyBulkRole(role: TeamRole) {
    const affected = members.filter((m) => selected.has(m.id));
    setPending({
      type: "role",
      count: affected.length,
      targetRole: role,
      snapshot: affected,
      message: `Role changed to ${TEAM_ROLE_LABELS[role]} for ${affected.length} ${affected.length === 1 ? "member" : "members"}.`,
    });
    setMembers((prev) =>
      prev.map((m) => (selected.has(m.id) ? { ...m, role } : m)),
    );
    setSelected(new Set());
    scheduleUndoClear();
  }

  function applyBulkResend() {
    const affected = members.filter((m) => selected.has(m.id));
    setPending({
      type: "resend",
      count: affected.length,
      snapshot: affected,
      message: `Invitation${affected.length === 1 ? "" : "s"} resent for ${affected.length} ${affected.length === 1 ? "member" : "members"}.`,
    });
    setSelected(new Set());
    scheduleUndoClear();
  }

  function applyBulkRemove() {
    const affected = members.filter((m) => selected.has(m.id));
    setPending({
      type: "remove",
      count: affected.length,
      snapshot: affected,
      message: `Removed ${affected.length} ${affected.length === 1 ? "member" : "members"} from the workspace.`,
    });
    setMembers((prev) => prev.filter((m) => !selected.has(m.id)));
    setSelected(new Set());
    scheduleUndoClear();
  }

  function scheduleUndoClear() {
    setTimeout(() => setPending(null), 10000);
  }

  function undoPending() {
    if (!pending) return;
    if (pending.type === "role" && pending.targetRole) {
      setMembers((prev) =>
        prev.map((m) => {
          const snap = pending.snapshot.find((s) => s.id === m.id);
          return snap ? { ...m, role: snap.role } : m;
        }),
      );
    } else if (pending.type === "remove") {
      setMembers((prev) => {
        const map = new Map(prev.map((m) => [m.id, m]));
        pending.snapshot.forEach((s) => map.set(s.id, s));
        return Array.from(map.values()).sort(
          (a, b) =>
            MOCK_TEAM.findIndex((x) => x.id === a.id) -
            MOCK_TEAM.findIndex((x) => x.id === b.id),
        );
      });
    }
    setPending(null);
  }

  const roleOptions = useMemo(
    () => ["admin", "billing", "member"] as TeamRole[],
    [],
  );

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <div>
        <h2>Team</h2>
        <p style={{ color: "var(--muted)" }}>
          Manage workspace members, roles, and pending invitations.
        </p>
      </div>

      {selectedCount > 0 && (
        <BulkActionToolbar
          selectedCount={selectedCount}
          onClear={() => setSelected(new Set())}
          onChangeRole={(r) => applyBulkRole(r)}
          onResendInvites={applyBulkResend}
          onRemove={applyBulkRemove}
        />
      )}

      {pending && (
        <div
          role="status"
          aria-live="polite"
          className="undo-banner"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            alignItems: "center",
            gap: "1rem",
            padding: "0.85rem 1.1rem",
            borderRadius: "var(--radius-sm)",
            background: "var(--surface-strong)",
            border: "1px solid var(--border-strong)",
          }}
        >
          <span style={{ fontSize: "0.93rem", fontWeight: 500 }}>
            {pending.message}
          </span>
          <button
            type="button"
            onClick={undoPending}
            aria-label={`Undo: ${pending.message}`}
            style={{
              ...pagerBtnStyle,
              minHeight: "2.5rem",
              padding: "0.45rem 1rem",
              color: "var(--accent)",
              borderColor: "rgba(94, 234, 212, 0.35)",
              fontWeight: 700,
            }}
          >
            Undo
          </button>
        </div>
      )}

      <div style={{ overflowX: "auto" }}>
        <table
          role="table"
          aria-label="Team members"
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
              <th scope="col" style={{ ...thStyle, width: 48 }}>
                <label className="sr-only" htmlFor="team-select-all">
                  Select all members
                </label>
                <input
                  id="team-select-all"
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={toggleAll}
                  aria-label={
                    allSelected ? "Deselect all members" : "Select all members"
                  }
                  style={{ width: 18, height: 18 }}
                />
              </th>
              <th scope="col" style={thStyle}>
                Member
              </th>
              <th scope="col" style={thStyle}>
                Role
              </th>
              <th scope="col" style={thStyle}>
                Status
              </th>
              <th scope="col" style={thStyle}>
                Joined
              </th>
              <th scope="col" style={{ ...thStyle, textAlign: "right" }}>
                <span className="sr-only">Row actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => {
              const isSel = selected.has(m.id);
              const statusMeta = MEMBER_STATUS_META[m.status];
              return (
                <tr
                  key={m.id}
                  className="team-member-row"
                  style={{ borderTop: "1px solid var(--border)" }}
                >
                  <td style={{ ...tdStyle, width: 48 }}>
                    <label className="sr-only" htmlFor={`sel-${m.id}`}>
                      Select {m.name}
                    </label>
                    <input
                      id={`sel-${m.id}`}
                      type="checkbox"
                      checked={isSel}
                      onChange={() => toggleOne(m.id)}
                      aria-label={
                        isSel ? `Deselect ${m.name}` : `Select ${m.name}`
                      }
                      style={{ width: 18, height: 18 }}
                    />
                  </td>
                  <td style={tdStyle}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                      }}
                    >
                      <MemberAvatar initials={m.avatarInitials} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600 }}>{m.name}</div>
                        <div
                          style={{
                            color: "var(--muted)",
                            fontSize: "0.85rem",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {m.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <RoleChip role={m.role} />
                  </td>
                  <td style={tdStyle}>
                    <span
                      role="status"
                      aria-label={`Status: ${statusMeta.label}`}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.4rem",
                        fontSize: "0.88rem",
                        color: "var(--text)",
                      }}
                    >
                      <span
                        aria-hidden="true"
                        style={{
                          width: "0.5rem",
                          height: "0.5rem",
                          borderRadius: "50%",
                          background: statusMeta.dot,
                          flexShrink: 0,
                        }}
                      />
                      {statusMeta.label}
                    </span>
                  </td>
                  <td
                    style={{
                      ...tdStyle,
                      color: "var(--muted)",
                      fontSize: "0.88rem",
                    }}
                  >
                    {new Date(m.joinedAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "2-digit",
                    })}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>
                    <div
                      style={{
                        display: "inline-flex",
                        gap: "0.4rem",
                        flexWrap: "wrap",
                        justifyContent: "flex-end",
                      }}
                    >
                      <select
                        aria-label={`Change role for ${m.name}`}
                        value={m.role}
                        onChange={(e) => {
                          const role = e.target.value as TeamRole;
                          setMembers((prev) =>
                            prev.map((x) =>
                              x.id === m.id ? { ...x, role } : x,
                            ),
                          );
                        }}
                        style={{
                          ...pagerBtnStyle,
                          minHeight: "2.25rem",
                          padding: "0.25rem 1.75rem 0.25rem 0.6rem",
                          fontSize: "0.82rem",
                          appearance: "auto",
                        }}
                      >
                        {(
                          ["owner", "admin", "billing", "member"] as TeamRole[]
                        ).map((r) => (
                          <option
                            key={r}
                            value={r}
                            disabled={r === "owner" && m.role !== "owner"}
                          >
                            {TEAM_ROLE_LABELS[r]}
                          </option>
                        ))}
                      </select>
                      {m.status === "pending" && (
                        <button
                          type="button"
                          aria-label={`Resend invitation to ${m.name}`}
                          style={{
                            ...iconBtnStyle,
                            minHeight: "2.25rem",
                            padding: "0.3rem 0.6rem",
                            fontSize: "0.82rem",
                          }}
                        >
                          Resend
                        </button>
                      )}
                      {m.role !== "owner" && (
                        <button
                          type="button"
                          aria-label={`Remove ${m.name} from workspace`}
                          onClick={() => {
                            setSelected(new Set([m.id]));
                            setTimeout(() => applyBulkRemove(), 0);
                          }}
                          style={{
                            ...iconBtnStyle,
                            minHeight: "2.25rem",
                            padding: "0.3rem 0.6rem",
                            fontSize: "0.82rem",
                            color: "var(--danger)",
                            borderColor: "rgba(251, 113, 133, 0.3)",
                          }}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {roleOptions && null}
    </div>
  );
}

const PANELS: Record<TabId, () => JSX.Element> = {
  profile: ProfilePanel,
  notifications: NotificationsPanel,
  team: TeamPanel,
  integrations: SettingsIntegrationsPanel,
  "api-keys": ApiKeysPanel,
  tokens: TokensPanel,
  billing: BillingPanel,
  security: SecurityPanel,
  "audit-log": AuditLogPanel,
};

// ─── Settings ─────────────────────────────────────────────────────────────────

export default function Settings() {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>(() =>
    getTabFromHash(location.hash),
  );
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Sync active tab with URL hash changes (e.g. browser back/forward)
  useEffect(() => {
    setActiveTab(getTabFromHash(location.hash));
  }, [location.hash]);

  const selectTab = useCallback(
    (id: TabId) => {
      setActiveTab(id);
      navigate(`/settings#${id}`, { replace: true });
    },
    [navigate],
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

  const Panel = PANELS[activeTab];

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
          width: "100%",
          padding: "0.6rem 0.8rem",
          borderRadius: 8,
          border: "1px solid var(--border)",
          background: "var(--surface-strong)",
          color: "var(--text)",
          fontSize: "0.95rem",
          marginBottom: "1.5rem",
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
          display: "flex",
          gap: "0",
          borderBottom: "2px solid var(--border)",
          marginBottom: "1.5rem",
          overflowX: "auto",
        }}
      >
        {TABS.map((tab, index) => {
          const isActive = tab.id === activeTab;
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
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab panels */}
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
  );
}
