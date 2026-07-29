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

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateRecoveryCodes(): string[] {
  return Array.from({ length: 10 }, () => {
    const seg = () =>
      Array.from(
        { length: 4 },
        () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)],
      ).join("");
    return `${seg()}-${seg()}-${seg()}`;
  });
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
      <hr
        style={{
          border: "none",
          borderTop: "1px solid var(--border)",
          margin: "1.5rem 0",
        }}
      />
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

type TeamRole = "owner" | "admin" | "billing" | "member";
type MemberStatus = "active" | "pending" | "disabled";
type InviteStatus = "pending" | "expired";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: TeamRole;
  status: MemberStatus;
  joinedAt: string;
  avatarInitials: string;
  extraPermissions?: string[];
}

interface PendingInvitation {
  id: string;
  email: string;
  role: TeamRole;
  invitedBy: string;
  invitedAt: string;
  expiresAt: string;
  status: InviteStatus;
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

const ROLE_PERMISSIONS: Record<TeamRole, string[]> = {
  owner: ["*"],
  admin: [
    "team.manage",
    "billing.manage",
    "sources.read",
    "sources.write",
    "attestations.read",
    "attestations.write",
    "settings.read",
    "settings.write",
    "api_keys.manage",
  ],
  billing: [
    "billing.manage",
    "billing.read",
    "invoices.read",
    "payment_methods.manage",
  ],
  member: ["sources.read", "attestations.read", "settings.read"],
};

const PERMISSION_LABELS: Record<string, string> = {
  "*": "Full access",
  "team.manage": "Manage team members",
  "billing.manage": "Manage billing",
  "billing.read": "View billing",
  "sources.read": "View revenue sources",
  "sources.write": "Edit revenue sources",
  "attestations.read": "View attestations",
  "attestations.write": "Create attestations",
  "settings.read": "View settings",
  "settings.write": "Edit settings",
  "api_keys.manage": "Manage API keys",
  "invoices.read": "View invoices",
  "payment_methods.manage": "Manage payment methods",
};

function getRoleConflicts(
  currentRole: TeamRole,
  targetRole: TeamRole,
  extraPermissions: string[] = [],
): {
  redundant: string[];
  supersededBy: string;
  resolutionPaths: { label: string; action: string }[];
} | null {
  const currentPerms = new Set(ROLE_PERMISSIONS[currentRole]);
  const targetPerms = new Set(ROLE_PERMISSIONS[targetRole]);
  const extraPerms = new Set(extraPermissions);

  if (currentPerms.has("*")) return null;
  if (targetPerms.has("*")) {
    if (
      currentRole !== "owner" &&
      (currentPerms.size > 0 || extraPerms.size > 0)
    ) {
      return {
        redundant: Array.from(new Set([...currentPerms, ...extraPerms])).filter(
          (p) => p !== "*",
        ),
        supersededBy: "Owner",
        resolutionPaths: [
          {
            label: `Keep as Owner (supersedes ${TEAM_ROLE_LABELS[currentRole]})`,
            action: "accept",
          },
          {
            label: `Revert to ${TEAM_ROLE_LABELS[currentRole]}`,
            action: "revert",
          },
        ],
      };
    }
    return null;
  }

  if (targetRole === "admin" && currentRole === "billing") {
    return {
      redundant: [
        "billing.manage",
        "billing.read",
        "invoices.read",
        "payment_methods.manage",
      ],
      supersededBy: "Admin",
      resolutionPaths: [
        { label: "Promote to Admin (keeps billing access)", action: "accept" },
        { label: "Keep as Billing only", action: "revert" },
        {
          label: "Promote & remove explicit billing grant",
          action: "strip_extras",
        },
      ],
    };
  }

  if (targetRole === "billing" && currentRole === "admin") {
    return {
      redundant: [
        "team.manage",
        "sources.write",
        "attestations.write",
        "settings.write",
        "api_keys.manage",
      ],
      supersededBy: "Billing role downgrade",
      resolutionPaths: [
        {
          label: "Downgrade to Billing (removes admin privileges)",
          action: "accept",
        },
        { label: "Keep as Admin", action: "revert" },
      ],
    };
  }

  if (targetRole === "member") {
    const extras = Array.from(extraPerms);
    const roleOverlap = Array.from(currentPerms).filter(
      (p) => !targetPerms.has(p),
    );
    if (extras.length > 0 || roleOverlap.length > 0) {
      return {
        redundant: [
          ...extras,
          ...roleOverlap.filter((p) => !targetPerms.has(p)),
        ],
        supersededBy: "Member role",
        resolutionPaths: [
          {
            label: "Demote to Member (strips extra permissions)",
            action: "accept",
          },
          {
            label: `Keep as ${TEAM_ROLE_LABELS[currentRole]}`,
            action: "revert",
          },
          {
            label: "Demote but preserve extra permissions",
            action: "keep_extras",
          },
        ],
      };
    }
  }

  return null;
}

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
    extraPermissions: ["team.manage"],
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
    extraPermissions: ["attestations.write", "sources.write"],
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

const now = Date.now();
const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

const MOCK_INVITATIONS: PendingInvitation[] = [
  {
    id: "inv_001",
    email: "alex.wong@example.com",
    role: "admin",
    invitedBy: "Joel Agboola",
    invitedAt: new Date(now - 2 * DAY).toISOString(),
    expiresAt: new Date(now + 5 * DAY).toISOString(),
    status: "pending",
  },
  {
    id: "inv_002",
    email: "emma.davis@example.com",
    role: "member",
    invitedBy: "Sarah Chen",
    invitedAt: new Date(now - 18 * HOUR).toISOString(),
    expiresAt: new Date(now + 2 * DAY).toISOString(),
    status: "pending",
  },
  {
    id: "inv_003",
    email: "james.liu@example.com",
    role: "billing",
    invitedBy: "Joel Agboola",
    invitedAt: new Date(now - 6 * DAY).toISOString(),
    expiresAt: new Date(now + 18 * HOUR).toISOString(),
    status: "pending",
  },
  {
    id: "inv_004",
    email: "sofia.rossi@example.com",
    role: "member",
    invitedBy: "Marcus Johnson",
    invitedAt: new Date(now - 10 * DAY).toISOString(),
    expiresAt: new Date(now - 2 * HOUR).toISOString(),
    status: "expired",
  },
  {
    id: "inv_005",
    email: "daniel.kim@example.com",
    role: "member",
    invitedBy: "Sarah Chen",
    invitedAt: new Date(now - 14 * DAY).toISOString(),
    expiresAt: new Date(now - 5 * DAY).toISOString(),
    status: "expired",
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

function PermissionConflictWarning({
  conflict,
  memberName,
  onResolve,
  onDismiss,
  conflictId,
}: {
  conflict: NonNullable<ReturnType<typeof getRoleConflicts>>;
  memberName: string;
  onResolve: (action: string) => void;
  onDismiss: () => void;
  conflictId: string;
}) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      id={conflictId}
      style={{
        marginTop: "0.75rem",
        padding: "0.9rem 1rem",
        borderRadius: "var(--radius-sm)",
        background: "var(--warning-soft)",
        border: `1px solid rgba(251, 191, 36, 0.4)`,
        display: "grid",
        gap: "0.75rem",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem" }}>
        <span
          aria-hidden="true"
          style={{
            fontSize: "1.1rem",
            flexShrink: 0,
            marginTop: "0.05rem",
            color: "var(--warning)",
          }}
        >
          ⚠
        </span>
        <div style={{ display: "grid", gap: "0.35rem", minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontWeight: 700,
              fontSize: "0.92rem",
              color: "var(--text)",
            }}
          >
            Permission conflict detected for {memberName}
          </div>
          <p
            style={{
              margin: 0,
              fontSize: "0.88rem",
              color: "var(--muted)",
              lineHeight: 1.55,
            }}
          >
            {conflict.supersededBy} supersedes or overlaps with existing grants.
            The following permissions become redundant or change scope:
          </p>
          <ul
            style={{
              margin: "0.15rem 0 0",
              paddingLeft: "1.1rem",
              display: "grid",
              gap: "0.2rem",
            }}
            aria-label="Redundant permissions"
          >
            {conflict.redundant.slice(0, 5).map((p) => (
              <li
                key={p}
                style={{
                  fontSize: "0.82rem",
                  color: "var(--muted)",
                  listStyle: '"▸ "',
                }}
              >
                <span
                  style={{
                    fontFamily:
                      "ui-monospace, SFMono-Regular, Menlo, monospace",
                    fontSize: "0.78rem",
                    color: "var(--warning)",
                    marginRight: "0.3rem",
                  }}
                >
                  {p}
                </span>
                {PERMISSION_LABELS[p] ?? p}
              </li>
            ))}
            {conflict.redundant.length > 5 && (
              <li
                style={{
                  fontSize: "0.82rem",
                  color: "var(--muted)",
                  listStyle: "none",
                  paddingLeft: 0,
                }}
              >
                <em>and {conflict.redundant.length - 5} more…</em>
              </li>
            )}
          </ul>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss permission conflict warning"
          style={{
            background: "transparent",
            border: "none",
            color: "var(--muted)",
            cursor: "pointer",
            padding: "0.2rem",
            borderRadius: 6,
            fontSize: "0.95rem",
            flexShrink: 0,
            minWidth: "1.75rem",
            minHeight: "1.75rem",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ✕
        </button>
      </div>
      <div
        role="radiogroup"
        aria-label="Resolve permission conflict"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.5rem",
          marginLeft: "1.7rem",
        }}
      >
        {conflict.resolutionPaths.map((path, i) => (
          <button
            key={path.action}
            type="button"
            role="radio"
            aria-checked={false}
            onClick={() => onResolve(path.action)}
            style={{
              minHeight: "2.5rem",
              padding: "0.45rem 0.9rem",
              borderRadius: 8,
              border:
                i === 0
                  ? "1px solid transparent"
                  : "1px solid rgba(251, 191, 36, 0.35)",
              background:
                i === 0
                  ? "linear-gradient(135deg, var(--accent), #60a5fa)"
                  : "rgba(251, 191, 36, 0.08)",
              color: i === 0 ? "#04111f" : "var(--text)",
              fontWeight: 700,
              fontSize: "0.85rem",
              cursor: "pointer",
              transition: "transform 120ms ease, box-shadow 120ms ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform =
                "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = "none";
            }}
          >
            {path.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function formatExpiryCountdown(
  expiresAt: string,
  nowTs: number,
): {
  label: string;
  urgent: boolean;
  expired: boolean;
  icon: string;
} {
  const diff = new Date(expiresAt).getTime() - nowTs;
  if (diff <= 0) {
    const daysAgo = Math.floor(Math.abs(diff) / DAY);
    const hoursAgo = Math.floor(Math.abs(diff) / HOUR);
    return {
      label:
        daysAgo > 0
          ? `Expired ${daysAgo} day${daysAgo === 1 ? "" : "s"} ago`
          : hoursAgo > 0
            ? `Expired ${hoursAgo} hr${hoursAgo === 1 ? "" : "s"} ago`
            : "Expired moments ago",
      urgent: false,
      expired: true,
      icon: "⏱",
    };
  }
  const days = Math.floor(diff / DAY);
  const hours = Math.floor((diff % DAY) / HOUR);
  if (diff < 24 * HOUR) {
    return {
      label: `Expires in ${hours} hr${hours === 1 ? "" : "s"}`,
      urgent: true,
      expired: false,
      icon: "⏰",
    };
  }
  return {
    label: `Expires in ${days} day${days === 1 ? "" : "s"} ${hours} hr${hours === 1 ? "" : "s"}`,
    urgent: diff < 3 * DAY,
    expired: false,
    icon: "⏳",
  };
}

function PendingInvitationsTable() {
  const [invitations, setInvitations] =
    useState<PendingInvitation[]>(MOCK_INVITATIONS);
  const [expiredOnly, setExpiredOnly] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [nowTs, setNowTs] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNowTs(Date.now()), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const visibleInvitations = useMemo(
    () =>
      invitations.filter((inv) =>
        expiredOnly ? inv.status === "expired" : true,
      ),
    [invitations, expiredOnly],
  );

  const pendingCount = invitations.filter((i) => i.status === "pending").length;
  const expiredCount = invitations.filter((i) => i.status === "expired").length;

  function handleResend(id: string) {
    setResendingId(id);
    setTimeout(() => {
      setInvitations((prev) =>
        prev.map((inv) =>
          inv.id === id
            ? {
                ...inv,
                status: "pending",
                invitedAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 7 * DAY).toISOString(),
              }
            : inv,
        ),
      );
      setResendingId(null);
    }, 1200);
  }

  function handleRevoke(id: string) {
    setRevokingId(id);
    setTimeout(() => {
      setInvitations((prev) => prev.filter((inv) => inv.id !== id));
      setRevokingId(null);
    }, 800);
  }

  return (
    <section
      aria-labelledby="pending-invites-heading"
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
            id="pending-invites-heading"
            style={{ margin: 0, fontSize: "1.05rem" }}
          >
            Pending invitations
          </h3>
          <p
            style={{
              margin: "0.25rem 0 0",
              color: "var(--muted)",
              fontSize: "0.9rem",
            }}
          >
            Outstanding workspace invitations. Expired invites can be resent.
          </p>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            flexWrap: "wrap",
          }}
        >
          <div
            aria-live="polite"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              fontSize: "0.82rem",
              color: "var(--muted)",
              fontWeight: 600,
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: "1.5rem",
                height: "1.5rem",
                padding: "0 0.45rem",
                borderRadius: 999,
                background: "rgba(251, 191, 36, 0.14)",
                color: "var(--warning)",
                fontWeight: 800,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {pendingCount}
            </span>
            pending
            <span style={{ opacity: 0.4 }}>·</span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: "1.5rem",
                height: "1.5rem",
                padding: "0 0.45rem",
                borderRadius: 999,
                background: "var(--danger-soft)",
                color: "var(--danger)",
                fontWeight: 800,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {expiredCount}
            </span>
            expired
          </div>
          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.45rem 0.8rem",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--surface-strong)",
              minHeight: "2.5rem",
              cursor: "pointer",
              fontSize: "0.85rem",
              fontWeight: 600,
              color: expiredOnly ? "var(--danger)" : "var(--text)",
            }}
          >
            <input
              type="checkbox"
              checked={expiredOnly}
              onChange={(e) => setExpiredOnly(e.target.checked)}
              aria-label="Filter to show expired invitations only"
              style={{ width: 16, height: 16 }}
            />
            <span aria-hidden="true">◷</span>
            Expired only
          </label>
        </div>
      </div>

      <div
        role="region"
        aria-label="Pending invitations table"
        style={{ overflowX: "auto" }}
      >
        <table
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
              <th scope="col" style={thStyle}>
                Recipient
              </th>
              <th scope="col" style={thStyle}>
                Role
              </th>
              <th scope="col" style={thStyle}>
                Invited by
              </th>
              <th scope="col" style={thStyle}>
                Expiry
              </th>
              <th scope="col" style={{ ...thStyle, textAlign: "right" }}>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visibleInvitations.length === 0 ? (
              <tr style={{ borderTop: "1px solid var(--border)" }}>
                <td
                  colSpan={5}
                  style={{
                    ...tdStyle,
                    padding: "2rem 1.1rem",
                    textAlign: "center",
                    color: "var(--muted)",
                  }}
                >
                  <div
                    aria-hidden="true"
                    style={{ fontSize: "1.75rem", marginBottom: "0.4rem" }}
                  >
                    📭
                  </div>
                  {expiredOnly
                    ? "No expired invitations."
                    : "No pending invitations."}
                </td>
              </tr>
            ) : (
              visibleInvitations.map((inv) => {
                const countdown = formatExpiryCountdown(inv.expiresAt, nowTs);
                const isExpired = inv.status === "expired";
                return (
                  <tr
                    key={inv.id}
                    aria-label={isExpired ? `Expired invitation for ${inv.email}` : `Pending invitation for ${inv.email}`}
                    style={{
                      borderTop: "1px solid var(--border)",
                      background: isExpired
                        ? "repeating-linear-gradient(\n                              45deg,\n                              transparent,\n                              transparent 10px,\n                              rgba(251, 113, 133, 0.04) 10px,\n                              rgba(251, 113, 133, 0.04) 20px\n                            )"
                        : undefined,
                      opacity: isExpired ? 0.88 : 1,
                      outline: isExpired ? "1px dashed rgba(251, 113, 133, 0.25)" : undefined,
                      outlineOffset: isExpired ? "-1px" : undefined,
                    }}
                  >
                    <td style={tdStyle}>
                      <div style={{ display: "grid", gap: "0.15rem" }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            flexWrap: "wrap",
                          }}
                        >
                          <span style={{ fontWeight: 600 }}>{inv.email}</span>
                          {isExpired && (
                            <span
                              aria-label="This invitation has expired"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.25rem",
                                padding: "0.12rem 0.5rem",
                                borderRadius: 999,
                                fontSize: "0.7rem",
                                fontWeight: 800,
                                letterSpacing: "0.04em",
                                textTransform: "uppercase",
                                background: "var(--danger-soft)",
                                border: "1px solid rgba(251, 113, 133, 0.35)",
                                color: "var(--danger)",
                              }}
                            >
                              {/* Strikethrough icon provides a non-colour cue */}
                              <span aria-hidden="true">⊘</span>
                              Expired
                            </span>
                          )}
                        </div>
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
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <RoleChip role={inv.role} />
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: "grid", gap: "0.1rem" }}>
                        <div style={{ fontSize: "0.92rem" }}>
                          {inv.invitedBy}
                        </div>
                        <div
                          style={{
                            color: "var(--muted)",
                            fontSize: "0.82rem",
                          }}
                        >
                          {new Date(inv.invitedAt).toLocaleDateString(
                            undefined,
                            {
                              year: "numeric",
                              month: "short",
                              day: "2-digit",
                            },
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <span
                        role="status"
                        aria-label={`Invitation status: ${isExpired ? "Expired" : countdown.label}`}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "0.45rem",
                          fontSize: "0.88rem",
                        }}
                      >
                        <span
                          aria-hidden="true"
                          style={{
                            marginTop: "0.05rem",
                            fontSize: "0.95rem",
                            flexShrink: 0,
                            color: isExpired
                              ? "var(--danger)"
                              : countdown.urgent
                                ? "var(--warning)"
                                : "var(--muted)",
                          }}
                        >
                          {isExpired ? "⏱" : countdown.icon}
                        </span>
                        <span
                          style={{
                            color: isExpired
                              ? "var(--danger)"
                              : countdown.urgent
                                ? "var(--warning)"
                                : "var(--text)",
                            fontWeight:
                              isExpired || countdown.urgent ? 700 : 500,
                          }}
                        >
                          {isExpired ? countdown.label : countdown.label}
                        </span>
                      </span>
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
                        <button
                          type="button"
                          onClick={() => handleResend(inv.id)}
                          disabled={resendingId === inv.id}
                          aria-label={`Resend invitation to ${inv.email}`}
                          aria-busy={resendingId === inv.id}
                          style={{
                            ...iconBtnStyle,
                            minHeight: "2.25rem",
                            padding: "0.3rem 0.7rem",
                            fontSize: "0.82rem",
                            background: isExpired
                              ? "rgba(251, 191, 36, 0.12)"
                              : undefined,
                            borderColor: isExpired
                              ? "rgba(251, 191, 36, 0.35)"
                              : undefined,
                            color: isExpired ? "var(--warning)" : undefined,
                          }}
                        >
                          <span aria-hidden="true">↻</span>
                          {resendingId === inv.id ? "Sending…" : "Resend"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRevoke(inv.id)}
                          disabled={revokingId === inv.id}
                          aria-label={`Revoke invitation to ${inv.email}`}
                          aria-busy={revokingId === inv.id}
                          style={{
                            ...iconBtnStyle,
                            minHeight: "2.25rem",
                            padding: "0.3rem 0.7rem",
                            fontSize: "0.82rem",
                            color: "var(--danger)",
                            borderColor: "rgba(251, 113, 133, 0.3)",
                          }}
                        >
                          <span aria-hidden="true">✕</span>
                          {revokingId === inv.id ? "Revoking…" : "Revoke"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
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
  const [activeConflicts, setActiveConflicts] =
    useState <
    Map<
      string,
      NonNullable<ReturnType<typeof getRoleConflicts>> & {
        _originalRole?: TeamRole;
      }
    >(new Map());
  const [dismissedConflicts, setDismissedConflicts] = useState<Set<string>>(
    new Set(),
  );

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

  function resolveConflict(
    memberId: string,
    action: string,
    targetRole: TeamRole,
    originalRole: TeamRole,
  ) {
    const member = members.find((m) => m.id === memberId);
    if (!member) return;

    switch (action) {
      case "accept":
        setMembers((prev) =>
          prev.map((m) =>
            m.id === memberId
              ? { ...m, role: targetRole, extraPermissions: [] }
              : m,
          ),
        );
        break;
      case "revert":
        setMembers((prev) =>
          prev.map((m) =>
            m.id === memberId ? { ...m, role: originalRole } : m,
          ),
        );
        break;
      case "strip_extras":
        setMembers((prev) =>
          prev.map((m) =>
            m.id === memberId
              ? { ...m, role: targetRole, extraPermissions: [] }
              : m,
          ),
        );
        break;
      case "keep_extras":
        setMembers((prev) =>
          prev.map((m) => (m.id === memberId ? { ...m, role: targetRole } : m)),
        );
        break;
    }
    setActiveConflicts((prev) => {
      const next = new Map(prev);
      next.delete(memberId);
      return next;
    });
    setDismissedConflicts((prev) => new Set(prev).add(memberId));
    setTimeout(() => {
      setDismissedConflicts((prev) => {
        const next = new Set(prev);
        next.delete(memberId);
        return next;
      });
    }, 10000);
  }

  function dismissConflict(memberId: string, originalRole: TeamRole) {
    setActiveConflicts((prev) => {
      const next = new Map(prev);
      next.delete(memberId);
      return next;
    });
    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, role: originalRole } : m)),
    );
    setDismissedConflicts((prev) => new Set(prev).add(memberId));
    setTimeout(() => {
      setDismissedConflicts((prev) => {
        const next = new Set(prev);
        next.delete(memberId);
        return next;
      });
    }, 10000);
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
                  <td
                    style={{
                      ...tdStyle,
                      textAlign: "right",
                      verticalAlign: "top",
                      paddingTop: "0.85rem",
                    }}
                  >
                    <div
                      style={{
                        display: "grid",
                        justifyItems: "end",
                        gap: "0.4rem",
                      }}
                    >
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
                          aria-describedby={
                            activeConflicts.has(m.id)
                              ? `conflict-${m.id}`
                              : undefined
                          }
                          aria-invalid={activeConflicts.has(m.id)}
                          value={m.role}
                          onChange={(e) => {
                            const newRole = e.target.value as TeamRole;
                            const prevMember = members.find(
                              (x) => x.id === m.id,
                            );
                            const prevRole = prevMember?.role ?? m.role;
                            if (newRole !== prevRole) {
                              const conflict = getRoleConflicts(
                                prevRole,
                                newRole,
                                prevMember?.extraPermissions ?? [],
                              );
                              if (conflict && !dismissedConflicts.has(m.id)) {
                                setActiveConflicts((prev) => {
                                  const next = new Map(prev);
                                  next.set(m.id, {
                                    ...conflict,
                                    _originalRole: prevRole,
                                  });
                                  return next;
                                });
                              }
                            }
                            setMembers((prev) =>
                              prev.map((x) =>
                                x.id === m.id ? { ...x, role: newRole } : x,
                              ),
                            );
                          }}
                          style={{
                            ...pagerBtnStyle,
                            minHeight: "2.25rem",
                            padding: "0.25rem 1.75rem 0.25rem 0.6rem",
                            fontSize: "0.82rem",
                            appearance: "auto",
                            borderColor: activeConflicts.has(m.id)
                              ? "rgba(251, 191, 36, 0.5)"
                              : undefined,
                            boxShadow: activeConflicts.has(m.id)
                              ? "0 0 0 3px rgba(251, 191, 36, 0.15)"
                              : undefined,
                          }}
                        >
                          {(
                            [
                              "owner",
                              "admin",
                              "billing",
                              "member",
                            ] as TeamRole[]
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
                      {activeConflicts.has(m.id) &&
                        activeConflicts.get(m.id) && (
                          <div style={{ width: "100%", maxWidth: 420 }}>
                            <PermissionConflictWarning
                              conflict={activeConflicts.get(m.id)!}
                              memberName={m.name}
                              conflictId={`conflict-${m.id}`}
                              onResolve={(action) =>
                                resolveConflict(
                                  m.id,
                                  action,
                                  m.role,
                                  (activeConflicts.get(m.id) as any)
                                    ._originalRole ?? m.role,
                                )
                              }
                              onDismiss={() =>
                                dismissConflict(
                                  m.id,
                                  (activeConflicts.get(m.id) as any)
                                    ._originalRole ?? m.role,
                                )
                              }
                            />
                          </div>
                        )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <hr
        style={{
          border: "none",
          borderTop: "1px solid var(--border)",
          margin: "0.5rem 0",
          opacity: 0.6,
        }}
      />

      <PendingInvitationsTable />
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
