import { useEffect, useMemo, useRef, useState } from 'react'
import { formatExpiryCountdown, getRoleConflicts, TEAM_ROLE_LABELS, type TeamRole } from './utils'

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
    name: "TomÃ¡s Rivera",
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
                  listStyle: '"â–¸ "',
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
                <em>and {conflict.redundant.length - 5} moreâ€¦</em>
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
          âœ•
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
            <span style={{ opacity: 0.4 }}>Â·</span>
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
            <span aria-hidden="true">â—·</span>
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
                    ðŸ“­
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
                              <span aria-hidden="true">âŠ˜</span>
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
                          {isExpired ? "â±" : countdown.icon}
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
                          <span aria-hidden="true">â†»</span>
                          {resendingId === inv.id ? "Sendingâ€¦" : "Resend"}
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
                          <span aria-hidden="true">âœ•</span>
                          {revokingId === inv.id ? "Revokingâ€¦" : "Revoke"}
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
            Change roleâ€¦
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
          âœ•
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// #245 â€” InviteMemberModal
// Multi-email chip input with role preselect and invitation email preview.
// ---------------------------------------------------------------------------

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const INVITE_ROLE_OPTIONS: { value: TeamRole; label: string; description: string }[] = [
  { value: "admin",   label: "Admin",   description: "Full access except billing and ownership transfer." },
  { value: "billing", label: "Billing", description: "Can manage payment methods and view invoices." },
  { value: "member",  label: "Member",  description: "Read access to attestations and revenue sources." },
];

interface InviteMemberModalProps {
  onClose: () => void;
  onInvite: (emails: string[], role: TeamRole) => void;
}

