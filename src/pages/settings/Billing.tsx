import { useState } from 'react'
import { useBilling, type CardBrand, type InvoiceStatus, type PaymentMethod, type PaymentMethodStatus } from '../../components/BillingContext'
import { PLANS, PLAN_FEATURES, formatProratedImpact, type PlanId, type PlanMeta } from '../../components/billing/plans'
import { useLocale } from '../../i18n/useLocale'
import { formatDate } from '../../i18n/formatters'
import { formatCurrency, getPrice } from './utils'

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

export default BillingPanel
