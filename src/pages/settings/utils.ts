export { formatCurrency } from '../../i18n/formatters'
export { getPrice } from '../../components/billing/plans'

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

export type TeamRole = "owner" | "admin" | "billing" | "member";

export const TEAM_ROLE_LABELS: Record<TeamRole, string> = {
  owner: "Owner",
  admin: "Admin",
  billing: "Billing",
  member: "Member",
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

export function getRoleConflicts(
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

export function formatExpiryCountdown(
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