function InviteMemberModal({ onClose, onInvite }: InviteMemberModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState("");
  const [chips, setChips] = useState<{ email: string; valid: boolean }[]>([]);
  const [role, setRole] = useState<TeamRole>("member");
  const [showPreview, setShowPreview] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Focus trap â€” move focus into dialog on mount
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    return () => prev?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Commit the current input value as a chip
  function commitInput(raw: string) {
    const trimmed = raw.trim().replace(/,+$/, "");
    if (!trimmed) return;
    const email = trimmed.toLowerCase();
    // Avoid duplicates
    if (chips.some((c) => c.email === email)) {
      setInputValue("");
      return;
    }
    setChips((prev) => [...prev, { email, valid: EMAIL_REGEX.test(email) }]);
    setInputValue("");
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
      e.preventDefault();
      commitInput(inputValue);
    } else if (e.key === "Backspace" && inputValue === "" && chips.length > 0) {
      // Remove last chip on backspace when input is empty
      setChips((prev) => prev.slice(0, -1));
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    // Auto-commit when user types/pastes a comma
    if (val.includes(",")) {
      const parts = val.split(",");
      parts.slice(0, -1).forEach((part) => commitInput(part));
      setInputValue(parts[parts.length - 1]);
    } else {
      setInputValue(val);
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData("text");
    if (text.includes(",") || text.includes("\n") || text.includes(" ")) {
      e.preventDefault();
      const parts = text.split(/[,\n\s]+/);
      parts.forEach((part) => commitInput(part));
    }
  }

  function removeChip(email: string) {
    setChips((prev) => prev.filter((c) => c.email !== email));
    inputRef.current?.focus();
  }

  function handleSubmit() {
    // Commit any dangling input
    if (inputValue.trim()) commitInput(inputValue);
    setSubmitted(true);
  }

  // After submit state updates, check if we can send
  useEffect(() => {
    if (!submitted) return;
    const validEmails = chips.filter((c) => c.valid).map((c) => c.email);
    if (validEmails.length > 0) {
      onInvite(validEmails, role);
      onClose();
    }
    setSubmitted(false);
  }, [submitted, chips, role, onInvite, onClose]);

  const validCount = chips.filter((c) => c.valid).length;
  const invalidCount = chips.filter((c) => !c.valid).length;
  const hasInvalidChips = invalidCount > 0;
  const canSend = (validCount > 0 || inputValue.trim().length > 0);

  const selectedRoleMeta = INVITE_ROLE_OPTIONS.find((r) => r.value === role)!;

  // Preview email body
  const previewEmails = chips.filter((c) => c.valid).map((c) => c.email);
  const previewRecipient = previewEmails[0] ?? "colleague@example.com";

  const modalOverlay: React.CSSProperties = {
    position: "fixed", inset: 0, zIndex: 50,
    background: "rgba(2, 6, 23, 0.72)",
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: "1rem",
  };

  const chipBase: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: "0.3rem",
    padding: "0.2rem 0.4rem 0.2rem 0.65rem",
    borderRadius: 999, fontSize: "0.83rem", fontWeight: 500,
    maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  };

  return (
    <div
      aria-hidden="true"
      onClick={onClose}
      style={modalOverlay}
    >
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- stops click propagation from dialog to backdrop */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-modal-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 520,
          maxHeight: "92dvh", overflowY: "auto",
          background: "var(--surface-strong)",
          border: "1px solid var(--border-strong)",
          borderRadius: "var(--radius-md)",
          boxShadow: "var(--shadow-lg)",
          display: "grid",
          outline: "none",
        }}
      >
        {/* â”€â”€ Header â”€â”€ */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "1.1rem 1.25rem 0.75rem",
          borderBottom: "1px solid var(--border)",
        }}>
          <h2 id="invite-modal-title" style={{ margin: 0, fontSize: "var(--text-lg)", fontWeight: 700 }}>
            Invite team members
          </h2>
          <button
            type="button"
            aria-label="Close invite modal"
            onClick={onClose}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 32, height: 32, borderRadius: 8,
              border: "1px solid var(--border)", background: "transparent",
              cursor: "pointer", color: "var(--muted)",
            }}
          >
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* â”€â”€ Body â”€â”€ */}
        <div style={{ padding: "1rem 1.25rem", display: "grid", gap: "1.1rem" }}>

          {/* Email chip input */}
          <div>
            {/* eslint-disable-next-line jsx-a11y/label-has-associated-control -- referenced via aria-labelledby on the chip input group */}
            <label
              id="invite-emails-label"
              style={{ display: "block", fontWeight: 700, marginBottom: "0.4rem", fontSize: "0.9rem" }}
            >
              Email addresses
            </label>
            {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- clicking the chip container focuses the inner text input */}
            <div
              role="group"
              aria-labelledby="invite-emails-label"
              aria-describedby="invite-emails-hint"
              onClick={() => inputRef.current?.focus()}
              style={{
                display: "flex", flexWrap: "wrap", gap: "0.35rem",
                alignItems: "center",
                minHeight: "var(--density-touch-min)",
                padding: "0.4rem 0.6rem",
                borderRadius: 12,
                border: `1px solid ${hasInvalidChips ? "var(--danger)" : "var(--border)"}`,
                background: "var(--surface)",
                cursor: "text",
              }}
            >
              {chips.map(({ email, valid }) => (
                <span
                  key={email}
                  style={{
                    ...chipBase,
                    background: valid ? "rgba(94, 234, 212, 0.12)" : "var(--danger-soft)",
                    border: `1px solid ${valid ? "rgba(94,234,212,0.35)" : "rgba(251,113,133,0.4)"}`,
                    color: valid ? "var(--accent)" : "var(--danger)",
                  }}
                >
                  <span
                    style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                    title={email}
                  >
                    {email}
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove ${email}`}
                    onClick={(e) => { e.stopPropagation(); removeChip(email); }}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0, width: 16, height: 16, borderRadius: "50%",
                      border: "none", background: "transparent",
                      cursor: "pointer", color: "inherit", padding: 0,
                    }}
                  >
                    <svg aria-hidden="true" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </span>
              ))}
              <input
                ref={inputRef}
                type="email"
                multiple
                autoComplete="off"
                value={inputValue}
                placeholder={chips.length === 0 ? "name@company.com, another@company.com" : ""}
                aria-label="Add email address"
                onChange={handleInputChange}
                onKeyDown={handleInputKeyDown}
                onPaste={handlePaste}
                onBlur={() => { if (inputValue.trim()) commitInput(inputValue); }}
                style={{
                  flex: "1 1 160px", minWidth: 0,
                  border: "none", outline: "none",
                  background: "transparent", color: "var(--text)",
                  fontSize: "0.9rem", padding: "0.15rem 0",
                }}
              />
            </div>
            <p id="invite-emails-hint" style={{ margin: "0.3rem 0 0", fontSize: "0.78rem", color: "var(--muted)" }}>
              Press Enter or comma to add each address. Paste a comma-separated list to add many at once.
            </p>
            {hasInvalidChips && (
              <p role="alert" style={{ margin: "0.3rem 0 0", fontSize: "0.8rem", color: "var(--danger)" }}>
                {invalidCount} address{invalidCount > 1 ? "es are" : " is"} invalid and will be skipped.
              </p>
            )}
          </div>

          {/* Role preselect */}
          <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
            <legend style={{ fontWeight: 700, marginBottom: "0.5rem", fontSize: "0.9rem" }}>Role</legend>
            <div style={{ display: "grid", gap: "0.45rem" }}>
              {INVITE_ROLE_OPTIONS.map((opt) => (
                // eslint-disable-next-line jsx-a11y/label-has-associated-control -- label wraps radio input and nested role description
                <label
                  key={opt.value}
                  style={{
                    display: "flex", alignItems: "flex-start", gap: "0.65rem",
                    padding: "0.65rem 0.85rem",
                    borderRadius: 10,
                    border: `1px solid ${role === opt.value ? "var(--border-strong)" : "var(--border)"}`,
                    background: role === opt.value ? "rgba(94, 234, 212, 0.06)" : "transparent",
                    cursor: "pointer",
                    transition: "border-color 0.12s, background 0.12s",
                  }}
                >
                  <input
                    type="radio"
                    name="invite-role"
                    value={opt.value}
                    checked={role === opt.value}
                    onChange={() => setRole(opt.value)}
                    aria-describedby={`invite-role-desc-${opt.value}`}
                    style={{ marginTop: "0.15rem", flexShrink: 0 }}
                  />
                  <span>
                    <span style={{ display: "block", fontWeight: 600, fontSize: "0.9rem" }}>{opt.label}</span>
                    <span id={`invite-role-desc-${opt.value}`} style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
                      {opt.description}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Email preview toggle */}
          <div>
            <button
              type="button"
              aria-expanded={showPreview}
              aria-controls="invite-email-preview"
              onClick={() => setShowPreview((p) => !p)}
              style={{
                display: "inline-flex", alignItems: "center", gap: "0.4rem",
                background: "transparent", border: "none", cursor: "pointer",
                color: "var(--accent)", fontSize: "0.85rem", fontWeight: 600, padding: 0,
              }}
            >
              <svg
                aria-hidden="true" width="13" height="13" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round"
                style={{ transform: showPreview ? "rotate(90deg)" : "none", transition: "transform 0.15s" }}
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
              {showPreview ? "Hide" : "Preview"} invitation email
            </button>

            {showPreview && (
              <div
                id="invite-email-preview"
                aria-label="Invitation email preview"
                style={{
                  marginTop: "0.75rem",
                  padding: "0.85rem 1rem",
                  borderRadius: 10,
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  fontSize: "0.85rem",
                  lineHeight: 1.65,
                  color: "var(--text)",
                }}
              >
                <p style={{ margin: "0 0 0.5rem", color: "var(--muted)", fontSize: "0.78rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Preview Â· Not a real send
                </p>
                <p style={{ margin: "0 0 0.35rem" }}>
                  <strong>To:</strong>{" "}
                  <span style={{ color: "var(--muted)" }}>{previewRecipient}</span>
                </p>
                <p style={{ margin: "0 0 0.35rem" }}>
                  <strong>Subject:</strong> You've been invited to join the Veritasor workspace
                </p>
                <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "0.6rem 0" }} />
                <p style={{ margin: "0 0 0.5rem" }}>Hi there,</p>
                <p style={{ margin: "0 0 0.5rem" }}>
                  You've been invited to join the Veritasor workspace as a{" "}
                  <strong>{selectedRoleMeta.label}</strong>.{" "}
                  {selectedRoleMeta.description}
                </p>
                <p style={{ margin: "0 0 0.75rem" }}>
                  Click the button below to accept your invitation and set up your account.
                </p>
                <span
                  style={{
                    display: "inline-block",
                    padding: "0.5rem 1.1rem",
                    borderRadius: 8,
                    background: "var(--accent)",
                    color: "#04111f",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                  }}
                >
                  Accept invitation
                </span>
                <p style={{ margin: "0.75rem 0 0", color: "var(--muted)", fontSize: "0.78rem" }}>
                  This invitation expires in 7 days. If you did not expect this email, you can safely ignore it.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* â”€â”€ Footer â”€â”€ */}
        <div style={{
          padding: "0.9rem 1.25rem",
          borderTop: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexWrap: "wrap", gap: "0.75rem",
        }}>
          <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
            {validCount > 0
              ? <>Sending to <strong style={{ color: "var(--text)" }}>{validCount}</strong> address{validCount !== 1 ? "es" : ""} as <strong style={{ color: "var(--text)" }}>{selectedRoleMeta.label}</strong></>
              : "Add at least one valid email address"}
          </span>
          <div style={{ display: "flex", gap: "0.6rem" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "0.55rem 1rem", borderRadius: 10,
                border: "1px solid var(--border)", background: "transparent",
                cursor: "pointer", color: "var(--text)", fontWeight: 600, fontSize: "0.88rem",
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!canSend}
              onClick={handleSubmit}
              style={{
                padding: "0.55rem 1.1rem", borderRadius: 10,
                border: "1px solid transparent",
                background: canSend ? "linear-gradient(135deg, var(--accent), #60a5fa)" : "var(--surface-soft)",
                cursor: canSend ? "pointer" : "not-allowed",
                color: canSend ? "#04111f" : "var(--muted)",
                fontWeight: 700, fontSize: "0.88rem",
                opacity: canSend ? 1 : 0.6,
              }}
            >
              Send {validCount > 1 ? `${validCount} invitations` : "invitation"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TeamPanel() {
  const [members, setMembers] = useState<TeamMember[]>(MOCK_TEAM);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [pending, setPending] = useState<PendingBulkAction | null>(null);
  const [activeConflicts, setActiveConflicts] =
    useState<
      Map<
        string,
        NonNullable<ReturnType<typeof getRoleConflicts>> & {
          _originalRole?: TeamRole;
        }
      >
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

  function handleInvite(emails: string[], role: TeamRole) {
    const newMembers: TeamMember[] = emails.map((email, i) => ({
      id: `u_invite_${Date.now()}_${i}`,
      name: email.split("@")[0],
      email,
      role,
      status: "pending" as MemberStatus,
      joinedAt: new Date().toISOString().split("T")[0],
      avatarInitials: email.slice(0, 2).toUpperCase(),
    }));
    setMembers((prev) => [...prev, ...newMembers]);
    setPending({
      type: "resend",
      count: newMembers.length,
      snapshot: newMembers,
      message: `Invitation${newMembers.length === 1 ? "" : "s"} sent to ${newMembers.length} ${newMembers.length === 1 ? "address" : "addresses"}.`,
    });
    scheduleUndoClear();
  }

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
        <div>
          <h2>Team</h2>
          <p style={{ color: "var(--muted)" }}>
            Manage workspace members, roles, and pending invitations.
          </p>
        </div>
        <button
          type="button"
          aria-label="Invite new team members"
          onClick={() => setShowInviteModal(true)}
          style={{
            display: "inline-flex", alignItems: "center", gap: "0.4rem",
            padding: "0.6rem 1.1rem", borderRadius: 10,
            border: "1px solid transparent",
            background: "linear-gradient(135deg, var(--accent), #60a5fa)",
            color: "#04111f", fontWeight: 700, fontSize: "0.9rem",
            cursor: "pointer",
          }}
        >
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Invite members
        </button>
      </div>

      {showInviteModal && (
        <InviteMemberModal
          onClose={() => setShowInviteModal(false)}
          onInvite={handleInvite}
        />
      )}

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
                                  activeConflicts.get(m.id)?._originalRole ?? m.role,
                                )
                              }
                              onDismiss={() =>
                                dismissConflict(
                                  m.id,
                                  activeConflicts.get(m.id)?._originalRole ?? m.role,
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

export default TeamPanel
